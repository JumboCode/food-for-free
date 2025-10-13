"use client";

import React from "react";

// TODO: add what the button takes in
type ButtonProps = {
    onClick?: () => void;
    label: string;
  
};

export default function Button({ onClick, label }: ButtonProps) {
  return (
    // TODO: create the button
    <button
      type="button"
      onClick={onClick}
      className="bg-blue-600 text-white rounded px-4 py-2"
    >
      {label}
    </button>
  );
}