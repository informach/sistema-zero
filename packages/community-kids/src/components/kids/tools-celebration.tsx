'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Wrench } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { type ToolsGain, toolsGainHeadline } from '@/lib/tools-gain'
import { KidsConfetti } from './kids-confetti'
import { KidsMascot } from './mascot'

/**
 * Comemoração de FERRAMENTA NOVA — a criança concluiu e publicou um curso, e os blocos que
 * ele ensinava entraram na caixa de ferramentas do Estúdio dela, para sempre.
 *
 * É o caso COMUM (7 de cada 8 cursos de um degrau); quando o curso também faz subir de
 * nível, este overlay não aparece: o ganho entra DENTRO da `LevelUpCelebration`, para a
 * criança nunca encarar três festas em fila (decisão da usuária). Quem decide é o
 * `CelebrationWatcher`.
 *
 * ⚠️ Confete SEM som, de propósito: esta festa acontece a cada curso e vem logo depois da
 * `MuralCelebration`, que já tocou o som — dois sons seguidos, 48 vezes ao longo da
 * carreira, cansam. O som fica onde é raro (a subida de nível).
 */
export function ToolsCelebration({ gain, onClose }: { gain: ToolsGain; onClose: () => void }) {
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })
  // Fecha sozinho (criança nem sempre clica) — limpo no unmount, como o irmão de nível.
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    autoCloseTimer.current = setTimeout(onClose, 7000)
    return () => clearTimeout(autoCloseTimer.current)
  }, [onClose])

  const headline = toolsGainHeadline(gain)
  const chips = [...gain.novas, ...gain.cresceram.map((item) => item.name)]

  return (
    <div
      /* Espelha o `Dialog` do ui: conteúdo alto ROLA em vez de sangrar para fora da
         tela. Estas festas têm altura variável (as gavetas ganhas entram como chips) e,
         numa janela baixa, o "Continuar" ficava fora de alcance. */
      className="sz-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <KidsConfetti sound={false} />
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={headline}
        onClick={(e) => e.stopPropagation()}
        className="sz-modal w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-xl outline-none md:p-8"
      >
        <div className="relative mx-auto flex size-28 items-center justify-center">
          <KidsMascot expression="celebrating" className="kid-wiggle size-28" />
          <span className="-bottom-1 -right-1 absolute grid size-12 place-items-center rounded-full bg-card text-primary shadow-[0_0_0_3px_var(--primary)]">
            <Wrench className="size-6" aria-hidden />
          </span>
        </div>

        <p className="sz-display mt-4 text-base text-muted-foreground">Ferramenta nova! 🛠️</p>
        <h2 className="sz-display mt-1 text-2xl text-primary">{headline}</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Já está no seu Estúdio, e é sua para sempre.
        </p>

        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((name) => (
            <li
              key={name}
              className="rounded-full border-2 border-border bg-background px-3 py-1.5 font-bold text-sm"
            >
              {name}
            </li>
          ))}
        </ul>

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
