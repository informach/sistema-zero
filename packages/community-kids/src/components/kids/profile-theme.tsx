'use client'

import type { KidsTheme } from '@sistemazero/core/learning'
import { apiGet, apiSend } from '@sistemazero/member-shell/lib/api'
import { useTheme } from 'next-themes'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

const ProfileThemeContext = createContext<{
  busy: boolean
  error: string
  toggle: () => Promise<void>
  retry: () => void
} | null>(null)
export const useProfileTheme = () => useContext(ProfileThemeContext)

/** The server owns the preference; next-themes applies it to the current document. */
export function ProfileThemeProvider({
  viewerId,
  children,
}: {
  viewerId: string
  children: ReactNode
}) {
  const { setTheme } = useTheme()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const current = useRef<KidsTheme>('padrao')
  const request = useRef(0)
  const saving = useRef(false)
  const load = useCallback(() => {
    const id = ++request.current
    setBusy(true)
    setError('')
    void apiGet<{ theme: KidsTheme | null }>('/api/members/preferences', {
      'x-sz-viewer': viewerId,
    })
      .then((saved) => {
        if (id !== request.current) return
        current.current = saved.theme ?? 'padrao'
        setTheme(current.current)
      })
      .catch(() => {
        if (id === request.current) setError('Não consegui carregar o tema do seu perfil.')
      })
      .finally(() => {
        if (id === request.current) setBusy(false)
      })
  }, [viewerId, setTheme])
  useEffect(() => {
    setTheme('padrao')
    load()
    const onFocus = () => {
      if (!saving.current) load()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      request.current++
      window.removeEventListener('focus', onFocus)
    }
  }, [load, setTheme])
  async function toggle() {
    if (busy || error || saving.current) return
    saving.current = true
    const id = ++request.current
    setBusy(true)
    const theme = current.current === 'padrao' ? 'pink' : 'padrao'
    try {
      await apiSend('/api/members/preferences', 'PUT', { theme }, { 'x-sz-viewer': viewerId })
      if (id !== request.current) return
      current.current = theme
      setTheme(theme)
    } catch {
      if (id === request.current) setError('Não consegui salvar seu tema. Tente novamente.')
    } finally {
      saving.current = false
      if (id === request.current) setBusy(false)
    }
  }
  return (
    <ProfileThemeContext.Provider value={{ busy, error, toggle, retry: load }}>
      {children}
    </ProfileThemeContext.Provider>
  )
}
