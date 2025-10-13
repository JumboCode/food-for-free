"use client"; //Tells node.js that this is running on the client side (browser), not server

import React from "react"; //?

import styles from "./Button.module.css"; //from file above

// TODO: add what the button takes in
type ButtonProps = {
  label: string; //What the button will be labeled as
  onClick: () => void; //What the funciton onClick returns (nothing)
};

//export = function is available to other files; default = this is main export
//function Button(...) = declares JavaScript function named Button
//({label, onClick}: ButtonProps) = from the incoming props object, pull out label and onClick properties and name them
//: ButtonProps = tells compiler argument is object shaped like ButtonProps
export default function Button({ label, onClick }: ButtonProps) { 
  
  return ( //Returns an actual button
    
    //When clicked, it will the function passed as the onClick prop (what?)
    //Assign the CSS class named button to this element

    <button onClick={onClick} className={styles.button}> 
      {label}
      </button>
  );
}