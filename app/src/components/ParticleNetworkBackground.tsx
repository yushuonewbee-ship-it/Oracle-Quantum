import { useEffect, useRef } from 'react'

type SpeedOption = 'slow' | 'medium' | 'fast' | 'none'
type DensityOption = 'low' | 'high' | number
type MaskPreset = 'none' | 'landing'

type ExclusionZone =
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'rect'; x: number; y: number; w: number; h: number }

type ParticleNetworkBackgroundProps = {
  particleColor?: string
  lineDistance?: number
  lineOpacity?: number
  lineWidth?: number
  particleSize?: number
  particleOpacity?: number
  speed?: SpeedOption
  density?: DensityOption
  interactive?: boolean
  maskPreset?: MaskPreset
  className?: string
}

type ParticleContext = {
  canvas: HTMLCanvasElement
  particleColor: string
  speed: number
}

function buildLandingExclusions(width: number, height: number): ExclusionZone[] {
  return [
    // 中央：粒子球 + 标题 + 按钮
    { type: 'ellipse', cx: width * 0.5, cy: height * 0.46, rx: width * 0.44, ry: height * 0.46 },
    // 四角 HUD
    { type: 'rect', x: 0, y: 0, w: width * 0.36, h: height * 0.17 },
    { type: 'rect', x: width * 0.64, y: 0, w: width * 0.36, h: height * 0.17 },
    { type: 'rect', x: 0, y: height * 0.84, w: width * 0.38, h: height * 0.16 },
    { type: 'rect', x: width * 0.62, y: height * 0.84, w: width * 0.38, h: height * 0.16 },
    // 底部提示语
    { type: 'rect', x: width * 0.12, y: height * 0.9, w: width * 0.76, h: height * 0.1 },
  ]
}

function isPointExcluded(x: number, y: number, zones: ExclusionZone[]) {
  for (const zone of zones) {
    if (zone.type === 'ellipse') {
      const dx = (x - zone.cx) / zone.rx
      const dy = (y - zone.cy) / zone.ry
      if (dx * dx + dy * dy <= 1) return true
    } else if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
      return true
    }
  }
  return false
}

function pushOutOfExclusions(x: number, y: number, zones: ExclusionZone[]) {
  let px = x
  let py = y

  for (const zone of zones) {
    if (zone.type === 'ellipse') {
      const dx = px - zone.cx
      const dy = py - zone.cy
      const norm = Math.sqrt((dx * dx) / (zone.rx * zone.rx) + (dy * dy) / (zone.ry * zone.ry))
      if (norm < 1) {
        const scale = 1.06 / Math.max(norm, 0.001)
        px = zone.cx + dx * scale
        py = zone.cy + dy * scale
      }
    } else if (px >= zone.x && px <= zone.x + zone.w && py >= zone.y && py <= zone.y + zone.h) {
      const toLeft = px - zone.x
      const toRight = zone.x + zone.w - px
      const toTop = py - zone.y
      const toBottom = zone.y + zone.h - py
      const minDist = Math.min(toLeft, toRight, toTop, toBottom)
      if (minDist === toLeft) px = zone.x - 4
      else if (minDist === toRight) px = zone.x + zone.w + 4
      else if (minDist === toTop) py = zone.y - 4
      else py = zone.y + zone.h + 4
    }
  }

  return { x: px, y: py }
}

function randomAllowedPosition(canvas: HTMLCanvasElement, zones: ExclusionZone[]) {
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    if (!isPointExcluded(x, y, zones)) return { x, y }
  }
  return {
    x: Math.random() < 0.5 ? canvas.width * 0.08 : canvas.width * 0.92,
    y: Math.random() * canvas.height,
  }
}

class NetworkParticle {
  x: number
  y: number
  velocity: { x: number; y: number }

  constructor(cfg: ParticleContext, startX: number, startY: number) {
    this.x = startX
    this.y = startY
    this.velocity = {
      x: (Math.random() - 0.5) * cfg.speed,
      y: (Math.random() - 0.5) * cfg.speed,
    }
  }

  update(canvas: HTMLCanvasElement, zones: ExclusionZone[]) {
    if (this.x > canvas.width + 20 || this.x < -20) this.velocity.x = -this.velocity.x
    if (this.y > canvas.height + 20 || this.y < -20) this.velocity.y = -this.velocity.y
    this.x += this.velocity.x
    this.y += this.velocity.y

    if (zones.length > 0 && isPointExcluded(this.x, this.y, zones)) {
      const pushed = pushOutOfExclusions(this.x, this.y, zones)
      this.x = pushed.x
      this.y = pushed.y
      this.velocity.x *= -1
      this.velocity.y *= -1
    }
  }

