// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Button from "../components/Button";

export default function WeatherPage() {
  const [weather, setWeather] = useState("");

  // TODO: Fetch weather data from an API

  const getWeather = async () => {
    // Hint: call the API, extract some info, and update state with setWeather(...)
    const apiKey = process.env.NEXT_PUBLIC_WEATHER_KEY;

    try{
      const response = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=London&aqi=no`
      );

      const data = await response.json();
      const temp = data.current.temp_c;

      setWeather(`Current temperature: ${temp}°C`);
    } catch (error) {
      setWeather("Failed to fetch data.");
    }
  };

  return (
    <div>
      {/* TODO: Create an instance of the Button component that calls getWeather when clicked */}
      {/* TODO: Display the weather info here */}
      <Button label="Get Weather" onClick={getWeather} />
      {weather && <p className="mt-4">{weather}</p>}
    </div>
  );
}
