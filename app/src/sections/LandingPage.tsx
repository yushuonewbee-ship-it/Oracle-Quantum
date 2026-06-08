import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useFateStore } from '../store/fateStore'
import QuantumParticleOrb from '../components/QuantumParticleOrb'
import ParticleAssembleText, { ParticleTitleSpacer } from '../components/ParticleAssembleText'
import ParticleNetworkBackground from '../components/ParticleNetworkBackground'
import ObserveCtaButton from '../components/ObserveCtaButton'

function HUDData({ label, value, position }: { label: string; value: string; position: string }) {
  const posStyles: Record<string, string> = {
    tl: 'top-8 left-8',
    tr: 'top-8 right-8',
    bl: 'bottom-8 left-8',
    br: 'bottom-8 right-8 text-right',
  }
  const alignStyle = position.includes('r') ? 'items-end' : 'items-start'

  return (
    <motion.div
      className={`fixed ${posStyles[position]} z-20 hidden md:flex flex-col ${alignStyle} gap-1`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 1.5 }}
    >
      <span className="font-data text-[9px] tracking-[0.25em] uppercase" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="font-data text-[11px] tracking-wider" style={{ color: 'var(--quantum-cyan)' }}>
        {value}
      </span>
    </motion.div>
  )
}

export default function LandingPage() {
  const setStep = useFateStore((s) => s.setStep)
  const setBirthWizardStep = useFateStore((s) => s.setBirthWizardStep)
  const setQuestionWizardStep = useFateStore((s) => s.setQuestionWizardStep)
  const [timeStr, setTimeStr] = useState('')
  const [noiseVal, setNoiseVal] = useState('0.0012')
  const [observerId] = useState(() => `OBS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toISOString().replace('T', ' ').slice(0, 19))
      setNoiseVal((Math.random() * 0.008 + 0.001).toFixed(4))
    }
    update()
    const timer = setInterval(update, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'var(--bg-void)' }}>
      <ParticleAssembleText
        text="Quantum Oracle"
        theme="light"
        fill="parent"
        textAnchor={{ x: 0.5, y: 0.72 }}
        className="z-[12]"
      />

      <ParticleNetworkBackground
        particleColor="#8B7E9B"
        speed="medium"
        density={18000}
        lineDistance={130}
        lineOpacity={0.65}
        lineWidth={1}
        particleSize={2}
        particleOpacity={0.75}
        maskPreset="landing"
        interactive
      />

      {/* HUD Corner Data */}
      <HUDData label="Quantum Noise (σ)" value={noiseVal} position="tl" />
      <HUDData label="Observer ID" value={observerId} position="tr" />
      <HUDData label="System Status" value="STABLE" position="bl" />
      <HUDData label="Timestamp (UTC)" value={timeStr} position="br" />

      {/* Center: particle orb + title */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(242,240,245,0.35) 88%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center gap-4 md:gap-7 w-full h-full px-6 pt-16 pb-24">
          <div className="relative z-[20] flex items-center justify-center">
            <QuantumParticleOrb className="relative w-[min(86vw,640px)] h-[min(86vw,640px)] max-h-[58vh]" />
            <span
              className="absolute -bottom-5 md:-bottom-6 font-data text-[9px] tracking-[0.2em] uppercase pointer-events-none"
              style={{ color: 'var(--text-dim)' }}
            >
              Drag orb to rotate
            </span>
          </div>

          <motion.div
            className="text-center pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          >
            <motion.div
              className="font-data text-[10px] tracking-[0.3em] uppercase mb-5 md:mb-6"
              style={{ color: 'var(--text-muted)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Quantum Oracle Protocol v1.0
            </motion.div>

            <motion.div
              className="mb-2 md:mb-3 w-full"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3 }}
            >
              <ParticleTitleSpacer className="max-w-[min(94vw,720px)] mx-auto" />
            </motion.div>

            <motion.p
              className="font-data text-[11px] md:text-xs tracking-[0.25em] uppercase mb-9 md:mb-11 text-morandi-lilac"
              style={{ color: 'var(--morandi-lavender)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              Multi-Dimensional Fate Observation
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <ObserveCtaButton
                onClick={() => {
                  setBirthWizardStep(0)
                  setQuestionWizardStep(0)
                  setStep('theory')
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.p
        className="absolute bottom-10 left-0 right-0 z-20 text-center font-data text-[9px] tracking-[0.2em] uppercase pointer-events-none"
        style={{ color: 'var(--text-dim)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.3, 0.6] }}
        transition={{ duration: 3, delay: 2, repeat: Infinity }}
      >
        Probability collapses when you observe
      </motion.p>
    </div>
  )
}
