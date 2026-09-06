/**
 * Toast efêmero com aria-live (anúncio p/ leitores de tela). Um por vez, some
 * sozinho; a região live existe SEMPRE (aria-live só anuncia mudanças de
 * conteúdo em região já montada). Cópia por valor do Pinta.
 */
import type { JSX, ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/** Um botão dentro do toast ("Dividir", "Desfazer"…): consertar DEPOIS e perguntar, em vez de impedir. */
export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastContextValue {
  showToast(message: string, actions?: readonly ToastAction[]): void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return value
}

const TOAST_DURATION_MS = 3500
/** Com botões o toast fica mais (a criança precisa ler e escolher). */
const TOAST_WITH_ACTIONS_MS = 8000

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toast, setToast] = useState<{ message: string; actions: readonly ToastAction[] } | null>(
    null,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((next: string, actions: readonly ToastAction[] = []) => {
    setToast({ message: next, actions })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => {
        timerRef.current = null
        setToast(null)
      },
      actions.length > 0 ? TOAST_WITH_ACTIONS_MS : TOAST_DURATION_MS,
    )
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
        {toast ? (
          <div className="pointer-events-auto flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-2xl border-2 border-mld-border bg-mld-surface px-5 py-3 text-base font-bold text-mld-text shadow-lg">
            <span>{toast.message}</span>
            {toast.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  if (timerRef.current) clearTimeout(timerRef.current)
                  timerRef.current = null
                  setToast(null)
                  action.onClick()
                }}
                className="min-h-11 rounded-full border-2 border-mld-accent px-4 text-sm font-bold text-mld-accent hover:bg-mld-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}
