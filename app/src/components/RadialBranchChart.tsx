import { useEffect, useRef } from 'react'
import type { FateBranch } from '../types/fate'

export default function RadialBranchChart({
  branches,
  mainBranchId,
  size = 320,
}: {
  branches: FateBranch[]
  mainBranchId: string
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    let frame = 0
    let startTime = performance.now()

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      ctx.clearRect(0, 0, size, size)

      const cx = size / 2
      const cy = size / 2
      const radius = size * 0.32

      // Draw faint concentric circles
      for (let r = 0.25; r <= 1; r += 0.25) {
        ctx.beginPath()
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.04 + r * 0.03})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Draw radial lines
      const angleStep = (Math.PI * 2) / 12
      for (let i = 0; i < 12; i++) {
        const angle = i * angleStep - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'
        ctx.lineWidth = 0.3
        ctx.stroke()
      }

      // Draw center node
      const centerPulse = Math.sin(elapsed * 1.5) * 0.3 + 0.7
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(46, 64, 87, ${centerPulse})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, 12, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(0, 0, 0, ${centerPulse * 0.15})`
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Draw branches
      const sortedBranches = [...branches].sort((a, b) => b.probability - a.probability)
      const totalAngle = Math.PI * 1.6
      const startAngle = -Math.PI / 2 - totalAngle / 2

      sortedBranches.forEach((branch, i) => {
        const angle = startAngle + (i / Math.max(sortedBranches.length - 1, 1)) * totalAngle
        const branchRadius = radius * (0.4 + branch.probability * 0.6)
        const isMain = branch.id === mainBranchId

        const nx = cx + Math.cos(angle) * branchRadius
        const ny = cy + Math.sin(angle) * branchRadius

        // Connection line with gradient
        const grad = ctx.createLinearGradient(cx, cy, nx, ny)
        grad.addColorStop(0, `rgba(107, 98, 128, ${0.15 + branch.amplitude * 0.28})`)
        grad.addColorStop(1, isMain
          ? `rgba(46, 64, 87, ${0.35 + branch.amplitude * 0.45})`
          : `rgba(138, 143, 154, ${0.12 + branch.amplitude * 0.2})`
        )

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(nx, ny)
        ctx.strokeStyle = grad
        ctx.lineWidth = isMain ? 1.5 : 0.8
        ctx.stroke()

        // Node
        const nodeSize = isMain ? 8 : 5 + branch.probability * 6
        const nodePulse = isMain ? Math.sin(elapsed * 2 + i) * 0.2 + 0.8 : 1

        ctx.beginPath()
        ctx.arc(nx, ny, nodeSize, 0, Math.PI * 2)
        ctx.fillStyle = isMain
          ? `rgba(74, 98, 120, ${nodePulse * 0.85})`
          : `rgba(138, 143, 154, 0.35)`
        ctx.fill()

        // Glow for main
        if (isMain) {
          ctx.beginPath()
          ctx.arc(nx, ny, nodeSize * 3, 0, Math.PI * 2)
          const glowGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodeSize * 3)
          glowGrad.addColorStop(0, `rgba(0, 0, 0, 0.1)`)
          glowGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = glowGrad
          ctx.fill()
        }

        // Label
        const labelRadius = branchRadius + 24
        const lx = cx + Math.cos(angle) * labelRadius
        const ly = cy + Math.sin(angle) * labelRadius

        ctx.font = `${isMain ? 500 : 400} 10px "JetBrains Mono", monospace`
        ctx.fillStyle = isMain ? '#2E4057' : 'rgba(90, 90, 98, 0.85)'
        ctx.textAlign = angle > 0 && angle < Math.PI ? 'left' : 'right'
        ctx.textBaseline = 'middle'

        const labelText = isMain ? `${branch.label} ★` : branch.label
        ctx.fillText(labelText, lx, ly - 6)

        ctx.font = '9px "JetBrains Mono", monospace'
        ctx.fillStyle = isMain ? 'rgba(58, 58, 64, 0.85)' : 'rgba(138, 143, 154, 0.55)'
        ctx.fillText(`${(branch.probability * 100).toFixed(1)}%`, lx, ly + 8)
      })

      frame = requestAnimationFrame(animate)
    }

    animate()

    return () => cancelAnimationFrame(frame)
  }, [branches, mainBranchId, size])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        display: 'block',
      }}
    />
  )
}
