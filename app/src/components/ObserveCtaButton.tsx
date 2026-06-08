import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

type ObserveCtaButtonProps = {
  onClick: () => void
  label?: string
  initTag?: string
  className?: string
}

type Spark = { id: number; x: number; y: number; vx: number; vy: number; life: number }

export default function ObserveCtaButton({
  onClick,
  label = 'Begin Observation',
  initTag = 'INIT',
  className = '',
}: ObserveCtaButtonProps) {
  const [hovered, setHovered] = useState(false)
  const [sparks, setSparks] = useState<Spark[]>([])
  const sparkId = useRef(0)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const spawnSparks = (clientX: number, clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    const batch: Spark[] = []
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 1.2 + 0.4
      batch.push({
        id: sparkId.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      })
    }
    setSparks((prev) => [...prev.slice(-24), ...batch])
  }

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!hovered) return
    if (Math.random() > 0.65) spawnSparks(e.clientX, e.clientY, e.currentTarget)
  }

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHovered(true)
  }

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => {
      setHovered(false)
      setSparks([])
    }, 120)
  }

  return (
    <motion.button
      type="button"
      className={`observe-cta group ${hovered ? 'observe-cta--active' : ''} ${className}`}
      onClick={onClick}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onPointerMove={handleMove}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
    >
      <span className="observe-cta__glow" aria-hidden />
      <span className="observe-cta__border" aria-hidden />
      <span className="observe-cta__scan" aria-hidden />
      <span className="observe-cta__corner observe-cta__corner--tl" aria-hidden />
      <span className="observe-cta__corner observe-cta__corner--tr" aria-hidden />
      <span className="observe-cta__corner observe-cta__corner--bl" aria-hidden />
      <span className="observe-cta__corner observe-cta__corner--br" aria-hidden />

      <span className="observe-cta__sparks" aria-hidden>
        {sparks.map((s) => (
          <motion.span
            key={s.id}
            className="observe-cta__spark"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 0, x: s.vx * 18, y: s.vy * 18 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setSparks((prev) => prev.filter((p) => p.id !== s.id))
            }}
          />
        ))}
      </span>

      <span className="observe-cta__label">{label}</span>
      <span className="observe-cta__init font-data">{initTag}</span>
    </motion.button>
  )
}
