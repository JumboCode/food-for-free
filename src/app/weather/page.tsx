"use client";

import React from 'react';
import Button from '../components/Button'

type Weather = {
    location: string;
    temperature: number;
}

export default function WeatherPage() {
    const [weather, setWeather] = React.useState<Weather | null>();
    
    const getWeather = async () => {
        // TODO: have user decide location
        try {
            const response = await fetch(
                `http://api.weatherapi.com/v1/current.json?key=${process.env.NEXT_PUBLIC_WEATHER_KEY}&q=02131&aqi=no`
            );
            const data = await response.json();
            const need: Weather = {
                location: data.location.name + ", " + data.location.region + ", " + data.location.country,
                temperature: data.current.temp_f
            }
            setWeather(need);
        } catch (error) {
            console.error("Failed to retrieve weather data: ", error);
        }
        console.log(weather)
    };

    return(
        // TODO: make so that labels only appear after user presses button
        <div>
            <Button label="check weather" onClick={getWeather}/>
            <p>Location: {weather?.location || null}</p>
            <p>Temperature: {weather?.temperature || null} °F</p>
        </div>
    )

};