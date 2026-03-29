import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const { userId } = await auth();
    if (!userId) {
        redirect('/sign-in');
    }
    if (!(await isAdmin())) {
        redirect('/overview');
    }
    return <>{children}</>;
}
