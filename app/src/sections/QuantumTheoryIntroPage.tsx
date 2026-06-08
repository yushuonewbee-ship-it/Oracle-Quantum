import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import ParticleAssembleText, { ParticleTitleSpacer } from '../components/ParticleAssembleText'
import MathFormula from '../components/MathFormula'
import ObserveCtaButton from '../components/ObserveCtaButton'
import { useFateStore } from '../store/fateStore'

type ModelSlide = {
  id: string
  latex: string
  title: string
  role: string
  implementation: string
}

const MODEL_SLIDES: ModelSlide[] = [
  {
    id: 'register',
    latex: String.raw`|\psi\rangle \in \mathbb{C}^{16}`,
    title: '4-Qubit Fate Register',
    role: 'The oracle models your question as a 16-dimensional complex state on four logical qubits.',
    implementation:
      'q₀ encodes the question domain, q₁ the time horizon, q₂ emotion and agency, and q₃ the birth-year nayin prior.',
  },
  {
    id: 'birth',
    latex: String.raw`|\psi_{\mathrm{birth}}\rangle = R_y(\theta_3)\,R_z(\phi_3)\,H\,|0\rangle^{\otimes 4}`,
    title: 'Birth Prior State Preparation',
    role: 'Your birth date is not a label—it sets rotation angles and phase on the prior qubit before the question enters.',
    implementation:
      'The ganzhi year pillar after Lichun and its nayin element map into θ₃, φ₃, plus a seeded hash from birth metadata.',
  },
  {
    id: 'question',
    latex: String.raw`U_{\mathrm{question}} = R_y^{(0)} R_z^{(1)} R_y^{(2)} R_x^{(2)} \cdot \mathrm{CNOT}_{0\to2}`,
    title: 'Question Encoded as Gate Sequence',
    role: 'Free text, topic, mood, and situation tags become rotation angles, decoherence increments, and entangling gates.',
    implementation:
      'Keywords such as “career change” or “anxiety” shift topic angle, γ on q₂, and optional q₀–q₂ coupling strength.',
  },
  {
    id: 'noise',
    latex: String.raw`\rho \;\mapsto\; \mathcal{D}_2(\gamma)\,\rho\,\mathcal{D}_2^\dagger(\gamma)`,
    title: 'Emotional Noise & Decoherence',
    role: 'Anxiety, fatigue, or ambiguity are modeled as amplitude damping on the mood qubit—not mere flavor text.',
    implementation:
      'Emotion type and situation tags jointly set γ; higher γ spreads Born probabilities before measurement.',
  },
  {
    id: 'ritual',
    latex: String.raw`M_{\mathrm{ritual}} = R_z^{(0)}(\phi_0)\,R_z^{(1)}(\phi_1)\,R_z^{(2)}(\phi_2)`,
    title: 'Ritual Rotates the Measurement Basis',
    role: 'The ritual and symbol do not rewrite the answer; they rotate which branches are easiest to observe.',
    implementation:
      'Double-slit, many-worlds, tunneling, and other rites apply different phase biases to the first three qubits.',
  },
  {
    id: 'born',
    latex: String.raw`P(i) = \bigl|\langle \mathrm{branch}_i \mid \psi_{\mathrm{final}}\rangle\bigr|^2`,
    title: 'Fate Branches from Born’s Rule',
    role: 'Outcomes are basis branches; their weights are projection probabilities of the final state—not a fixed destiny score.',
    implementation:
      'A seeded sample picks the collapsed branch; it may differ from the highest-probability candidate when the basis is biased.',
  },
]

