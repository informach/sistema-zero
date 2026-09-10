'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Sparkles } from 'lucide-react'
import { KidsConfetti } from './kids-confetti'
import { KidsMascot } from './mascot'
import { ZappyCoin } from './zappy-coin'

/**
 * Festa de abrir o baú. É prima da celebração de aula, mas não reusa aquele
 * componente: lá o assunto é progresso de curso (barra antes/depois, próxima
 * aula, publicação no Mural) e aqui é só "você ganhou isto".
 */
export function ChestReward({
  unitNumber,
  xp,
  coins,
  onClose,
}: {
  unitNumber: number
  xp: number
  coins: number
  onClose: () => void
}) {
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })
  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Baú da unidade ${unitNumber} aberto`}
    >
      <KidsConfetti />
      <div
        ref={cardRef}
        tabIndex={-1}
        className="sz-modal w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-xl outline-none md:p-8"
      >
        <KidsMascot expression="celebrating" className="kid-wiggle mx-auto size-24" />
        <h2 className="sz-display mt-3 text-2xl">Baú aberto!</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Você terminou a unidade {unitNumber}. Olha o que estava lá dentro:
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="kid-pop inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 [background-image:var(--sz-gradient)] [font-family:var(--font-display)] font-bold text-(--sz-primary-fg) text-base">
            <Sparkles className="size-4" />+{xp} XP
          </span>
          {coins > 0 ? (
            <span className="kid-pop inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-4 py-1.5 [font-family:var(--font-display)] font-bold text-base text-foreground">
              <ZappyCoin className="size-4" />+{coins}
            </span>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="sz-btn-gradient mt-6 w-full">
          Continuar
        </button>
      </div>
    </div>
  )
}
