'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

type NavItem = {
    label: string;
    href: string;
    icon?: React.ReactElement;
};

interface SideNavBarProps {
    items?: NavItem[];
}

const SideNavBar: React.FC<SideNavBarProps> = ({
    items = [
        { label: 'Overview', href: '/overview' },
        { label: 'Distribution', href: '/distribution' },
        { label: 'Admin', href: '/admin' },
        { label: 'Account', href: '/account' },
    ],
}) => {
    const pathname = usePathname();

    return (
        // actual sidebar component
        <aside className="fixed left-0 bg-white h-screen top-0 w-56 flex flex-col px-2">
            {/* top logo portion */}
            <div className="left-0 h-20 flex top-0">
                {/* labels */}
                <h2 className="px-7 pt-7 text-lg font-semibold mb-4">Food For Free</h2>
                <h3 className="fixed top-14 text-gray-400 px-7 text-sm">Partner Portal</h3>
            </div>

            <h3 className="text-lightgray px-7 text-md font-medium mb-2">Pages</h3>
            {/* navigation */}
            <nav className="flex flex-col space-y-2">
                {items.map(item => {
                    const isActive = pathname === item.href;

                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            className={`px-7 py-5 rounded-xl text-gray-800 transition 
                ${isActive ? 'bg-[#FAC87D] text-white' : 'bg-white'}
              `}
                        >
                            {item.label}
                        </a>
                    );
                })}
            </nav>
        </aside>
    );
};

export default SideNavBar;
