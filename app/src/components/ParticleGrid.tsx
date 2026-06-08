import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  alpha: number
  pulseSpeed: number
  pulseOffset: number
}

export default function ParticleGrid({ density = 1 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    const initParticles = () => {
      const spacing = 60 / density
      const cols = Math.ceil(canvas.width / spacing) + 1
      const rows = Math.ceil(canvas.height / spacing) + 1
      particlesRef.current = []

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const jitterX = (Math.random() - 0.5) * spacing * 0.3
          const jitterY = (Math.random() - 0.5) * spacing * 0.3
          particlesRef.current.push({
            x: c * spacing + jitterX,
            y: r * spacing + jitterY,
            baseX: c * spacing + jitterX,
            baseY: r * spacing + jitterY,
            size: Math.random() * 0.8 + 0.3,
            alpha: Math.random() * 0.15 + 0.03,
            pulseSpeed: Math.random() * 0.008 + 0.003,
            pulseOffset: Math.random() * Math.PI * 2,
          })
        }
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    let startTime = performance.now()

    const draw = () => {
      const elapsed = performance.now() - startTime
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      particlesRef.current.forEach((p) => {
        // Breathing pulse
        const pulse = Math.sin(elapsed * p.pulseSpeed + p.pulseOffset) * 0.5 + 0.5
        const currentAlpha = p.alpha * (0.5 + pulse * 0.5)

        // Mouse repulsion (subtle)
        const dx = p.baseX - mx
        const dy = p.baseY - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const repelRadius = 120

        if (dist < repelRadius) {
          const force = (1 - dist / repelRadius) * 8
          p.x = p.baseX + (dx / dist) * force
          p.y = p.baseY + (dy / dist) * force
        } else {
          p.x += (p.baseX - p.x) * 0.05
          p.y += (p.baseY - p.y) * 0.05
        }

        // Draw
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (0.8 + pulse * 0.4), 0, Math.PI * 2)
        const tint = 90 + Math.sin(p.baseX * 0.01 + p.baseY * 0.01) * 25
        ctx.fillStyle = `rgba(${tint}, ${tint + 8}, ${tint + 18}, ${currentAlpha})`
        ctx.fill()

        // Draw faint connection lines to nearby particles
        if (currentAlpha > 0.08) {
          for (let j = 0; j < 3; j++) {
            const other = particlesRef.current[
              (particlesRef.current.indexOf(p) + j + 1) % particlesRef.current.length
            ]
            const ldx = p.x - other.x
            const ldy = p.y - other.y
            const lDist = Math.sqrt(ldx * ldx + ldy * ldy)
            if (lDist < 80) {
              ctx.beginPath()
              ctx.moveTo(p.x, p.y)
              ctx.lineTo(other.x, other.y)
              ctx.strokeStyle = `rgba(74, 98, 120, ${currentAlpha * 0.12 * (1 - lDist / 80)})`
              ctx.lineWidth = 0.3
              ctx.stroke()
            }
          }
        }
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
