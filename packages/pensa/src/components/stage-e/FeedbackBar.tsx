/**
 * Barra de feedback de uma seção do spec: campo "O que você quer mudar?"
 * (2..500) com aviso de que o DESENHO INTEIRO será refeito. O submit chama o
 * generateSpec(projectId, feedback) do pai; enquanto gera, tudo desabilita.
 */
import type { FormEvent, JSX } from 'react'
import { useId, useState } from 'react'
import { usePensaApp } from '../appContext'

const FEEDBACK_MAX = 500

export function FeedbackBar({
  busy,
  errorMessage,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  /** Mensagem gentil do último generateSpec que falhou (exibida após tentar). */
  errorMessage: string | null
  /** Resolve false quando a geração falhou (a barra permanece aberta). */
  onSubmit: (feedback: string) => Promise<boolean>
  onCancel: () => void
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageE.feedback
  const [text, setText] = useState('')
  const [tooShort, setTooShort] = useState(false)
  const [failed, setFailed] = useState(false)
  const fieldId = useId()

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (busy) return
    const trimmed = text.trim()
    if (trimmed.length < 2) {
      setTooShort(true)
      return
    }
    setTooShort(false)
    setFailed(false)
    void onSubmit(trimmed).then((ok) => {
      if (!ok) setFailed(true)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-2 rounded-2xl border-2 border-pz-accent/40 bg-pz-bg p-4"
    >
      <label htmlFor={fieldId} className="font-bold text-pz-text">
        {c.label}
      </label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setTooShort(false)
        }}
        maxLength={FEEDBACK_MAX}
        rows={2}
        disabled={busy}
        placeholder={c.placeholder}
        className="w-full rounded-2xl border-2 border-pz-border bg-pz-surface px-4 py-2.5 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent disabled:opacity-60"
      />
      <p className="text-xs font-semibold text-pz-muted">
        <span aria-hidden="true">🎨 </span>
        {c.warning}
      </p>
      {tooShort ? (
        <p role="alert" className="text-sm font-semibold text-pz-warn">
          {c.tooShort}
        </p>
      ) : null}
      {failed && errorMessage ? (
        <p role="alert" className="text-sm font-semibold text-pz-warn">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy || undefined}
          className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? copy.stageE.generating : c.submit}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-muted transition hover:bg-pz-surface hover:text-pz-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {c.cancel}
        </button>
      </div>
    </form>
  )
}
