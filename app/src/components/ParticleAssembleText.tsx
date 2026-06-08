import { useEffect, useRef } from 'react'

type FillMode = 'box' | 'parent' | 'viewport'

type ParticleAssembleTextProps = {
  text: string
  className?: string
  onAssembled?: () => void
  theme?: 'light' | 'dark'
  /** 仅 fill="box" 时生效 */
  height?: string
  /** parent = 铺满定位父级；viewport = 铺满窗口；box = 组件自身盒子 */
  fill?: FillMode
  /** 文字中心在画布中的归一化位置 (0–1) */
  textAnchor?: { x: number; y: number }
  /** 是否响应鼠标风蚀（全屏层关闭时可避免挡住下层 3D 交互） */
  interactive?: boolean
  /** title = 大标题；body = 科普说明（更大、可自动换行） */
  sizePreset?: 'title' | 'body'
}

const SIZE_PRESETS = {
  title: { fontMin: 28, fontMax: 140, fontWeight: 700, heightRatio: 0.72, charFactor: 0.55, gridStep: 1.4, wrap: false, lineHeight: 1.15 },
  body: { fontMin: 34, fontMax: 54, fontWeight: 500, heightRatio: 0.92, charFactor: 0.38, gridStep: 1.32, wrap: true, lineHeight: 1.3 },
} as const

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  label: string,
  maxWidth: number,
): string[] {
  const words = label.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [label]

  const lines: string[] = []
  let line = words[0]
  for (let i = 1; i < words.length; i++) {
    const next = `${line} ${words[i]}`
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
    } else {
      lines.push(line)
      line = words[i]
    }
  }
  lines.push(line)
  return lines
}

