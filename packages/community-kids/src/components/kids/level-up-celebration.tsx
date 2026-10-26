'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { levelInfo } from '@/lib/level-info'
import { type ToolsGain, toolsGainInline } from '@/lib/tools-gain'
import type { StudentLevelSlug } from '@/lib/types'
import { KidsConfetti } from './kids-confetti'
import { KidsMascotAnimated } from './mascot-rive'

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
  molda = null,
  trail = null,
  onClose,
}: {
  level: StudentLevelSlug
  /**
   * No currículo da Jornada do Criador: o que a trilha nova abriu (os cursos da trilha, a
   * missão e quantos Poderes), para a festa dizer o que tem de novo e levar até lá.
   */
  trail?: LevelUpTrail | null
  /** Ferramenta ganha no MESMO momento; `null` = só subiu de nível. */
  tools?: ToolsGain | null
  /**
   * O ganho real do Molda desde a observação anterior, só para quem tem o produto;
   * `null` = nada a dizer do Molda.
   */
  molda?: string | null
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
      className="kids-sobre-escuro sz-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
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
          <KidsMascotAnimated
            expression="celebrating"
            className="size-28"
            stillClassName="kid-wiggle"
          />
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
        <p className="mt-2 text-muted-foreground text-sm">
          {trail?.previous
            ? `Você completou a Trilha ${trail.previous}.`
            : 'Você conquistou mais um posto na sua jornada de criação!'}
        </p>

        {trail ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-(--band-creme) px-4 py-3 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/jornada/${level}.webp`}
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-full border-[3px] bg-card object-cover"
              style={{ borderColor: info.colorVar }}
            />
            <div className="min-w-0">
              <p className="font-extrabold text-sm">
                {trail.legend ? 'As Maestrias estão abertas' : `A Trilha ${trail.title} abriu`}
              </p>
              <ul className="mt-1.5 space-y-1 font-medium text-muted-foreground text-sm">
                {trail.legend ? (
                  <li>🏆 Escolha no que quer ficar craque, em qualquer ordem</li>
                ) : (
                  <>
                    {trail.courses.length ? (
                      <li>
                        🎮{' '}
                        {trail.courses.length === 1
                          ? '1 curso novo'
                          : `${trail.courses.length} cursos novos`}
                        : {trail.courses.join(' e ')}
                      </li>
                    ) : null}
                    {trail.mission ? <li>🎯 A missão {trail.mission}</li> : null}
                    {trail.powers ? <li>⚡ {trail.powers} Poderes para escolher</li> : null}
                  </>
                )}
              </ul>
            </div>
          </div>
        ) : null}

        {tools ? (
          <p className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 font-bold text-primary text-sm">
            🛠️ E tem mais: {toolsGainInline(tools)}
          </p>
        ) : null}
        {molda ? (
          <p
            className={cn(
              tools ? 'mt-3' : 'mt-4',
              'rounded-2xl bg-primary/10 px-4 py-3 font-bold text-primary text-sm',
            )}
          >
            🧊 No Molda: {molda}
          </p>
        ) : null}

        {trail ? (
          <>
            <Link
              href={trail.legend ? '/maestrias' : `/cursos/trilha/${level}`}
              prefetch={false}
              onClick={onClose}
              className="sz-btn-gradient mt-7 inline-flex h-12 w-full items-center justify-center text-base"
            >
              {trail.legend ? 'Ver as Maestrias' : `Ver a Trilha ${trail.title}`}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex min-h-11 items-center font-bold text-primary text-sm"
            >
              Continuar depois
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="sz-btn-gradient mt-7 inline-flex h-12 w-full items-center justify-center text-base"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  )
}

/** O que a trilha nova abriu, para a festa de subir de nível no currículo. */
export interface LevelUpTrail {
  title: string
  /** A trilha que a criança acabou de terminar. */
  previous: string | null
  courses: string[]
  mission: string | null
  powers: number
  /** Subiu para a Lenda: o que abre são as Maestrias. */
  legend: boolean
}
