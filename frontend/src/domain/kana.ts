import type { KanaItem, KanaSet, ScriptMode } from '@/types/training'

export function getActiveKanaPool(
  kana: KanaItem[],
  activeSets: KanaSet[],
  scriptMode: ScriptMode,
) {
  const activeSetLookup = new Set(activeSets)
  const bySet = kana.filter((item) => activeSetLookup.has(item.set))

  let byScript = bySet
  if (scriptMode === 'hiragana') {
    byScript = bySet.filter((item) => item.script === 'hiragana')
  } else if (scriptMode === 'katakana') {
    byScript = bySet.filter((item) => item.script === 'katakana')
  }

  if (byScript.length) {
    return byScript
  }

  if (bySet.length) {
    return bySet
  }

  return kana
}

export function toggleKanaSetSelection(activeSets: KanaSet[], target: KanaSet) {
  if (activeSets.includes(target)) {
    return activeSets.length > 1
      ? activeSets.filter((item) => item !== target)
      : activeSets
  }

  return [...activeSets, target]
}

export function normalizeRomaji(input: string) {
  return input.trim().toLowerCase()
}
