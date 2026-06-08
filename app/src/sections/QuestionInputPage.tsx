import { useFateStore } from '../store/fateStore'
import ParticleWizardShell from '../components/ParticleWizardShell'
import type { QuestionType, EmotionType, TimeHorizon } from '../types/fate'

const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
  { id: 'career', label: 'Career' },
  { id: 'relationship', label: 'Love' },
  { id: 'study', label: 'Study' },
  { id: 'wealth', label: 'Wealth' },
  { id: 'social', label: 'Social' },
  { id: 'creative', label: 'Create' },
  { id: 'daily', label: 'Today' },
  { id: 'majorChoice', label: 'Choice' },
]

const EMOTIONS: { id: EmotionType; label: string }[] = [
  { id: 'calm', label: 'Calm' },
  { id: 'hesitant', label: 'Hesitant' },
  { id: 'excited', label: 'Excited' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'tired', label: 'Tired' },
  { id: 'angry', label: 'Angry' },
  { id: 'expectant', label: 'Hopeful' },
  { id: 'numb', label: 'Numb' },
]

const SITUATION_TAGS = [
  { id: 'waiting', label: 'Waiting' },
  { id: 'competing', label: 'Competing' },
  { id: 'transition', label: 'Turning' },
  { id: 'ambiguous', label: 'Unclear' },
  { id: 'bottleneck', label: 'Stuck' },
  { id: 'opportunity', label: 'Opening' },
  { id: 'farewell', label: 'Leaving' },
  { id: 'reunion', label: 'Return' },
  { id: 'jobChange', label: 'Move' },
  { id: 'start', label: 'Begin' },
]

const TIME_HORIZONS: { id: TimeHorizon; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7days', label: '7 days' },
  { id: '30days', label: '30 days' },
  { id: '3months', label: '3 months' },
  { id: '1year', label: '1 year' },
]

const TOTAL_STEPS = 5

const STEP_META = [
  {
    title: 'QUESTION',
    guide: 'Write one sentence only.',
    oracle: 'The first word you choose already bends the field.',
  },
  {
    title: 'DOMAIN',
    guide: 'Pick the field that feels closest.',
    oracle: 'Every question hides its own door.',
  },
  {
    title: 'MOOD',
    guide: 'Name the weather inside you.',
    oracle: 'Fog changes what the mirror shows.',
  },
  {
    title: 'CONTEXT',
    guide: 'Choose up to three tags.',
    oracle: 'The room you stand in is never empty.',
  },
  {
    title: 'HORIZON',
    guide: 'How far should the answer reach?',
    oracle: 'Near wind and distant tide do not speak alike.',
  },
]

export default function QuestionInputPage() {
  const {
    contextInput,
    setContextInput,
    setStep,
    questionWizardStep,
    setQuestionWizardStep,
    setBirthWizardStep,
  } = useFateStore()

  const meta = STEP_META[questionWizardStep]

  const handleEmotion = (emotion: EmotionType) => {
    setContextInput({ emotion })
  }

  const toggleTag = (tagId: string) => {
    const cur = contextInput.situationTags
    if (cur.includes(tagId)) {
      setContextInput({ situationTags: cur.filter((t) => t !== tagId) })
    } else if (cur.length < 3) {
      setContextInput({ situationTags: [...cur, tagId] })
    }
  }

  const handleBack = () => {
    if (questionWizardStep > 0) setQuestionWizardStep(questionWizardStep - 1)
    else {
      setBirthWizardStep(TOTAL_STEPS - 1)
      setStep('birthInput')
    }
  }

  const handleNext = () => {
    if (questionWizardStep < TOTAL_STEPS - 1) {
      setQuestionWizardStep(questionWizardStep + 1)
      return
    }
    setStep('ritualSelect')
  }

  const canNext = questionWizardStep === 0 ? contextInput.question.trim().length > 0 : true

  return (
    <ParticleWizardShell
      flowLabel="Step 02 / Question"
      stepIndex={questionWizardStep}
      totalSteps={TOTAL_STEPS}
      title={meta.title}
      guide={meta.guide}
      oracle={meta.oracle}
      onBack={handleBack}
      onNext={handleNext}
      canNext={canNext}
      nextHint={questionWizardStep === 0 ? 'Enter your question to continue' : undefined}
      stepKey={`question-${questionWizardStep}`}
      usesPersistentVideoBackground
    >
      {questionWizardStep === 0 && (
        <textarea
          value={contextInput.question}
          onChange={(e) => setContextInput({ question: e.target.value })}
          placeholder="What do you need to know?"
          rows={3}
          className="textarea-lab particle-input w-full text-center"
          autoFocus
        />
      )}

      {questionWizardStep === 1 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {QUESTION_TYPES.map((qt) => (
            <button
              key={qt.id}
              type="button"
              onClick={() => setContextInput({ questionType: qt.id })}
              className={`chip particle-chip ${contextInput.questionType === qt.id ? 'chip-active' : ''}`}
            >
              {qt.label}
            </button>
          ))}
        </div>
      )}

      {questionWizardStep === 2 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {EMOTIONS.map((em) => (
            <button
              key={em.id}
              type="button"
              onClick={() => handleEmotion(em.id)}
              className={`chip particle-chip ${contextInput.emotion === em.id ? 'chip-active' : ''}`}
            >
              {em.label}
            </button>
          ))}
        </div>
      )}

      {questionWizardStep === 3 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {SITUATION_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`chip particle-chip ${contextInput.situationTags.includes(tag.id) ? 'chip-active' : ''}`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {questionWizardStep === 4 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {TIME_HORIZONS.map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => setContextInput({ timeHorizon: th.id })}
              className={`chip particle-chip ${contextInput.timeHorizon === th.id ? 'chip-active' : ''}`}
            >
              {th.label}
            </button>
          ))}
        </div>
      )}
    </ParticleWizardShell>
  )
}
