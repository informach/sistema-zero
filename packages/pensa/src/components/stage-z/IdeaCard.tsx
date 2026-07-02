/**
 * A "Carta da Ideia": card colecionável com moldura em gradiente (tokens pz),
 * título = nome do projeto, texto = content.text do artefato e as 5 estrelas
 * no rodapé. Ações: "É isso!" (valida → avança → callback p/ o ProjectView),
 * "Quero mudar uma coisa" (volta ao chat) e "Refazer a Carta" (regenera, com
 * aviso de que substitui a carta atual).
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { z } from 'zod'
import { useStore } from 'zustand'
import type { PensaChatStore } from '../../state/chatStore'
import { usePensaApp } from '../appContext'
import { Dialog } from '../common/Dialog'

const ideaContentSchema = z.object({ text: z.string() })

/** Extrai o texto da carta do `content` (unknown) com segurança. */
function ideaText(content: unknown): string {
  const parsed = ideaContentSchema.safeParse(content)
  return parsed.success ? parsed.data.text : ''
}

function FooterStars(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex justify-center gap-1 text-pz-warn">
      {['a', 'b', 'c', 'd', 'e'].map((key) => (
        <svg
          key={key}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
        >
          <path d="M12 2.5 15 8.7l6.6 1-4.8 4.7 1.1 6.6L12 17.9 6.1 21l1.1-6.6L2.4 9.7l6.6-1L12 2.5Z" />
        </svg>
      ))}
    </div>
  )
}

export function IdeaCard({
  store,
  projectName,
  onConfirmed,
  onEditChat,
}: {
  store: PensaChatStore
  projectName: string
  /** Validou e avançou com sucesso (o ProjectView volta ao mapa e re-busca). */
  onConfirmed: () => void
  /** "Quero mudar uma coisa": volta ao chat. */
  onEditChat: () => void
}): JSX.Element | null {
  const { copy } = usePensaApp()
  const ideaArtifact = useStore(store, (s) => s.ideaArtifact)
  const generatingIdea = useStore(store, (s) => s.generatingIdea)
  const validating = useStore(store, (s) => s.validating)
  const advancing = useStore(store, (s) => s.advancing)
  const ideaError = useStore(store, (s) => s.ideaError)
  const validateIdea = useStore(store, (s) => s.validateIdea)
  const advance = useStore(store, (s) => s.advance)
  const generateIdea = useStore(store, (s) => s.generateIdea)
  const [regenOpen, setRegenOpen] = useState(false)

  if (!ideaArtifact) return null

  const busy = validating || advancing || generatingIdea

  const handleConfirm = async (): Promise<void> => {
    if (!(await validateIdea())) return
    if (!(await advance())) return
    onConfirmed()
  }

  const handleRegenerate = async (): Promise<void> => {
    setRegenOpen(false)
    await generateIdea()
  }

  return (
    <section
      aria-label={copy.idea.cardLabel}
      className="rounded-[28px] bg-gradient-to-br from-pz-stage-z via-pz-accent to-pz-stage-o p-1 shadow-lg"
    >
      <div className="flex flex-col gap-4 rounded-3xl bg-pz-surface p-6 sm:p-8">
        <p className="text-center text-xs font-bold tracking-widest text-pz-accent uppercase">
          <span aria-hidden="true">💌 </span>
          {copy.idea.cardLabel}
        </p>
        <h3 className="text-center text-2xl leading-snug font-extrabold break-words text-pz-text">
          {projectName}
        </h3>
        <p className="text-center text-lg leading-relaxed text-pz-text">
          {ideaText(ideaArtifact.content)}
        </p>
        <FooterStars />

        {ideaError ? (
          <p
            role="alert"
            className="rounded-2xl border-2 border-pz-warn bg-pz-bg px-4 py-2.5 text-center text-sm font-semibold text-pz-warn"
          >
            {ideaError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleConfirm()
            }}
            disabled={busy}
            aria-busy={validating || advancing || undefined}
            className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true">🎉 </span>
            {copy.idea.confirm}
          </button>
          <button
            type="button"
            onClick={onEditChat}
            disabled={busy}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-text transition hover:border-pz-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.idea.edit}
          </button>
          <button
            type="button"
            onClick={() => setRegenOpen(true)}
            disabled={busy}
            aria-busy={generatingIdea || undefined}
            className="min-h-11 rounded-2xl px-4 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingIdea ? copy.chat.generating : copy.idea.regenerate}
          </button>
        </div>
      </div>

      <Dialog
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        title={copy.idea.regenerateTitle}
      >
        <p className="text-pz-muted">{copy.idea.regenerateBody}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setRegenOpen(false)}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
          >
            {copy.idea.regenerateCancel}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleRegenerate()
            }}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
          >
            {copy.idea.regenerateConfirm}
          </button>
        </div>
      </Dialog>
    </section>
  )
}
