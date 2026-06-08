import { type ReactNode, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import ParticleAssembleText, { ParticleTitleSpacer } from './ParticleAssembleText'
import InteractiveTouchParticles from './InteractiveTouchParticles'
import PageTransition from './PageTransition'

type ParticleWizardShellProps = {
  flowLabel: string
  stepIndex: number
  totalSteps: number
  title: string
  guide?: string
  oracle?: string
  onBack: () => void
  onNext: () => void
  canNext: boolean
  nextHint?: string
  stepKey: string
  usesPersistentVideoBackground?: boolean
  children: ReactNode
}

export default function ParticleWizardShell({
  flowLabel,
  stepIndex,
  totalSteps,
  title,
  guide,
  oracle,
  onBack,
  onNext,
  canNext,
  nextHint,
  stepKey,
  usesPersistentVideoBackground = false,
  children,
}: ParticleWizardShellProps) {
  const [assembly, setAssembly] = useState({ stepKey, assembled: false })
  const assembled = assembly.stepKey === stepKey && assembly.assembled
  const progress = ((stepIndex + 1) / totalSteps) * 100

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && canNext && assembled) onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [assembled, canNext, onNext])

  return (
    <PageTransition
      className="relative min-h-screen overflow-hidden"
      style={{ background: usesPersistentVideoBackground ? 'transparent' : '#050508' }}
    >
      {!usesPersistentVideoBackground && (
        <InteractiveTouchParticles className="fixed inset-0 z-0" density={8500} color="#2f2a3a" />
      )}

      <main className="oracle-night wizard-clean relative z-10 flex min-h-screen flex-col px-4 md:px-10 pt-20 pb-28 overflow-hidden">
        <ParticleAssembleText
          key={stepKey}
          text={title}
          fill="parent"
          theme="dark"
          textAnchor={{ x: 0.5, y: 0.38 }}
          onAssembled={() => setAssembly({ stepKey, assembled: true })}
        />
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary"
            style={{ borderColor: 'rgba(216,208,228,0.18)', color: 'rgba(247,246,250,0.72)' }}
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="font-data">{stepIndex === 0 ? 'BACK' : 'PREV'}</span>
          </button>
          <div className="text-right">
            <div className="font-data text-[9px] tracking-[0.25em] uppercase" style={{ color: 'rgba(181,168,192,0.62)' }}>
              {flowLabel}
            </div>
            <div className="font-data text-[10px] tracking-wider mt-1" style={{ color: 'rgba(216,208,228,0.72)' }}>
              {stepIndex + 1} / {totalSteps}
            </div>
          </div>
        </header>

        <div className="absolute top-[4.25rem] left-6 right-6 md:left-10 md:right-10 z-30">
          <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(216,208,228,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, rgba(122,110,142,0.9), rgba(197,184,216,0.75))' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="relative z-20 flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepKey}
              className="w-full flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <ParticleTitleSpacer />

              <motion.div
                className="w-full max-w-xl mt-10 md:mt-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: assembled ? 1 : 0, y: assembled ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{ pointerEvents: assembled ? 'auto' : 'none' }}
              >
                {children}
              </motion.div>

              {(guide || oracle) && (
                <motion.div
                  className="mt-10 md:mt-12 text-center max-w-md space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: assembled ? 1 : 0 }}
                  transition={{ delay: 0.25, duration: 0.45 }}
                >
                  {guide && (
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(216,208,228,0.58)' }}>
                      {guide}
                    </p>
                  )}
                  {oracle && (
                    <p
                      className="text-xs leading-relaxed tracking-[0.04em]"
                      style={{ color: 'rgba(181,168,192,0.42)', fontStyle: 'italic' }}
                    >
                      {oracle}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          <motion.div
            className="mt-12 flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: assembled ? 1 : 0 }}
            transition={{ delay: 0.35 }}
            style={{ pointerEvents: assembled ? 'auto' : 'none' }}
          >
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className="btn-primary w-full md:w-auto min-w-[200px]"
              style={{
                opacity: canNext ? 1 : 0.35,
                cursor: canNext ? 'pointer' : 'not-allowed',
                borderColor: 'rgba(216,208,228,0.22)',
                color: 'rgba(247,246,250,0.9)',
              }}
            >
              <span>{stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {nextHint && !canNext && (
              <p className="mt-3 text-xs text-center" style={{ color: 'rgba(181,168,192,0.5)' }}>
                {nextHint}
              </p>
            )}
          </motion.div>
        </div>
      </main>
    </PageTransition>
  )
}
