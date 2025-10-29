"use client";
import React from 'react'

type LottieProps = {
  src: string
  autoplay?: boolean
  loop?: boolean
  mode?: string
  style?: React.CSSProperties
}

export default function LottiePlayer(props: LottieProps) {
  return React.createElement('lottie-player', props as any)
}

