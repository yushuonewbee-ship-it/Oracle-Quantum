import { useEffect, useRef } from 'react'

type Particle = {
  baseX: number
  baseY: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  seed: number
  alpha: number
}

type ParticleFormulaCardProps = {
  formula: string
  className?: string
  fontSize?: number
  fontFamily?: string
  density?: number
  delay?: number
  onSettled?: () => void
}

const DEFAULT_FONT_FAMILY =
  '"Cormorant Garamond", "EB Garamond", "Times New Roman", "Noto Serif SC", serif'

export default function ParticleFormulaCard({
  formula,
  className,
  fontSize,
  fontFamily = DEFAULT_FONT_FAMILY,
  density = 2,
  delay = 0,
  onSettled,
}: ParticleFormulaCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const settledRef = useRef(false)
  const startRef = useRef(0)
  const onSettledRef = useRef(onSettled)

  useEffect(() => {
    onSettledRef.current = onSettled
  }, [onSettled])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let disposed = false
    let cssWidth = 1
    let cssHeight = 1
    const maskCanvas = document.createElement('canvas')
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) return
    const particles: Particle[] = []

    const buildParticles = () => {
      particles.length = 0
      const rect = canvas.getBoundingClientRect()
      cssWidth = Math.max(1, Math.floor(rect.width))
      cssHeight = Math.max(1, Math.floor(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)

      const targetFontSize = fontSize ?? Math.min(cssHeight * 0.62, cssWidth * 0.18)
      maskCanvas.width = cssWidth
      maskCanvas.height = cssHeight
      maskCtx.clearRect(0, 0, cssWidth, cssHeight)
      maskCtx.fillStyle = '#ffffff'
      maskCtx.textAlign = 'center'
      maskCtx.textBaseline = 'middle'
      maskCtx.font = `400 ${targetFontSize}px ${fontFamily}`
      maskCtx.fillText(formula, cssWidth / 2, cssHeight / 2)

      const data = maskCtx.getImageData(0, 0, cssWidth, cssHeight).data
      const step = Math.max(1.8, density)

      for (let y = 0; y < cssHeight; y += step) {
        for (let x = 0; x < cssWidth; x += step) {
          const alpha = data[(y * cssWidth + x) * 4 + 3]
          if (alpha > 110) {
            const angle = Math.random() * Math.PI * 2
            const distance = Math.max(cssWidth, cssHeight) * (0.6 + Math.random() * 0.4)
            particles.push({
              baseX: x + (Math.random() - 0.5) * 0.6,
              baseY: y + (Math.random() - 0.5) * 0.6,
              x: x + Math.cos(angle) * distance,
              y: y + Math.sin(angle) * distance,
              vx: 0,
              vy: 0,
              size: Math.random() * 0.9 + 0.5,
              seed: Math.random() * Math.PI * 2,
              alpha: 0.45 + Math.random() * 0.4,
            })
          }
        }
      }
      settledRef.current = false
      startRef.current = performance.now()
    }

    const animate = () => {
      const now = performance.now()
      const elapsed = (now - startRef.current) / 1000
      const after = (now - startRef.current - delay) / 1000

      ctx.clearRect(0, 0, cssWidth, cssHeight)

      let sumDist = 0
      for (const p of particles) {
        const t = Math.max(0, after)
        const ease = 1 - Math.pow(1 - Math.min(1, t / 1.4), 3)
        const targetX = p.baseX + Math.sin(elapsed * 0.6 + p.seed) * 0.35
        const targetY = p.baseY + Math.cos(elapsed * 0.5 + p.seed * 1.3) * 0.3

        const spring = 0.035 * ease + 0.012
        p.vx += (targetX - p.x) * spring
        p.vy += (targetY - p.y) * spring
        p.vx *= 0.85
        p.vy *= 0.85
        p.x += p.vx
        p.y += p.vy

        const dist = Math.hypot(p.baseX - p.x, p.baseY - p.y)
        sumDist += dist

        const proximity = Math.max(0, 1 - dist * 0.04)
        const alpha = p.alpha * (0.55 + proximity * 0.45)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(216, 208, 228, ${alpha})`
        ctx.fill()
      }

      const avgDist = particles.length ? sumDist / particles.length : 0
      if (!settledRef.current && avgDist < 1.5 && after > 0.6) {
        settledRef.current = true
        onSettledRef.current?.()
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    const observer = new ResizeObserver(buildParticles)
    observer.observe(canvas)

    const boot = async () => {
      if (document.fonts?.ready) await document.fonts.ready
      if (disposed) return
      buildParticles()
      animate()
    }
    boot()

    return () => {
      disposed = true
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [delay, density, fontFamily, fontSize, formula])

  return <canvas ref={canvasRef} className={className} role="img" aria-label={formula} />
}
