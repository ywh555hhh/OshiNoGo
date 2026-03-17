import { useState } from 'react'

import { AppHeader } from '@/components/layout/AppHeader'
import { OnboardingDialog } from '@/components/layout/OnboardingDialog'
import { AppShell } from '@/components/layout/AppShell'
import { ModeTabs } from '@/components/layout/ModeTabs'
import { TrainingStatusCard } from '@/components/layout/TrainingStatusCard'
import { DictationPanel } from '@/components/training/DictationPanel'
import { RecognitionPanel } from '@/components/training/RecognitionPanel'
import { WordsPanel } from '@/components/training/WordsPanel'
import { useAppPreferences } from '@/hooks/useAppPreferences'
import { useTheme } from '@/hooks/useTheme'

function App() {
  const {
    isPersistenceDegraded,
    persistenceWarning,
    preferences,
    completeOnboarding,
    setLastMode,
    setTheme: setThemePreference,
    updateDictation,
    updateRecognition,
    updateWords,
  } = useAppPreferences()
  const { label, toggleTheme } = useTheme(preferences.theme, setThemePreference)
  const [onboardingOpen, setOnboardingOpen] = useState(!preferences.onboardingCompleted)

  return (
    <>
      <AppShell
        header={
          <AppHeader
            themeLabel={label}
            onOpenHelp={() => setOnboardingOpen(true)}
            onToggleTheme={toggleTheme}
          />
        }
        tabs={
          <div className="space-y-6">
            <ModeTabs
              mode={preferences.lastMode}
              onModeChange={setLastMode}
              recognition={
                <RecognitionPanel
                  preferences={preferences.recognition}
                  onPreferencesChange={updateRecognition}
                />
              }
              dictation={
                <DictationPanel preferences={preferences.dictation} onPreferencesChange={updateDictation} />
              }
              words={<WordsPanel preferences={preferences.words} onPreferencesChange={updateWords} />}
            />

            <TrainingStatusCard
              lastMode={preferences.lastMode}
              onboardingCompleted={preferences.onboardingCompleted}
              recognitionSummary={preferences.recognition.lastSessionSummary}
              dictationSummary={preferences.dictation.lastSessionSummary}
              practicedCount={preferences.words.practicedCount}
              storageWarning={isPersistenceDegraded ? persistenceWarning : null}
              onModeChange={setLastMode}
            />
          </div>
        }
      />

      <OnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onComplete={() => {
          completeOnboarding()
          setOnboardingOpen(false)
        }}
      />
    </>
  )
}

export default App
