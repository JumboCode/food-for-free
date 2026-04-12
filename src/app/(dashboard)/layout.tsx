import { FilterProvider } from '@/contexts/FilterContext';
import { isAdmin } from '@/lib/admin';
import { DashboardFrame } from './DashboardFrame';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const admin = await isAdmin();
    return (
        <FilterProvider>
            <DashboardFrame isAdmin={admin}>{children}</DashboardFrame>
        </FilterProvider>
    );
}
