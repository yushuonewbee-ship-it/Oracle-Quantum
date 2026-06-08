import { useFateStore } from '../store/fateStore'
import ParticleWizardShell from '../components/ParticleWizardShell'

const LIFE_THEMES = [
  { id: 'career', label: 'Career' },
  { id: 'relationship', label: 'Love' },
  { id: 'wealth', label: 'Wealth' },
  { id: 'study', label: 'Study' },
  { id: 'family', label: 'Family' },
  { id: 'creative', label: 'Create' },
  { id: 'health', label: 'Health' },
  { id: 'growth', label: 'Growth' },
]

const SELF_KEYWORDS = [
  { id: 'rational', label: 'Rational' },
  { id: 'sensitive', label: 'Sensitive' },
  { id: 'adventurous', label: 'Bold' },
  { id: 'stable', label: 'Steady' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'executive', label: 'Driven' },
  { id: 'creative', label: 'Creative' },
  { id: 'introverted', label: 'Introvert' },
  { id: 'extroverted', label: 'Extrovert' },
  { id: 'perfectionist', label: 'Exacting' },
]

const TOTAL_STEPS = 5

const STEP_META = [
  {
    title: 'BIRTH DATE',
    guide: 'Required.',
    oracle: 'The day you arrived sets the first phase.',
  },
  {
    title: 'BIRTH TIME',
    guide: 'Optional — skip if unknown.',
    oracle: 'Hour sharpens the orbit; silence still counts.',
  },
  {
    title: 'BIRTH PLACE',
    guide: 'Optional — city or region.',
    oracle: 'Every coordinate hums a little differently.',
  },
  {
    title: 'THEMES',
    guide: 'Pick up to four long arcs.',
    oracle: 'What you call life shapes what the field hears.',
  },
  {
    title: 'SELF',
    guide: 'Pick up to five traits.',
    oracle: 'You are part of the instrument.',
  },
]

export default function BirthInputPage() {
  const {
    birthInput,
    setBirthInput,
    setStep,
    birthWizardStep,
    setBirthWizardStep,
    setQuestionWizardStep,
  } = useFateStore()

  const meta = STEP_META[birthWizardStep]

  const toggleTheme = (themeId: string) => {
    const current = birthInput.lifeThemes
    if (current.includes(themeId)) {
      setBirthInput({ lifeThemes: current.filter((t) => t !== themeId) })
    } else if (current.length < 4) {
      setBirthInput({ lifeThemes: [...current, themeId] })
    }
  }

  const toggleKeyword = (kwId: string) => {
    const current = birthInput.selfKeywords
    if (current.includes(kwId)) {
      setBirthInput({ selfKeywords: current.filter((k) => k !== kwId) })
    } else if (current.length < 5) {
      setBirthInput({ selfKeywords: [...current, kwId] })
    }
  }

  const handleBack = () => {
    if (birthWizardStep > 0) setBirthWizardStep(birthWizardStep - 1)
    else setStep('theory')
  }

  const handleNext = () => {
    if (birthWizardStep < TOTAL_STEPS - 1) {
      setBirthWizardStep(birthWizardStep + 1)
      return
    }
    setQuestionWizardStep(0)
    setStep('questionInput')
  }

  const canNext = birthWizardStep === 0 ? birthInput.birthDate.length > 0 : true

  return (
    <ParticleWizardShell
      flowLabel="Step 01 / Profile"
      stepIndex={birthWizardStep}
      totalSteps={TOTAL_STEPS}
      title={meta.title}
      guide={meta.guide}
      oracle={meta.oracle}
      onBack={handleBack}
      onNext={handleNext}
      canNext={canNext}
      nextHint={birthWizardStep === 0 ? 'Select a birth date to continue' : undefined}
      stepKey={`birth-${birthWizardStep}`}
    >
      {birthWizardStep === 0 && (
        <input
          type="date"
          value={birthInput.birthDate}
          onChange={(e) => setBirthInput({ birthDate: e.target.value })}
          className="input-lab particle-input text-lg text-center w-full"
          autoFocus
        />
      )}

      {birthWizardStep === 1 && (
        <input
          type="time"
          value={birthInput.birthTime}
          onChange={(e) => setBirthInput({ birthTime: e.target.value })}
          className="input-lab particle-input text-lg text-center w-full"
          autoFocus
        />
      )}

      {birthWizardStep === 2 && (
        <input
          type="text"
          value={birthInput.birthPlace}
          onChange={(e) => setBirthInput({ birthPlace: e.target.value })}
          placeholder="City or region"
          className="input-lab particle-input text-lg text-center w-full"
          autoFocus
        />
      )}

      {birthWizardStep === 3 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {LIFE_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => toggleTheme(theme.id)}
              className={`chip particle-chip ${birthInput.lifeThemes.includes(theme.id) ? 'chip-active' : ''}`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      )}

      {birthWizardStep === 4 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {SELF_KEYWORDS.map((kw) => (
            <button
              key={kw.id}
              type="button"
              onClick={() => toggleKeyword(kw.id)}
              className={`chip particle-chip ${birthInput.selfKeywords.includes(kw.id) ? 'chip-active' : ''}`}
            >
              {kw.label}
            </button>
          ))}
        </div>
      )}
    </ParticleWizardShell>
  )
}
