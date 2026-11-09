import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import type { ImperativePanelGroupHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { cn, IconColumns, IconMaximize, IconPlay, IconRefresh, IconStop } from '#ui'
import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import { useHighlightStoreApi } from '../../state/highlightStore'
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
  cards,
  onToggleLarge,
  onShowBlock,
  onOpenProblems,
  liveTargets = true,
  children,
}: {
  subject: ProStageSubject
  /** Celular: sem "Jogo maior" e com o par Rodar / Parar embaixo do palco. */
  phone: boolean
  /**
   * Os cartões por cima da prévia: `all` = "Aperte Rodar…" (parado) e "Opa, o jogo parou" (erro);
   * `error` = só o do erro (a prévia Python desenha o parado e o preparando, mas o "Opa" com
   * "Mostrar o bloco" é deste palco, que sabe trazer a aba dos blocos no estreito).
   */
  cards: 'all' | 'error'
  /** Presente no largo: alterna o "Jogo maior" (meio a meio). */
  onToggleLarge?: () => void
  /** "Mostrar o bloco" do cartão de erro (quando o erro tem lugar no código). */
  onShowBlock?: () => void
  /** "Ver em Problemas" do cartão de erro (quando o erro não tem lugar no código). */
  onOpenProblems?: () => void
  /**
   * O par Rodar/Parar do celular leva os alvos do cursor da professora só quando está à vista
   * (com a aba dos blocos aberta, o alvo do Rodar é o botão flutuante).
   */
  liveTargets?: boolean
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
        {state &&
        ((cards === 'all' && state.phase === 'idle') ||
          (state.phase === 'error' && state.errorKind === 'runtime')) ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-sz-bg p-4">
            <ProStageState
              state={state}
              subject={subject}
              flavor="classic"
              idleHintKey="pro.stage.idle.hint.blocks"
              seeProblemKey={state.errorAt ? 'stage.showBlock' : 'stage.seeProblems'}
              onRun={run}
              onSeeProblem={state.errorAt ? onShowBlock : onOpenProblems}
            />
          </div>
        ) : null}
      </div>
      {phone ? (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-sz-border bg-sz-panel p-2">
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--primary"
            data-live-target={liveTargets ? 'studio-run' : undefined}
            disabled={!canRun}
            onClick={run}
          >
            {phase && proRunLabelKey({ phase }) === 'run.runAgain' ? <IconRefresh /> : <IconPlay />}
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
  const highlight = useHighlightStoreApi()
  const setClassicDock = useUIStore((s) => s.setClassicDock)
  const [previewRequest, setPreviewRequest] = useState(0)
  // No estreito blocos, jogo e mensagens são abas: "Mostrar o bloco" traz a aba dos blocos e
  // "Ver em Problemas" a das mensagens (os pedidos sobem e o `NarrowPanels` troca a aba).
  const [editorRequest, setEditorRequest] = useState(0)
  const [dockRequest, setDockRequest] = useState(0)
  // A aba à vista no estreito (o `NarrowPanels` avisa): no celular, o alvo ao vivo do Rodar é o
  // botão flutuante enquanto a criança está nos blocos, e o par do palco na aba do jogo.
  const [narrowTab, setNarrowTab] = useState('')
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
  const phone = proLayoutTier(width) === 'phone'
  return {
    group,
    previewRequest,
    editorRequest,
    dockRequest,
    phone,
    setNarrowTab,
    stageLiveTargets: !phone || narrowTab === 'preview',
    toggleLarge: () => setStageLarge(!stageLarge),
    /** Depois do pedido ao editor (`revealBlock`), no estreito traz a aba dos blocos. */
    revealBlocks: () => {
      if (isNarrow) setEditorRequest((n) => n + 1)
    },
    showBlock: () => {
      highlight.getState().revealBlock({ kind: 'runtime' })
      if (isNarrow) setEditorRequest((n) => n + 1)
    },
    openProblems: () => {
      setClassicDock('problems')
      if (isNarrow) setDockRequest((n) => n + 1)
    },
  }
}

/**
 * O Rodar flutuando sobre os blocos no celular (como no Pro): a barra de cima não tem o par nesse
 * tamanho. Rodar também traz a aba do jogo (`revealStage`). Leva o alvo ao vivo do Rodar.
 */
export function ClassicRunFab(): JSX.Element {
  const t = useT()
  const api = useProRunApi()
  const { phase, canRun } = useProRun(
    useShallow((s) => ({
      phase: s.state?.phase ?? null,
      canRun: Boolean(s.actions && s.state?.canRun),
    })),
  )
  const key = proRunLabelKey(phase ? { phase } : null)
  return (
    <button
      type="button"
      className="sz-pro-fab"
      data-live-target="studio-run"
      disabled={!canRun}
      onClick={() => {
        const { actions, revealStage } = api.getState()
        actions?.run()
        revealStage?.()
      }}
    >
      {key === 'run.runAgain' ? <IconRefresh /> : <IconPlay />}
      <span>{t(key)}</span>
    </button>
  )
}
