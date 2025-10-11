// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Button from "../components/Button";

export default function WeatherPage() {
  const [weather, setWeather] = useState("");

  // Fetch weather data from WeatherAPI.com
  const fetchWeatherData = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_WEATHER_KEY; // your WeatherAPI key
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=40.71,-74.01&aqi=no`
      );

      const data = await response.json();

      // WeatherAPI returns fields like data.current.temp_c and data.current.wind_kph
      if (data.current && data.location) {
        setWeather(
          `City: ${data.location.name} | Temperature: ${data.current.temp_c}°C | Windspeed: ${data.current.wind_kph} kph`
        );
      } else if (data.error) {
        // WeatherAPI sometimes returns 200 with an error object
        setWeather(`Error: ${data.error.message}`);
      } else {
        setWeather("Weather data not available.");
      }
    } catch (error) {
      setWeather("Failed to fetch weather data.");
    }
  };

  const getWeather = async () => {
    await fetchWeatherData();
  };

  return (
    <div>
      <Button text="Get Weather" onClick={getWeather} />
      {weather && <div>{weather}</div>}
    </div>
  );
}
