"use client";

import React from "react";

// TODO: add what the button takes in
type ButtonProps = {
  
  onClick: () => void;
  children: React
};

export default function Button({ /* add to this */ }: ButtonProps) {
  return (
    // TODO: create the button
    <Button
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      {label}
    </button>
    
  );
}