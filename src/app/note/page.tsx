
"use client";
import { useState } from "react";
import Note from "../components/notes";

// Note Component Function 
export default function NotePage() {
    const [notes, setNotes] = useState<string[]>([]);
    const [currNote, setCurrNote] = useState<string>("");
// Add a note function 
    const addNote = (note: string) => {
        // append string to current note 
        setNotes([...notes, currNote]);
        console.log("note saved:", currNote);
    
    };
    // clear the current note and the saved notes
    const clearNote = () =>{
        console.log("cleared: ", currNote)

        setCurrNote("");
        setNotes([]);
    }

  return (
    <div style = {{margin: "20px"}}>
         {/* header */}
    <h1 style={{ fontFamily: "Arial, sans-serif", fontSize: "24px"}}>Notes:</h1>
         {/* note component */}
        <div className="flex flex-col">
        <Note text={currNote} onChange={(val) => setCurrNote(val)} />

        </div>
        {/* save button */}
       <button
        className="Save" style={{
        border: "black 1px solid",
        borderRadius: "8px",
        padding: "5px 5px",
        width: "60px",
       }}
       onClick={() => addNote(currNote)}>Save</button>
        {/* clear button */}
       <button className="Clear" style={{
        border: "black 1px solid",
        borderRadius: "8px",
        padding: "5px 5px",
        width: "60px",

       }}
       onClick={() =>clearNote()}>Clear</button>
    </div>
  );
}