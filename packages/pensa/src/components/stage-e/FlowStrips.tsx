/**
 * Seção "Como o jogo funciona": cada flow do spec vira uma TIRINHA de 3
 * quadrinhos (quando o jogador... / ...o jogo... / ...e aparece na tela...),
 * lado a lado no desktop e empilhados no mobile, com chips das telas
 * envolvidas no rodapé. As ações da seção (aprovar/mudar) vêm juntas.
 */
import type { JSX } from 'react'
import type { PensaSpecFlow } from '../../core/specContent'
import { usePensaApp } from '../appContext'
import { ApprovalActions } from './ApprovalActions'

function Panel({
  number,
  label,
  text,
}: {
  number: number
  label: string
  text: string
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border-2 border-pz-border bg-pz-surface p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-pz-accent">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pz-accent/15"
        >
          {number}
        </span>
        {label}
      </p>
      <p className="text-sm leading-snug text-pz-text">{text}</p>
    </div>
  )
}

export function FlowStrips({
  flows,
  approved,
  busy,
  onApprove,
  onChange,
}: {
  flows: PensaSpecFlow[]
  approved: boolean
  busy?: boolean
  onApprove: () => void
  onChange: () => void
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageE
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {flows.map((flow) => (
          <li key={flow.id} data-flow={flow.id} className="rounded-2xl bg-pz-bg p-4">
            <p className="font-bold text-pz-text">{flow.title}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Panel number={1} label={c.strip.input} text={flow.input} />
              <Panel number={2} label={c.strip.processing} text={flow.processing} />
              <Panel number={3} label={c.strip.output} text={flow.output} />
            </div>
            {flow.screens.length > 0 ? (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-pz-muted">
                {c.stripScreensLabel}
                {flow.screens.map((screenName) => (
                  <span
                    key={screenName}
                    className="rounded-full bg-pz-accent/10 px-2 py-0.5 font-bold text-pz-accent"
                  >
                    {screenName}
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <ApprovalActions approved={approved} busy={busy} onApprove={onApprove} onChange={onChange} />
    </div>
  )
}
