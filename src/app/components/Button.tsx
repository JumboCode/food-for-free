"use client";

import React from "react";

// TODO: add what the button takes in
type ButtonProps = {
  text: string;
  onClick: () => void;
  
};

export default function Button({ text, onClick }: ButtonProps) {
  return (

    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      {text}
    </button>
    // TODO: create the button
  );
}