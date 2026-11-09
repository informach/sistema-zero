import type { JSX, ReactNode } from 'react'
import { IconPlay } from '#ui'
import type { ProRunState } from '../../state/proRun'
import { useT } from '../../studio/i18n'

/** Quem roda: o dev-server local (WebContainer), o compilador remoto (BFF) ou o Python. */
export type ProStageFlavor = 'local' | 'remote' | 'python' | 'classic'
/** O que a criança vê: um JOGO, uma PÁGINA (o clássico sem jogo) ou um PROGRAMA (Python). */
export type ProStageSubject = 'game' | 'page' | 'program'

const STEP_KEYS: Record<ProStageFlavor, readonly string[]> = {
  local: ['pro.stage.step.engine', 'pro.stage.step.parts', 'pro.stage.step.openGame'],
  remote: ['pro.stage.step.build'],
  python: ['pro.stage.step.python', 'pro.stage.step.program', 'pro.stage.step.openProgram'],
  classic: ['pro.stage.step.openGame'],
}

/**
 * O cartão de estado do palco do Pro (redesenho de 11/2026), compartilhado pelas três prévias:
 * parado (o ▶ grande e "Aperte Rodar…"), preparando (os passos nomeados, com o texto técnico
 * de sempre em "Ver detalhes"), erro (título curto, a mensagem técnica dobrada, "Tentar de
 * novo") e sem suporte. Nas fases rodando/esperando/concluído a prévia mostra o jogo e este
 * cartão não renderiza nada. `children` é a cauda de log ou a saída do build, dentro dos
 * detalhes (nunca no parado: a saída da rodada anterior não é o estado de agora). ⚠️ O botão do ▶ se chama "Rodar o jogo/programa", não "Rodar": o "Rodar" exato é
 * o da Topbar, o que carrega o `data-live-target` e o que os e2e clicam.
 */
export function ProStageState({
  state,
  subject,
  flavor,
  onRun,
  onSeeProblem,
  idleHintKey = 'pro.stage.idle.hint',
  children,
}: {
  state: ProRunState
  subject: ProStageSubject
  flavor: ProStageFlavor
  onRun?: () => void
  onSeeProblem?: () => void
  /** O texto de baixo do parado: "no código" no Pro, "nos blocos" no clássico. */
  idleHintKey?: string
  children?: ReactNode
}): JSX.Element | null {
  const t = useT()
  if (state.phase === 'idle') {
    return (
      <div role="status" className="sz-pro-stage-state">
        <button
          type="button"
          className="sz-pro-play"
          aria-label={t(`pro.stage.idle.action.${subject}`)}
          disabled={!state.canRun || !onRun}
          onClick={onRun}
        >
          <IconPlay />
        </button>
        <p className="sz-pro-stage-state__title">{t(`pro.stage.idle.${subject}`)}</p>
        <p className="sz-pro-stage-state__hint">{t(idleHintKey)}</p>
      </div>
    )
  }
  if (state.phase === 'preparing') {
    const steps = STEP_KEYS[flavor]
    const current = state.step?.index ?? 1
    return (
      <div role="status" className="sz-pro-stage-state">
        <p className="sz-pro-stage-state__title">{t('pro.stage.preparing')}</p>
        <ol className="sz-pro-steps">
          {steps.map((key, i) => {
            const index = i + 1
            const done = index < current
            const now = index === current
            const tone = done ? ' sz-pro-step--done' : now ? ' sz-pro-step--current' : ''
            return (
              <li
                key={key}
                className={`sz-pro-step${tone}`}
                aria-current={now ? 'step' : undefined}
              >
                <span className="sz-pro-step__dot" aria-hidden="true">
                  {done ? '✓' : index}
                </span>
                <span>{t(key)}</span>
                {done || now ? (
                  <span className="sr-only">
                    {` (${t(done ? 'pro.stage.stepDone' : 'pro.stage.stepCurrent')})`}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
        <p className="sz-pro-stage-state__hint">{t('pro.stage.preparingHint')}</p>
        {state.detail || children ? (
          <details className="sz-pro-stage-state__details">
            <summary>{t('pro.stage.details')}</summary>
            {state.detail ? <p className="sz-pro-stage-state__tech">{state.detail}</p> : null}
            {children}
          </details>
        ) : null}
      </div>
    )
  }
  if (state.phase === 'error') {
    return (
      <div role="alert" className="sz-pro-stage-state">
        <p className="sz-pro-stage-state__title">{t(`pro.stage.error.${subject}`)}</p>
        <p className="sz-pro-stage-state__hint">{t('pro.stage.error.hint')}</p>
        <div className="sz-pro-stage-state__actions">
          {onRun ? (
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--primary"
              disabled={!state.canRun}
              onClick={onRun}
            >
              {t('pro.stage.retry')}
            </button>
          ) : null}
          {onSeeProblem ? (
            <button type="button" className="sz-pro-btn" onClick={onSeeProblem}>
              {t('pro.stage.seeProblem')}
            </button>
          ) : null}
        </div>
        {state.error || children ? (
          <details className="sz-pro-stage-state__details" open>
            <summary>{t('pro.stage.details')}</summary>
            {state.error ? <pre className="sz-pro-stage-state__tech">{state.error}</pre> : null}
            {children}
          </details>
        ) : null}
      </div>
    )
  }
  if (state.phase === 'unsupported') {
    return (
      <div role="status" className="sz-pro-stage-state">
        <p className="sz-pro-stage-state__title">{t('pro.stage.unsupported.title')}</p>
        <p className="sz-pro-stage-state__hint">{t('pro.stage.unsupported.hint')}</p>
      </div>
    )
  }
  return null
}
