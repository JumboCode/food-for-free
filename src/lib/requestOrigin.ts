import { headers } from 'next/headers';

function trimTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Best-effort origin for the current request (works on Vercel via forwarded headers).
 * Falls back to NEXT_PUBLIC_APP_URL, then VERCEL_URL, then localhost for local dev.
 */
export async function getRequestOrigin(): Promise<string> {
    const h = await headers();
    const forwardedHost = h.get('x-forwarded-host');
    const host = (forwardedHost ?? h.get('host') ?? '').split(',')[0]?.trim();
    const forwardedProto = h.get('x-forwarded-proto');
    const proto = (forwardedProto ?? 'https').split(',')[0]?.trim() || 'https';

    if (host) return `${proto}://${host}`;

    const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (publicUrl) return trimTrailingSlash(publicUrl);

    const vercelUrl = process.env.VERCEL_URL?.trim();
    if (vercelUrl) return trimTrailingSlash(`https://${vercelUrl}`);

    return 'http://localhost:3000';
}

export async function getOverviewRedirectUrl(): Promise<string> {
    const origin = await getRequestOrigin();
    return `${trimTrailingSlash(origin)}/overview`;
}
