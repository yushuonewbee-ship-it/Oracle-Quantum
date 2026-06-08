import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useFateStore } from '../store/fateStore'
import ParticleGrid from '../components/ParticleGrid'
import PageTransition from '../components/PageTransition'
import type { RitualType } from '../types/fate'
import ParameterExplainerPanel from '../components/ParameterExplainerPanel'
import { previewMeasurementContributions } from '../engine/quantumFateEngine'

const RITUALS: {
  id: RitualType
  label: string
  labelEn: string
  description: string
  available: boolean
  accentColor: string
}[] = [
  {
    id: 'doubleSlit',
    label: '双缝命运法',
    labelEn: 'DOUBLE-SLIT',
    description: '通过两道光束的干涉图样，观测你的选择如何在时间中叠加与抵消。适用于二选一困境。',
    available: true,
    accentColor: '#4A6278',
  },
  {
    id: 'manyWorlds',
    label: '多世界分支法',
    labelEn: 'MANY-WORLDS',
    description: '让每一个可能的决策都分裂出一条独立的世界线。适合探索多种可能性的全景图。',
    available: true,
    accentColor: '#6E7F72',
  },
  {
    id: 'schrodinger',
    label: '薛定谔命题法',
    labelEn: "SCHRÖDINGER'S",
    description: '将你的问题放入一个虚拟的盒子中，在打开之前，所有结果同时存在。适合需要直觉洞察的时刻。',
    available: true,
    accentColor: '#9A8470',
  },
  {
    id: 'entanglement',
    label: '纠缠合盘法',
    labelEn: 'ENTANGLEMENT',
    description: '探索你与他人之间的量子纠缠关系。',
    available: false,
    accentColor: '#6B6280',
  },
  {
    id: 'tunneling',
    label: '隧穿突破法',
    labelEn: 'TUNNELING',
    description: '帮助你找到突破能量壁垒的路径。',
    available: false,
    accentColor: '#2E4057',
  },
  {
    id: 'decoherence',
    label: '退相干诊断法',
    labelEn: 'DECOHERENCE',
    description: '诊断导致你决策混乱的噪声源。',
    available: false,
    accentColor: '#9B6B62',
  },
]

const SYMBOLS = [
  { id: 'moon', label: '月', meaning: '周期与变化' },
  { id: 'gate', label: '门', meaning: '机遇与边界' },
  { id: 'mirror', label: '镜', meaning: '反思与真相' },
  { id: 'fire', label: '火', meaning: '热情与毁灭' },
  { id: 'ocean', label: '海', meaning: '深度与流动' },
  { id: 'star', label: '星', meaning: '指引与远方' },
  { id: 'eye', label: '眼', meaning: '洞察与觉醒' },
  { id: 'snake', label: '蛇', meaning: '蜕变与智慧' },
  { id: 'clock', label: '钟', meaning: '时机与节奏' },
  { id: 'flower', label: '花', meaning: '绽放与短暂' },
]

