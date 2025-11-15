'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { CircleUser, ChartLine, Gift, Users } from 'lucide-react';

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
        { label: 'Overview', href: '/overview', icon: <ChartLine className="h-5 w-5" /> },
        { label: 'Distribution', href: '/distribution', icon: <Gift className="h-5 w-5" /> },
        { label: 'Admin', href: '/admin', icon: <Users className="h-5 w-5" /> },
        { label: 'Account', href: '/account', icon: <CircleUser className="h-5 w-5" /> },
        { label: 'Sticker Sheet', href: '/sticker-sheet', icon: <Gift className="h-5 w-5" /> },
    ],
}) => {
    const pathname = usePathname();

    return (
        // actual sidebar component
        <aside className="fixed left-0 bg-white h-screen top-0 w-16 sm:w-56 flex flex-col ">
            {/* top logo portion */}
            <div className="left-0 h-20 flex top-0">
                {/* labels */}
                <h2 className="hidden sm:block px-7 pt-7 text-lg font-semibold mb-4 font-bold">
                    Food For Free
                </h2>
                <h3 className=" hidden sm:block fixed top-14 text-gray-400 px-7 text-sm">
                    Partner Portal
                </h3>
            </div>

            <h3 className="hidden sm:inline text-lightgray px-7 text-md font-medium mb-2">Pages</h3>
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
                            <div className=" flex items-center gap-2">
                                {item.icon && (
                                    <div className="h-5 w-5 text-muted-foreground">{item.icon}</div>
                                )}
                                <span className="items-center sm:items-start hidden sm:inline  text-sm font-medium text-gray-700">
                                    {item.label}
                                </span>
                            </div>
                        </a>
                    );
                })}
            </nav>
        </aside>
    );
};

export default SideNavBar;
