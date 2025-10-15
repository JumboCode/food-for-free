"use client";

import React from "react";

// TODO: add what the button takes in
type ButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
};

export default function Button({ label, onClick}: ButtonProps) {
  return (
    <button
      type="button"
      onClick= {() => {
        void onClick();
      }}
      >
        {label}
      </button>
  );
}