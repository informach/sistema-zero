'use client'

import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { LogOut, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { ImpersonationMode } from '../lib/types'

interface ImpersonationBannerProps {
  studentName: string
  actorName: string
  mode: ImpersonationMode
}

function errorMessage(body: unknown): string {
  if (!body || typeof body !== 'object' || !('error' in body))
    return 'Não foi possível alterar o modo.'
  const error = body.error
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return 'Não foi possível alterar o modo.'
  }
  return typeof error.message === 'string' ? error.message : 'Não foi possível alterar o modo.'
}

/** Faixa persistente que torna visível a capacidade real da sessão de suporte. */
export function ImpersonationBanner({ studentName, actorName, mode }: ImpersonationBannerProps) {
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const writable = mode === 'write'

  async function changeMode(nextMode: ImpersonationMode) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/impersonation/mode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(errorMessage(body))
        return
      }
      window.location.reload()
    } catch {
      setError('Não foi possível alterar o modo. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function endSession() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(errorMessage(body))
        return
      }
      // Reload de documento elimina também o cache RSC da identidade impersonada.
      window.location.replace('/login')
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        className={
          writable
            ? 'flex flex-wrap items-center justify-center gap-2 bg-red-700 px-4 py-2 text-sm text-white shadow-md'
            : 'flex flex-wrap items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-sm text-amber-800 dark:text-amber-300'
        }
        role="status"
        aria-live="polite"
      >
        {writable ? (
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
        ) : (
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
        )}
        <p className="min-w-0 text-center sm:text-left">
          {writable ? (
            <>
              <strong className="font-bold">Modo de edição ativo</strong> — alterações reais como{' '}
              <strong className="font-semibold">{studentName}</strong>, por {actorName}.
            </>
          ) : (
            <>
              Sessão de suporte somente leitura: você ({actorName}) está navegando como{' '}
              <strong className="font-semibold">{studentName}</strong>.
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {writable ? (
            <button
              type="button"
              onClick={() => changeMode('readonly')}
              disabled={busy}
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-white/60 px-3 font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
            >
              <ShieldAlert className="size-3.5" aria-hidden />
              Desativar edição
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setConfirmOpen(true)
              }}
              disabled={busy}
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-amber-700/50 px-3 font-semibold hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-60 dark:border-amber-300/60"
            >
              <Pencil className="size-3.5" aria-hidden />
              Ativar edição
            </button>
          )}
          <button
            type="button"
            onClick={endSession}
            disabled={busy}
            className={
              writable
                ? 'inline-flex min-h-9 items-center gap-1 rounded-md px-3 font-medium hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60'
                : 'inline-flex min-h-9 items-center gap-1 rounded-md px-3 font-medium hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-60'
            }
          >
            <LogOut className="size-3.5" aria-hidden />
            Encerrar
          </button>
        </div>
        {error && (!confirmOpen || writable) ? (
          <p className="w-full text-center font-medium" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setError(null)
        }}
        title="Ativar modo de edição?"
        message={
          <>
            As próximas ações serão alterações reais na conta ou no perfil de{' '}
            <strong className="text-foreground">{studentName}</strong>. A ativação deste modo será
            registrada na auditoria em nome de{' '}
            <strong className="text-foreground">{actorName}</strong>.
          </>
        }
        confirmText="Ativar edição"
        confirmVariant="destructive"
        onConfirm={() => changeMode('write')}
      >
        {error ? (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  )
}
