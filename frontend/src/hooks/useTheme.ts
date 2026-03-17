import { useEffect, useMemo } from 'react'

import type { ThemePreference } from '@/types/training'

function getSystemTheme(): Exclude<ThemePreference, 'system'> {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyResolvedTheme(theme: Exclude<ThemePreference, 'system'>): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function useTheme(theme: ThemePreference, setTheme: (theme: ThemePreference) => void) {
  const resolvedTheme = useMemo(() => (theme === 'system' ? getSystemTheme() : theme), [theme])

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia || theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const syncTheme = () => {
      applyResolvedTheme(getSystemTheme())
    }

    mediaQuery.addEventListener('change', syncTheme)
    return () => mediaQuery.removeEventListener('change', syncTheme)
  }, [theme])

  const label = useMemo(() => {
    if (theme === 'system') {
      return `跟随系统 · ${resolvedTheme === 'dark' ? '夜间' : '日间'}`
    }

    return resolvedTheme === 'dark' ? '夜间' : '日间'
  }, [resolvedTheme, theme])

  return {
    theme,
    resolvedTheme,
    label,
    setTheme,
    toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    useSystemTheme: () => setTheme('system'),
  }
}
