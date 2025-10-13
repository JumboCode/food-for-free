'use client';
import { useState } from 'react';
import Button from '../components/Button';

export default function WeatherPage() {
    const [weather, setWeather] = useState('');

    const getWeather = async () => {
        try {
            const key = process.env.NEXT_PUBLIC_WEATHER_KEY;
            const city = 'Boston';

            const res = await fetch(
                `https://api.weatherapi.com/v1/current.json?key=${key}&q=${city}`
            );
            const data = await res.json();

            const temperature = data.current.temp_c;
            const feelsLike = data.current.feelslike_c;
            const rainChance = data.forecast?.forecastday?.[0]?.day?.daily_chance_of_rain;
            const cond = data.current?.condition?.text;

            setWeather(
                `Weather in ${data.location?.name}: It is ${cond}, and the temperature
          is ${temperature}°C. It feels like ${feelsLike}°C. There is a 
          ${rainChance}% chance of rain.`
            );
        } catch (any) {
            setWeather(`Failed to fetch`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
            <h1 className="text-2xl font-semibold">Weather!! </h1>

            <input
                className="border rounded-lg px-3 py-2 w-64"
                placeholder="Boston"
                value="Boston"
            />

            <Button onClick={getWeather}>Get Weather</Button>

            {weather && <p className="text-lg text-center max-w-xl">{weather}</p>}
        </div>
    );
}
