import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

interface PersistentStateOptions<T> {
  version: number
  key: string
  fallback: T
  migrate?: (value: unknown) => T
}

interface StoredValue<T> {
  version: number
  value: T
}

type PersistentStateStatus = 'ready' | 'read-failed' | 'write-failed'

interface PersistentStateSnapshot<T> {
  state: T
  status: PersistentStateStatus
  warning: string | null
}

interface PersistentStateResult<T> {
  state: T
  setState: Dispatch<SetStateAction<T>>
  reset: () => void
  isPersistenceDegraded: boolean
  persistenceWarning: string | null
}

function readStoredValue<T>({ key, fallback, version, migrate }: PersistentStateOptions<T>): PersistentStateSnapshot<T> {
  if (typeof window === 'undefined') {
    return { state: fallback, status: 'ready', warning: null }
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return { state: fallback, status: 'ready', warning: null }
    }

    const parsed = JSON.parse(raw) as StoredValue<T> | T
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      'value' in parsed &&
      typeof parsed.version === 'number'
    ) {
      if (parsed.version === version) {
        return { state: parsed.value, status: 'ready', warning: null }
      }

      return {
        state: migrate ? migrate(parsed.value) : fallback,
        status: 'ready',
        warning: null,
      }
    }

    return {
      state: migrate ? migrate(parsed) : fallback,
      status: 'ready',
      warning: null,
    }
  } catch {
    return {
      state: fallback,
      status: 'read-failed',
      warning: '浏览器本地数据读取失败，已回退到默认设置。刷新后请检查 localStorage 是否被禁用或损坏。',
    }
  }
}

function writeStoredValue<T>(key: string, version: number, value: T): PersistentStateSnapshot<T> {
  if (typeof window === 'undefined') {
    return { state: value, status: 'ready', warning: null }
  }

  try {
    window.localStorage.setItem(key, JSON.stringify({ version, value }))
    return { state: value, status: 'ready', warning: null }
  } catch {
    return {
      state: value,
      status: 'write-failed',
      warning: '浏览器阻止了本地保存，当前偏好只会保留到本次页面刷新前。',
    }
  }
}

export function usePersistentState<T>(options: PersistentStateOptions<T>): PersistentStateResult<T> {
  const { key, fallback, version } = options
  const [snapshot, setSnapshot] = useState<PersistentStateSnapshot<T>>(() => readStoredValue(options))

  const setPersistentState = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setSnapshot((current) => {
        const resolvedState = typeof next === 'function' ? (next as (value: T) => T)(current.state) : next
        return writeStoredValue(key, version, resolvedState)
      })
    },
    [key, version],
  )

  const reset = useCallback(() => {
    setSnapshot(writeStoredValue(key, version, fallback))
  }, [fallback, key, version])

  return useMemo(
    () => ({
      state: snapshot.state,
      setState: setPersistentState,
      reset,
      isPersistenceDegraded: snapshot.status !== 'ready',
      persistenceWarning: snapshot.warning,
    }),
    [reset, setPersistentState, snapshot],
  )
}
