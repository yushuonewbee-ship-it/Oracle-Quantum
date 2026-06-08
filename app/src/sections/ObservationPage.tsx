import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFateStore } from '../store/fateStore'
import { runQuantumFateEngine } from '../engine/quantumFateEngine'
import { generateOracleProphecy } from '../engine/deepseekOracle'
import type { ObservationPhase } from '../types/fate'
import ParticleImageOracle from '../components/ParticleImageOracle'
import QuantumObservationPanel from '../components/quantum/QuantumObservationPanel'

const PHASE_LABELS: Record<ObservationPhase, { cn: string; en: string }> = {
  idle: { cn: '准备就绪', en: 'READY' },
  superposition: { cn: '叠加态展开', en: 'SUPERPOSITION' },
  interference: { cn: '干涉波纹', en: 'INTERFERENCE' },
  decoherence: { cn: '退相干', en: 'DECOHERENCE' },
  collapse: { cn: '波函数坍缩', en: 'COLLAPSE' },
  reveal: { cn: '结果揭示', en: 'REVEAL' },
}

const PHASE_TO_QUANTUM_STEP: Partial<Record<ObservationPhase, number>> = {
  superposition: 0,
  interference: 1,
  decoherence: 2,
  collapse: 3,
  reveal: 4,
}

export default function ObservationPage() {
  const { birthInput, contextInput, measurementInput, setFateResult, setStep, setMeasurementInput } = useFateStore()
  const [phase, setPhase] = useState<ObservationPhase>('idle')
  const [oracleImageSrc, setOracleImageSrc] = useState('/images/obsidian-totem.jpg')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isProcessingRef = useRef(false)
  const previewQuantum = useMemo(
    () =>
      runQuantumFateEngine({
        birth: birthInput,
        context: contextInput,
        measurement: measurementInput,
        now: new Date(),
      }).quantumTrace,
    [birthInput, contextInput, measurementInput],
  )
  const activeQuantumStep = PHASE_TO_QUANTUM_STEP[phase] ?? previewQuantum.steps.length - 1

  useEffect(() => {
    const video = videoRef.current
    if (video && cameraStream) {
      video.srcObject = cameraStream
      void video.play()
    }
  }, [cameraStream])

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop())
    }
  }, [cameraStream])

  const handleImageUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setOracleImageSrc(reader.result)
        setCameraError('')
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 900 },
          height: { ideal: 900 },
        },
        audio: false,
      })
      setCameraStream(stream)
    } catch {
      setCameraError('无法打开摄像头，请检查浏览器权限。')
    }
  }, [])

  const stopCamera = useCallback(() => {
    cameraStream?.getTracks().forEach((track) => track.stop())
    setCameraStream(null)
  }, [cameraStream])

  const captureCamera = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setOracleImageSrc(canvas.toDataURL('image/png'))
    setCameraError('')
    stopCamera()
  }, [stopCamera])

  const runSequence = useCallback(async () => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    const { setOracleStatus, setOracleProphecy } = useFateStore.getState()
    setOracleProphecy(null)
    setOracleStatus('idle')

    const phases: ObservationPhase[] = ['superposition', 'interference', 'decoherence', 'collapse']
    const delays = [1500, 1100, 950, 1700]

    const finalMeasurement = {
      ...measurementInput,
      gestureSeed: Math.random().toString(36).substring(2, 15),
      observeTimestamp: Date.now(),
    }
    setMeasurementInput(finalMeasurement)

    const result = runQuantumFateEngine({
      birth: birthInput,
      context: contextInput,
      measurement: finalMeasurement,
      now: new Date(),
    })
    setFateResult(result)

    setOracleStatus('loading')
    const prophecyPromise = generateOracleProphecy({
      birth: birthInput,
      context: contextInput,
      measurement: finalMeasurement,
      result,
    })
      .then((p) => {
        useFateStore.getState().setOracleProphecy(p.raw)
        useFateStore.getState().setOracleStatus('success')
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : '神谕未能成形'
        useFateStore.getState().setOracleProphecy(null)
        useFateStore.getState().setOracleStatus('error', message)
      })

    for (let i = 0; i < phases.length; i++) {
      setPhase(phases[i])
      await new Promise((r) => setTimeout(r, delays[i]))
    }
    setPhase('reveal')

    await Promise.race([
      prophecyPromise,
      new Promise((r) => setTimeout(r, 6000)),
    ])

    const { addHistory } = useFateStore.getState()
    addHistory({
      id: `obs-${Date.now()}`,
      date: new Date().toISOString(),
      question: contextInput.question,
      questionType: contextInput.questionType,
      mainBranchLabel: result.mainBranch.label,
      mainBranchProbability: result.mainBranch.probability,
      oraclePoem: result.oraclePoem,
      result,
    })

    await new Promise((r) => setTimeout(r, 600))
    setStep('result')
  }, [birthInput, contextInput, measurementInput, setFateResult, setStep, setMeasurementInput])

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: '#1F1F22' }}>
      <ParticleImageOracle
        imageSrc={oracleImageSrc}
        phase={phase}
        className="fixed inset-0 z-[1] h-full w-full"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div className="relative z-10 grid min-h-screen grid-cols-1 items-center gap-8 px-4 py-24 lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="flex flex-col items-center justify-center">
        {/* Phase display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="mb-12 text-center"
          >
            <div className="font-data text-[9px] tracking-[0.3em] uppercase mb-3" style={{ color: 'rgba(216,208,228,0.62)' }}>
              {phase === 'idle' ? 'QUANTUM OBSERVATION PROTOCOL' : 'PROCESSING'}
            </div>
            <h2 className="text-xl md:text-2xl font-light tracking-tight mb-1" style={{ color: 'rgba(247,246,250,0.9)' }}>
              {PHASE_LABELS[phase].cn}
            </h2>
            <div className="font-data text-[10px] tracking-[0.2em]" style={{ color: 'rgba(181,168,192,0.72)' }}>
              {PHASE_LABELS[phase].en}
            </div>

            {phase !== 'idle' && phase !== 'reveal' && (
              <motion.div
                className="mt-6 w-24 h-[1px] mx-auto"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(216,208,228,0.85), transparent)' }}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {phase === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center gap-4"
          >
            {cameraStream && (
              <div
                className="overflow-hidden rounded-full"
                style={{
                  width: 132,
                  height: 132,
                  border: '1px solid rgba(216,208,228,0.28)',
                  boxShadow: '0 0 36px rgba(216,208,228,0.12)',
                }}
              >
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-data rounded-full px-4 py-2 text-[9px] tracking-[0.18em] uppercase transition hover:opacity-80"
                style={{
                  border: '1px solid rgba(216,208,228,0.24)',
                  color: 'rgba(247,246,250,0.72)',
                  background: 'rgba(0,0,0,0.18)',
                }}
              >
                Upload Image
              </button>
              {!cameraStream ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="font-data rounded-full px-4 py-2 text-[9px] tracking-[0.18em] uppercase transition hover:opacity-80"
                  style={{
                    border: '1px solid rgba(216,208,228,0.24)',
                    color: 'rgba(247,246,250,0.72)',
                    background: 'rgba(0,0,0,0.18)',
                  }}
                >
                  Camera
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={captureCamera}
                    className="font-data rounded-full px-4 py-2 text-[9px] tracking-[0.18em] uppercase transition hover:opacity-80"
                    style={{
                      border: '1px solid rgba(216,208,228,0.32)',
                      color: 'rgba(247,246,250,0.88)',
                      background: 'rgba(181,168,192,0.16)',
                    }}
                  >
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="font-data rounded-full px-4 py-2 text-[9px] tracking-[0.18em] uppercase transition hover:opacity-80"
                    style={{
                      border: '1px solid rgba(216,208,228,0.18)',
                      color: 'rgba(247,246,250,0.56)',
                      background: 'rgba(0,0,0,0.12)',
                    }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>

            <p className="max-w-sm text-center text-xs" style={{ color: 'rgba(216,208,228,0.5)' }}>
              图片只在本地浏览器内粒子化；移动鼠标会像气流一样扰动轮廓。
            </p>
            {cameraError && (
              <p className="text-xs" style={{ color: 'rgba(184,146,138,0.85)' }}>
                {cameraError}
              </p>
            )}
          </motion.div>
        )}

        {/* Center element */}
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.button
              key="observe"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.5 }}
              onClick={() => phase === 'idle' && runSequence()}
              className="relative group cursor-pointer"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid rgba(216,208,228,0.28)' }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <div
                className="relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                style={{
                  background: 'rgba(0, 0, 0, 0.18)',
                  border: '1px solid rgba(216,208,228,0.3)',
                  boxShadow: '0 0 40px rgba(216,208,228,0.12)',
                }}
              >
                <span
                  className="font-oracle-script text-2xl md:text-3xl"
                  style={{ color: 'rgba(247,246,250,0.9)' }}
                >
                  观测
                </span>
              </div>
            </motion.button>
          )}

          {phase !== 'idle' && phase !== 'reveal' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'rgba(216,208,228,0.86)' }}
                  animate={{ opacity: [0.15, 0.8, 0.15], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formula */}
        <motion.div
          className="absolute bottom-10 left-0 right-0 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="font-data text-[9px] tracking-wider" style={{ color: 'rgba(216,208,228,0.36)' }}>
            |ψ_now⟩ = M · U_context · U_time · |ψ_birth⟩
          </span>
        </motion.div>
        </div>

        <motion.aside
          className="w-full max-h-[min(85vh,720px)] overflow-y-auto"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
        >
          <QuantumObservationPanel
            trace={previewQuantum}
            compact
            activeStepIndex={Math.min(activeQuantumStep, previewQuantum.steps.length - 1)}
          />
        </motion.aside>
      </div>

      {/* Collapse flash */}
      <AnimatePresence>
        {phase === 'collapse' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 50, background: 'rgba(0, 0, 0, 0.06)', mixBlendMode: 'multiply' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
