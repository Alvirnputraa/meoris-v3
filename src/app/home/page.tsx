"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Show splash briefly, then redirect to main homepage
    const t = setTimeout(() => router.replace('/'), 800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-belleza">
      <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
      <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
    </div>
  );
}
