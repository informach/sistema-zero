import {
  type JSX,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type ImperativePanelGroupHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { cn, IconCode, IconFolder, IconMessageSquare, IconPlay, IconWindow } from '#ui'
import { type ProLayoutTier, proLayoutTier } from '../../../components/layout/layoutBreakpoints'
import { proRunLabelKey, useProRun, useProRunApi } from '../../../state/proRun'
import { useT } from '../../../studio/i18n'
import { useStudioLayout } from '../../../studio/layoutContext'
import { useStudioTutor } from '../../../studio/tutor'
import type { ProWorkspacePanel, ProWorkspacePreferences } from './model'
import { ProRail } from './ProRail'
import { ProStage, type ProStageSubject } from './ProStage'

type PhoneTab = 'files' | 'code' | 'game' | 'output'

/**
 * O layout do workspace Pro (redesenho de 11/2026) nos três tamanhos do PRÓPRIO Studio
 * (`proLayoutTier`): no LARGO, trilho + painel lateral fixo + [código | palco] + gaveta; no
 * TABLET, o painel lateral vira uma gaveta por cima do código; no CELULAR, abas no rodapé
 * (Arquivos · Código · Jogo · Saída) e o Rodar flutuando na aba Código.
 *
 * ⚠️ Regra 12 do CLAUDE.md: trocar de tamanho NÃO remonta Monaco nem a prévia. Trilho, painel
 * lateral, o grupo de painéis, a gaveta e a barra de abas são renderizados SEMPRE e só
 * alternam classes e `hidden`; o painel lateral é sempre o mesmo irmão antes do grupo; o grupo
 * fica montado (só `hidden`) no celular. `ProWorkspaceLayout.test.tsx` cobra isso.
 */
export function ProWorkspaceLayout({
  navigator,
  editor,
  preview,
  tutor,
  dock,
  subject,
  preferences,
  change,
  gameRequest,
  searchRequest,
  codeRequest = 0,
}: {
  navigator: (close: () => void, options: { phone: boolean }) => ReactNode
  editor: ReactNode
  preview: ReactNode | null
  tutor: ReactNode
  dock: ReactNode
  subject: ProStageSubject
  preferences: ProWorkspacePreferences
  change: (update: (previous: ProWorkspacePreferences) => ProWorkspacePreferences) => void
  gameRequest: number
  searchRequest: number
  codeRequest?: number
}): JSX.Element {
  const t = useT()
  const { width } = useStudioLayout()
  const tier: ProLayoutTier = proLayoutTier(width)
  const phone = tier === 'phone'
  const { open: tutorOpen, setOpen: setTutorOpen } = useStudioTutor()
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('code')
  const [panelOpen, setPanelOpen] = useState(true)
  const group = useRef<ImperativePanelGroupHandle>(null)
  const [panelsReady, setPanelsReady] = useState(false)
  const interacted = useRef(false)
  const id = useId()
  const panelId = `${id}-panel`
  const hasPreview = Boolean(preview)
  const proRun = useProRunApi()

  // No tablet o painel nasce fechado (é uma gaveta); no largo, aberto.
  const previousTier = useRef(tier)
  useEffect(() => {
    if (previousTier.current === tier) return
    previousTier.current = tier
    setPanelOpen(tier === 'wide')
  }, [tier])

  const sizes = useMemo(() => {
    if (phone) return phoneTab === 'game' && hasPreview ? [0, 100] : [100, 0]
    if (tutorOpen)
      return preferences.layout === 'split' && hasPreview ? preferences.sizes : [60, 40]
    if (!hasPreview || preferences.layout === 'code') return [100, 0]
    if (preferences.layout === 'game') return [0, 100]
    return preferences.sizes
  }, [phone, phoneTab, hasPreview, tutorOpen, preferences.layout, preferences.sizes])
  useLayoutEffect(() => {
    if (panelsReady) group.current?.setLayout(sizes)
  }, [sizes, panelsReady])

  useEffect(() => {
    if (!gameRequest) return
    setPhoneTab('game')
    setTutorOpen(false)
    change((previous) => (previous.layout === 'code' ? { ...previous, layout: 'split' } : previous))
  }, [gameRequest, setTutorOpen, change])
  // A Topbar chama junto com Rodar: traz o palco à vista, saindo de "Só o código" e, no
  // celular, abrindo a aba do jogo.
  useEffect(() => {
    proRun.getState().setRevealStage(() => {
      setPhoneTab('game')
      setTutorOpen(false)
      change((previous) =>
        previous.layout === 'code' ? { ...previous, layout: 'split' } : previous,
      )
    })
    return () => proRun.getState().setRevealStage(null)
  }, [proRun, setTutorOpen, change])
  useEffect(() => {
    if (!searchRequest) return
    setPhoneTab('files')
    setPanelOpen(true)
    change((previous) => ({
      ...previous,
      layout: previous.layout === 'game' ? 'split' : previous.layout,
    }))
  }, [searchRequest, change])
  useEffect(() => {
    if (codeRequest) setPhoneTab('code')
  }, [codeRequest])
  // A gaveta do tablet também fecha no Esc.
  useEffect(() => {
    if (tier !== 'tablet' || !panelOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tier, panelOpen])

  const arrange = (layout: ProWorkspacePreferences['layout']) => {
    if (layout === 'game') setTutorOpen(false)
    change((previous) => (previous.layout === layout ? previous : { ...previous, layout }))
  }
  const selectPanel = (view: ProWorkspacePanel) => {
    if (!phone && panelOpen && preferences.panel === view) {
      setPanelOpen(false)
      return
    }
    change((previous) => (previous.panel === view ? previous : { ...previous, panel: view }))
    setPanelOpen(true)
  }
  const closePanel = () => {
    if (tier === 'tablet') setPanelOpen(false)
    if (phone) setPhoneTab('code')
  }
  const resize = (next: number[]) => {
    if (next.length === 2) setPanelsReady(true)
    if (
      !interacted.current ||
      phone ||
      tutorOpen ||
      preferences.layout !== 'split' ||
      next.some((size) => size < 20)
    )
      return
    change((previous) =>
      next.every((size, index) => Math.abs(size - (previous.sizes[index] ?? 0)) < 0.1)
        ? previous
        : { ...previous, sizes: next },
    )
  }
  const sideVisible = phone ? phoneTab === 'files' : panelOpen
  const bodyHidden = phone && phoneTab === 'output'
  const resizerVisible = !phone && (sizes[0] ?? 0) > 0 && (sizes[1] ?? 0) > 0
  const stageHidden = (sizes[1] ?? 0) === 0 || (!phone && tutorOpen)
  return (
    <div
      data-sz-pro-tier={tier}
      className="sz-pro-root relative flex h-full min-h-0 flex-col bg-sz-bg"
    >
      <div hidden={bodyHidden} className="relative flex min-h-0 flex-1">
        <div hidden={phone}>
          <ProRail
            view={preferences.panel}
            open={panelOpen}
            panelId={panelId}
            onSelect={selectPanel}
          />
        </div>
        {/* A gaveta do tablet fecha tocando fora. */}
        {tier === 'tablet' && panelOpen ? (
          <button
            type="button"
            aria-label={t('pro.panel.close')}
            className="sz-pro-backdrop"
            onClick={() => setPanelOpen(false)}
          />
        ) : null}
        <div
          id={panelId}
          hidden={!sideVisible}
          className={cn(
            'sz-pro-side',
            tier === 'wide' && 'sz-pro-side--column',
            tier === 'tablet' && 'sz-pro-side--drawer',
            phone && 'sz-pro-side--full',
          )}
        >
          {navigator(closePanel, { phone })}
        </div>
        <div className="relative min-h-0 min-w-0 flex-1">
          <PanelGroup
            ref={group}
            direction="horizontal"
            onLayout={resize}
            style={{ overflow: 'visible' }}
          >
            <Panel
              id={`${id}-code`}
              order={1}
              defaultSize={60}
              minSize={20}
              collapsible
              collapsedSize={0}
            >
              <div hidden={(sizes[0] ?? 0) === 0} className="h-full">
                {editor}
              </div>
            </Panel>
            <PanelResizeHandle
              aria-label={t('pro.layout.label')}
              disabled={!resizerVisible}
              tabIndex={resizerVisible ? 0 : -1}
              className={resizerVisible ? 'sz-resize-handle sz-resize-handle--vertical' : 'hidden'}
              onDragging={(dragging) => {
                if (dragging) interacted.current = true
              }}
              onKeyDown={() => {
                interacted.current = true
              }}
            />
            <Panel
              id={`${id}-stage`}
              order={2}
              defaultSize={40}
              minSize={20}
              collapsible
              collapsedSize={0}
              style={{ overflow: phone && tutorOpen ? 'visible' : 'hidden' }}
            >
              <div hidden={stageHidden} className="h-full">
                {hasPreview ? (
                  <ProStage
                    subject={subject}
                    layout={preferences.layout}
                    tier={tier}
                    onArrange={arrange}
                  >
                    {preview}
                  </ProStage>
                ) : null}
              </div>
              {!phone && tutorOpen ? (
                <div className="flex shrink-0 justify-end border-b border-sz-border bg-sz-panel px-2 py-1">
                  <button
                    type="button"
                    className="sz-pro-btn sz-pro-btn--sm"
                    onClick={() => setTutorOpen(false)}
                  >
                    {t('pro.tutor.back')}
                  </button>
                </div>
              ) : null}
              <div className={phone ? 'contents' : 'relative h-full'}>{tutor}</div>
            </Panel>
          </PanelGroup>
          {phone && phoneTab === 'code' && hasPreview ? (
            <PhoneRunFab onRun={() => setPhoneTab('game')} />
          ) : null}
        </div>
      </div>
      <div
        hidden={phone && phoneTab !== 'output'}
        className={phone ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0'}
      >
        {dock}
      </div>
      {phone ? (
        <PhoneTabBar
          tab={phoneTab}
          hasPreview={hasPreview}
          subject={subject}
          onSelect={(next) => {
            setPhoneTab(next)
            if (next === 'game') setTutorOpen(false)
            // A aba Saída é a gaveta inteira: se ela estava fechada, abre nos Problemas.
            if (next === 'output')
              change((previous) =>
                previous.bottom === 'closed' ? { ...previous, bottom: 'problems' } : previous,
              )
          }}
        />
      ) : null}
    </div>
  )
}

/** O Rodar flutuando na aba Código do celular (a Topbar não mostra o par nesse tamanho). */
function PhoneRunFab({ onRun }: { onRun: () => void }): JSX.Element {
  const t = useT()
  const api = useProRunApi()
  const { phase, canRun } = useProRun(
    useShallow((s) => ({
      phase: s.state?.phase ?? null,
      canRun: Boolean(s.actions && s.state?.canRun),
    })),
  )
  return (
    <button
      type="button"
      className="sz-pro-fab"
      data-live-target="studio-run"
      disabled={!canRun}
      onClick={() => {
        api.getState().actions?.run()
        onRun()
      }}
    >
      <IconPlay />
      <span>{t(proRunLabelKey(phase ? { phase } : null))}</span>
    </button>
  )
}

const PHASE_DOT: Record<string, string> = {
  running: 'var(--color-sz-success)',
  waiting: 'var(--color-sz-warn)',
  preparing: 'var(--color-sz-accent)',
  error: 'var(--color-sz-error)',
}

function PhoneTabBar({
  tab,
  hasPreview,
  subject,
  onSelect,
}: {
  tab: PhoneTab
  hasPreview: boolean
  subject: ProStageSubject
  onSelect: (tab: PhoneTab) => void
}): JSX.Element {
  const t = useT()
  const phase = useProRun((s) => s.state?.phase ?? null)
  const dot = phase ? PHASE_DOT[phase] : undefined
  const tabs: { id: PhoneTab; label: string; Icon: typeof IconFolder }[] = [
    { id: 'files', label: t('pro.files'), Icon: IconFolder },
    { id: 'code', label: t('pro.phone.code'), Icon: IconCode },
    ...(hasPreview
      ? [{ id: 'game' as const, label: t(`pro.stage.title.${subject}`), Icon: IconWindow }]
      : []),
    { id: 'output', label: t('pro.phone.output'), Icon: IconMessageSquare },
  ]
  return (
    <nav className="sz-pro-tabbar" aria-label={t('pro.phone.parts')}>
      <div role="tablist" className="contents">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="sz-pro-tabbar-btn"
            onClick={() => onSelect(id)}
          >
            <Icon />
            <span>{label}</span>
            {id === 'game' && dot ? (
              <span
                aria-hidden="true"
                className="sz-pro-tabbar-btn__dot"
                style={{ background: dot }}
              />
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  )
}
