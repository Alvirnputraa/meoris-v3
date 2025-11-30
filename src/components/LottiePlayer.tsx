"use client";
import React, { useEffect, useState } from 'react'

type LottieProps = {
  src: string
  autoplay?: boolean
  loop?: boolean
  mode?: string
  style?: React.CSSProperties
}

export default function LottiePlayer(props: LottieProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div style={props.style} />
  }

  return React.createElement('lottie-player', props as any)
}

