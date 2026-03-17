import { useEffect, useMemo, useState } from 'react'

import { getSpeechCapability, warmJapaneseVoices } from '@/lib/speech'
import type { SpeechCapability } from '@/types/training'

interface UseSpeechCapabilityResult {
  capability: SpeechCapability
  isReady: boolean
  isLimited: boolean
  isUnsupported: boolean
}

export function useSpeechCapability(): UseSpeechCapabilityResult {
  const [capability, setCapability] = useState<SpeechCapability>(() => getSpeechCapability())

  useEffect(() => {
    function syncCapability(): void {
      setCapability(getSpeechCapability())
    }

    warmJapaneseVoices()
    syncCapability()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const synthesis = window.speechSynthesis
    synthesis.addEventListener?.('voiceschanged', syncCapability)
    return () => synthesis.removeEventListener?.('voiceschanged', syncCapability)
  }, [])

  return useMemo(
    () => ({
      capability,
      isReady: capability.status === 'ready',
      isLimited: capability.status === 'limited',
      isUnsupported: capability.status === 'unsupported',
    }),
    [capability],
  )
}
