/**
 * Par de ações de APROVAÇÃO de uma seção da etapa E: "Tá certo!" aprova (e
 * vira um selo de aprovado) e "Mudar" abre a FeedbackBar da seção.
 * Compartilhado por FlowStrips e ScreenWireframes (interno da pasta stage-e).
 */
import type { JSX } from 'react'
import { usePensaApp } from '../appContext'

export function ApprovalActions({
  approved,
  busy,
  onApprove,
  onChange,
}: {
  approved: boolean
  busy?: boolean
  onApprove: () => void
  onChange: () => void
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageE
  return (
    <div className="flex flex-wrap items-center gap-2">
      {approved ? (
        <span className="flex min-h-11 items-center gap-1.5 rounded-2xl border-2 border-pz-ok px-4 font-bold text-pz-ok">
          <span aria-hidden="true">✓</span>
          {c.approvedBadge}
        </span>
      ) : (
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">👍 </span>
          {c.approve}
        </button>
      )}
      <button
        type="button"
        onClick={onChange}
        disabled={busy}
        className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-text transition hover:border-pz-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {c.change}
      </button>
    </div>
  )
}
