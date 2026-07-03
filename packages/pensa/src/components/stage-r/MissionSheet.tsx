/**
 * Missão ABERTA (miolo do card, usado no painel normal e na gaveta do Modo
 * Missão): história, passos numerados com dica expansível, chips "Blocos que
 * ajudam", checklist "Ficou pronto quando..." e as ações "Consegui!"
 * (habilita com todos os checks; move o card para 'done'), "Abrir o Estúdio"
 * (só com adapter.onOpenStudio; no buildEnv 'studio' ele ganha DESTAQUE; no
 * 'external' entra a linha gentil de orientação no lugar do botão) e
 * "Desenhar no Pinta" (só com adapter.onOpenPinta). Os checks PERSISTEM em
 * localStorage por task.id (07/2026 — sair e voltar não zera o progresso;
 * task ids são uuids, então não colidem entre perfis/projetos).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useState } from 'react'
import type { PensaTaskView } from '../../core/types'
import { usePensaApp } from '../appContext'

const CHECKS_PREFIX = 'pensa:checks:'

/** Lê os checks salvos (null = nada salvo/indisponível/tamanho não bate). */
function readSavedChecks(taskId: string, length: number): boolean[] | null {
  try {
    const raw = window.localStorage.getItem(CHECKS_PREFIX + taskId)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== length) return null
    return parsed.map((value) => value === true)
  } catch {
    return null
  }
}

function writeSavedChecks(taskId: string, checks: boolean[]): void {
  try {
    window.localStorage.setItem(CHECKS_PREFIX + taskId, JSON.stringify(checks))
  } catch {
    // storage cheio/indisponível: segue só em memória (comportamento antigo)
  }
}

/** Missão concluída: o registro não serve mais (card done = tudo marcado). */
function clearSavedChecks(taskId: string): void {
  try {
    window.localStorage.removeItem(CHECKS_PREFIX + taskId)
  } catch {
    // best-effort
  }
}

export function MissionSheet({
  task,
  finishing,
  onFinish,
  onOpenStudio,
  onOpenPinta = null,
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
  /** Ponte com o ateliê (adapter.onOpenPinta); ausente = botão some. */
  onOpenPinta?: (() => void) | null
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
  // Missão de ARTE (07/2026): o trabalho é no Pinta → o botão dele ganha o destaque.
  const artEmphasis = Boolean(mission.artKind)
  const alreadyDone = task.column === 'done'
  // Checklist do card aberto: card feito = tudo ok; senão restaura o salvo.
  const [checked, setChecked] = useState<boolean[]>(() => {
    if (alreadyDone) {
      clearSavedChecks(task.id)
      return mission.doneWhen.map(() => true)
    }
    return readSavedChecks(task.id, mission.doneWhen.length) ?? mission.doneWhen.map(() => false)
  })
  const allChecked = checked.length > 0 && checked.every(Boolean)

  const toggleCheck = (index: number): void => {
    setChecked((prev) => {
      const next = prev.map((value, i) => (i === index ? !value : value))
      writeSavedChecks(task.id, next)
      return next
    })
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
          {onOpenPinta ? (
            <button
              type="button"
              onClick={onOpenPinta}
              className={clsx(
                'min-h-12 rounded-2xl px-5 transition',
                artEmphasis
                  ? 'bg-pz-accent text-lg font-bold text-pz-accent-fg hover:brightness-105'
                  : 'border-2 border-pz-border font-semibold text-pz-text hover:border-pz-accent',
              )}
            >
              <span aria-hidden="true">🎨 </span>
              {c.openPinta}
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
