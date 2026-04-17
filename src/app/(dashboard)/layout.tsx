import { FilterProvider } from '@/contexts/FilterContext';
import { OrgScopeProvider } from '@/contexts/OrgScopeContext';
import { isAdmin } from '@/lib/admin';
import { DashboardFrame } from './DashboardFrame';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    let admin = false;
    try {
        admin = await isAdmin();
    } catch (err) {
        console.error('[dashboard layout] isAdmin failed', err);
    }
    return (
        <FilterProvider>
            <OrgScopeProvider>
                <DashboardFrame isAdmin={admin}>{children}</DashboardFrame>
            </OrgScopeProvider>
        </FilterProvider>
    );
}
