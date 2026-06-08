import { useEffect, useRef } from 'react'
import type { ObservationPhase } from '../types/fate'

type Particle = {
  x: number
  y: number
  tx: number
  ty: number
  vx: number
  vy: number
  size: number
  alpha: number
  shade: number
  seed: number
}

type ParticleImageOracleProps = {
  imageSrc: string
  phase: ObservationPhase
  className?: string
  maxParticles?: number
  variant?: 'dark' | 'light'
  sampleWidth?: number
  sampleHeight?: number
  verticalOffset?: number
  particleOpacity?: number
}

const PHASE_SPREAD: Record<ObservationPhase, number> = {
  idle: 4,
  superposition: 90,
  interference: 36,
  decoherence: 150,
  collapse: 18,
  reveal: 220,
}

function getLuma(r: number, g: number, b: number) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

function fitImage(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / width, maxHeight / height)
  return {
    width: width * scale,
    height: height * scale,
  }
}

export default function ParticleImageOracle({
  imageSrc,
  phase,
  className,
  maxParticles = 18000,
  variant = 'dark',
  sampleWidth,
  sampleHeight,
  verticalOffset = 24,
  particleOpacity = 1,
}: ParticleImageOracleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const phaseRef = useRef(phase)
  const pointerRef = useRef({
    x: -9999,
    y: -9999,
    px: -9999,
    py: -9999,
    vx: 0,
    vy: 0,
    active: false,
  })

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let disposed = false
    let cssWidth = 1
    let cssHeight = 1
    let startTime = performance.now()
    const image = new Image()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      cssWidth = Math.max(1, rect.width)
      cssHeight = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const buildParticles = () => {
      if (!image.naturalWidth || !image.naturalHeight) return

      const targetSampleWidth = sampleWidth ?? (cssWidth < 768 ? 190 : 270)
      const targetSampleHeight = sampleHeight ?? (cssWidth < 768 ? 190 : 220)
      const fitted = fitImage(image.naturalWidth, image.naturalHeight, targetSampleWidth, targetSampleHeight)
      const offscreen = document.createElement('canvas')
      offscreen.width = Math.max(1, Math.floor(fitted.width))
      offscreen.height = Math.max(1, Math.floor(fitted.height))
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true })
      if (!offCtx) return

      offCtx.clearRect(0, 0, offscreen.width, offscreen.height)
      offCtx.drawImage(image, 0, 0, offscreen.width, offscreen.height)

      const data = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data
      const candidates: Array<{ x: number; y: number; luma: number }> = []
      const threshold = 34
      const step = cssWidth < 768 ? 2 : 1

      for (let y = 0; y < offscreen.height; y += step) {
        for (let x = 0; x < offscreen.width; x += step) {
          const index = (y * offscreen.width + x) * 4
          const alpha = data[index + 3] ?? 0
          if (alpha < 24) continue

          const luma = getLuma(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0)
          if (luma <= threshold) continue
          candidates.push({ x, y, luma })
        }
      }

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = candidates[i]
        candidates[i] = candidates[j]
        candidates[j] = tmp
      }

      const limit = Math.min(maxParticles, candidates.length)
      const offsetX = cssWidth / 2 - offscreen.width / 2
      const offsetY = cssHeight / 2 - offscreen.height / 2 + verticalOffset
      const spread = Math.max(cssWidth, cssHeight) * 0.35

      particlesRef.current = candidates.slice(0, limit).map((point) => {
        const targetX = offsetX + point.x
        const targetY = offsetY + point.y
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * spread

        return {
          x: cssWidth / 2 + Math.cos(angle) * radius,
          y: cssHeight / 2 + Math.sin(angle) * radius,
          tx: targetX,
          ty: targetY,
          vx: (Math.random() - 0.5) * 1.6,
          vy: (Math.random() - 0.5) * 1.6,
          size: Math.random() * 1.25 + 0.55,
          alpha: Math.min(0.92, 0.28 + point.luma / 255),
          shade: 150 + (point.luma / 255) * 95,
          seed: Math.random() * Math.PI * 2,
        }
      })
    }

    const draw = () => {
      if (disposed) return

      const elapsed = (performance.now() - startTime) / 1000
      const currentPhase = phaseRef.current
      const pointer = pointerRef.current
      const spread = PHASE_SPREAD[currentPhase]
      const spring = currentPhase === 'decoherence' ? 0.018 : currentPhase === 'superposition' ? 0.025 : 0.045
      const damping = currentPhase === 'decoherence' ? 0.91 : 0.875

      ctx.clearRect(0, 0, cssWidth, cssHeight)

      const bg = ctx.createRadialGradient(cssWidth / 2, cssHeight / 2, 0, cssWidth / 2, cssHeight / 2, cssWidth * 0.65)
      if (variant === 'light') {
        bg.addColorStop(0, 'rgba(247, 246, 250, 0.72)')
        bg.addColorStop(0.72, 'rgba(242, 240, 245, 0.48)')
        bg.addColorStop(1, 'rgba(242, 240, 245, 0.12)')
      } else {
        bg.addColorStop(0, 'rgba(34, 34, 38, 0.78)')
        bg.addColorStop(0.72, 'rgba(22, 22, 25, 0.9)')
        bg.addColorStop(1, 'rgba(18, 18, 20, 0.2)')
      }
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, cssWidth, cssHeight)

      for (const particle of particlesRef.current) {
        const waveX = Math.sin(elapsed * 0.7 + particle.seed + particle.ty * 0.018) * spread
        const waveY = Math.cos(elapsed * 0.55 + particle.seed + particle.tx * 0.015) * spread * 0.55
        const lift = Math.sin(elapsed * 1.2 + particle.seed) * 4
        let targetX = particle.tx + waveX
        let targetY = particle.ty + waveY + lift

        if (currentPhase === 'collapse') {
          targetX = cssWidth / 2 + (particle.tx - cssWidth / 2) * 0.55 + waveX * 0.25
          targetY = cssHeight / 2 + (particle.ty - cssHeight / 2) * 0.55 + waveY * 0.25
        }

        if (currentPhase === 'reveal') {
          targetX = particle.tx + waveX * 1.2
          targetY = particle.ty + waveY * 1.2
        }

        const wind = Math.sin(elapsed * 0.9 + particle.y * 0.018) * Math.cos(elapsed * 0.4 + particle.x * 0.01)
        particle.vx += (targetX - particle.x) * spring + wind * 0.018
        particle.vy += (targetY - particle.y) * spring - 0.008 + Math.cos(elapsed + particle.seed) * 0.012

        if (pointer.active) {
          const dx = particle.x - pointer.x
          const dy = particle.y - pointer.y
          const distanceSq = dx * dx + dy * dy
          const radius = cssWidth < 768 ? 120 : 170

          if (distanceSq < radius * radius) {
            const distance = Math.sqrt(distanceSq) || 1
            const pressure = (1 - distance / radius) ** 2
            const nx = dx / distance
            const ny = dy / distance
            const swirl = Math.sin(elapsed * 3 + particle.seed) * pressure

            particle.vx += nx * pressure * 5.2 - ny * swirl * 2.4 + pointer.vx * pressure * 0.075
            particle.vy += ny * pressure * 5.2 + nx * swirl * 2.4 + pointer.vy * pressure * 0.075
          }
        }

        particle.vx *= damping
        particle.vy *= damping
        particle.x += particle.vx
        particle.y += particle.vy

        const pulse = 0.72 + Math.sin(elapsed * 1.6 + particle.seed) * 0.22
        const alpha = particle.alpha * pulse * particleOpacity
        const shade = Math.floor(particle.shade)
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = variant === 'light'
          ? `rgba(${Math.max(70, shade - 92)}, ${Math.max(64, shade - 100)}, ${Math.max(88, shade - 72)}, ${alpha * 0.82})`
          : `rgba(${shade}, ${shade}, ${Math.min(255, shade + 10)}, ${alpha})`
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const pointer = pointerRef.current
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      pointer.vx = x - pointer.px
      pointer.vy = y - pointer.py
      pointer.px = x
      pointer.py = y
      pointer.x = x
      pointer.y = y
      pointer.active = true
    }

    const handlePointerLeave = () => {
      pointerRef.current.active = false
    }

    image.onload = () => {
      if (disposed) return
      resize()
      buildParticles()
      startTime = performance.now()
      cancelAnimationFrame(frameRef.current)
      draw()
    }
    image.src = imageSrc

    const observer = new ResizeObserver(() => {
      resize()
      buildParticles()
    })
    observer.observe(canvas)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      cancelAnimationFrame(frameRef.current)
    }
  }, [imageSrc, maxParticles, particleOpacity, sampleHeight, sampleWidth, variant, verticalOffset])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
    />
  )
}
