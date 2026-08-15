'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Wrench } from 'lucide-react'
import { familyLabel } from '@/lib/studio-family'
import {
  type ToolsGain,
  toolsGainDrawers,
  toolsGainFamily,
  toolsGainHeadline,
  toolsGainSubline,
} from '@/lib/tools-gain'
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
 * `MuralCelebration`, que já tocou o som — dois sons seguidos, 49 vezes ao longo da
 * carreira, cansam. O som fica onde é raro (a subida de nível).
 *
 * ⚠️⚠️ ALTURA É CONTRATO: o cartão precisa caber na tela SEM rolagem, em qualquer tamanho de
 * ganho. Esta modal já estourou a tela porque enumerava as gavetas DUAS vezes — o título
 * montava uma frase com todos os nomes (em `text-2xl`) e os chips repetiam os mesmos nomes,
 * nenhum dos dois com limite. Hoje o título CONTA (ver `toolsGainHeadline`) e os chips param
 * em `MAX_CHIPS`. Ao mexer aqui, mantenha as duas pontas limitadas.
 */

/** Quantos chips cabem antes de virar "+N". Além disso o cartão começa a crescer. */
const MAX_CHIPS = 4

export function ToolsCelebration({ gain, onClose }: { gain: ToolsGain; onClose: () => void }) {
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })

  const headline = toolsGainHeadline(gain)
  const subline = toolsGainSubline(gain)
  const family = toolsGainFamily(gain)
  const drawers = toolsGainDrawers(gain)
  // Esconder UMA gaveta atrás de "+1" não economiza linha nenhuma (o chip do "+1" ocupa o mesmo
  // espaço) e ainda tira um nome da vista da criança. Nesse caso mostra a gaveta mesmo.
  const chips = drawers.slice(0, drawers.length === MAX_CHIPS + 1 ? drawers.length : MAX_CHIPS)
  const restante = drawers.length - chips.length

  return (
    <div
      /* Espelha o `Dialog` do ui: conteúdo alto ROLA em vez de sangrar para fora da tela.
         Com o título e os chips limitados a altura já cabe, mas a rede de segurança fica —
         fonte grande do sistema ou janela muito baixa ainda podem apertar. */
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
        <div className="relative mx-auto flex size-24 items-center justify-center">
          <KidsMascot expression="celebrating" className="kid-wiggle size-24" />
          <span className="-bottom-1 -right-1 absolute grid size-11 place-items-center rounded-full bg-card text-primary shadow-[0_0_0_3px_var(--primary)]">
            <Wrench className="size-5" aria-hidden />
          </span>
        </div>

        <p className="sz-display mt-4 text-base text-muted-foreground">Ferramenta nova! 🛠️</p>
        <h2 className="sz-display mt-1 text-2xl text-primary">{headline}</h2>
        {family ? (
          <p className="mt-1 font-bold text-muted-foreground text-sm">no {familyLabel(family)}</p>
        ) : null}
        {subline ? <p className="mt-1 text-muted-foreground text-sm">{subline}</p> : null}

        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((drawer) => (
            <li
              key={drawer.key}
              className="rounded-full border-2 border-border bg-background px-3 py-1.5 font-bold text-sm"
            >
              {drawer.label}
            </li>
          ))}
          {restante > 0 ? (
            /* "+6" sozinho não diz nada em voz alta: o rótulo acessível completa a frase. */
            <li
              aria-label={`e mais ${restante} ${restante === 1 ? 'ferramenta' : 'ferramentas'}`}
              className="rounded-full border-2 border-primary/30 bg-primary/10 px-3 py-1.5 font-bold text-primary text-sm"
            >
              +{restante}
            </li>
          ) : null}
        </ul>

        <p className="mt-4 text-muted-foreground text-sm">
          Já está no seu Estúdio, e é sua para sempre.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="sz-btn-gradient mt-6 inline-flex h-12 w-full items-center justify-center text-base"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
