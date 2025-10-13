// Full Stack Weather Button Starter Code 

"use client";

import { useState } from "react";
import Button from "../components/Button"; //imports our previously created button component
import styles from "./WeatherPage.module.css";

export default function WeatherPage() { //Declares a function
  
  //Creates a state variable called weather, initialized as ""
  //setWeather is function used to update the state
  const [weather, setWeather] = useState("");

  // TODO: Fetch weather data from an API
  const getWeather = async () => {
    const city = "Copenhagen";
    const apiKey = "ac09a0d107b94e299cf131155250510";

    const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`;
    
    //Makes request and waits till return
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }

    //Reads response body, stores in JavaScript object, and stores that in data
    const data = await response.json();

    //Grabs temp and conditions from data
    const temp = data.current.temp_f;
    const condition = data.current.condition.text;

    //Updates weather state variable
    setWeather(`In ${city}, it's ${condition} with a temperature of ${temp}°F.`);

    // Hint: call the API, extract some info, and update state with setWeather(...)
  };

  return (
    <div className={styles.container}>
      <Button label="Copenhagen Weather" onClick={getWeather} />
      <p>{weather}</p>
    </div>
  );
}