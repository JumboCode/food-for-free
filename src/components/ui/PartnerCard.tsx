import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export type PartnerCardProps = {
    id: number;
    name: string;
    location: string;
    type: string;
    disableClick?: boolean;
    onSelect?: (name: string) => void; // Add this
    compact?: boolean;
    /** `brand` = green strip; `neutral` = white list row (e.g. search vs chart greens). */
    surface?: 'brand' | 'neutral';
    //If using this card for something else, change props here
};

const PartnerCard: React.FC<PartnerCardProps> = ({
    name,
    id,
    location,
    type,
    disableClick = false,
    onSelect,
    compact = false,
    surface = 'brand',
}) => {
    const [showPopup, setShowPopup] = useState<boolean>(false);

    const openPopup = () => {
        if (!disableClick) {
            setShowPopup(true);
        } else if (onSelect) {
            // If click is disabled but we have onSelect, call it
            onSelect(name);
        }
    };

    const closePopup = () => {
        setShowPopup(false);
    };

    return (
        <>
            {/*Card info goes here*/}
            <div
                onClick={openPopup}
                className={`flex cursor-pointer items-center justify-between transition-colors duration-200 ${
                    surface === 'neutral'
                        ? `bg-[#FAF9F7] hover:bg-[#F3F0EA] text-slate-800 ${
                              compact ? 'px-3 py-2' : 'px-6 py-4'
                          }`
                        : `border-b border-white bg-[#B7D7BD] text-[#608D6A] hover:bg-[#E7F3EA] hover:text-black ${
                              compact ? 'px-3 py-2' : 'px-6 py-4'
                          }`
                }`}
            >
                <span className={`font-medium ${compact ? 'text-sm' : ''}`}>{name}</span>
                <ChevronRight
                    className={`shrink-0 ${compact ? 'h-4 w-4' : 'h-5 w-5'} ${
                        surface === 'neutral' ? 'text-slate-400' : ''
                    }`}
                />
            </div>

            {/* Popup info goes here */}
            {showPopup && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={closePopup}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl p-8 w-[90vw] h-[90vh] max-w-6xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/*Popup content here*/}
                    </div>
                </div>
            )}
        </>
    );
};

export default PartnerCard;
