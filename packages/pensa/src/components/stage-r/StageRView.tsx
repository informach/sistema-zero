/**
 * Tela da ETAPA R (Rodar as Missões). ANTES de tudo, se o projeto ainda não
 * escolheu ONDE construir (detail.buildEnv null) → CHOOSER de 3 cartões
 * (BuildEnvChooser); o header ganha um chip discreto da escolha + "Trocar"
 * (reabre o chooser sem perder nada). Depois: sem plano → hero "Criar as
 * missões"; plano salvo sem quadro vivo → "Recriar as missões"; com tasks →
 * KanbanBoard. Abrir uma missão semeia o projeto do Estúdio (LAZY; NUNCA no
 * env 'external') e o comportamento segue o buildEnv: 'embedded' = MODO
 * MISSÃO split (desktop ≥1024px + adapter.renderStudio + semeado); 'studio' =
 * SEMPRE painel com "Abrir o Estúdio" em destaque; 'external' = painel guia
 * puro com a linha gentil de orientação. Todas em 'done' → CTA de avanço r→o
 * (toast "+XP" quando o advance devolve gamificação). Componente INTERNO — a
 * stageRStore é criada POR INSTÂNCIA.
 */
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { PensaBuildEnv } from '../../core/types'
import { createStageRStore } from '../../state/stageRStore'
import { usePensaApp, usePensaStore } from '../appContext'
import { GeneratingIndicator } from '../common/GeneratingIndicator'
import { useMediaQuery } from '../common/useMediaQuery'
import { BuildEnvChooser, ENV_EMOJI } from './BuildEnvChooser'
import { KanbanBoard } from './KanbanBoard'
import { MissionMode } from './MissionMode'
import { MissionSheet } from './MissionSheet'

/** Tempo do toast "+XP" na tela antes de voltar ao mapa. */
export const R_ADVANCE_TOAST_MS = 1200

