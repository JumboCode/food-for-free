import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const body = await req.json();
        const { email, organizationId, organizationName } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate that at least one of organizationId or organizationName is provided
        if (!organizationId && !organizationName) {
            return NextResponse.json(
                { error: 'Either organizationId or organizationName must be provided' },
                { status: 400 }
            );
        }

        // Reject if both are provided (ambiguous)
        if (organizationId && organizationName) {
            return NextResponse.json(
                { error: 'Provide either organizationId or organizationName, not both' },
                { status: 400 }
            );
        }

        const client = await clerkClient();
        let targetOrganizationId = organizationId;

        // Invites keyed by Clerk org id must still have a Partner row or the membership webhook cannot link users.
        if (organizationId && !organizationName) {
            const org = await client.organizations.getOrganization({
                organizationId: targetOrganizationId!,
            });
            await prisma.partner.upsert({
                where: { clerkOrganizationId: org.id },
                update: { organizationName: org.name },
                create: {
                    organizationName: org.name,
                    clerkOrganizationId: org.id,
                },
            });
        }

        // If organizationName is provided, reuse the organization in Clerk (or create it if missing)
        if (organizationName) {
            try {
                // Check if organization already exists
                const slug = organizationName.toLowerCase().replace(/\s+/g, '-');
                let existingOrganizationId: string | null = null;

                try {
                    const existing = await client.organizations.getOrganization({ slug });
                    existingOrganizationId = existing.id;
                    targetOrganizationId = existing.id;

                    // Ensure matching Partner exists in Neon for webhook association
                    await prisma.partner.upsert({
                        where: { clerkOrganizationId: existing.id },
                        update: { organizationName },
                        create: {
                            organizationName,
                            clerkOrganizationId: existing.id,
                        },
                    });
                } catch {
                    // Organization doesn't exist, proceed with creation
                }

                if (!existingOrganizationId) {
                    const newOrg = await client.organizations.createOrganization({
                        name: organizationName,
                        createdBy: userId,
                    });

                    // Create matching Partner in Neon so webhook can associate invited users with this org
                    await prisma.partner.upsert({
                        where: { clerkOrganizationId: newOrg.id },
                        update: { organizationName },
                        create: {
                            organizationName,
                            clerkOrganizationId: newOrg.id,
                        },
                    });

                    targetOrganizationId = newOrg.id;
                }
            } catch (error) {
                console.error('Error creating organization:', error);
                return NextResponse.json(
                    { error: 'Failed to create organization' },
                    { status: 500 }
                );
            }
        }

        // Create invitation
        const invitation = await client.organizations.createOrganizationInvitation({
            organizationId: targetOrganizationId!,
            emailAddress: email,
            inviterUserId: userId,
            role: 'org:member',
        });

        return NextResponse.json({
            invitation: {
                id: invitation.id,
                emailAddress: invitation.emailAddress,
                organizationId: invitation.organizationId,
                status: invitation.status,
            },
        });
    } catch (error) {
        console.error('Error creating invitation:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}
