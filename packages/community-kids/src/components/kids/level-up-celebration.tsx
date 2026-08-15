'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import type { CSSProperties } from 'react'
import { levelInfo } from '@/lib/level-info'
import { type ToolsGain, toolsGainInline } from '@/lib/tools-gain'
import type { StudentLevelSlug } from '@/lib/types'
import { KidsConfetti } from './kids-confetti'
import { KidsMascot } from './mascot'

/**
 * Comemoração de SUBIU DE NÍVEL (Faísca até Lenda) — overlay com o Zappy, confete e a
 * insígnia GRANDE do novo nível na sua cor (aura). Disparada pelo `CelebrationWatcher`
 * quando o nível avança (concluir + publicar no Mural). Reusa o `useModalA11y`
 * (foco-preso/Esc/restore) e o `KidsConfetti` (som de comemoração + reduced-motion).
 *
 * ⚠️ Quando o MESMO curso também entrega ferramenta nova (o curso que fecha um degrau), o
 * ganho vem EMBUTIDO aqui (`tools`) em vez de abrir um segundo overlay: esta já é a festa
 * grande, e a criança nunca encara três em fila (Mural → nível → gaveta). Decisão da
 * usuária; o `ToolsCelebration` cuida do caso comum, em que só a gaveta muda.
 */
export function LevelUpCelebration({
  level,
  tools = null,
  onClose,
}: {
  level: StudentLevelSlug
  /** Ferramenta ganha no MESMO momento; `null` = só subiu de nível. */
  tools?: ToolsGain | null
  onClose: () => void
}) {
  const info = levelInfo(level)
  const Icon = info.icon
  // ⚠️ SEM auto-close, de propósito. As duas festas do watcher fechavam sozinhas em 7s e a
  // usuária não conseguia terminar de ler — esta é a pior das duas, porque acumula o texto do
  // nível E o da ferramenta ganha junto. As irmãs (`mural-celebration`, `lesson-celebration`)
  // nunca tiveram timer: sai por "Continuar", Esc ou toque fora, e a criança decide quando.
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })

  return (
    <div
      /* Espelha o `Dialog` do ui: conteúdo alto ROLA em vez de sangrar para fora da tela. O
         ganho de ferramenta entra aqui como UMA linha curta (`toolsGainInline`), então a altura
         é estável; a rede de segurança fica para fonte grande do sistema ou janela muito baixa. */
      className="sz-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
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

        {tools ? (
          <p className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 font-bold text-primary text-sm">
            🛠️ E tem mais: {toolsGainInline(tools)}
          </p>
        ) : null}

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