export function StageRView({
  onBack,
  onAdvanced,
}: {
  /** Volta ao mapa (sem avançar). */
  onBack: () => void
  /** Avanço r→o concluído: o ProjectView volta ao mapa e re-busca o projeto. */
  onAdvanced: () => void
}): JSX.Element | null {
  const { adapter, copy, store: projectStore } = usePensaApp()
  const detail = usePensaStore((s) => s.detail)
  const [stageStore] = useState(() =>
    createStageRStore(adapter.transport, {
      ...(adapter.createStudioProject ? { createStudioProject: adapter.createStudioProject } : {}),
      // A semeadura PATCHa o projeto: lista + detalhe absorvem o id novo.
      onProjectUpdated: (project) => projectStore.getState().absorbDetail(project),
    }),
  )
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // Chooser REABERTO via "Trocar" (com buildEnv null ele abre sozinho).
  const [chooserOpen, setChooserOpen] = useState(false)
  const advanceTimer = useRef<number | null>(null)
  // Split do Modo Missão: desktop largo + renderStudio + projeto semeado.
  const wide = useMediaQuery('(min-width: 1024px)')
  const settingBuildEnv = usePensaStore((s) => s.settingBuildEnv)
  const buildEnvError = usePensaStore((s) => s.buildEnvError)

  const cycleId = detail?.currentCycle.id ?? null

  useEffect(() => {
    if (cycleId) void stageStore.getState().loadStage(cycleId)
  }, [stageStore, cycleId])

  useEffect(() => {
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    }
  }, [])

  const loadingStage = useStore(stageStore, (s) => s.loadingStage)
  const stageLoaded = useStore(stageStore, (s) => s.stageLoaded)
  const stageError = useStore(stageStore, (s) => s.stageError)
  const hasPlan = useStore(stageStore, (s) => s.hasPlan)
  const tasks = useStore(stageStore, (s) => s.tasks)
  const generating = useStore(stageStore, (s) => s.generating)
  const generateError = useStore(stageStore, (s) => s.generateError)
  const movingTaskId = useStore(stageStore, (s) => s.movingTaskId)
  const advancing = useStore(stageStore, (s) => s.advancing)
  const advanceError = useStore(stageStore, (s) => s.advanceError)

  if (!detail || !cycleId) return null

  const c = copy.stageR
  const buildEnv = detail.buildEnv
  const openTask = openTaskId !== null ? (tasks?.find((t) => t.id === openTaskId) ?? null) : null
  const studioProjectId = detail.studioProjectId
  const allDone = tasks !== null && tasks.length > 0 && tasks.every((t) => t.column === 'done')

  // ── Chooser "Onde você vai construir?" (ANTES de tudo) ─────────────────────
  if (buildEnv === null || chooserOpen) {
    const handleChoose = (env: PensaBuildEnv): void => {
      void projectStore
        .getState()
        .setBuildEnv(detail.id, env)
        .then((ok) => {
          if (ok) setChooserOpen(false)
        })
    }
    return (
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 p-6">
        <header className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={copy.chat.backToMap}
            className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-pz-border bg-pz-surface px-4 font-semibold text-pz-text transition hover:border-pz-accent"
          >
            <span aria-hidden="true">←</span>
            Voltar
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-pz-text">{copy.stages.r.name}</h2>
            <p className="truncate text-sm text-pz-muted">{detail.name}</p>
          </div>
        </header>
        <BuildEnvChooser
          current={buildEnv}
          busy={settingBuildEnv}
          error={buildEnvError}
          onChoose={handleChoose}
          onKeep={buildEnv !== null ? () => setChooserOpen(false) : null}
        />
      </div>
    )
  }

  const handleOpenMission = (taskId: string): void => {
    setOpenTaskId(taskId)
    // Semeadura LAZY na 1ª abertura (no-op sem a capability ou já semeado).
    // No env 'external' NÃO semeia: a criança constrói fora do Estúdio.
    if (buildEnv !== 'external') void stageStore.getState().ensureStudioProject(detail)
  }

  const handleFinishMission = async (): Promise<void> => {
    if (!openTask) return
    const ok = await stageStore.getState().moveTask(openTask.id, 'done')
    if (ok) setOpenTaskId(null)
  }

  const handleAdvance = async (): Promise<void> => {
    const ok = await stageStore.getState().advance()
    if (!ok) return
    const delta = stageStore.getState().gamification
    if (delta && delta.xpAwarded > 0) {
      // Toast discreto de XP antes de voltar ao mapa.
      setToast(c.xpToast(delta.xpAwarded))
      advanceTimer.current = window.setTimeout(onAdvanced, R_ADVANCE_TOAST_MS)
    } else {
      onAdvanced()
    }
  }

  const openStudio = adapter.onOpenStudio
  const handleOpenStudio = openStudio
    ? () =>
        openStudio({
          pensaProjectId: detail.id,
          studioProjectId: detail.studioProjectId,
          name: detail.name,
        })
    : null

  // ── Missão aberta ──────────────────────────────────────────────────────────
  if (openTask) {
    const sheet = (
      <MissionSheet
        task={openTask}
        finishing={movingTaskId === openTask.id}
        onFinish={() => {
          void handleFinishMission()
        }}
        // 'external': sem "Abrir o Estúdio"; entra a linha gentil de orientação.
        onOpenStudio={buildEnv === 'external' ? null : handleOpenStudio}
        // 'studio': a missão é o guia e o Estúdio Completo é o destino.
        openStudioEmphasis={buildEnv === 'studio'}
        guidance={buildEnv === 'external' ? copy.buildEnv.externalGuidance : null}
      />
    )
    // Split SÓ no env 'embedded' ('studio'/'external' abrem sempre o painel).
    if (buildEnv === 'embedded' && wide && adapter.renderStudio && studioProjectId) {
      return (
        <MissionMode
          title={openTask.title}
          studio={adapter.renderStudio(studioProjectId, detail.id)}
          onBack={() => setOpenTaskId(null)}
        >
          {sheet}
        </MissionMode>
      )
    }
    // Sem split (env studio/external, tela estreita ou host sem renderStudio/
    // semeadura): painel normal.
    return (
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-6">
        <header className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpenTaskId(null)}
            className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-pz-border bg-pz-surface px-4 font-semibold text-pz-text transition hover:border-pz-accent"
          >
            <span aria-hidden="true">←</span>
            {c.backToBoard}
          </button>
          <h2 className="min-w-0 flex-1 truncate text-xl font-extrabold text-pz-text">
            {openTask.title}
          </h2>
        </header>
        <section className="rounded-3xl border-2 border-pz-border bg-pz-surface p-5">
          {sheet}
        </section>
      </div>
    )
  }

  // ── Quadro / hero ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={copy.chat.backToMap}
            className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-pz-border bg-pz-surface px-4 font-semibold text-pz-text transition hover:border-pz-accent"
          >
            <span aria-hidden="true">←</span>
            Voltar
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-pz-text">{copy.stages.r.name}</h2>
            <p className="truncate text-sm text-pz-muted">{detail.name}</p>
          </div>
        </div>
        {/* Chip discreto da escolha de onde construir + "Trocar" (reabre o chooser). */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-pz-surface px-3 py-1 text-sm font-semibold text-pz-muted">
            <span aria-hidden="true">{ENV_EMOJI[buildEnv]} </span>
            {copy.buildEnv.chip[buildEnv]}
          </span>
          <button
            type="button"
            onClick={() => setChooserOpen(true)}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-4 text-sm font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
          >
            {copy.buildEnv.change}
          </button>
        </div>
      </header>

      {stageError ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-10 text-center">
          <span aria-hidden="true" className="text-4xl">
            🫧
          </span>
          <h3 className="text-lg font-bold text-pz-text">{copy.errors.title}</h3>
          <p role="alert" className="text-pz-muted">
            {stageError}
          </p>
          <button
            type="button"
            onClick={() => {
              void stageStore.getState().loadStage(cycleId)
            }}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
          >
            {copy.errors.retry}
          </button>
        </div>
      ) : loadingStage || !stageLoaded ? (
        <p aria-busy="true" className="py-10 text-center text-pz-muted">
          {c.loading}
        </p>
      ) : tasks === null && !hasPlan ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-12 text-center">
          <span aria-hidden="true" className="text-5xl">
            🗺️
          </span>
          <h3 className="text-2xl font-extrabold text-pz-text">{c.heroTitle}</h3>
          <p className="max-w-md text-pz-muted">{c.heroBody}</p>
          {generateError ? (
            <p role="alert" className="font-semibold text-pz-warn">
              {generateError}
            </p>
          ) : null}
          {generating ? (
            <GeneratingIndicator message={c.generating} hint={c.generatingHint} />
          ) : (
            <button
              type="button"
              onClick={() => {
                void stageStore.getState().generateMissions(detail.id)
              }}
              className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105"
            >
              <span aria-hidden="true">🪄 </span>
              {c.createCta}
            </button>
          )}
        </section>
      ) : tasks === null ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-12 text-center">
          <span aria-hidden="true" className="text-5xl">
            📦
          </span>
          <h3 className="text-2xl font-extrabold text-pz-text">{c.regenTitle}</h3>
          <p className="max-w-md text-pz-muted">{c.regenBody}</p>
          {generateError ? (
            <p role="alert" className="font-semibold text-pz-warn">
              {generateError}
            </p>
          ) : null}
          {generating ? (
            <GeneratingIndicator message={c.generating} hint={c.generatingHint} />
          ) : (
            <button
              type="button"
              onClick={() => {
                void stageStore.getState().generateMissions(detail.id)
              }}
              className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105"
            >
              {c.regenCta}
            </button>
          )}
        </section>
      ) : (
        <>
          <KanbanBoard store={stageStore} onOpenMission={handleOpenMission} />

          {allDone ? (
            <section className="flex flex-col items-center gap-2 rounded-3xl border-2 border-pz-ok bg-pz-surface p-6 text-center">
              <span aria-hidden="true" className="text-4xl">
                🚀
              </span>
              <h3 className="text-xl font-bold text-pz-text">{c.allDoneTitle}</h3>
              <p className="max-w-md text-pz-muted">{c.allDoneBody}</p>
              {advanceError ? (
                <p role="alert" className="font-semibold text-pz-warn">
                  {advanceError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void handleAdvance()
                }}
                disabled={advancing || toast !== null}
                aria-busy={advancing || undefined}
                className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {c.advanceCta}
              </button>
            </section>
          ) : null}
        </>
      )}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 border-pz-ok bg-pz-surface px-5 py-2.5 font-extrabold text-pz-ok shadow-lg"
        >
          <span aria-hidden="true">✨ </span>
          {toast}
        </div>
      ) : null}
    </div>
  )
}