export default function RitualSelectPage() {
  const { measurementInput, setMeasurementInput, setStep } = useFateStore()
  const [selectedRitual, setSelectedRitual] = useState<RitualType | null>(null)
  const [showSymbols, setShowSymbols] = useState(false)
  const parameterContributions = previewMeasurementContributions(measurementInput)

  const handleRitual = (ritual: RitualType) => {
    setSelectedRitual(ritual)
    setMeasurementInput({ ritualType: ritual })
    setShowSymbols(true)
  }

  const handleSymbol = (symbolId: string) => {
    setMeasurementInput({ symbolChoice: symbolId })
  }

  const canProceed = selectedRitual && measurementInput.symbolChoice

  const handleProceed = () => {
    if (!canProceed) return
    setMeasurementInput({
      gestureSeed: Math.random().toString(36).substring(2, 15),
      observeTimestamp: Date.now(),
    })
    setStep('observation')
  }

  return (
    <PageTransition className="relative min-h-screen" style={{ background: 'var(--bg-void)' }}>
      <ParticleGrid density={0.5} />

      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5">
        <button onClick={() => setStep('questionInput')} className="btn-secondary">
          <ArrowLeft className="w-3 h-3" />
          <span className="font-data">BACK</span>
        </button>
        <div className="font-data text-[9px] tracking-[0.25em] uppercase" style={{ color: 'var(--text-muted)' }}>
          Step 03 / Measurement
        </div>
      </header>

      <main className="relative z-10 pt-24 pb-32 px-4 md:px-10 max-w-4xl mx-auto">
        {/* Title */}
        <div className="mb-16">
          <div className="section-label mb-4">选择观测仪式</div>
          <h1 className="font-display text-3xl md:text-4xl mb-3" style={{ color: 'var(--text-primary)' }}>
            测量算符选择
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            每种仪式对应不同的观测算符，将影响概率波的坍缩方式
          </p>
        </div>

        {/* Ritual Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-16">
          {RITUALS.map((ritual, index) => {
            const isSelected = selectedRitual === ritual.id
            const isAvailable = ritual.available

            return (
              <motion.button
                key={ritual.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                onClick={() => isAvailable && handleRitual(ritual.id)}
                disabled={!isAvailable}
                className="relative panel p-6 text-left transition-all duration-400"
                style={{
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  opacity: isAvailable ? 1 : 0.35,
                  borderColor: isSelected ? `color-mix(in srgb, ${ritual.accentColor} 40%, transparent)` : undefined,
                  background: isSelected ? `color-mix(in srgb, ${ritual.accentColor} 4%, var(--bg-card))` : undefined,
                }}
              >
                {!isAvailable && (
                  <span className="absolute top-4 right-4 font-data text-[8px] tracking-wider px-2 py-0.5 rounded" style={{ background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>
                    SOON
                  </span>
                )}

                <div className="font-data text-[9px] tracking-[0.2em] mb-3" style={{ color: isSelected ? ritual.accentColor : 'var(--text-muted)' }}>
                  {ritual.labelEn}
                </div>

                <h3 className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {ritual.label}
                </h3>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {ritual.description}
                </p>

                {isSelected && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${ritual.accentColor}, transparent)` }}
                    layoutId="ritual-line"
                  />
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Symbol Selection */}
        {showSymbols && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
              <div className="section-label mb-3">选择观测符号</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                符号将作为测量基底的偏置，微妙地影响坍缩方向
              </p>
            </div>

            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-12">
              {SYMBOLS.map((symbol) => (
                <button
                  key={symbol.id}
                  onClick={() => handleSymbol(symbol.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded panel transition-all duration-300 hover:border-[rgba(0,0,0,0.18)]"
                  style={{
                    borderColor: measurementInput.symbolChoice === symbol.id
                      ? 'var(--quantum-cyan)'
                      : undefined,
                    background: measurementInput.symbolChoice === symbol.id
                      ? 'rgba(0, 0, 0, 0.04)'
                      : undefined,
                  }}
                >
                  <span className="text-base" style={{ color: 'var(--text-primary)' }}>{symbol.label}</span>
                  <span className="font-data text-[8px]" style={{ color: 'var(--text-muted)' }}>{symbol.meaning}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <ParameterExplainerPanel contributions={parameterContributions} />

        {/* Privacy Warning */}
        <div className="flex items-start gap-3 p-4 rounded mb-8" style={{ background: 'rgba(0, 0, 0, 0.03)', border: '1px solid var(--border-subtle)' }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--risk-red)' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            这是概率化自我探索工具，不是科学预测未来。所有数据仅保存在本地浏览器。
          </p>
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col items-center">
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className="btn-primary w-full md:w-auto"
            style={{ opacity: canProceed ? 1 : 0.3, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            <span>启动观测</span>
            <span className="font-data text-[9px] opacity-40">OBSERVE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </main>
    </PageTransition>
  )
}
