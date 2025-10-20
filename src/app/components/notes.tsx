'use client';

import React from 'react';

type NoteProps = {
    text: string;
    onChange: (newText: string) => void;
};

export default function Note({ text, onChange }: NoteProps) {
    return (
        <textarea
            value={text}
            onChange={e => onChange(e.target.value)}
            className="p-2 border border-gray-300 resize-none"
            placeholder="Type your answer here..."
            style={{
                fontFamily: 'Arial, sans-serif',
                width: '30vw',
                height: '50vh',
            }}
        />
    );
}