  draw(g: CanvasRenderingContext2D, size: number, opacity: number, particleColor: string) {
    g.beginPath()
    g.fillStyle = particleColor
    g.globalAlpha = opacity
    g.arc(this.x, this.y, size, 0, Math.PI * 2)
    g.fill()
  }
}

function resolveVelocity(speed: SpeedOption) {
  if (speed === 'fast') return 1
  if (speed === 'slow') return 0.33
  if (speed === 'none') return 0
  return 0.66
}

function resolveDensity(density: DensityOption) {
  if (density === 'high') return 5000
  if (density === 'low') return 20000
  if (typeof density === 'number') return density
  return 10000
}

function shouldSkipConnection(
  a: { x: number; y: number },
  b: { x: number; y: number },
  zones: ExclusionZone[],
) {
  if (zones.length === 0) return false
  if (isPointExcluded(a.x, a.y, zones) || isPointExcluded(b.x, b.y, zones)) return true
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return isPointExcluded(mx, my, zones)
}

export default function ParticleNetworkBackground({
  particleColor = '#8B7E9B',
  lineDistance = 150,
  lineOpacity = 0.72,
  lineWidth = 1.1,
  particleSize = 2.2,
  particleOpacity = 0.82,
  speed = 'medium',
  density = 'high',
  interactive = true,
  maskPreset = 'none',
  className,
}: ParticleNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const particlesRef = useRef<NetworkParticle[]>([])
  const zonesRef = useRef<ExclusionZone[]>([])
  const cursorRef = useRef<{ x: number; y: number } | null>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const g = canvas.getContext('2d')
    if (!g) return

    const moveSpeed = resolveVelocity(speed)
    const densityValue = resolveDensity(density)

    const spawnParticles = () => {
      const zones =
        maskPreset === 'landing' ? buildLandingExclusions(canvas.width, canvas.height) : []
      zonesRef.current = zones

      const ctx: ParticleContext = { canvas, particleColor, speed: moveSpeed }
      const areaFactor = zones.length > 0 ? 0.78 : 1
      const count = Math.max(20, Math.floor((canvas.width * canvas.height) / densityValue / areaFactor))

      particlesRef.current = Array.from({ length: count }, () => {
        const pos = zones.length > 0 ? randomAllowedPosition(canvas, zones) : {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
        }
        return new NetworkParticle(ctx, pos.x, pos.y)
      })
    }

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      spawnParticles()
    }

    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(resize, 300)
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      cursorRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    const draw = () => {
      g.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const zones = zonesRef.current
      const rawCursor = interactive ? cursorRef.current : null
      const cursor =
        rawCursor && !isPointExcluded(rawCursor.x, rawCursor.y, zones) ? rawCursor : null

      for (const particle of particles) {
        if (moveSpeed > 0) particle.update(canvas, zones)
        if (!isPointExcluded(particle.x, particle.y, zones)) {
          particle.draw(g, particleSize, particleOpacity, particleColor)
        }
      }

      const nodes = particles
        .filter((p) => !isPointExcluded(p.x, p.y, zones))
        .map((p) => ({ x: p.x, y: p.y }))
      if (cursor) nodes.push(cursor)

      for (let i = 0; i < nodes.length; i++) {
        for (let j = nodes.length - 1; j > i; j--) {
          if (shouldSkipConnection(nodes[i], nodes[j], zones)) continue

          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.hypot(dx, dy)
          if (dist > lineDistance) continue

          g.beginPath()
          g.strokeStyle = particleColor
          g.globalAlpha = ((lineDistance - dist) / lineDistance) * lineOpacity
          g.lineWidth = lineWidth
          g.moveTo(nodes[i].x, nodes[i].y)
          g.lineTo(nodes[j].x, nodes[j].y)
          g.stroke()
        }
      }

      if (cursor) {
        g.beginPath()
        g.fillStyle = particleColor
        g.globalAlpha = 0.55
        g.arc(cursor.x, cursor.y, 3.5, 0, Math.PI * 2)
        g.fill()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    resize()
    draw()

    window.addEventListener('resize', handleResize)
    if (interactive) window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (interactive) window.removeEventListener('mousemove', handleMouseMove)
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      cancelAnimationFrame(frameRef.current)
    }
  }, [
    density,
    interactive,
    lineDistance,
    lineOpacity,
    lineWidth,
    maskPreset,
    particleColor,
    particleOpacity,
    particleSize,
    speed,
  ])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
