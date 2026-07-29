'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { type CSSProperties, useEffect, useRef } from 'react'
import { levelInfo } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'
import { KidsConfetti } from './kids-confetti'
import { KidsMascot } from './mascot'

/**
 * Comemoração de SUBIU DE NÍVEL (Faísca até Lenda) — overlay com o Zappy, confete e a
 * insígnia GRANDE do novo nível na sua cor (aura). Disparada pelo `LevelUpWatcher`
 * quando o nível avança (concluir + publicar no Mural). Reusa o `useModalA11y`
 * (foco-preso/Esc/restore) e o `KidsConfetti` (som de comemoração + reduced-motion).
 */
export function LevelUpCelebration({
  level,
  onClose,
}: {
  level: StudentLevelSlug
  onClose: () => void
}) {
  const info = levelInfo(level)
  const Icon = info.icon
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })
  // Fecha sozinho depois de um tempo (criança nem sempre clica) — limpo no unmount.
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    autoCloseTimer.current = setTimeout(onClose, 7000)
    return () => clearTimeout(autoCloseTimer.current)
  }, [onClose])

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <KidsConfetti />
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Você subiu para o nível ${info.label}`}
        onClick={(e) => e.stopPropagation()}
        className="sz-modal w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-xl outline-none md:p-8"
        style={{ '--lvl': info.colorVar } as CSSProperties}
      >
        {/* Medalhão do nível: ícone grande com aura na cor do nível. */}
        <div className="relative mx-auto flex size-28 items-center justify-center">
          <KidsMascot expression="celebrating" className="kid-wiggle size-28" />
          <span
            className="-bottom-1 -right-1 absolute flex size-12 items-center justify-center rounded-full bg-card"
            style={{
              color: info.colorVar,
              boxShadow: `0 0 0 3px ${info.colorVar}, 0 0 16px color-mix(in oklch, ${info.colorVar} 60%, transparent)`,
            }}
          >
            <Icon className="size-6" aria-hidden />
          </span>
        </div>

        <p className="sz-display mt-4 text-base text-muted-foreground">Você subiu de nível! 🚀</p>
        <h2 className="sz-display mt-1 text-3xl" style={{ color: info.colorVar }}>
          Agora você é {info.label}!
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">{info.blurb}</p>

        <button
          type="button"
          onClick={onClose}
          className="sz-btn-gradient mt-7 inline-flex h-12 w-full items-center justify-center text-base"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
