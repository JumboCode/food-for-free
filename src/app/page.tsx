'use client';
import { useState } from 'react';
import { StatCard } from '../components/StatCard';
import { Button } from '@/components/ui/button';
import { Package, Users, UserCheck } from 'lucide-react';

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
            const humidity = data.current.humidity;
            const cond = data.current?.condition?.text;

            setWeather(
                `Weather in ${data.location?.name}: It is ${cond}, and the temperature
          is ${temperature}°F. It feels like ${feelsLike}°F. The humidity is 
          ${humidity}%.`
            );
        } catch {
            setWeather(`Failed to fetch weather data`);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
            <h1 className="text-3xl font-bold">Food for Free Dashboard</h1>
            <StatCard
                title="Summary Dashboard"
                statistics={[
                    {
                        label: 'Total Pounds Distributed',
                        value: '2,847',
                        icon: <Package className="h-5 w-5" />,
                    },
                    {
                        label: 'Total Partners',
                        value: '23',
                        icon: <Users className="h-5 w-5" />,
                    },
                    {
                        label: 'Active Volunteers',
                        value: '156',
                        icon: <UserCheck className="h-5 w-5" />,
                    },
                ]}
            />
        </main>
    );
}
