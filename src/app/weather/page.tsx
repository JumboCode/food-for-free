"use client";

import { useState } from "react";
import Button from "../components/Button";

export default function WeatherPage() {
  const [weather, setWeather] = useState<string>("");

  const getWeather = async () => {
    try {
      const res = await fetch(
        "https://api.weatherapi.com/v1/current.json?key=beedcb3ad7bf4728ae4215524250510&q=London&aqi=no"
      );
      const data = await res.json();

      // Extract key details
      const info = `City: ${data.location.name}, Temp: ${data.current.temp_c}°C, Condition: ${data.current.condition.text}`;
      setWeather(info);
    } catch (err) {
      setWeather("Failed to fetch weather data.");
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Weather Checker</h1>
      <Button onClick={getWeather} label="Get London Weather" />
      {weather && (
        <p className="mt-4 text-lg text-gray-800 bg-gray-100 px-4 py-2 rounded-md">
          {weather}
        </p>
      )}
    </div>
  );
}
