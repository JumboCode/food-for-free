import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export type PartnerCardProps = {
    id: number;
    name: string;
    location: string;
    type: string;
    disableClick?: boolean;
    onSelect?: (name: string) => void; // Add this
    //If using this card for something else, change props here
};

const PartnerCard: React.FC<PartnerCardProps> = ({
    name,
    id,
    location,
    type,
    disableClick = false,
    onSelect,
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
                className="flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-800 hover:text-gray-900 border-b border-gray-200 cursor-pointer transition-all duration-150"
            >
                <span className="font-medium text-sm">{name}</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
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
