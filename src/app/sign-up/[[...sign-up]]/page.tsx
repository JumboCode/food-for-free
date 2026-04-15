import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-[#FAF9F7] p-4">
            <SignUp forceRedirectUrl="/overview" />
        </main>
    );
}
