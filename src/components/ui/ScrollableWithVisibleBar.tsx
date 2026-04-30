'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type ScrollBarState = { mode: 'idle' } | { mode: 'scroll'; thumbTop: number; thumbHeight: number };

type DragState = {
    pointerId: number;
    startClientY: number;
    startScrollTop: number;
    overflow: number;
    maxThumbTop: number;
};

/**
 * Scrollable region with a fixed-width track and thumb on the right (always visible).
 * Hides the native scrollbar. Thumb supports drag; track supports click-to-jump.
 */
export function ScrollableWithVisibleBar({
    children,
    className,
    viewportClassName,
    trackClassName,
    /** When list contents change without remounting, bump this so the thumb recalculates. */
    contentKey,
}: {
    children: React.ReactNode;
    className?: string;
    viewportClassName?: string;
    trackClassName?: string;
    contentKey?: string | number;
}) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [bar, setBar] = useState<ScrollBarState>({ mode: 'idle' });

    const sync = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const overflow = scrollHeight - clientHeight;
        if (overflow <= 1) {
            setBar({ mode: 'idle' });
            return;
        }
        const thumbHeight = Math.max(28, Math.round((clientHeight / scrollHeight) * clientHeight));
        const maxThumbTop = Math.max(1, clientHeight - thumbHeight);
        const thumbTop = Math.round((scrollTop / overflow) * maxThumbTop);
        setBar({
            mode: 'scroll',
            thumbTop,
            thumbHeight,
        });
    }, []);

    const readScrollMetrics = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return null;
        const { scrollHeight, clientHeight } = el;
        const overflow = scrollHeight - clientHeight;
        if (overflow <= 1) return null;
        const thumbHeight = Math.max(28, Math.round((clientHeight / scrollHeight) * clientHeight));
        const maxThumbTop = Math.max(1, clientHeight - thumbHeight);
        return { overflow, maxThumbTop, clientHeight };
    }, []);

    const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = viewportRef.current;
        const metrics = readScrollMetrics();
        if (!el || !metrics) return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
            pointerId: e.pointerId,
            startClientY: e.clientY,
            startScrollTop: el.scrollTop,
            overflow: metrics.overflow,
            maxThumbTop: metrics.maxThumbTop,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || e.pointerId !== drag.pointerId) return;
        const el = viewportRef.current;
        if (!el) return;
        const deltaY = e.clientY - drag.startClientY;
        const next = drag.startScrollTop + (deltaY / drag.maxThumbTop) * drag.overflow;
        el.scrollTop = Math.max(0, Math.min(drag.overflow, next));
        sync();
    };

    const endThumbDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || e.pointerId !== drag.pointerId) return;
        dragRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    const onThumbLostPointerCapture = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (drag && drag.pointerId === e.pointerId) {
            dragRef.current = null;
        }
    };

    const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('[data-scrollbar-thumb]')) return;

        const el = viewportRef.current;
        const track = trackRef.current;
        const metrics = readScrollMetrics();
        if (!el || !track || !metrics) return;

        e.preventDefault();
        const rect = track.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const fraction = Math.max(0, Math.min(1, y / rect.height));
        el.scrollTop = fraction * metrics.overflow;
        sync();
    };

    useLayoutEffect(() => {
        sync();
    }, [sync, contentKey]);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            sync();
        });
        ro.observe(el);
        return () => {
            ro.disconnect();
        };
    }, [sync]);

    return (
        <div className={cn('flex min-h-0 w-full overflow-hidden', className)}>
            <div
                ref={viewportRef}
                onScroll={sync}
                className={cn(
                    'min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0',
                    viewportClassName
                )}
            >
                {children}
            </div>
            <div
                ref={trackRef}
                className={cn(
                    'relative my-1 mr-1 w-3 shrink-0 cursor-pointer self-stretch rounded-full bg-gray-200 select-none touch-none',
                    trackClassName
                )}
                aria-hidden
                onPointerDown={onTrackPointerDown}
            >
                {bar.mode === 'scroll' ? (
                    <div
                        data-scrollbar-thumb
                        className="absolute inset-x-0 cursor-grab rounded-full bg-gray-500/80 active:cursor-grabbing"
                        style={{
                            top: bar.thumbTop,
                            height: bar.thumbHeight,
                        }}
                        onPointerDown={onThumbPointerDown}
                        onPointerMove={onThumbPointerMove}
                        onPointerUp={endThumbDrag}
                        onPointerCancel={endThumbDrag}
                        onLostPointerCapture={onThumbLostPointerCapture}
                    />
                ) : null}
            </div>
        </div>
    );
}