function sampleParticleColor(isEdge: boolean, theme: 'light' | 'dark'): string {
  if (theme === 'light') {
    const base = isEdge ? 118 : 100
    const r = base + Math.floor(Math.random() * 22)
    const g = base - 14 + Math.floor(Math.random() * 18)
    const b = base + 10 + Math.floor(Math.random() * 20)
    const a = isEdge ? (Math.random() * 0.35 + 0.5).toFixed(2) : (Math.random() * 0.3 + 0.42).toFixed(2)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  const gray = isEdge ? Math.floor(Math.random() * 30) + 225 : Math.floor(Math.random() * 40) + 195
  const a = isEdge ? (Math.random() * 0.4 + 0.55).toFixed(2) : (Math.random() * 0.35 + 0.45).toFixed(2)
  return `rgba(${gray}, ${gray}, ${gray}, ${a})`
}

type Particle = {
  originX: number
  originY: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  isEdge: boolean
  springFactor: number
}

const CONFIG = {
  gridStep: 1.4,
  mouseRadius: 90,
  springStrength: 0.04,
  recoverySpeed: 0.0012,
  friction: 0.95,
  wanderStrength: 0.04,
  edgeWanderMultiplier: 2.8,
  evaporationRate: 0.00004,
  edgeEvapMultiplier: 5.0,
  ambientWindX: 0.018,
  ambientWindY: -0.028,
  windForceFactor: 0.16,
  swirlFactor: 0.05,
}

export default function ParticleAssembleText({
  text,
  className = '',
  onAssembled,
  theme = 'dark',
  height = 'clamp(130px, 22vw, 190px)',
  fill = 'box',
  textAnchor = { x: 0.5, y: 0.5 },
  interactive = true,
  sizePreset = 'title',
}: ParticleAssembleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const introRef = useRef(0)
  const assembledRef = useRef(false)
  const mouseRef = useRef({ x: -1000, y: -1000, vx: 0, vy: 0, lastX: 0, lastY: 0, active: false })
  const frameRef = useRef(0)
  const onAssembledRef = useRef(onAssembled)
  onAssembledRef.current = onAssembled

  const isFullBleed = fill === 'parent' || fill === 'viewport'

  useEffect(() => {
    assembledRef.current = false
    introRef.current = 0
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let disposed = false
    let cssW = 0
    let cssH = 0

    const preset = SIZE_PRESETS[sizePreset]

    const fitFontSize = (bandW: number, bandH: number, label: string) => {
      const probe = document.createElement('canvas').getContext('2d')
      if (!probe) return preset.fontMax
      const maxLineW = bandW * 0.9

      for (let size = preset.fontMax; size >= preset.fontMin; size -= 1) {
        probe.font = `${preset.fontWeight} ${size}px "Inter", "Helvetica Neue", Arial, sans-serif`
        const lines = preset.wrap ? wrapTextLines(probe, label, maxLineW) : [label]
        const lineHeight = size * preset.lineHeight
        const blockH = lines.length * lineHeight
        const widest = Math.max(...lines.map((ln) => probe.measureText(ln).width), 0)
        if (widest <= maxLineW && blockH <= bandH * preset.heightRatio) {
          return size
        }
      }
      return preset.fontMin
    }

    const measureCanvas = () => {
      if (fill === 'viewport') {
        return { w: window.innerWidth, h: window.innerHeight }
      }
      if (fill === 'parent') {
        const parent = wrapper.parentElement
        if (parent) {
          return {
            w: Math.max(1, parent.clientWidth),
            h: Math.max(1, parent.clientHeight),
          }
        }
      }
      const rect = wrapper.getBoundingClientRect()
      return {
        w: Math.max(280, Math.floor(rect.width)),
        h: Math.max(120, Math.floor(rect.height)),
      }
    }

    const initParticles = () => {
      introRef.current = 0
      particlesRef.current = []

      const temp = document.createElement('canvas')
      const tctx = temp.getContext('2d')
      if (!tctx) return

      const bandW = isFullBleed ? Math.min(cssW * 0.94, 920) : cssW
      const bandH = isFullBleed
        ? Math.min(cssH * (preset.wrap ? 0.26 : 0.32), preset.wrap ? 280 : 220)
        : cssH
      const pad = 28
      temp.width = Math.ceil(bandW + pad * 2)
      temp.height = Math.ceil(bandH + pad * 2)

      const fontSize = fitFontSize(bandW, bandH, text)
      const gridStep = preset.gridStep
      const textCx = cssW * textAnchor.x
      const textCy = cssH * textAnchor.y
      const offsetX = textCx - temp.width / 2
      const offsetY = textCy - temp.height / 2

      tctx.fillStyle = '#ffffff'
      tctx.font = `${preset.fontWeight} ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`
      tctx.textAlign = 'center'
      tctx.textBaseline = 'middle'

      const maxLineW = bandW * 0.9
      const lines = preset.wrap ? wrapTextLines(tctx, text, maxLineW) : [text]
      const lineHeight = fontSize * preset.lineHeight
      const blockH = lines.length * lineHeight
      let lineY = temp.height / 2 - blockH / 2 + lineHeight / 2
      for (const line of lines) {
        tctx.fillText(line, temp.width / 2, lineY)
        lineY += lineHeight
      }

      const img = tctx.getImageData(0, 0, temp.width, temp.height).data
      const tw = temp.width
      const th = temp.height
      const checkDist = 3
      const particles: Particle[] = []

      for (let y = 0; y < th; y += gridStep) {
        for (let x = 0; x < tw; x += gridStep) {
          const px = Math.floor(x)
          const py = Math.floor(y)
          const alpha = img[(py * tw + px) * 4 + 3]
          if (alpha <= 128) continue

          let isEdge = false
          if (
            px - checkDist < 0 ||
            px + checkDist >= tw ||
            py - checkDist < 0 ||
            py + checkDist >= th
          ) {
            isEdge = true
          } else {
            const idxU = ((py - checkDist) * tw + px) * 4 + 3
            const idxD = ((py + checkDist) * tw + px) * 4 + 3
            const idxL = (py * tw + (px - checkDist)) * 4 + 3
            const idxR = (py * tw + (px + checkDist)) * 4 + 3
            if (img[idxU] < 128 || img[idxD] < 128 || img[idxL] < 128 || img[idxR] < 128) {
              isEdge = true
            }
          }

          const angle = Math.random() * Math.PI * 2
          const speed = Math.random() * 8 + 4

          particles.push({
            originX: offsetX + x,
            originY: offsetY + y,
            x: Math.random() * cssW,
            y: Math.random() * cssH,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: isEdge
              ? Math.random() * (sizePreset === 'body' ? 0.75 : 0.6) + (sizePreset === 'body' ? 0.65 : 0.5)
              : Math.random() * (sizePreset === 'body' ? 0.65 : 0.5) + (sizePreset === 'body' ? 0.45 : 0.3),
            color: sampleParticleColor(isEdge, theme),
            isEdge,
            springFactor: 1,
          })
        }
      }

      particlesRef.current = particles
    }

    const resize = () => {
      const { w, h } = measureCanvas()
      cssW = w
      cssH = h
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initParticles()
    }

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const m = mouseRef.current
      const x = clientX - rect.left
      const y = clientY - rect.top
      if (!m.active) {
        m.active = true
        m.lastX = x
        m.lastY = y
      }
      m.x = x
      m.y = y
      m.vx = m.x - m.lastX
      m.vy = m.y - m.lastY
      m.lastX = m.x
      m.lastY = m.y
    }

    const onMove = (e: PointerEvent) => updateMouse(e.clientX, e.clientY)
    const onLeave = () => {
      const m = mouseRef.current
      m.active = false
      m.x = -1000
      m.y = -1000
      m.vx = 0
      m.vy = 0
    }

    const tick = () => {
      if (disposed) return
      const particles = particlesRef.current
      const m = mouseRef.current
      let intro = introRef.current
      if (intro < 1) {
        intro += 0.007
        if (intro > 1) intro = 1
        introRef.current = intro
        if (intro >= 1 && !assembledRef.current) {
          assembledRef.current = true
          onAssembledRef.current?.()
        }
      }

      ctx.clearRect(0, 0, cssW, cssH)

      for (const p of particles) {
        let localWander = CONFIG.wanderStrength
        if (p.isEdge) localWander *= CONFIG.edgeWanderMultiplier
        p.vx += (Math.random() - 0.5) * localWander * intro
        p.vy += (Math.random() - 0.5) * localWander * intro

        if (p.springFactor < 0.6) {
          p.vx += CONFIG.ambientWindX * (1 - p.springFactor)
          p.vy += CONFIG.ambientWindY * (1 - p.springFactor)
        }

        if (intro > 0.85) {
          let localEvap = CONFIG.evaporationRate
          if (p.isEdge) localEvap *= CONFIG.edgeEvapMultiplier
          if (Math.random() < localEvap) {
            p.springFactor = 0
            p.vy -= Math.random() * 0.3
            p.vx += (Math.random() - 0.5) * 0.1
          }
        }

        const dx = p.originX - p.x
        const dy = p.originY - p.y
        const introSpring = 0.05 + 0.95 * intro
        const spring =
          CONFIG.springStrength * (p.isEdge ? 0.75 : 1) * p.springFactor * introSpring
        p.vx += dx * spring
        p.vy += dy * spring

        if (intro > 0.85 && m.active) {
          const mdx = p.x - m.x
          const mdy = p.y - m.y
          const dist = Math.hypot(mdx, mdy)
          if (dist < CONFIG.mouseRadius) {
            const forceFactor = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius
            const mouseSpeed = Math.hypot(m.vx, m.vy)
            if (mouseSpeed > 0.15) {
              const release = forceFactor * mouseSpeed * 0.012
              p.springFactor = Math.max(0.01, p.springFactor - release)
              p.vx += m.vx * forceFactor * CONFIG.windForceFactor
              p.vy += m.vy * forceFactor * CONFIG.windForceFactor
              const moveAngle = Math.atan2(m.vy, m.vx)
              const particleAngle = Math.atan2(mdy, mdx)
              let angleDiff = particleAngle - moveAngle
              angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
              if (Math.abs(angleDiff) < Math.PI / 2) {
                const splitSign = angleDiff >= 0 ? 1 : -1
                const splitAngle = moveAngle + (Math.PI / 2) * splitSign
                const splitForce = mouseSpeed * forceFactor * CONFIG.swirlFactor
                p.vx += Math.cos(splitAngle) * splitForce
                p.vy += Math.sin(splitAngle) * splitForce
              }
              const turb = mouseSpeed * forceFactor * 0.05
              p.vx += (Math.random() - 0.5) * turb
              p.vy += (Math.random() - 0.5) * turb
            }
          }
        }

        if (p.springFactor < 1) {
          p.springFactor = Math.min(1, p.springFactor + CONFIG.recoverySpeed)
        }

        const friction = 0.98 - (0.98 - CONFIG.friction) * intro
        p.vx *= friction
        p.vy *= friction
        p.x += p.vx
        p.y += p.vy

        ctx.fillStyle = p.color
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }

      m.vx *= 0.85
      m.vy *= 0.85
      frameRef.current = requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(resize)
    if (fill === 'parent' && wrapper.parentElement) {
      observer.observe(wrapper.parentElement)
    } else if (fill === 'box') {
      observer.observe(wrapper)
    }
    window.addEventListener('resize', resize)

    const useWindowPointer = isFullBleed && interactive
    if (useWindowPointer) {
      window.addEventListener('pointermove', onMove)
      document.addEventListener('pointerleave', onLeave)
    } else if (interactive) {
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerleave', onLeave)
    }

    const boot = async () => {
      if (document.fonts?.ready) await document.fonts.ready
      if (disposed) return
      resize()
      frameRef.current = requestAnimationFrame(tick)
    }
    boot()

    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('resize', resize)
      if (useWindowPointer) {
        window.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerleave', onLeave)
      } else if (interactive) {
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerleave', onLeave)
      }
      cancelAnimationFrame(frameRef.current)
    }
  }, [text, theme, fill, textAnchor.x, textAnchor.y, isFullBleed, interactive, sizePreset])

  const wrapperClass = isFullBleed
    ? `absolute inset-0 z-[8] max-w-none mx-0 w-full h-full overflow-visible pointer-events-none ${className}`
    : `w-full max-w-3xl mx-auto ${className}`

  return (
    <div
      ref={wrapperRef}
      className={wrapperClass}
      style={fill === 'box' ? { height } : undefined}
      aria-hidden={isFullBleed}
    >
      <canvas
        ref={canvasRef}
        className={`block w-full h-full ${isFullBleed || !interactive ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{ background: 'transparent' }}
        role="img"
        aria-label={text}
      />
    </div>
  )
}

/** 与 fill="parent" 搭配，在文档流中保留标题占位 */
export function ParticleTitleSpacer({
  className = '',
  height = 'clamp(130px, 22vw, 190px)',
}: {
  className?: string
  height?: string
}) {
  return (
    <div
      className={`w-full shrink-0 pointer-events-none ${className}`}
      style={{ height }}
      aria-hidden
    />
  )
}
