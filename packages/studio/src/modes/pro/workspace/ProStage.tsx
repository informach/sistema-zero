import { type JSX, type ReactNode, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  cn,
  IconCode,
  IconColumns,
  IconMaximize,
  IconPlay,
  IconRefresh,
  IconStop,
  IconWindow,
} from '#ui'
import type { ProLayoutTier } from '../../../components/layout/layoutBreakpoints'
import { useMeasuredWidth } from '../../../hooks/useMeasuredWidth'
import { type ProRunPhase, proRunLabelKey, useProRun, useProRunApi } from '../../../state/proRun'
import { useT } from '../../../studio/i18n'
import type { ProWorkspacePreferences } from './model'

export type ProStageSubject = 'game' | 'program'
type Layout = ProWorkspacePreferences['layout']

const PILL: Record<ProRunPhase, { tone: string; key: string }> = {
  idle: { tone: 'sz-pro-pill--quiet', key: 'run.status.idle' },
  preparing: { tone: 'sz-pro-pill--prep', key: 'run.status.preparing' },
  running: { tone: 'sz-pro-pill--run', key: 'run.status.running' },
  waiting: { tone: 'sz-pro-pill--wait', key: 'run.status.waiting' },
  done: { tone: 'sz-pro-pill--done', key: 'run.status.done' },
  error: { tone: 'sz-pro-pill--error', key: 'run.status.error' },
  unsupported: { tone: 'sz-pro-pill--error', key: 'run.status.unsupported' },
}

/**
 * O palco do workspace Pro (redesenho de 11/2026): o cabeçalho [Jogo/Programa] [pílula de
 * estado] [Lado a lado · Só o código · Só o jogo] [⟳] [tela cheia] e, embaixo, a prévia (que
 * desenha o jogo ou o cartão de estado). No celular o segmentado sai (as abas do rodapé fazem
 * isso) e entra o par Rodar / Parar embaixo do palco, com os `data-live-target` que a Topbar
 * deixou de carregar nesse tamanho.
 */
export function ProStage({
  subject,
  layout,
  tier,
  onArrange,
  liveTargets = false,
  children,
}: {
  subject: ProStageSubject
  layout: Layout
  tier: ProLayoutTier
  onArrange: (layout: Layout) => void
  /** O par Rodar/Parar do celular leva os alvos da professora só quando está à vista. */
  liveTargets?: boolean
  children: ReactNode
}): JSX.Element {
  const t = useT()
  const api = useProRunApi()
  const card = useRef<HTMLDivElement>(null)
  const { phase, stale, canRun, canStop, canReload } = useProRun(
    useShallow((s) => ({
      phase: s.state?.phase ?? null,
      stale: Boolean(s.state?.stale),
      canRun: Boolean(s.actions && s.state?.canRun),
      canStop: Boolean(s.actions && s.state?.canStop),
      canReload: Boolean(
        s.actions?.reload && (s.state?.phase === 'running' || s.state?.phase === 'done'),
      ),
    })),
  )
  const phone = tier === 'phone'
  // O segmentado fica só no ícone quando o PRÓPRIO palco é estreito (o palco ocupa a fatia que a
  // criança deixou), não só pelo tamanho do Studio.
  const width = useMeasuredWidth(card)
  const compact = tier !== 'wide' || (width > 0 && width < 640)
  const stageOnly = subject === 'game' ? 'pro.layout.game' : 'pro.layout.program'
  const segment: { id: Layout; key: string; Icon: typeof IconColumns }[] = [
    { id: 'split', key: 'pro.layout.split', Icon: IconColumns },
    { id: 'code', key: 'pro.layout.code', Icon: IconCode },
    { id: 'game', key: stageOnly, Icon: IconWindow },
  ]
  const pill = phase ? PILL[phase] : null
  return (
    <div ref={card} className="sz-pro-stage flex h-full min-h-0 flex-col bg-sz-bg">
      <header className="sz-pro-stage__head">
        <h2 className="sz-pro-stage__title">{t(`pro.stage.title.${subject}`)}</h2>
        {pill ? (
          <span role="status" className={cn('sz-pro-pill', pill.tone)}>
            {t(pill.key)}
          </span>
        ) : null}
        {stale ? (
          <span className="sz-pro-pill sz-pro-pill--wait sz-pro-pill--quiet">
            {t('pro.stage.stale')}
          </span>
        ) : null}
        <span className="flex-1" />
        {!phone ? (
          <fieldset className="sz-pro-seg">
            <legend className="sr-only">{t('pro.layout.label')}</legend>
            {segment.map(({ id, key, Icon }) => (
              <button
                key={id}
                type="button"
                className={cn('sz-pro-seg-btn', compact && 'sz-pro-seg-btn--icon')}
                aria-pressed={layout === id}
                aria-label={t(key)}
                title={compact ? t(key) : undefined}
                onClick={() => onArrange(id)}
              >
                <Icon />
                {!compact ? <span>{t(key)}</span> : null}
              </button>
            ))}
          </fieldset>
        ) : null}
        {canReload ? (
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--icon"
            aria-label={t('run.reload')}
            title={t('run.reload')}
            onClick={() => api.getState().actions?.reload?.()}
          >
            <IconRefresh />
          </button>
        ) : null}
        <button
          type="button"
          className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--icon"
          aria-label={t('run.fullscreen')}
          title={t('run.fullscreen')}
          onClick={() => void card.current?.requestFullscreen?.().catch(() => undefined)}
        >
          <IconMaximize />
        </button>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
      {phone ? (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-sz-border bg-sz-panel p-2">
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--primary"
            data-live-target={liveTargets ? 'studio-run' : undefined}
            disabled={!canRun}
            onClick={() => api.getState().actions?.run()}
          >
            <IconPlay />
            <span>{t(proRunLabelKey(phase ? { phase } : null))}</span>
          </button>
          <button
            type="button"
            className="sz-pro-btn"
            data-live-target={liveTargets ? 'studio-stop' : undefined}
            disabled={!canStop}
            onClick={() => api.getState().actions?.stop()}
          >
            <IconStop />
            <span>{t('run.stop')}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
