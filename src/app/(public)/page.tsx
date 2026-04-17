'use client';

import Image from 'next/image';
import { SignInButton } from '@clerk/nextjs';
import { motion, useMotionValue, useTransform, useSpring, useMotionTemplate } from 'framer-motion';

export default function Home() {
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

    const pctX = useTransform(springX, v => `${v * 100}%`);
    const pctY = useTransform(springY, v => `${v * 100}%`);

    const gradientBg = useMotionTemplate`radial-gradient(circle at ${pctX} ${pctY}, #E7F3EB 0%, rgba(54, 175, 117, 0.5) 25%, rgba(54, 175, 117, 0.2) 40%, transparent 65%)`;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width);
        mouseY.set((e.clientY - rect.top) / rect.height);
    };

    return (
        <motion.div
            className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 lg:px-20 bg-[#E7F3EB]"
            style={{ fontFamily: 'Acumin Pro, sans-serif' }}
            onMouseMove={handleMouseMove}
        >
            {/* Circular Gradient Overlay */}
            <div
                className="absolute z-5 top-1/2 left-1/2
              w-[160vw] h-[160vw] sm:w-[130vw] sm:h-[130vw] lg:w-[110vw] lg:h-[100vw]
              -translate-x-1/2 -translate-y-1/2 lg:-translate-x-7/16 lg:-translate-y-9/16
              rounded-full
              bg-[radial-gradient(circle,_rgba(255,246,233,0.5)_17%,_rgba(143,193,169,0.3)_88%)]"
            ></div>
            <motion.div className="absolute inset-0 -z-1" style={{ background: gradientBg }} />

            <div className="z-10 inset-2 max-w-6xl w-full grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
                {/* Left Section - Text and Buttons */}
                <div className="space-y-8 lg:justify-self-center">
                    <div className="space-y-4">
                        <motion.h1
                            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-[#1C5E2C] leading-tight"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.1, ease: 'easeOut', delay: 0 }}
                        >
                            Food For Free
                            <br />
                            Partner Portal
                        </motion.h1>
                        <motion.p
                            className="text-lg md:text-xl text-[#1C5E2C]/80 max-w-lg"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
                        >
                            Access your partner organization&apos;s delivery history and key
                            statistics on food received from Food For Free.
                        </motion.p>
                    </div>

                    <motion.div
                        className="flex flex-wrap gap-4"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
                    >
                        <SignInButton forceRedirectUrl="/overview">
                            <motion.button
                                className="bg-[#1C5E2C] text-white rounded-lg font-semibold text-base md:text-lg px-8 py-3.5 shadow-md"
                                whileHover={{
                                    backgroundColor: '#154621',
                                    y: -3,
                                    boxShadow: '0 8px 24px rgba(28, 94, 44, 0.35)',
                                }}
                                whileTap={{ scale: 0.96, y: 0 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                                Sign In
                            </motion.button>
                        </SignInButton>
                    </motion.div>
                </div>

                {/* Right Section - Donut Chart/Logo */}
                <motion.div
                    className="flex justify-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                >
                    <motion.div
                        className="relative w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[500px] hidden lg:flex"
                        animate={{ y: [0, -14, 0] }}
                        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
                    >
                        <Image
                            src="https://i.imgur.com/lE2cImv.png"
                            alt="Food for Free Logo with Donut Chart"
                            width={500}
                            height={500}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
}
