import type { JSX } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { cn, IconPlay, IconRefresh, IconStop } from '#ui'
import { proRunLabelKey, useProRun, useProRunApi } from '../../../state/proRun'
import { useT } from '../../../studio/i18n'

/**
 * Rodar / Rodar de novo / Parar no MEIO da barra do projeto Pro (redesenho de 11/2026): o único
 * lugar de onde o jogo ou o programa é posto para rodar. Lê o `proRun` da instância (quem
 * publica é a prévia montada) e chama as ações dela; Rodar também traz o palco à vista
 * (`revealStage`, registrado pelo layout do workspace). Sem prévia publicada (a proposta do
 * construtor na tela, o palco ainda montando) os dois ficam desligados. Carrega os
 * `data-live-target` do cursor da professora, que no Pro saem dos botões da prévia Python.
 */
export function ProRunControls({ iconOnly }: { iconOnly: boolean }): JSX.Element {
  const t = useT()
  const api = useProRunApi()
  const { phase, canRun, canStop } = useProRun(
    useShallow((s) => ({
      phase: s.state?.phase ?? null,
      canRun: Boolean(s.actions && s.state?.canRun),
      canStop: Boolean(s.actions && s.state?.canStop),
    })),
  )
  const runKey = proRunLabelKey(phase ? { phase } : null)
  const runLabel = t(runKey)
  const stopLabel = t('run.stop')
  return (
    <fieldset className="sz-bar-run">
      <legend className="sr-only">{t('run.controls')}</legend>
      <button
        type="button"
        data-live-target="studio-run"
        disabled={!canRun}
        title={iconOnly ? runLabel : undefined}
        onClick={() => {
          const { actions, revealStage } = api.getState()
          actions?.run()
          revealStage?.()
        }}
        className={cn('sz-bar-pill sz-bar-pill--primary', iconOnly && 'sz-bar-pill--icon')}
      >
        {/* Rodar de novo = as setas em círculo; o play fica para o primeiro Rodar. */}
        {runKey === 'run.runAgain' ? <IconRefresh /> : <IconPlay />}
        <span className={iconOnly ? 'sr-only' : undefined}>{runLabel}</span>
      </button>
      <button
        type="button"
        data-live-target="studio-stop"
        disabled={!canStop}
        title={iconOnly ? stopLabel : undefined}
        onClick={() => api.getState().actions?.stop()}
        className={cn('sz-bar-pill sz-bar-pill--stop', iconOnly && 'sz-bar-pill--icon')}
      >
        <IconStop />
        <span className={iconOnly ? 'sr-only' : undefined}>{stopLabel}</span>
      </button>
    </fieldset>
  )
}
