/**
 * Tela do projeto aberto: header (voltar, nome, chip "Versão N"), Mapa da
 * criação e o painel da etapa CORRENTE. As quatro etapas (Z chat de clareza,
 * E spec amigável + identidade, R kanban de missões, O checklist do
 * lançamento) abrem pelo botão Continuar. Ciclo `done` → card "Você ZEROU a
 * Versão N!" com o fechamento de ciclo (NewCycleDialog → Versão N+1 no Z).
 */
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { versionLabel } from '../../core/copy'
import type { PensaPlanStage } from '../../core/stages'
import { usePensaApp, usePensaStore } from '../appContext'
import { ZappyImage } from '../common/ZappyImage'
import { StageEView } from '../stage-e/StageEView'
import { StageOView } from '../stage-o/StageOView'
import { StageRView } from '../stage-r/StageRView'
import { StageZView } from '../stage-z/StageZView'
import { CreationMap } from './CreationMap'
import { NewCycleDialog } from './NewCycleDialog'

const STAGE_INTRO_EMOJI: Record<PensaPlanStage, string> = {
  z: '💬',
  e: '🔭',
  r: '🧩',
  o: '🚀',
}

export function ProjectView(): JSX.Element {
  const { adapter, copy } = usePensaApp()
  const activeProjectId = usePensaStore((s) => s.activeProjectId)
  const detail = usePensaStore((s) => s.detail)
  const loadingDetail = usePensaStore((s) => s.loadingDetail)
  const detailError = usePensaStore((s) => s.detailError)
  const closeProject = usePensaStore((s) => s.closeProject)
  const openProject = usePensaStore((s) => s.openProject)
  // Navegação interna por estado (padrão lista ⇄ projeto): mapa ⇄ etapa.
  const [stageOpen, setStageOpen] = useState(false)
  const [newCycleOpen, setNewCycleOpen] = useState(false)
  // Projeto já sincronizado nesta abertura (o refetch pós-avanço não repete).
  const syncedProjectIdRef = useRef<string | null>(null)

  const stage = detail?.currentCycle.stage ?? null
  const syncStudioSnapshot = adapter.syncStudioSnapshot
  const detailId = detail?.id ?? null
  const detailStudioProjectId = detail?.studioProjectId ?? null
  const detailBuildEnv = detail?.buildEnv ?? null

  // Sync OPORTUNISTA do snapshot do Estúdio (fire-and-forget, uma vez por
  // abertura do projeto): só com projeto semeado, buildEnv 'embedded'/'studio'
  // e host com a capability. Nunca bloqueia o render nem mostra erro.
  useEffect(() => {
    if (!syncStudioSnapshot || !detailId || !detailStudioProjectId) return
    if (detailBuildEnv !== 'embedded' && detailBuildEnv !== 'studio') return
    if (syncedProjectIdRef.current === detailId) return
    syncedProjectIdRef.current = detailId
    try {
      syncStudioSnapshot({ pensaProjectId: detailId, studioProjectId: detailStudioProjectId })
    } catch {
      // Best-effort: falha do host fica silenciosa (o jogo local segue valendo).
    }
  }, [syncStudioSnapshot, detailId, detailStudioProjectId, detailBuildEnv])
  // Volta ao mapa e re-busca o detalhe após um avanço de etapa (o mapa mostra
  // a etapa concluída e a próxima como atual; um rename também aparece).
  const handleAdvanced = (): void => {
    setStageOpen(false)
    if (activeProjectId) void openProject(activeProjectId)
  }

  if (stageOpen && detail && stage === 'z') {
    return <StageZView onBack={() => setStageOpen(false)} onAdvanced={handleAdvanced} />
  }

  if (stageOpen && detail && stage === 'e') {
    return <StageEView onBack={() => setStageOpen(false)} onAdvanced={handleAdvanced} />
  }

  if (stageOpen && detail && stage === 'r') {
    return <StageRView onBack={() => setStageOpen(false)} onAdvanced={handleAdvanced} />
  }

  if (stageOpen && detail && stage === 'o') {
    return <StageOView onBack={() => setStageOpen(false)} onAdvanced={handleAdvanced} />
  }

  const stageIntro: Record<PensaPlanStage, string> = {
    z: copy.project.zIntro,
    e: copy.project.eIntro,
    r: copy.project.rIntro,
    o: copy.project.oIntro,
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={closeProject}
          aria-label={copy.project.back}
          className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-pz-border bg-pz-surface px-4 font-semibold text-pz-text transition hover:border-pz-accent"
        >
          <span aria-hidden="true">←</span>
          Voltar
        </button>
        {detail ? (
          <>
            <h1 className="min-w-0 flex-1 text-2xl leading-snug font-extrabold break-words text-pz-text">
              {detail.name}
            </h1>
            <span className="rounded-full bg-pz-accent/15 px-3 py-1 text-sm font-bold text-pz-accent">
              {versionLabel(detail.currentCycle.number)}
            </span>
          </>
        ) : null}
      </header>

      {detailError ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-10 text-center">
          <ZappyImage
            pose="sleeping"
            fallbackEmoji="🫧"
            className="h-16 w-16 object-contain text-4xl"
          />
          <h2 className="text-lg font-bold text-pz-text">{copy.errors.title}</h2>
          <p role="alert" className="text-pz-muted">
            {detailError}
          </p>
          <button
            type="button"
            onClick={() => {
              if (activeProjectId) void openProject(activeProjectId)
            }}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
          >
            {copy.errors.retry}
          </button>
        </div>
      ) : loadingDetail || !detail ? (
        <p aria-busy="true" className="py-10 text-center text-pz-muted">
          {copy.project.loading}
        </p>
      ) : (
        <>
          <section
            aria-label={copy.project.mapLabel}
            className="rounded-3xl border-2 border-pz-border bg-pz-surface p-4"
          >
            <CreationMap cycle={detail.currentCycle} mode={adapter.mode} />
          </section>

          {stage && stage !== 'done' ? (
            <section className="rounded-3xl border-2 border-pz-border bg-pz-surface p-6">
              <h2 className="text-xl font-bold text-pz-text">{copy.stages[stage].name}</h2>
              <p className="mt-1 text-pz-muted">{copy.stages[stage].subtitle}</p>
              {/* Balão de fala do Zappy (a intro já fala em nome dele). */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-pz-bg p-4">
                <ZappyImage
                  pose="happy"
                  fallbackEmoji={STAGE_INTRO_EMOJI[stage]}
                  className="h-12 w-12 shrink-0 object-contain text-3xl"
                />
                <p className="min-w-0 font-semibold text-pz-text">{stageIntro[stage]}</p>
              </div>
              <button
                type="button"
                onClick={() => setStageOpen(true)}
                className="mt-5 min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105"
              >
                {copy.project.continue}
              </button>
            </section>
          ) : (
            <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-ok bg-pz-surface p-8 text-center">
              <ZappyImage
                pose="celebrating"
                fallbackEmoji="🏆"
                className="h-20 w-20 object-contain text-5xl"
              />
              <h2 className="text-xl font-bold text-pz-text">
                {copy.newCycle.doneTitle(detail.currentCycle.number)}
              </h2>
              <p className="max-w-md text-pz-muted">{copy.newCycle.doneBody}</p>
              <button
                type="button"
                onClick={() => setNewCycleOpen(true)}
                className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105"
              >
                <span aria-hidden="true">✨ </span>
                {copy.newCycle.cta(detail.currentCycle.number + 1)}
              </button>
            </section>
          )}

          <NewCycleDialog
            open={newCycleOpen}
            projectId={detail.id}
            onClose={() => setNewCycleOpen(false)}
          />
        </>
      )}
    </div>
  )
}
