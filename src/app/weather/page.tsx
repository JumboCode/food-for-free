// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Button from "../components/Button";

export default function WeatherPage() {
  const [weather, setWeather] = useState("");

  // TODO: Fetch weather data from an API
  const getWeather = async () => {
    // Hint: call the API, extract some info, and update state with setWeather(...)
    const weatherAPI = process.env.NEXT_PUBLIC_WEATHER_KEY;
    try {
      const response = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=${weatherAPI}&q=London&aqi=no`
      );

      const result = await response.json();
      const temp = result.current.temp_c;
      console.log(temp);
      setWeather(`Current temperature: ${temp} ºC`);
    } catch(error) {
      setWeather("Failed to retrieve data");
    }
  };

  return (
    <div>
      {/* TODO: Create an instance of the Button component that calls getWeather when clicked */}
      {/* TODO: Display the weather info here */}
      <Button label="Get Weather" onClick={getWeather} />
      {weather && <p>{weather}</p>}
    </div>
  );
}
