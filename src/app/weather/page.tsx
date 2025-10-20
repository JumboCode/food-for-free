
// Full Stack Weather Button Starter Code 

"use client";
import { useState } from "react";
import Button from "../components/button";

export default function WeatherPage() {
  const [weather, setWeather] = useState("");

  // TODO: Fetch weather data from an API
  const getWeather = async () => {
    // Hint: call the API, extract some info, and update state with setWeather(...)
    
  const api_key = process.env.NEXT_PUBLIC_WEATHER_KEY;
  const response = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${api_key}&q=Boston`
  );
  const data = await response.json();
  const temp = data.current.temp_c;
  setWeather(`${temp}°C`);  
  };

  return (
    <div>
      {/* TODO: Create an instance of the Button component that calls getWeather when clicked */}
      {/* TODO: Display the weather info here */}

        <Button label="Show Boston Weather" onClick={getWeather} />
        {weather && <p>Temperature: {weather}</p>}
    </div>
  );
}