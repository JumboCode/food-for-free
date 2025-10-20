'use client';

import React, { useState } from 'react';

export default function Note() {
    const [notes, setNotes] = useState<string[]>([]);
    const [currNote, setCurrNote] = useState<string>('');

    const addNote = () => {
        if (currNote.trim() === '') return;
        setNotes([...notes, currNote]);
    };

    const clearNotes = () => {
        setCurrNote('');
        setNotes([]);
    };

    return (
        <div style={{ margin: '20px' }}>
            {/* Header */}
            <h1 style={{ fontFamily: 'Arial, sans-serif', fontSize: '24px' }}>Notes:</h1>

            {/* Text area */}
            <div className="flex flex-col mb-4">
                <textarea
                    value={currNote}
                    onChange={e => setCurrNote(e.target.value)}
                    className="p-2 border border-gray-300 resize-none"
                    placeholder="Type your note here..."
                    style={{
                        fontFamily: 'Arial, sans-serif',
                        width: '30vw',
                        height: '30vh',
                    }}
                />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mb-4">
                <button
                    className="hover:bg-gray-300"
                    style={{
                        border: 'black 1px solid',
                        borderRadius: '8px',
                        padding: '5px 5px',
                        width: '60px',
                    }}
                    onClick={addNote}
                >
                    Save
                </button>

                <button
                    className="hover:bg-gray-300"
                    style={{
                        border: 'black 1px solid',
                        borderRadius: '8px',
                        padding: '5px 5px',
                        width: '60px',
                    }}
                    onClick={clearNotes}
                >
                    Clear
                </button>
            </div>

            {/* Display saved notes */}
            {notes.length > 0 && (
                <ul className="list-disc pl-5">
                    {notes.map((note, i) => (
                        <li key={i} className="mb-1">
                            {note}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
