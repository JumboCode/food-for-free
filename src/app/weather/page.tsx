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

            const temperature = data.current.temp_f;
            const feelsLike = data.current.feelslike_f;
            const precip = data.current.precip_mm;
            const humidity = data.current.humidity;
            const cond = data.current?.condition?.text;

            setWeather(
                `Weather in ${data.location?.name}: It is ${cond}, and the temperature
          is ${temperature}°F. It feels like ${feelsLike}°F. The humidity is 
          ${humidity}. There will be ${humidity} mm of rain!! `
            );
        } catch (any) {
            setWeather(`Failed to fetch`);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
            <h1 className="text-2xl font-semibold">Click here to see the weather in Boston!</h1>

            <Button onClick={getWeather}>Show me the weather!</Button>

            {weather && <p className="text-lg mt-2">{weather}</p>}
        </main>
    );
}
