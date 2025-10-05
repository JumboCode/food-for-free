// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Button from "../components/Button";

export default function WeatherPage() {
  const [weather, setWeather] = useState("");

  // TODO: Fetch weather data from an API
  const getWeather = async () => {
    // Hint: call the API, extract some info, and update state with setWeather(...)
  };

  return (
    <div>
      {/* TODO: Create an instance of the Button component that calls getWeather when clicked */}
      {/* TODO: Display the weather info here */}
    </div>
  );
}
