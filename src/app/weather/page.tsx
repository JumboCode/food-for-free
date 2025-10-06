// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Button from "../components/Button";

export default function WeatherPage() {
  const [weather, setWeather] = useState("");

  // TODO: Fetch weather data from an API
  const getWeather = async () => {
    // Hint: call the API, extract some info, and update state with setWeather(...)
    const api_key = process.env.NEXT_PUBLIC_WEATHER_KEY;
    try {
      const res = await fetch(
        `http://api.weatherapi.com/v1/forecast.json?key=${api_key}&q=02130&days=1&aqi=no&alerts=no`
      );
      const data = await res.json();
      const temp = data.current.temp_c;
      setWeather(`Current temperature: ${temp}°C`);
    } catch (err) {
      setWeather("Failed.");
    }
  };

  return (
    <div>
      {/* TODO: Create an instance of the Button component that calls getWeather when clicked */}
      {/* TODO: Display the weather info here */}
      <div className="flex flex-col items-center gap-4 p-6">
      <Button label="Get Weather" onClick={getWeather} />
      {weather && <p>{weather}</p>}
    </div>
    </div>
  );
}
