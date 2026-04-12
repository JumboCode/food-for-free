import { FilterProvider } from '@/contexts/FilterContext';
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
            <DashboardFrame isAdmin={admin}>{children}</DashboardFrame>
        </FilterProvider>
    );
}
