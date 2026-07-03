/**
 * Festa do lançamento: overlay com confete em CSS PURO (animação FINITA;
 * prefers-reduced-motion desliga tudo no pensa.css), a Carta da Ideia
 * "carimbada" com o selo rotacionado "VERSÃO N LANÇADA", o delta de
 * gamificação (+XP e "Nova conquista desbloqueada!" genérico — a apresentação
 * das badges é papel do HOST) e o botão "Ver meu projeto". A11y na mecânica do
 * Dialog interno (foco, Esc fecha, aria-modal, trap de Tab); renderiza INLINE
 * (sem portal), dentro do escopo [data-pensa-theme].
 */
import type { CSSProperties, JSX, KeyboardEvent } from 'react'
import { useEffect, useRef } from 'react'
import type { PensaGamificationDelta } from '../../core/gamification'
import { usePensaApp } from '../appContext'
import { trapTabKey } from '../common/focusTrap'
import { ZappyImage } from '../common/ZappyImage'

/** Confete: posição/atraso fixos + cor pelos tokens pz-stage-* (4 cores). */
const CONFETTI_COLORS = [
  'var(--color-pz-stage-z)',
  'var(--color-pz-stage-e)',
  'var(--color-pz-stage-r)',
  'var(--color-pz-stage-o)',
] as const

const CONFETTI_PIECES = Array.from({ length: 14 }, (_, index) => ({
  id: `piece-${index}`,
  left: `${(index * 7.1 + 3) % 100}%`,
  delay: `${(index % 7) * 0.18}s`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] as string,
}))

export function LaunchCelebration({
  cycleNumber,
  projectName,
  ideaText,
  gamification,
  onClose,
}: {
  cycleNumber: number
  projectName: string
  /** Texto da Carta da Ideia (ausente → o nome do projeto vira a carta). */
  ideaText: string | null
  gamification: PensaGamificationDelta | null
  /** "Ver meu projeto": fecha a festa e volta ao mapa. */
  onClose: () => void
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.launch
  const rootRef = useRef<HTMLDivElement>(null)

  // Foca o overlay ao abrir e devolve o foco ao acionador ao fechar.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    rootRef.current?.focus()
    return () => {
      previous?.focus()
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    trapTabKey(event, rootRef.current)
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-pz-scrim p-4 outline-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI_PIECES.map((piece) => (
          <span
            key={piece.id}
            className="pz-confetti-piece"
            style={
              {
                left: piece.left,
                animationDelay: piece.delay,
                backgroundColor: piece.color,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-2 border-pz-border bg-pz-surface p-6 text-center shadow-xl">
        <ZappyImage
          pose="celebrating"
          fallbackEmoji="🎆"
          className="h-24 w-24 object-contain text-5xl"
        />
        <h3 className="text-2xl font-extrabold text-pz-text">{c.title}</h3>
        <p className="text-pz-muted">{c.body}</p>

        <div className="relative w-full rounded-2xl border-2 border-pz-border bg-pz-bg p-5">
          <p className="text-xs font-bold tracking-widest text-pz-muted uppercase">
            {copy.idea.cardLabel}
          </p>
          <p className="mt-2 leading-snug break-words text-pz-text italic">
            {ideaText ?? projectName}
          </p>
          <span className="pz-launch-stamp">{c.stamp(cycleNumber)}</span>
        </div>

        {gamification && gamification.xpAwarded > 0 ? (
          <p
            role="status"
            className="rounded-full border-2 border-pz-ok px-4 py-1.5 font-extrabold text-pz-ok"
          >
            <span aria-hidden="true">✨ </span>
            {c.xpChip(gamification.xpAwarded)}
          </p>
        ) : null}
        {gamification && gamification.badgesUnlocked.length > 0 ? (
          <p className="font-bold text-pz-accent">
            <span aria-hidden="true">🏅 </span>
            {c.badgeUnlocked}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg transition hover:brightness-105"
        >
          {c.close}
        </button>
      </div>
    </div>
  )
}
