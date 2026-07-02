/**
 * Tela da ETAPA O (O Grande Lançamento): sem seed → hero "Preparar o
 * lançamento" (generate `checklist_seed`); reload com seed mas sem itens vivos
 * → mesmo CTA com aviso de que os checks recomeçam (v1 sem GET — TODO no
 * store); com itens → lista vertical (checkbox grande, chip "opcional" nos
 * não-obrigatórios, "Abrir o Estúdio" no item de publicar) + barra de
 * progresso dos obrigatórios + CTA "Lançar!" (habilita com todos os required)
 * → advance o→done → LaunchCelebration. Componente INTERNO — a stageOStore é
 * criada POR INSTÂNCIA.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import type { PensaChecklistCategory } from '../../core/types'
import { createStageOStore } from '../../state/stageOStore'
import { usePensaApp, usePensaStore } from '../appContext'
import { GeneratingIndicator } from '../common/GeneratingIndicator'
import { LaunchCelebration } from './LaunchCelebration'

const CATEGORY_EMOJI: Record<PensaChecklistCategory, string> = {
  test: '🐞',
  polish: '✨',
  publish: '📣',
  share: '🎉',
}

export function StageOView({
  onBack,
  onAdvanced,
}: {
  /** Volta ao mapa (sem avançar). */
  onBack: () => void
  /** Festa fechada após o o→done: volta ao mapa e re-busca o projeto. */
  onAdvanced: () => void
}): JSX.Element | null {
  const { adapter, copy } = usePensaApp()
  const detail = usePensaStore((s) => s.detail)
  const [stageStore] = useState(() => createStageOStore(adapter.transport))

  const cycleId = detail?.currentCycle.id ?? null

  useEffect(() => {
    if (cycleId) void stageStore.getState().loadStage(cycleId)
  }, [stageStore, cycleId])

  const loadingStage = useStore(stageStore, (s) => s.loadingStage)
  const stageLoaded = useStore(stageStore, (s) => s.stageLoaded)
  const stageError = useStore(stageStore, (s) => s.stageError)
  const hasSeed = useStore(stageStore, (s) => s.hasSeed)
  const items = useStore(stageStore, (s) => s.items)
  const generating = useStore(stageStore, (s) => s.generating)
  const generateError = useStore(stageStore, (s) => s.generateError)
  const toggleError = useStore(stageStore, (s) => s.toggleError)
  const advancing = useStore(stageStore, (s) => s.advancing)
  const advanceError = useStore(stageStore, (s) => s.advanceError)
  const launched = useStore(stageStore, (s) => s.launched)
  const gamification = useStore(stageStore, (s) => s.gamification)
  const ideaText = useStore(stageStore, (s) => s.ideaText)

  if (!detail || !cycleId) return null

  const c = copy.stageO
  const required = (items ?? []).filter((item) => item.required)
  const requiredDone = required.filter((item) => item.done).length
  const allRequiredDone = required.length > 0 && requiredDone === required.length
  const progressPct = required.length === 0 ? 0 : Math.round((requiredDone / required.length) * 100)

  const openStudio = adapter.onOpenStudio
  const handleOpenStudio = openStudio
    ? () =>
        openStudio({
          pensaProjectId: detail.id,
          studioProjectId: detail.studioProjectId,
          name: detail.name,
        })
    : null

  const hero = (
    <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-12 text-center">
      <span aria-hidden="true" className="text-5xl">
        🚀
      </span>
      <h3 className="text-2xl font-extrabold text-pz-text">{c.heroTitle}</h3>
      <p className="max-w-md text-pz-muted">{c.heroBody}</p>
      {hasSeed ? (
        <p className="max-w-md text-sm font-semibold text-pz-muted">{c.reseedNotice}</p>
      ) : null}
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
            void stageStore.getState().generateChecklist(detail.id)
          }}
          className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105"
        >
          <span aria-hidden="true">🎁 </span>
          {c.prepareCta}
        </button>
      )}
    </section>
  )

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 p-6">
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
            <h2 className="truncate text-xl font-extrabold text-pz-text">{copy.stages.o.name}</h2>
            <p className="truncate text-sm text-pz-muted">{detail.name}</p>
          </div>
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
      ) : items === null ? (
        hero
      ) : (
        <>
          <section className="flex flex-col gap-1.5 rounded-3xl border-2 border-pz-border bg-pz-surface p-5">
            <p className="text-sm font-bold text-pz-text">
              {c.progressLabel(requiredDone, required.length)}
            </p>
            <div
              aria-hidden="true"
              className="h-3 w-full overflow-hidden rounded-full bg-pz-border"
            >
              <div
                className="h-full rounded-full bg-pz-ok transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </section>

          {toggleError ? (
            <p
              role="alert"
              className="rounded-2xl border-2 border-pz-warn bg-pz-surface px-4 py-2.5 font-semibold text-pz-warn"
            >
              {toggleError}
            </p>
          ) : null}

          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <div className="rounded-3xl border-2 border-pz-border bg-pz-surface p-4">
                  <label className="flex min-h-11 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(event) => {
                        void stageStore.getState().toggleItem(item.id, event.target.checked)
                      }}
                      className="h-11 w-11 shrink-0 rounded-xl accent-pz-accent"
                    />
                    <span className="min-w-0 flex-1 pt-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span aria-hidden="true">{CATEGORY_EMOJI[item.category]}</span>
                        <span className="leading-snug font-bold break-words text-pz-text">
                          {item.title}
                        </span>
                        {item.required ? null : (
                          <span className="rounded-full bg-pz-bg px-2 py-0.5 text-xs font-bold text-pz-muted">
                            {c.optionalChip}
                          </span>
                        )}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-sm leading-snug text-pz-muted">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  {item.category === 'publish' && handleOpenStudio ? (
                    <button
                      type="button"
                      onClick={handleOpenStudio}
                      className="mt-2 ml-14 min-h-11 rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-text transition hover:border-pz-accent"
                    >
                      <span aria-hidden="true">🧩 </span>
                      {c.openStudio}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <section className="flex flex-col items-center gap-2 rounded-3xl border-2 border-pz-border bg-pz-surface p-6 text-center">
            {advanceError ? (
              <p role="alert" className="font-semibold text-pz-warn">
                {advanceError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void stageStore.getState().advance()
              }}
              disabled={!allRequiredDone || advancing}
              aria-busy={advancing || undefined}
              className="min-h-12 rounded-2xl bg-pz-accent px-8 text-lg font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">🚀 </span>
              {c.launchCta}
            </button>
            {allRequiredDone ? null : (
              <p className="text-sm font-semibold text-pz-muted">{c.launchHint}</p>
            )}
          </section>
        </>
      )}

      {launched ? (
        <LaunchCelebration
          cycleNumber={detail.currentCycle.number}
          projectName={detail.name}
          ideaText={ideaText}
          gamification={gamification}
          onClose={onAdvanced}
        />
      ) : null}
    </div>
  )
}
