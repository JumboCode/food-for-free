import React from 'react';

interface DeliverySummaryRowProps {
    date: string | Date;
    totalPounds: number;
    id: string | number;
    onClick: (id: string | number) => void;
}

const DeliverySummaryRow: React.FC<DeliverySummaryRowProps> = ({
    date,
    totalPounds,
    id,
    onClick,
}) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
    });

    const backgroundColor = 'bg-green-50';
    const hoverColor = 'hover:bg-orange-100';

    return (
        <div
            className={`${backgroundColor} ${hoverColor} cursor-pointer flex justify-between items-center px-4 py-3`}
            onClick={() => onClick(id)}
        >
            {' '}
            <div className="flex flex-col">
                {' '}
                <span className="text-sm font-medium text-gray-900 flex-1">
                    {formattedDate}
                </span>{' '}
            </div>{' '}
            <div className="flex-1 items-center space-x-2">
                {' '}
                <span className="text-center text-sm text-gray-700">{totalPounds} lbs</span>{' '}
            </div>{' '}
        </div>
    );
};

export default DeliverySummaryRow;
