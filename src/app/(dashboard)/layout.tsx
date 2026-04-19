import { FilterProvider } from '@/contexts/FilterContext';
import { OrgScopeProvider } from '@/contexts/OrgScopeContext';
import { ViewerProvider } from '@/contexts/ViewerContext';
import { getCurrentUser, isAdmin } from '@/lib/admin';
import { DashboardFrame } from './DashboardFrame';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    let admin = false;
    let partnerOrganizationName: string | null = null;
    let partnerHouseholdId18: string | null = null;
    try {
        const [isAdminValue, user] = await Promise.all([isAdmin(), getCurrentUser()]);
        admin = isAdminValue;
        partnerOrganizationName = user?.partner?.organizationName?.trim() ?? null;
        partnerHouseholdId18 = user?.partner?.householdId18 ?? null;
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
