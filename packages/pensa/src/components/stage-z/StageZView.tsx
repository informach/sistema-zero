/**
 * Tela da ETAPA Z (Zerar a Bagunça): header com voltar-ao-mapa, título via
 * copy e QuestionTracker; corpo = ChatPanel. Quando `zState.ready`, banner com
 * CTA "Criar a Carta da Ideia" (generateIdea → IdeaCard). Se já existe a carta
 * (`ideaArtifact`), mostra o IdeaCard (com opção de voltar ao chat p/ mudar).
 * Componente INTERNO (não sai no index) — a chatStore é criada POR INSTÂNCIA.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { createChatStore } from '../../state/chatStore'
import { usePensaApp, usePensaStore } from '../appContext'
import { ChatPanel } from './ChatPanel'
import { IdeaCard } from './IdeaCard'
import { QuestionTracker } from './QuestionTracker'

export function StageZView({
  onBack,
  onAdvanced,
}: {
  /** Volta ao mapa (sem avançar). */
  onBack: () => void
  /** Avanço z→e concluído: o ProjectView volta ao mapa e re-busca o projeto. */
  onAdvanced: () => void
}): JSX.Element | null {
  const { adapter, copy } = usePensaApp()
  const detail = usePensaStore((s) => s.detail)
  const [chatStore] = useState(() => createChatStore(adapter.transport))
  // "Quero mudar uma coisa": mesmo com carta pronta, a criança volta ao chat.
  const [backToChat, setBackToChat] = useState(false)

  const cycleId = detail?.currentCycle.id ?? null

  useEffect(() => {
    if (cycleId) void chatStore.getState().loadStage(cycleId)
  }, [chatStore, cycleId])

  // Aborta um turno em voo ao sair da tela.
  useEffect(() => {
    return () => {
      chatStore.getState().cancel()
    }
  }, [chatStore])

  const loadingStage = useStore(chatStore, (s) => s.loadingStage)
  const stageLoaded = useStore(chatStore, (s) => s.stageLoaded)
  const stageError = useStore(chatStore, (s) => s.stageError)
  const zState = useStore(chatStore, (s) => s.zState)
  const ideaArtifact = useStore(chatStore, (s) => s.ideaArtifact)
  const generatingIdea = useStore(chatStore, (s) => s.generatingIdea)
  const ideaError = useStore(chatStore, (s) => s.ideaError)

  if (!detail || !cycleId) return null

  const showIdea = ideaArtifact !== null && !backToChat
  const ready = zState?.ready === true

  const handleGenerate = async (): Promise<void> => {
    const ok = await chatStore.getState().generateIdea()
    if (ok) setBackToChat(false)
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
            <h2 className="truncate text-xl font-extrabold text-pz-text">{copy.stages.z.name}</h2>
            <p className="truncate text-sm text-pz-muted">{detail.name}</p>
          </div>
        </div>
        <QuestionTracker zState={zState} mode={adapter.mode} />
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
              void chatStore.getState().loadStage(cycleId)
            }}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
          >
            {copy.errors.retry}
          </button>
        </div>
      ) : loadingStage || !stageLoaded ? (
        <p aria-busy="true" className="py-10 text-center text-pz-muted">
          {copy.chat.loading}
        </p>
      ) : showIdea ? (
        <IdeaCard
          store={chatStore}
          projectName={detail.name}
          onConfirmed={onAdvanced}
          onEditChat={() => setBackToChat(true)}
        />
      ) : (
        <>
          {ready ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-pz-ok bg-pz-surface px-5 py-4">
              <div>
                <p className="font-bold text-pz-text">
                  <span aria-hidden="true">🌟 </span>
                  {copy.chat.readyTitle}
                </p>
                <p className="text-sm text-pz-muted">{copy.chat.readyBody}</p>
                {ideaError ? (
                  <p role="alert" className="mt-1 text-sm font-semibold text-pz-warn">
                    {ideaError}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (ideaArtifact) {
                    setBackToChat(false)
                  } else {
                    void handleGenerate()
                  }
                }}
                disabled={generatingIdea}
                aria-busy={generatingIdea || undefined}
                className="min-h-12 rounded-2xl bg-pz-accent px-6 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingIdea
                  ? copy.chat.generating
                  : ideaArtifact
                    ? copy.chat.viewIdeaCta
                    : copy.chat.readyCta}
              </button>
            </div>
          ) : null}
          <ChatPanel store={chatStore} projectId={detail.id} />
        </>
      )}
    </div>
  )
}
