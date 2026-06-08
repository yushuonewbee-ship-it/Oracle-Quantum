import { AnimatePresence } from 'framer-motion'
import { useFateStore } from './store/fateStore'
import BackgroundVideo from './components/BackgroundVideo'
import LandingPage from './sections/LandingPage'
import QuantumTheoryIntroPage from './sections/QuantumTheoryIntroPage'
import BirthInputPage from './sections/BirthInputPage'
import QuestionInputPage from './sections/QuestionInputPage'
import RitualSelectPage from './sections/RitualSelectPage'
import ObservationPage from './sections/ObservationPage'
import ResultPage from './sections/ResultPage'

function App() {
  const currentStep = useFateStore((s) => s.currentStep)
  const showPersistentBackground = currentStep === 'theory' || currentStep === 'questionInput'

  const renderStep = () => {
    switch (currentStep) {
      case 'landing': return <LandingPage key="landing" />
      case 'theory': return <QuantumTheoryIntroPage key="theory" />
      case 'birthInput': return <BirthInputPage key="birthInput" />
      case 'questionInput': return <QuestionInputPage key="questionInput" />
      case 'ritualSelect': return <RitualSelectPage key="ritualSelect" />
      case 'observation': return <ObservationPage key="observation" />
      case 'result': return <ResultPage key="result" />
      default: return <LandingPage key="landing" />
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: 'var(--bg-void)' }}>
      <BackgroundVideo
        src="/video/particles_2026_5_30_12_37_41.mp4"
        className={`transition-opacity duration-500 ${showPersistentBackground ? 'opacity-100' : 'opacity-0'}`}
        opacity={0.44}
        overlay="radial-gradient(circle at 50% 42%, rgba(5,5,8,0.28), rgba(5,5,8,0.76) 72%), linear-gradient(180deg, rgba(5,5,8,0.46), rgba(5,5,8,0.82))"
      />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
