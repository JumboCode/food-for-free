'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

const ICON_BUBBLE = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full';

type CautionDialogBodyProps = {
    title: string;
    children: ReactNode;
    actions: ReactNode;
};

/**
 * Common alert-dialog layout: warning icon centered on top, then title, body, actions
 * (similar to many design systems’ destructive / caution modals).
 */
export function CautionDialogBody({ title, children, actions }: CautionDialogBodyProps) {
    return (
        <div className="px-6 pb-6 pt-6">
            <div className="flex flex-col items-center text-center">
                <div
                    className={ICON_BUBBLE}
                    style={{ backgroundColor: 'rgba(250, 200, 125, 0.35)' }}
                    aria-hidden
                >
                    <AlertTriangle className="h-5 w-5 text-[#744210]" strokeWidth={2.25} />
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-snug text-gray-900">{title}</h3>
                <div className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
                    {children}
                </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
        </div>
    );
}
