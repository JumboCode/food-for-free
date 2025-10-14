// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Button from "../components/Button";
export default function WeatherPage() {
  const [weather, setWeather] = useState("");

  // TODO: Fetch weather data from an API
  const getWeather = async () => {
    // Hint: call the API, extract some info, and update state with setWeather(...)
  const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  try{
    const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=Boston`);
  const data = await response.json();
  const temp = data.current.temp_f;
  console.log(data);
  // const temperature = data.current.json;
  setWeather(temp);
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }
};

  return (
    <div>
      {
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
          <Button text={"Get Weather"} onClick={getWeather} />
        </div>
      }
      {
        <p className="flex flex-col items-center">
          Current weather: <span className="font-medium">{weather}</span>
        </p>
      }
    </div>
  );
}