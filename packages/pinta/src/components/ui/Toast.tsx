/**
 * Toast efêmero com aria-live (anúncio p/ leitores de tela). Um por vez, some
 * sozinho; a região live existe SEMPRE (aria-live só anuncia mudanças de
 * conteúdo em região já montada).
 */
import type { JSX, ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface ToastContextValue {
  showToast(message: string): void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return value
}

const TOAST_DURATION_MS = 3500

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((next: string) => {
    setMessage(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setMessage(null)
    }, TOAST_DURATION_MS)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
      >
        {message ? (
          <div className="rounded-2xl border-2 border-pin-border bg-pin-surface px-5 py-3 text-base font-bold text-pin-text shadow-lg">
            {message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}
