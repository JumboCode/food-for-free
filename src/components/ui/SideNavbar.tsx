'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartLine, Gift, Users } from 'lucide-react';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

type NavItem = {
    label: string;
    href: string;
    icon?: React.ReactElement;
};

interface SideNavBarProps {
    items?: NavItem[];
    /**
     * When provided (e.g. from server layout), Admin visibility is known on first paint.
     * When omitted, falls back to /api/user/context (e.g. sticker-sheet preview).
     */
    isAdmin?: boolean;
}

const defaultItems: NavItem[] = [
    { label: 'Overview', href: '/overview', icon: <ChartLine className="h-5 w-5" /> },
    { label: 'Distribution', href: '/distribution', icon: <Gift className="h-5 w-5" /> },
    { label: 'Admin', href: '/admin', icon: <Users className="h-5 w-5" /> },
];

const SideNavBar: React.FC<SideNavBarProps> = ({
    items: itemsProp,
    isAdmin: isAdminFromServer,
}) => {
    const pathname = usePathname();
    const [isAdminFetched, setIsAdminFetched] = useState<boolean | null>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const handleProfileAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const btn = profileRef.current?.querySelector('button');
        if (btn && !btn.contains(e.target as Node)) {
            btn.click();
        }
    };

    useEffect(() => {
        if (isAdminFromServer !== undefined) return;
        fetch('/api/user/context')
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then((d: { isAdmin?: boolean }) => setIsAdminFetched(Boolean(d.isAdmin)))
            .catch(() => setIsAdminFetched(false));
    }, [isAdminFromServer]);

    const isAdminResolved = isAdminFromServer !== undefined ? isAdminFromServer : isAdminFetched;

    const items = useMemo(() => {
        const base = itemsProp ?? defaultItems;
        if (isAdminResolved === null) return base.filter(i => i.href !== '/admin');
        if (!isAdminResolved) return base.filter(i => i.href !== '/admin');
        return base;
    }, [itemsProp, isAdminResolved]);

    return (
        <aside className="fixed left-0 bg-white h-screen top-0 w-16 lg:w-64 flex flex-col border-r border-gray-100">
            <Link href="/overview" className="flex items-center gap-3 px-4 lg:px-5 pt-6 pb-4">
                <Image
                    src="/images/food-for-free-logo.png"
                    alt="Food For Free"
                    width={36}
                    height={36}
                    className="shrink-0"
                />
                <div className="hidden lg:flex flex-col">
                    <span className="text-base font-bold leading-tight">Food For Free</span>
                    <span className="text-xs text-gray-400">Partner Portal</span>
                </div>
            </Link>

            <nav className="flex flex-col flex-1 px-2 lg:px-3 space-y-1 mt-2">
                {items.map(item => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 px-3 py-3 rounded-xl transition
                                ${isActive ? 'bg-[#FAC87D]' : 'hover:bg-gray-50'}`}
                        >
                            <div className="h-5 w-5 text-[#1C5E2C] shrink-0">{item.icon}</div>
                            <span className="hidden lg:inline text-sm font-medium text-gray-700">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="px-2 lg:px-3 pb-5 pt-3 border-t border-gray-100 mt-auto">
                <div className="lg:hidden mb-2 flex justify-center">
                    <OrganizationSwitcher
                        afterSelectOrganizationUrl="/overview"
                        hidePersonal={true}
                        appearance={{
                            elements: {
                                organizationSwitcherTrigger:
                                    'h-9 w-9 rounded-lg border border-gray-200 bg-white p-0 overflow-hidden',
                            },
                        }}
                    />
                </div>
                <div className="hidden lg:block mb-3 px-1">
                    <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                        Organization
                    </p>
                    <OrganizationSwitcher
                        afterSelectOrganizationUrl="/overview"
                        hidePersonal={true}
                        appearance={{
                            elements: {
                                rootBox: 'w-full max-w-full',
                                organizationSwitcherTrigger:
                                    'w-full max-w-full h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 hover:bg-gray-50',
                                organizationSwitcherPopoverCard:
                                    'w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]',
                            },
                        }}
                    />
                </div>
                <div
                    ref={profileRef}
                    onClick={handleProfileAreaClick}
                    className="flex items-center justify-center lg:justify-start gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition"
                >
                    <UserButton
                        showName={false}
                        appearance={{
                            variables: {
                                colorPrimary: '#1C5E2C',
                            },
                        }}
                    />
                    <span className="hidden lg:inline text-sm font-medium text-gray-700">
                        My Profile
                    </span>
                </div>
            </div>
        </aside>
    );
};

export default SideNavBar;
