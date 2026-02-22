'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddPartnerModalProps {
    onClose: () => void;
    onSubmit: (data: { name: string; slug?: string }) => Promise<void>;
}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="px-6 py-4 bg-[#608D6A] text-white rounded-t-lg flex justify-between items-center">
                    <h3 className="text-xl font-bold">Add Partner Organization</h3>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        {/* Organization Name Field */}
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Organization Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608D6A] focus:border-transparent"
                                placeholder="Enter organization name"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Slug Field */}
                        <div>
                            <label
                                htmlFor="slug"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Slug <span className="text-gray-500">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="slug"
                                value={slug}
                                onChange={e =>
                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608D6A] focus:border-transparent"
                                placeholder="organization-slug"
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Leave empty to auto-generate from name
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
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[#608D6A] text-white rounded-lg hover:bg-[#4F7557] transition-colors disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Organization'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
