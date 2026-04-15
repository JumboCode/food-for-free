import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-[#FAF9F7] p-4">
            <SignIn forceRedirectUrl="/overview" />
        </main>
    );
}
