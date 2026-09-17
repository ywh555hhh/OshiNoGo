import { useCallback, useEffect, useMemo } from 'react'

import type { ThemePreference } from './storage'

type ResolvedTheme = 'light' | 'dark'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function useTheme(theme: ThemePreference, setTheme: (next: ThemePreference) => void) {
  const resolved: ResolvedTheme = useMemo(
    () => (theme === 'system' ? getSystemTheme() : theme),
    [theme],
  )

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme(getSystemTheme())
    query.addEventListener('change', sync)

    return () => query.removeEventListener('change', sync)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setTheme])

  return { resolved, toggle }
}
