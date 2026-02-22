'use client';

import Image from 'next/image';
import { SignInButton, SignUpButton } from '@clerk/nextjs';

export default function Home() {
    return (
        <div
            className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 lg:px-20 bg-[#E7F3EB]"
            style={{ fontFamily: 'Acumin Pro, sans-serif' }}
        >
            {/* Circular Gradient Overlay */}
            <div
                className="absolute inset-0 -z-10"
                style={{
                    background:
                        'radial-gradient(circle at bottom left, #36AF75 0%, rgba(54, 175, 117, 0.5) 25%, rgba(54, 175, 117, 0.2) 40%, transparent 65%)',
                }}
            />

            <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Section - Text and Buttons */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#1C5E2C] leading-tight">
                            Food for Free
                            <br />
                            Partner Portal
                        </h1>
                        <p className="text-lg md:text-xl text-[#1C5E2C]/80 max-w-md">
                            Manage donations, users, and distributions in one place.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <SignInButton>
                            <button className="bg-[#1C5E2C] text-white rounded-lg font-semibold text-base md:text-lg px-8 py-3.5 hover:bg-[#154621] transition-colors shadow-md">
                                Sign In
                            </button>
                        </SignInButton>
                        <SignUpButton>
                            <button className="bg-transparent border-2 border-[#1C5E2C] text-[#1C5E2C] rounded-lg font-semibold text-base md:text-lg px-8 py-3.5 hover:bg-[#1C5E2C] hover:text-white transition-colors">
                                Create Partner Account
                            </button>
                        </SignUpButton>
                    </div>
                </div>

                {/* Right Section - Donut Chart/Logo */}
                <div className="flex justify-center lg:justify-end">
                    <div className="relative w-[400px] h-[400px] md:w-[500px] md:h-[500px]">
                        <Image
                            src="https://i.imgur.com/lE2cImv.png"
                            alt="Food for Free Logo with Donut Chart"
                            width={500}
                            height={500}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
