'use client';

import React from 'react';

type Props = {
    destinations: string[];
};

export default function UniqueDestinationsDisplay({ destinations }: Props) {
    if (!destinations.length) return null;

    return (
        <section className="mt-6 w-full max-w-2xl rounded-lg border bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Unique Destinations</h2>
                <span className="text-sm text-muted-foreground">{destinations.length} total</span>
            </div>

            <table className="w-full text-sm">
                <tbody>
                    {destinations.map(dest => (
                        <tr
                            key={dest}
                            className="border-b last:border-none hover:bg-muted/40 transition-colors"
                        >
                            <td className="px-3 py-2">{dest}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
