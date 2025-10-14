"use client";

import React from "react";

// TODO: add what the button takes in
type ButtonProps = {
  onClick: () => void;
  label: string;
};

export default function Button({ onClick, label }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
    >
      {label}
    </button>
  );
}