import { FilterProvider } from '@/contexts/FilterContext';
import { OrgScopeProvider } from '@/contexts/OrgScopeContext';
import { ViewerProvider } from '@/contexts/ViewerContext';
import { getCurrentUser, isAdmin } from '@/lib/admin';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '~/lib/prisma';
import { DashboardFrame } from './DashboardFrame';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    let admin = false;
    let partnerOrganizationName: string | null = null;
    let partnerHouseholdId18: string | null = null;
    try {
        const { userId, orgId } = await auth();
        const [isAdminValue, user] = await Promise.all([isAdmin(), getCurrentUser()]);
        admin = isAdminValue;
        partnerOrganizationName = user?.partner?.organizationName?.trim() ?? null;
        partnerHouseholdId18 = user?.partner?.householdId18 ?? null;

        if (userId && !admin && !orgId) {
            const userMemberships = await prisma.user.findUnique({
                where: { clerkId: userId },
                select: {
                    partnerMemberships: {
                        select: { partnerId: true },
                        take: 2,
                    },
                },
            });
            if ((userMemberships?.partnerMemberships.length ?? 0) > 1) {
                redirect('/choose-organization');
            }
        }
    } catch (err) {
        console.error('[dashboard layout] viewer context failed', err);
    }
    return (
        <FilterProvider>
            <ViewerProvider
                value={{ isAdmin: admin, partnerOrganizationName, partnerHouseholdId18 }}
            >
                <OrgScopeProvider>
                    <DashboardFrame isAdmin={admin}>{children}</DashboardFrame>
                </OrgScopeProvider>
            </ViewerProvider>
        </FilterProvider>
    );
}
