import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import type { ImperativePanelGroupHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { cn, IconColumns, IconMaximize, IconPlay, IconRefresh, IconStop } from '#ui'
import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import { proRunLabelKey, useProRun, useProRunApi } from '../../state/proRun'
import { useUIStore } from '../../state/uiStore'
import { useT } from '../../studio/i18n'
import { useStudioLayout } from '../../studio/layoutContext'
import { proLayoutTier } from '../layout/layoutBreakpoints'
import { ProStageState, type ProStageSubject } from './ProStageState'
import { STAGE_PILL } from './stagePill'

/** Abaixo desta largura do PRÓPRIO palco, os botões do cabeçalho ficam só no ícone. */
const STAGE_HEAD_COMPACT_MAX_PX = 520

/**
 * O palco do Estúdio clássico, blocos e Ponte, JavaScript e Python (redesenho de 11/2026): o
 * cabeçalho do palco do Pro — [Jogo/Página/Programa] [pílula de estado] [Atualizar] [Jogo maior]
 * [tela cheia] — e, embaixo, a prévia. Quem roda e para é a barra de cima (`ProRunControls`,
 * lendo o `proRun` que a prévia publica); no celular, onde a barra não tem o Rodar, entra o par
 * Rodar / Parar embaixo do palco, com os `data-live-target`.
 *
 * ⚠️ O "Atualizar" (a seta redonda logo acima do jogo) é uma âncora das aulas gravadas: a fala
 * do Desafio do Farol manda clicar nele, e o robô de gravação o acha pelo nome acessível
 * "Atualizar o preview". Não renomear nem tirar daqui.
 */
export function ClassicStage({
  subject,
  phone,
  idleCard,
  onToggleLarge,
  children,
}: {
  subject: ProStageSubject
  /** Celular: sem "Jogo maior" e com o par Rodar / Parar embaixo do palco. */
  phone: boolean
  /** Desenha o cartão "Aperte Rodar…" por cima da prévia parada (a prévia Python já tem o dela). */
  idleCard: boolean
  /** Presente no largo: alterna o "Jogo maior" (meio a meio). */
  onToggleLarge?: () => void
  children: ReactNode
}): JSX.Element {
  const t = useT()
  const api = useProRunApi()
  const card = useRef<HTMLDivElement>(null)
  const width = useMeasuredWidth(card)
  const compact = phone || (width > 0 && width < STAGE_HEAD_COMPACT_MAX_PX)
  const stageLarge = useUIStore((s) => s.stageLarge)
  const { state, canRun, canStop, canReload } = useProRun(
    useShallow((s) => ({
      state: s.state,
      canRun: Boolean(s.actions && s.state?.canRun),
      canStop: Boolean(s.actions && s.state?.canStop),
      canReload: Boolean(s.actions?.reload && s.state?.canRun),
    })),
  )
  const phase = state?.phase ?? null
  const pill = phase ? STAGE_PILL[phase] : null
  const reloadText = t('run.reload')
  const run = () => {
    const { actions, revealStage } = api.getState()
    actions?.run()
    revealStage?.()
  }
  return (
    <div ref={card} className="sz-pro-stage flex h-full min-h-0 flex-col bg-sz-bg">
      <header className="sz-pro-stage__head">
        <h2 className="sz-pro-stage__title">{t(`pro.stage.title.${subject}`)}</h2>
        {pill ? (
          <span role="status" className={cn('sz-pro-pill', pill.tone)}>
            {t(pill.key)}
          </span>
        ) : null}
        <span className="flex-1" />
        {canReload ? (
          <button
            type="button"
            className={cn('sz-pro-btn sz-pro-btn--sm', compact && 'sz-pro-btn--icon')}
            aria-label={t('stage.reloadLabel')}
            title={reloadText}
            onClick={() => api.getState().actions?.reload?.()}
          >
            <IconRefresh />
            {!compact ? <span aria-hidden="true">{reloadText}</span> : null}
          </button>
        ) : null}
        {onToggleLarge && !phone ? (
          <button
            type="button"
            className={cn('sz-pro-btn sz-pro-btn--sm', compact && 'sz-pro-btn--icon')}
            aria-pressed={stageLarge}
            title={compact ? t(stageLarge ? 'stage.smaller' : 'stage.bigger') : undefined}
            onClick={onToggleLarge}
          >
            <IconColumns />
            {!compact ? <span>{t(stageLarge ? 'stage.smaller' : 'stage.bigger')}</span> : null}
            {compact ? (
              <span className="sr-only">{t(stageLarge ? 'stage.smaller' : 'stage.bigger')}</span>
            ) : null}
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
      <div className="relative min-h-0 flex-1">
        {children}
        {idleCard && state?.phase === 'idle' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-sz-bg p-4">
            <ProStageState
              state={state}
              subject={subject}
              flavor="classic"
              idleHintKey="pro.stage.idle.hint.blocks"
              onRun={run}
            />
          </div>
        ) : null}
      </div>
      {phone ? (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-sz-border bg-sz-panel p-2">
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--primary"
            data-live-target="studio-run"
            disabled={!canRun}
            onClick={run}
          >
            {phase && proRunLabelKey({ phase }) === 'run.runAgain' ? <IconRefresh /> : <IconPlay />}
            <span>{t(proRunLabelKey(phase ? { phase } : null))}</span>
          </button>
          <button
            type="button"
            className="sz-pro-btn"
            data-live-target="studio-stop"
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

/**
 * A fiação do palco clássico num modo (Blocos, Ponte, Python): o "Jogo maior" (o `PanelGroup`
 * do modo passa a dividir meio a meio), o tamanho celular e o `revealStage` que a barra chama
 * junto com o Rodar (no largo mostra o palco escondido; no estreito abre a aba do jogo).
 * `normal`/`large` são os tamanhos dos painéis do modo, na ordem do `PanelGroup`.
 */
export function useClassicStage(
  sizes: { normal: number[]; large: number[] },
  showPreview: boolean,
) {
  const { width, isNarrow } = useStudioLayout()
  const group = useRef<ImperativePanelGroupHandle>(null)
  const stageLarge = useUIStore((s) => s.stageLarge)
  const setStageLarge = useUIStore((s) => s.setStageLarge)
  const setShowPreview = useUIStore((s) => s.setShowPreview)
  const api = useProRunApi()
  const [previewRequest, setPreviewRequest] = useState(0)
  const sizesRef = useRef(sizes)
  sizesRef.current = sizes
  useEffect(() => {
    if (!showPreview || isNarrow) return
    group.current?.setLayout(stageLarge ? sizesRef.current.large : sizesRef.current.normal)
  }, [stageLarge, showPreview, isNarrow])
  useEffect(() => {
    api.getState().setRevealStage(() => {
      if (isNarrow) setPreviewRequest((n) => n + 1)
      else setShowPreview(true)
    })
    return () => api.getState().setRevealStage(null)
  }, [api, isNarrow, setShowPreview])
  return {
    group,
    previewRequest,
    phone: proLayoutTier(width) === 'phone',
    toggleLarge: () => setStageLarge(!stageLarge),
  }
}
