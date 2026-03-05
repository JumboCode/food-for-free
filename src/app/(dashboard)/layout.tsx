import SideNavBar from '@/components/ui/SideNavbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SideNavBar />
            <div className="ml-16 sm:ml-56 min-h-screen bg-[#FAF9F5]">
                <main>{children}</main>
            </div>
        </>
    );
}
