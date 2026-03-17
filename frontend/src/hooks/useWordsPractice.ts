import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

import { WORDS } from '@/data/words'
import type { WordsPreferences } from '@/hooks/useAppPreferences'
import type { WordItem } from '@/types/training'

function randomPickWord(previous?: WordItem | null): WordItem | null {
  if (!WORDS.length) {
    return null
  }

  if (WORDS.length === 1) {
    return WORDS[0]
  }

  let next = WORDS[Math.floor(Math.random() * WORDS.length)]
  while (next === previous) {
    next = WORDS[Math.floor(Math.random() * WORDS.length)]
  }

  return next
}

interface UseWordsPracticeOptions {
  preferences: WordsPreferences
  onPreferencesChange: (next: WordsPreferences | ((current: WordsPreferences) => WordsPreferences)) => void
}

interface UseWordsPracticeResult {
  answerVisible: boolean
  count: number
  current: WordItem | null
  nextWord: () => void
  setAnswerVisible: Dispatch<SetStateAction<boolean>>
  toggleAnswer: () => void
}

export function useWordsPractice({ preferences, onPreferencesChange }: UseWordsPracticeOptions): UseWordsPracticeResult {
  const [current, setCurrent] = useState<WordItem | null>(() => randomPickWord())
  const [answerVisible, setAnswerVisible] = useState(false)
  const [count, setCount] = useState(preferences.practicedCount)

  useEffect(() => {
    onPreferencesChange((currentPreference) => ({
      ...currentPreference,
      practicedCount: count,
    }))
  }, [count, onPreferencesChange])

  const nextWord = useCallback(() => {
    setCurrent((previous) => randomPickWord(previous))
    setAnswerVisible(false)
    setCount((value) => value + 1)
  }, [])

  const toggleAnswer = useCallback(() => {
    setAnswerVisible((value) => !value)
  }, [])

  return {
    answerVisible,
    count,
    current,
    nextWord,
    setAnswerVisible,
    toggleAnswer,
  }
}