export default function QuantumTheoryIntroPage() {
  const setStep = useFateStore((s) => s.setStep)
  const [slideIndex, setSlideIndex] = useState(0)
  const [textReady, setTextReady] = useState(false)

  const slide = MODEL_SLIDES[slideIndex]
  const total = MODEL_SLIDES.length
  const progress = ((slideIndex + 1) / total) * 100
  const isLast = slideIndex === total - 1

  const goPrev = () => {
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1)
      setTextReady(false)
    } else setStep('landing')
  }

  const goNext = () => {
    if (!textReady && !isLast) return
    if (isLast) {
      setStep('birthInput')
      return
    }
    setSlideIndex(slideIndex + 1)
    setTextReady(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && textReady) goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <PageTransition className="relative min-h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(122,90,168,0.16), transparent 45%), radial-gradient(circle at 88% 82%, rgba(72,90,160,0.14), transparent 55%)',
        }}
      />

      <header className="relative z-30 flex items-center justify-between px-6 md:px-12 pt-7">
        <button
          type="button"
          onClick={goPrev}
          className="btn-secondary"
          style={{ borderColor: 'rgba(216,208,228,0.18)', color: 'rgba(247,246,250,0.72)' }}
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="font-data">{slideIndex === 0 ? 'BACK' : 'PREV'}</span>
        </button>
        <div className="text-right">
          <div className="font-data text-[9px] tracking-[0.28em] uppercase" style={{ color: 'rgba(181,168,192,0.6)' }}>
            Model Specification
          </div>
          <div className="font-data text-[10px] tracking-wider mt-1" style={{ color: 'rgba(216,208,228,0.72)' }}>
            {slideIndex + 1} / {total}
          </div>
        </div>
      </header>

      <div className="absolute top-[4.25rem] left-6 right-6 md:left-12 md:right-12 z-30">
        <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(216,208,228,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, rgba(122,110,142,0.9), rgba(197,184,216,0.75))' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 md:px-10 pt-24 pb-32 overflow-hidden">
        <ParticleAssembleText
          key={`theory-role-${slide.id}`}
          text={slide.role}
          fill="parent"
          theme="dark"
          sizePreset="body"
          textAnchor={{ x: 0.5, y: 0.44 }}
          className="z-[8]"
          onAssembled={() => setTextReady(true)}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className="relative z-20 w-full max-w-3xl flex flex-col items-center text-center pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="font-data text-[10px] tracking-[0.28em] uppercase mb-5"
              style={{ color: 'rgba(181,168,192,0.62)' }}
            >
              {slide.title}
            </p>

            <div
              className="theory-formula w-full px-4 py-6 md:py-8 mb-6 md:mb-8 rounded-sm pointer-events-auto"
              style={{
                border: '1px solid rgba(216,208,228,0.12)',
                background: 'rgba(8,7,12,0.45)',
              }}
            >
              <MathFormula latex={slide.latex} className="theory-formula__math" />
            </div>

            <ParticleTitleSpacer
              className="max-w-3xl mx-auto"
              height="clamp(260px, 34vw, 340px)"
            />

            <div className="w-full min-h-[2.5rem] md:min-h-[3.5rem] shrink-0" aria-hidden />

            <motion.p
              className="max-w-xl text-base leading-relaxed px-2 pointer-events-auto mt-6 md:mt-8"
              style={{ color: 'rgba(181,168,192,0.68)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: textReady ? 1 : 0, y: textReady ? 0 : 10 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="font-data text-[9px] tracking-[0.2em] uppercase block mb-2" style={{ color: 'rgba(155,143,168,0.55)' }}>
                In this model
              </span>
              {slide.implementation}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <motion.div
          className="relative z-20 mt-12 md:mt-14 flex flex-col items-center gap-5 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {isLast ? (
            <ObserveCtaButton label="Enter Observation" onClick={goNext} />
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!textReady}
              className="observe-cta group"
              style={{
                opacity: textReady ? 1 : 0.4,
                cursor: textReady ? 'pointer' : 'not-allowed',
              }}
            >
              <span className="observe-cta__border" aria-hidden />
              <span className="observe-cta__corner observe-cta__corner--tl" aria-hidden />
              <span className="observe-cta__corner observe-cta__corner--tr" aria-hidden />
              <span className="observe-cta__corner observe-cta__corner--bl" aria-hidden />
              <span className="observe-cta__corner observe-cta__corner--br" aria-hidden />
              <span className="observe-cta__label">Next</span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10" style={{ color: 'var(--morandi-deep)' }} />
            </button>
          )}
        </motion.div>
      </main>
    </PageTransition>
  )
}
