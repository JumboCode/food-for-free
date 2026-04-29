import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function usage() {
    throw new Error(
        [
            'Usage:',
            '  node scripts/seed-multi-org-user.mjs --user <clerk_user_id> --orgs <org_1,org_2,...> [--role org:member]',
            '',
            'Required env:',
            '  CLERK_SECRET_KEY',
        ].join('\n')
    );
}

function parseArgs(argv) {
    const parsed = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const key = token.slice(2);
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) {
            parsed[key] = true;
            continue;
        }
        parsed[key] = value;
        i += 1;
    }
    return parsed;
}

async function clerkRequest(path, init = {}) {
    const apiKey = process.env.CLERK_SECRET_KEY;
    if (!apiKey) throw new Error('Missing CLERK_SECRET_KEY');

    const response = await fetch(`https://api.clerk.com/v1${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
        },
    });

    if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Clerk API ${response.status} for ${path}: ${bodyText}`);
    }
    if (response.status === 204) return null;
    return response.json();
}

async function ensureClerkMembership({ userId, organizationId, role }) {
    try {
        await clerkRequest(`/organizations/${organizationId}/memberships`, {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                role,
            }),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Clerk returns 409 when user is already in org.
        if (message.includes(' 409 ')) {
            return;
        }
        throw error;
    }
}

async function ensureAppMembership({ dbUserId, organizationId }) {
    const partner = await prisma.partner.findUnique({
        where: { clerkOrganizationId: organizationId },
        select: { householdId18: true, organizationName: true },
    });
    if (!partner) {
        return;
    }

    await prisma.userPartnerMembership.upsert({
        where: {
            userId_partnerId: {
                userId: dbUserId,
                partnerId: partner.householdId18,
            },
        },
        create: {
            userId: dbUserId,
            partnerId: partner.householdId18,
        },
        update: {},
    });
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || !args.user || !args.orgs) {
        usage();
    }

    const userId = String(args.user).trim();
    const organizationIds = String(args.orgs)
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    const role = typeof args.role === 'string' ? args.role : 'org:member';

    if (organizationIds.length === 0) {
        throw new Error('No organization IDs provided in --orgs');
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, email: true },
    });
    if (!dbUser) {
        throw new Error(
            `No local User row found for clerkId=${userId}. Sign in once first so webhook/session backfill creates it.`
        );
    }

    for (const organizationId of organizationIds) {
        await ensureClerkMembership({ userId, organizationId, role });
        await ensureAppMembership({ dbUserId: dbUser.id, organizationId });
    }
}

main()
    .catch(() => {
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
