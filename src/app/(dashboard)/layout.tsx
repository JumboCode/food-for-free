import SideNavBar from '@/components/ui/SideNavbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SideNavBar />
            <div className="ml-16 sm:ml-56">
                <main className="p-6">{children}</main>
            </div>
        </>
    );
}
