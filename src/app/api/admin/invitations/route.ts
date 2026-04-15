import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const body = await req.json();
        const { email, organizationId, organizationName, isAdmin } = body as {
            email?: string;
            organizationId?: string;
            organizationName?: string;
            isAdmin?: boolean;
        };

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        if (organizationName && !organizationId) {
            return NextResponse.json(
                {
                    error: 'Creating organizations from invites is disabled. Create the partner first with a Household Id 18.',
                },
                { status: 400 }
            );
        }

        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
        }

        const client = await clerkClient();
        const targetOrganizationId = organizationId;

        // Invites keyed by Clerk org id must still have a Partner row or webhook cannot link users.
        const org = await client.organizations.getOrganization({
            organizationId: targetOrganizationId!,
        });
        const metadataHouseholdId18 =
            typeof org.publicMetadata?.householdId18 === 'string'
                ? org.publicMetadata.householdId18.trim()
                : '';
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: org.id },
            select: { householdId18: true },
        });
        const householdId18 = metadataHouseholdId18 || partner?.householdId18?.trim() || '';

        if (!householdId18) {
            return NextResponse.json(
                { error: 'This organization is missing a Household Id 18.' },
                { status: 400 }
            );
        }

        if (!metadataHouseholdId18) {
            try {
                await client.organizations.updateOrganizationMetadata(org.id, {
                    publicMetadata: { ...org.publicMetadata, householdId18 },
                });
            } catch (metadataError) {
                console.warn('Failed to backfill householdId18 metadata for organization:', {
                    organizationId: org.id,
                    metadataError,
                });
            }
        }

        await prisma.partner.upsert({
            where: { clerkOrganizationId: org.id },
            update: { organizationName: org.name, householdId18 },
            create: {
                householdId18,
                organizationName: org.name,
                clerkOrganizationId: org.id,
            },
        });

        if (isAdmin && !isDistributorPartnerOrgName(org.name)) {
            return NextResponse.json(
                { error: 'Admin invites are only allowed for the Food For Free organization.' },
                { status: 400 }
            );
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
