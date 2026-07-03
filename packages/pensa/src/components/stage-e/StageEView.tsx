/**
 * Tela da ETAPA E (Enxergar o Jogo): sem spec → hero com CTA "Desenhar meu
 * jogo" (geração pode levar ~30s, com indicador animado); com spec → 3 seções
 * verticais com aprovação própria (tirinhas de funcionamento, wireframes das
 * telas e o funil de identidade) + barra de progresso no topo. Aprovar (a)+(b)
 * valida o spec automaticamente (na store); com spec validado + identidade
 * salva aparece o CTA de avançar (e→r). Componente INTERNO — a stageEStore é
 * criada POR INSTÂNCIA (o rename pós-identidade é absorvido pela projectStore).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import type { PensaCopy } from '../../core/copy'
import { parseFriendlySpecContent, parseIdentityContent } from '../../core/specContent'
import { createStageEStore } from '../../state/stageEStore'
import { usePensaApp, usePensaStore } from '../appContext'
import { GeneratingIndicator } from '../common/GeneratingIndicator'
import { ZappyImage } from '../common/ZappyImage'
import { FeedbackBar } from './FeedbackBar'
import { FlowStrips } from './FlowStrips'
import { IdentityPanel } from './IdentityPanel'
import { ScreenEditor } from './ScreenEditor'
import { ScreenWireframes } from './ScreenWireframes'

function StageProgress({
  copy,
  flowsApproved,
  screensApproved,
  identityDone,
}: {
  copy: PensaCopy
  flowsApproved: boolean
  screensApproved: boolean
  identityDone: boolean
}): JSX.Element {
  const items = [
    { key: 'flows', label: copy.stageE.progress.flows, done: flowsApproved },
    { key: 'screens', label: copy.stageE.progress.screens, done: screensApproved },
    { key: 'identity', label: copy.stageE.progress.identity, done: identityDone },
  ] as const
  const count = items.filter((item) => item.done).length
  return (
    <div
      role="img"
      aria-label={`${count} de ${items.length} partes prontas`}
      className="flex flex-wrap items-center gap-1.5"
    >
      {items.map((item) => (
        <span
          key={item.key}
          data-part={item.key}
          data-done={item.done}
          className={clsx(
            'flex min-h-7 items-center gap-1 rounded-full border-2 px-2.5 text-xs font-bold',
            item.done ? 'border-pz-ok text-pz-ok' : 'border-pz-border text-pz-muted',
          )}
        >
          <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function StageEView({
  onBack,
  onAdvanced,
}: {
  /** Volta ao mapa (sem avançar). */
  onBack: () => void
  /** Avanço e→r concluído: o ProjectView volta ao mapa e re-busca o projeto. */
  onAdvanced: () => void
}): JSX.Element | null {
  const { adapter, copy, store: projectStore } = usePensaApp()
  const detail = usePensaStore((s) => s.detail)
  const [stageStore] = useState(() =>
    createStageEStore(adapter.transport, {
      // O nome escolhido no funil vira o nome do projeto: lista + detalhe.
      onProjectUpdated: (project) => projectStore.getState().absorbDetail(project),
    }),
  )
  // Qual seção está com a barra de feedback aberta (uma por vez).
  const [feedbackFor, setFeedbackFor] = useState<'flows' | 'screens' | null>(null)
  // Índice da tela em edição pontual (autoria manual); null = editor fechado.
  const [editingScreen, setEditingScreen] = useState<number | null>(null)

  const cycleId = detail?.currentCycle.id ?? null

  useEffect(() => {
    if (cycleId) void stageStore.getState().loadStage(cycleId)
  }, [stageStore, cycleId])

  const loadingStage = useStore(stageStore, (s) => s.loadingStage)
  const stageLoaded = useStore(stageStore, (s) => s.stageLoaded)
  const stageError = useStore(stageStore, (s) => s.stageError)
  const spec = useStore(stageStore, (s) => s.spec)
  const identity = useStore(stageStore, (s) => s.identity)
  const generatingSpec = useStore(stageStore, (s) => s.generatingSpec)
  const specError = useStore(stageStore, (s) => s.specError)
  const flowsApproved = useStore(stageStore, (s) => s.flowsApproved)
  const screensApproved = useStore(stageStore, (s) => s.screensApproved)
  const validatingSpec = useStore(stageStore, (s) => s.validatingSpec)
  const advancing = useStore(stageStore, (s) => s.advancing)
  const advanceError = useStore(stageStore, (s) => s.advanceError)
  const identityStep = useStore(stageStore, (s) => s.identityStep)
  const chosenPalette = useStore(stageStore, (s) => s.chosenPalette)

  if (!detail || !cycleId) return null

  const c = copy.stageE
  const specContent = spec ? parseFriendlySpecContent(spec.content) : null
  const identityContent = identity ? parseIdentityContent(identity.content) : null
  // Paleta que pinta os wireframes: a escolhida no funil (feedback imediato)
  // ou, sem funil em andamento, a da identidade já salva.
  const activePalette = chosenPalette?.colors ?? identityContent?.palette.colors
  const identityDone = identityStep === 'done' && identity !== null
  const sectionsBusy = generatingSpec || validatingSpec
  const allReady = spec?.status === 'validated' && identity?.status === 'validated'
  // Erro da validação automática (a+b aprovadas, spec ainda draft): retry visível.
  const validationError =
    specError !== null && flowsApproved && screensApproved && spec?.status === 'draft'

  const submitFeedback = async (feedback: string): Promise<boolean> => {
    const ok = await stageStore.getState().generateSpec(detail.id, feedback)
    if (ok) setFeedbackFor(null)
    return ok
  }

  const handleAdvance = async (): Promise<void> => {
    if (await stageStore.getState().advance()) onAdvanced()
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 p-6">
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
            <h2 className="truncate text-xl font-extrabold text-pz-text">{copy.stages.e.name}</h2>
            <p className="truncate text-sm text-pz-muted">{detail.name}</p>
          </div>
        </div>
        {spec ? (
          <StageProgress
            copy={copy}
            flowsApproved={flowsApproved}
            screensApproved={screensApproved}
            identityDone={identityDone}
          />
        ) : null}
      </header>

      {stageError ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-10 text-center">
          <ZappyImage
            pose="sleeping"
            fallbackEmoji="🫧"
            className="h-16 w-16 object-contain text-4xl"
          />
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
      ) : !spec ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-12 text-center">
          <ZappyImage
            pose="happy"
            fallbackEmoji="🔭"
            className="h-20 w-20 object-contain text-5xl"
          />
          <h3 className="text-2xl font-extrabold text-pz-text">{c.heroTitle}</h3>
          <p className="max-w-md text-pz-muted">{c.heroBody}</p>
          {specError ? (
            <p role="alert" className="font-semibold text-pz-warn">
              {specError}
            </p>
          ) : null}
          {generatingSpec ? (
            <GeneratingIndicator message={c.generating} hint={c.generatingHint} />
          ) : (
            <button
              type="button"
              onClick={() => {
                void stageStore.getState().generateSpec(detail.id)
              }}
              className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105"
            >
              <span aria-hidden="true">🪄 </span>
              {c.drawCta}
            </button>
          )}
        </section>
      ) : !specContent ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-10 text-center">
          <ZappyImage
            pose="sleeping"
            fallbackEmoji="🌀"
            className="h-16 w-16 object-contain text-4xl"
          />
          <h3 className="text-lg font-bold text-pz-text">{copy.errors.title}</h3>
          <p className="text-pz-muted">{c.specBrokenBody}</p>
          {specError ? (
            <p role="alert" className="font-semibold text-pz-warn">
              {specError}
            </p>
          ) : null}
          {generatingSpec ? (
            <GeneratingIndicator message={c.generating} hint={c.generatingHint} />
          ) : (
            <button
              type="button"
              onClick={() => {
                void stageStore.getState().generateSpec(detail.id)
              }}
              className="min-h-12 rounded-2xl bg-pz-accent px-6 font-bold text-pz-accent-fg transition hover:brightness-105"
            >
              {c.redoCta}
            </button>
          )}
        </section>
      ) : (
        <>
          {validationError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-pz-warn bg-pz-surface px-4 py-3">
              <p role="alert" className="font-semibold text-pz-warn">
                {specError}
              </p>
              <button
                type="button"
                onClick={() => {
                  void stageStore.getState().validateSpec()
                }}
                className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
              >
                {copy.errors.retry}
              </button>
            </div>
          ) : null}

          <section
            aria-label={c.flowsTitle}
            className="rounded-3xl border-2 border-pz-border bg-pz-surface p-5"
          >
            <h3 className="mb-3 text-lg font-extrabold text-pz-text">
              <span aria-hidden="true">🎬 </span>
              {c.flowsTitle}
            </h3>
            <FlowStrips
              flows={specContent.flows}
              approved={flowsApproved}
              busy={sectionsBusy}
              onApprove={() => stageStore.getState().approveFlows()}
              onChange={() => setFeedbackFor('flows')}
            />
            {feedbackFor === 'flows' ? (
              <FeedbackBar
                busy={generatingSpec}
                errorMessage={specError}
                onSubmit={submitFeedback}
                onCancel={() => setFeedbackFor(null)}
              />
            ) : null}
          </section>

          <section
            aria-label={c.screensTitle}
            className="rounded-3xl border-2 border-pz-border bg-pz-surface p-5"
          >
            <h3 className="mb-3 text-lg font-extrabold text-pz-text">
              <span aria-hidden="true">📱 </span>
              {c.screensTitle}
            </h3>
            <ScreenWireframes
              screens={specContent.screens}
              palette={activePalette}
              approved={screensApproved}
              busy={sectionsBusy}
              onApprove={() => stageStore.getState().approveScreens()}
              onChange={() => setFeedbackFor('screens')}
              onEditScreen={(index) => setEditingScreen(index)}
              editLabel={c.screenEdit.edit}
            />
            {editingScreen !== null && specContent.screens[editingScreen] ? (
              <ScreenEditor
                key={editingScreen}
                store={stageStore}
                open
                projectId={detail.id}
                screenIndex={editingScreen}
                screen={specContent.screens[editingScreen]}
                onClose={() => setEditingScreen(null)}
              />
            ) : null}
            {feedbackFor === 'screens' ? (
              <FeedbackBar
                busy={generatingSpec}
                errorMessage={specError}
                onSubmit={submitFeedback}
                onCancel={() => setFeedbackFor(null)}
              />
            ) : null}
          </section>

          <section
            aria-label={c.identityTitle}
            className="rounded-3xl border-2 border-pz-border bg-pz-surface p-5"
          >
            <h3 className="mb-3 text-lg font-extrabold text-pz-text">
              <span aria-hidden="true">🎨 </span>
              {c.identityTitle}
            </h3>
            <IdentityPanel store={stageStore} projectId={detail.id} />
          </section>

          {allReady ? (
            <section className="flex flex-col items-center gap-2 rounded-3xl border-2 border-pz-ok bg-pz-surface p-6 text-center">
              <ZappyImage
                pose="celebrating"
                fallbackEmoji="🚀"
                className="h-16 w-16 object-contain text-4xl"
              />
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
                disabled={advancing}
                aria-busy={advancing || undefined}
                className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {c.advanceCta}
              </button>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
