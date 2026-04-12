'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartLine, Gift, Users } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

type NavItem = {
    label: string;
    href: string;
    icon?: React.ReactElement;
};

interface SideNavBarProps {
    items?: NavItem[];
}

const defaultItems: NavItem[] = [
    { label: 'Overview', href: '/overview', icon: <ChartLine className="h-5 w-5" /> },
    { label: 'Distribution', href: '/distribution', icon: <Gift className="h-5 w-5" /> },
    { label: 'Admin', href: '/admin', icon: <Users className="h-5 w-5" /> },
];

const SideNavBar: React.FC<SideNavBarProps> = ({ items: itemsProp }) => {
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const handleProfileAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const btn = profileRef.current?.querySelector('button');
        if (btn && !btn.contains(e.target as Node)) {
            btn.click();
        }
    };

    useEffect(() => {
        fetch('/api/user/context')
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then((d: { isAdmin?: boolean }) => setIsAdmin(Boolean(d.isAdmin)))
            .catch(() => setIsAdmin(false));
    }, []);

    const items = useMemo(() => {
        const base = itemsProp ?? defaultItems;
        if (isAdmin === null) return base.filter(i => i.href !== '/admin');
        if (!isAdmin) return base.filter(i => i.href !== '/admin');
        return base;
    }, [itemsProp, isAdmin]);

    return (
        <aside className="fixed left-0 bg-white h-screen top-0 w-16 sm:w-56 flex flex-col border-r border-gray-100">
            <Link href="/overview" className="flex items-center gap-3 px-4 sm:px-5 pt-6 pb-4">
                <Image
                    src="/food-for-free-logo.png"
                    alt="Food For Free"
                    width={36}
                    height={36}
                    className="flex-shrink-0"
                />
                <div className="hidden sm:flex flex-col">
                    <span className="text-base font-bold leading-tight">Food For Free</span>
                    <span className="text-xs text-gray-400">Partner Portal</span>
                </div>
            </Link>

            <nav className="flex flex-col flex-1 px-2 sm:px-3 space-y-1 mt-2">
                {items.map(item => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 px-3 py-3 rounded-xl transition
                                ${isActive ? 'bg-[#FAC87D]' : 'hover:bg-gray-50'}`}
                        >
                            <div className="h-5 w-5 text-[#1C5E2C] flex-shrink-0">{item.icon}</div>
                            <span className="hidden sm:inline text-sm font-medium text-gray-700">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="px-2 sm:px-3 pb-5 pt-3 border-t border-gray-100 mt-auto">
                <div
                    ref={profileRef}
                    onClick={handleProfileAreaClick}
                    className="flex items-center justify-center sm:justify-start gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition"
                >
                    <UserButton
                        showName={false}
                        appearance={{
                            variables: {
                                colorPrimary: '#1C5E2C',
                            },
                        }}
                    />
                    <span className="hidden sm:inline text-sm font-medium text-gray-700">
                        My Profile
                    </span>
                </div>
            </div>
        </aside>
    );
};

export default SideNavBar;
