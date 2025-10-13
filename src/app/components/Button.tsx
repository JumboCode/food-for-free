'use client';

import React from 'react';

// TODO: add what the button takes in
type ButtonProps = {
    onClick: () => void;
    children: React.ReactNode;
};

export default function Button({ onClick, children }: ButtonProps) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 bg-pink-300 hover:bg-pink-600 text-white font-medium rounded-lg shadow transition"
        >
            {children}
        </button>
    );
}
