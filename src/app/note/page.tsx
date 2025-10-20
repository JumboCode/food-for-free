'use client';
import { useState } from 'react';
import Note from '../components/notes';

export default function NotePage() {
    const [notes, setNotes] = useState<string[]>([]);
    const [currNote, setCurrNote] = useState<string>('');

    // Add a note function
    const addNote = (note: string) => {
        // append string to current note
        setNotes([...notes, currNote]);
    };

    // clear the current note and the saved notes
    const clearNote = () => {
        setCurrNote('');
        setNotes([]);
    };

    return (
        <div style={{ margin: '20px' }}>
            {/* header */}
            <h1 style={{ fontFamily: 'Arial, sans-serif', fontSize: '24px' }}>Notes:</h1>

            {/* note component */}
            <div className="flex flex-col mb-4">
                <Note text={currNote} onChange={val => setCurrNote(val)} />
            </div>

            {/* buttons */}
            <div className="flex gap-2">
                <button
                    className="hover:bg-gray-300"
                    style={{
                        border: 'black 1px solid',
                        borderRadius: '8px',
                        padding: '5px 5px',
                        width: '60px',
                    }}
                    onClick={() => addNote(currNote)}
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
                    onClick={() => clearNote()}
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
