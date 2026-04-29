import { FilterProvider } from '@/contexts/FilterContext';
import { OrgScopeProvider } from '@/contexts/OrgScopeContext';
import { ViewerProvider } from '@/contexts/ViewerContext';
import { getCurrentUser, getUserPartnerContexts, isAdmin } from '@/lib/admin';
import { auth } from '@clerk/nextjs/server';
import { DashboardFrame } from './DashboardFrame';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    let admin = false;
    let partnerOrganizationName: string | null = null;
    let partnerHouseholdId18: string | null = null;
    let shouldShowOrgChooser = false;
    try {
        const { userId, orgId } = await auth();
        const [isAdminValue, user] = await Promise.all([isAdmin(), getCurrentUser()]);
        admin = isAdminValue;
        partnerOrganizationName = user?.partner?.organizationName?.trim() ?? null;
        partnerHouseholdId18 = user?.partner?.householdId18 ?? null;

        if (userId && !admin && !orgId) {
            const userMemberships = await getUserPartnerContexts(userId);
            if (userMemberships.length > 1) {
                shouldShowOrgChooser = true;
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
                    <DashboardFrame isAdmin={admin} showOrgChooser={shouldShowOrgChooser}>
                        {children}
                    </DashboardFrame>
                </OrgScopeProvider>
            </ViewerProvider>
        </FilterProvider>
    );
}
