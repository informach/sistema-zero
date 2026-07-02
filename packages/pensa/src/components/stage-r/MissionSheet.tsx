/**
 * Missão ABERTA (miolo do card, usado no painel normal e na gaveta do Modo
 * Missão): história, passos numerados com dica expansível, chips "Blocos que
 * ajudam", checklist LOCAL "Ficou pronto quando..." e as ações "Consegui!"
 * (habilita com todos os checks; move o card para 'done') e "Abrir o Estúdio"
 * (só com adapter.onOpenStudio; no buildEnv 'studio' ele ganha DESTAQUE; no
 * 'external' entra a linha gentil de orientação no lugar do botão). Os checks
 * NÃO persistem (estado do card).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useState } from 'react'
import type { PensaTaskView } from '../../core/types'
import { usePensaApp } from '../appContext'

export function MissionSheet({
  task,
  finishing,
  onFinish,
  onOpenStudio,
  openStudioEmphasis = false,
  guidance = null,
  errorMessage = null,
}: {
  task: PensaTaskView
  /** Move para 'done' em voo (desabilita as ações). */
  finishing: boolean
  onFinish: () => void
  /** Ausente quando o host não deu a capability (o botão some). */
  onOpenStudio: (() => void) | null
  /** buildEnv 'studio': "Abrir o Estúdio" vira o botão em destaque. */
  openStudioEmphasis?: boolean
  /** buildEnv 'external': linha gentil no lugar de "Abrir o Estúdio". */
  guidance?: string | null
  /** Erro do "Consegui!"/semeadura — sem isto a falha era invisível aqui. */
  errorMessage?: string | null
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageR
  const mission = task.mission
  const alreadyDone = task.column === 'done'
  // Checklist LOCAL do card aberto (não persiste por passo; card feito = tudo ok).
  const [checked, setChecked] = useState<boolean[]>(() => mission.doneWhen.map(() => alreadyDone))
  const allChecked = checked.length > 0 && checked.every(Boolean)

  const toggleCheck = (index: number): void => {
    setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)))
  }

  return (
    <div className="flex flex-col gap-4">
      {mission.story ? (
        <section aria-label={c.storyLabel} className="rounded-2xl bg-pz-bg p-3">
          <p className="text-sm leading-snug font-semibold text-pz-text">
            <span aria-hidden="true">📜 </span>
            {mission.story}
          </p>
        </section>
      ) : null}

      <section aria-label={c.stepsLabel} className="flex flex-col gap-1.5">
        <h4 className="text-sm font-extrabold tracking-wide text-pz-muted uppercase">
          {c.stepsLabel}
        </h4>
        <ol className="flex flex-col gap-2">
          {mission.steps.map((step, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: passos não têm id; a posição é a identidade.
              key={index}
              className="rounded-2xl border-2 border-pz-border bg-pz-surface p-3"
            >
              <p className="leading-snug text-pz-text">
                <span className="font-extrabold text-pz-accent">{index + 1}.</span> {step.text}
              </p>
              {step.hint ? (
                <details className="mt-1.5">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-1 text-sm font-bold text-pz-accent">
                    <span aria-hidden="true">💡</span>
                    {c.hintToggle}
                  </summary>
                  <p className="mt-1 text-sm leading-snug text-pz-muted">{step.hint}</p>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {mission.studioHints && mission.studioHints.categories.length > 0 ? (
        <section aria-label={c.blocksLabel} className="flex flex-col gap-1.5">
          <h4 className="text-sm font-extrabold tracking-wide text-pz-muted uppercase">
            <span aria-hidden="true">🧱 </span>
            {c.blocksLabel}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {mission.studioHints.categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-pz-accent/15 px-3 py-1 text-sm font-bold text-pz-accent"
              >
                {category}
              </span>
            ))}
          </div>
          {mission.studioHints.blocks.length > 0 ? (
            <p className="text-sm text-pz-muted">{mission.studioHints.blocks.join(' · ')}</p>
          ) : null}
        </section>
      ) : null}

      <section aria-label={c.doneWhenLabel} className="flex flex-col gap-1.5">
        <h4 className="text-sm font-extrabold tracking-wide text-pz-muted uppercase">
          <span aria-hidden="true">🎯 </span>
          {c.doneWhenLabel}
        </h4>
        <ul className="flex flex-col gap-1.5">
          {mission.doneWhen.map((criterion, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: critérios não têm id; a posição é a identidade.
              key={index}
            >
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border-2 border-pz-border bg-pz-surface px-3 py-1.5 transition hover:border-pz-accent">
                <input
                  type="checkbox"
                  checked={checked[index] ?? false}
                  onChange={() => toggleCheck(index)}
                  disabled={alreadyDone || finishing}
                  className="h-6 w-6 shrink-0 rounded accent-pz-accent"
                />
                <span className="leading-snug font-semibold text-pz-text">{criterion}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-2xl border-2 border-pz-warn bg-pz-surface px-4 py-2.5 font-semibold text-pz-warn"
          >
            {errorMessage}
          </p>
        ) : null}
        {!alreadyDone && !allChecked ? (
          <p className="text-sm font-semibold text-pz-muted">{c.finishHint}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {alreadyDone ? (
            <span className="flex min-h-12 items-center gap-1.5 rounded-2xl border-2 border-pz-ok px-5 font-bold text-pz-ok">
              <span aria-hidden="true">✓</span>
              {c.cardDoneBadge}
            </span>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              disabled={!allChecked || finishing}
              aria-busy={finishing || undefined}
              className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">🎉 </span>
              {c.cardFinish}
            </button>
          )}
          {onOpenStudio ? (
            <button
              type="button"
              onClick={onOpenStudio}
              className={clsx(
                'min-h-12 rounded-2xl px-5 transition',
                openStudioEmphasis
                  ? 'bg-pz-accent text-lg font-bold text-pz-accent-fg hover:brightness-105'
                  : 'border-2 border-pz-border font-semibold text-pz-text hover:border-pz-accent',
              )}
            >
              <span aria-hidden="true">🧩 </span>
              {c.openStudio}
            </button>
          ) : null}
        </div>
        {!onOpenStudio && guidance ? (
          <p className="rounded-2xl bg-pz-bg p-3 text-sm leading-snug font-semibold text-pz-muted">
            <span aria-hidden="true">💻 </span>
            {guidance}
          </p>
        ) : null}
      </div>
    </div>
  )
}
