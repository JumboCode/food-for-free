import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export type PartnerCardProps = {
    id: number;
    name: string;
    location: string;
    type: string;
    //If using this card for something else, change props here
};

const PartnerCard: React.FC<PartnerCardProps> = ({ name, id, location, type }) => {
    const [showPopup, setShowPopup] = useState<boolean>(false);

    const openPopup = () => {
        setShowPopup(true);
    };

    const closePopup = () => {
        setShowPopup(false);
    };

    return (
        <>
            {/*Card info goes here*/}
            <div
                onClick={openPopup}
                className="flex items-center justify-between px-6 py-4 bg-[#B7D7BD] hover:bg-[#E7F3EA] text-[#608D6A] hover:text-black border-b border-white cursor-pointer transition-all duration-200"
            >
                <span className="font-medium">{name}</span>
                <ChevronRight className="h-5 w-5" />
            </div>

            {/*Popup info goes here*/}
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
