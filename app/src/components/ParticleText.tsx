import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  size: number
}

type ParticleTextProps = {
  text: string
  className?: string
  color?: string
  fontFamily?: string
  fontWeight?: number
  /**
   * compact：小画布 HUD / 说明条 —— 更密采样、更小粒子、按宽度估更大字号
   */
  variant?: 'default' | 'compact'
  /** 粒子网格步长（px），越小越密；不设则随 variant / 画布自动 */
  sampleGap?: number
  /** 粒子点半径范围 */
  particleSizeMin?: number
  particleSizeMax?: number
}

function measureTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
) {
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.88
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.12
  return {
    width: metrics.width,
    height: ascent + descent,
    ascent,
    descent,
  }
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontWeight: number,
  fontFamily: string,
  opts: { compact: boolean; minFontPx: number },
) {
  const { compact, minFontPx } = opts
  const len = Math.max(text.length, 4)
  // 不再用 maxHeight 当初始字号（小画布会把字压到看不见）
  const widthLed = (maxWidth * 0.94) / (len * (compact ? 0.56 : 0.52))
  const heightLed = maxHeight * (compact ? 1.42 : 1.12)
  let fontSize = Math.max(minFontPx, Math.min(widthLed, heightLed))
  let block = measureTextBlock(ctx, text, fontSize, fontWeight, fontFamily)

  const step = compact ? 1 : 2
  while (block.width > maxWidth * 0.98 && fontSize > minFontPx) {
    fontSize -= step
    block = measureTextBlock(ctx, text, fontSize, fontWeight, fontFamily)
  }
  while (block.height > maxHeight * 0.98 && fontSize > minFontPx) {
    fontSize -= step
    block = measureTextBlock(ctx, text, fontSize, fontWeight, fontFamily)
  }

  return { fontSize, block }
}

export default function ParticleText({
  text,
  className,
  color = '#8B7E9B',
  fontFamily = '"Noto Sans SC", "Inter", sans-serif',
  fontWeight = 700,
  variant = 'default',
  sampleGap: sampleGapProp,
  particleSizeMin: particleSizeMinProp,
  particleSizeMax: particleSizeMaxProp,
}: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: Particle[] = []
    const compact = variant === 'compact'
    const mouse = {
      x: 0,
      y: 0,
      active: false,
      radius: compact ? 72 : 95,
    }

    let cssWidth = 0
    let cssHeight = 0
    let dpr = 1
    let disposed = false

    const maskCanvas = document.createElement('canvas')
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) return

    const createParticles = () => {
      particles.length = 0

      const tight = compact || cssHeight < 52 || cssWidth < 280
      const padX = tight ? 6 : 28
      const padY = tight ? 5 : 22
      const maxW = cssWidth - padX * 2
      const maxH = cssHeight - padY * 2

      maskCanvas.width = cssWidth
      maskCanvas.height = cssHeight
      maskCtx.clearRect(0, 0, cssWidth, cssHeight)

      const minFontPx = compact ? 9 : 12
      const { fontSize, block } = fitFontSize(maskCtx, text, maxW, maxH, fontWeight, fontFamily, {
        compact,
        minFontPx,
      })
      const centerX = cssWidth / 2
      const baselineY = cssHeight / 2 + (block.ascent - block.descent) / 2

      maskCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
      maskCtx.textAlign = 'center'
      maskCtx.textBaseline = 'alphabetic'
      maskCtx.fillStyle = '#ffffff'
      maskCtx.fillText(text, centerX, baselineY)

      const imageData = maskCtx.getImageData(0, 0, cssWidth, cssHeight).data
      const gap =
        sampleGapProp ?? (tight ? 2 : cssWidth < 520 ? 4 : 3)
      const alphaCut = gap <= 2 ? 100 : 120
      const pMin = particleSizeMinProp ?? (compact ? 0.38 : 1.0)
      const pMax = particleSizeMaxProp ?? (compact ? 0.82 : 2.2)

      for (let y = 0; y < cssHeight; y += gap) {
        for (let x = 0; x < cssWidth; x += gap) {
          const alpha = imageData[(y * cssWidth + x) * 4 + 3]
          if (alpha > alphaCut) {
            particles.push({
              x,
              y,
              baseX: x,
              baseY: y,
              vx: 0,
              vy: 0,
              size: Math.random() * (pMax - pMin) + pMin,
            })
          }
        }
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      cssWidth = Math.max(1, Math.floor(rect.width))
      cssHeight = Math.max(1, Math.floor(rect.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)

      createParticles()
    }

    const handleLeave = () => {
      mouse.active = false
    }

    const handlePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
      mouse.active = true
    }

    const animate = () => {
      ctx.clearRect(0, 0, cssWidth, cssHeight)
      ctx.fillStyle = color
      ctx.shadowColor = '#C9BED8'
      ctx.shadowBlur = compact ? 3 : 6

      for (const p of particles) {
        if (mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < mouse.radius && dist > 0.001) {
            const force = (mouse.radius - dist) / mouse.radius
            const angle = Math.atan2(dy, dx)
            p.vx += Math.cos(angle) * force * 2.2
            p.vy += Math.sin(angle) * force * 2.2
          }
        }

        p.vx += (p.baseX - p.x) * 0.026
        p.vy += (p.baseY - p.y) * 0.026
        p.vx *= 0.84
        p.vy *= 0.84
        p.x += p.vx
        p.y += p.vy

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const boot = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }
      if (disposed) return
      resize()
      animate()
    }

    boot()

    canvas.addEventListener('pointermove', handlePointer)
    canvas.addEventListener('pointerenter', handlePointer)
    canvas.addEventListener('pointerleave', handleLeave)

    return () => {
      disposed = true
      observer.disconnect()
      canvas.removeEventListener('pointermove', handlePointer)
      canvas.removeEventListener('pointerenter', handlePointer)
      canvas.removeEventListener('pointerleave', handleLeave)
      cancelAnimationFrame(frameRef.current)
    }
  }, [
    color,
    fontFamily,
    fontWeight,
    text,
    variant,
    sampleGapProp,
    particleSizeMinProp,
    particleSizeMaxProp,
  ])

  return <canvas ref={canvasRef} className={className} />
}
