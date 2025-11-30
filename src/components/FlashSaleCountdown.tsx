"use client";

import { useEffect, useState } from 'react';

interface CountdownProps {
  endTime: string;
}

export default function FlashSaleCountdown({ endTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setIsExpired(true);
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (isExpired) {
    return (
      <div className="text-center">
        <p className="font-cormorant text-2xl md:text-3xl lg:text-4xl text-white font-bold">
          FLASH SALE BERAKHIR
        </p>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center gap-2 md:gap-3 bg-black/80 backdrop-blur-md rounded-xl px-4 py-1 md:px-6 md:py-1.5 shadow-2xl border border-white/10">
      {/* Hours */}
      <span className="font-cormorant text-xl md:text-3xl font-bold text-white leading-none">
        {String(timeLeft.hours).padStart(2, '0')}
      </span>

      {/* Separator */}
      <span className="font-cormorant text-xl md:text-3xl font-bold text-white/50 leading-none">:</span>

      {/* Minutes */}
      <span className="font-cormorant text-xl md:text-3xl font-bold text-white leading-none">
        {String(timeLeft.minutes).padStart(2, '0')}
      </span>

      {/* Separator */}
      <span className="font-cormorant text-xl md:text-3xl font-bold text-white/50 leading-none">:</span>

      {/* Seconds */}
      <span className="font-cormorant text-xl md:text-3xl font-bold text-white leading-none">
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
