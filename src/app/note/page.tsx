// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Note from "../components/notes";

export default function NotePage() {
    const [notes, setNotes] = useState<string[]>([]);
    const [currNote, setCurrNote] = useState<string>("");

    const addNote = (note: string) => {
        setNotes([...notes, currNote]);
        setCurrNote("");
        console.log("note saved");
    };
    const clearNote = () =>{
                console.log("cleared: ", currNote)

        setCurrNote("");
        setNotes([]);
    }

  return (
    <div>

    <h1 style={{ fontFamily: "Arial, sans-serif", fontSize: "24px", }}>Notes:</h1>
      
        <div className="flex flex-col">
        <Note text={currNote} onChange={(val) => setCurrNote(val)} />

        </div>
      
       <button
        className="Save" style={{
        border: "black 1px solid",
        borderRadius: "8px",
        padding: "5px 5px",
       }}
       onClick={() => addNote(currNote)}>Save</button>

       <button className="Clear" style={{
        border: "black 1px solid",
        borderRadius: "8px",
        padding: "5px 5px",
       }}
       onClick={() =>clearNote()}>Clear</button>
    </div>
  );
}