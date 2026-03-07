'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddPartnerModalProps {
    onClose: () => void;
    onSubmit: (data: { name: string; slug?: string }) => Promise<void>;
}

const THEME_GREEN = '#B7D7BD';

export function AddPartnerModal({ onClose, onSubmit }: AddPartnerModalProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Organization name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit({
                name: name.trim(),
                slug: slug.trim() || undefined,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create organization');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#B7D7BD]">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            Add partner organization
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Create a new partner record to link users and deliveries.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-3 text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4">
                    <div className="space-y-4">
                        {/* Organization Name Field */}
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide"
                            >
                                Organization name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                placeholder="Food For Free Partner"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Slug Field */}
                        <div>
                            <label
                                htmlFor="slug"
                                className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide"
                            >
                                Slug <span className="normal-case text-gray-500">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="slug"
                                value={slug}
                                onChange={e =>
                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                                }
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                placeholder="food-for-free-partner"
                                disabled={isSubmitting}
                            />
                            <p className="text-[11px] text-gray-500 mt-1">
                                Leave empty to auto-generate from the organization name.
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="mt-6 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 h-9 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 h-9 text-sm font-medium text-gray-800 rounded-lg border border-[#9fc5a9] hover:bg-[#9fc5a9]/80 disabled:opacity-50 transition-colors"
                            style={{ backgroundColor: THEME_GREEN }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating…' : 'Create organization'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
