import { Check, Crown, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { isLegend, type StageBadge, stageColor, stageInk } from '@/lib/journey-stage'

export interface JourneyStepperItem {
  key: string
  href: string
  title: string
  /** `bloqueada` (só no currículo): ainda não alcançada, cinza e sem link, como no Kids. */
  state: 'feita' | 'aqui' | 'fechada' | 'bloqueada'
}

/**
 * A linha das etapas (Estúdio à noite): um círculo por etapa na cor dela, o ✓ nas concluídas, a
 * atual maior e com "Você está aqui", e a Lenda no fim. Cada etapa leva à página dela. No celular a
 * linha rola de lado. Serve à jornada histórica e ao currículo da Jornada do Criador.
 * No currículo, a etapa ainda não alcançada (`bloqueada`) e a Lenda antes de chegar lá ficam em
 * cinza, com o cadeado, e não são link (a mesma trava do mapa do Kids).
 */
export function JourneyStepper({
  items,
  total,
  legendReached,
  legendHref,
  legendLocked = false,
}: {
  items: readonly JourneyStepperItem[]
  /** Posições da jornada, com a Lenda (`items.length + 1`). */
  total: number
  legendReached: boolean
  /** No currículo a Lenda leva às Maestrias. */
  legendHref?: string
  /** A Lenda ainda não alcançada: cinza, com cadeado e sem link. */
  legendLocked?: boolean
}) {
  const legend = (
    <>
      <StageMedal
        badge={{ position: total, total, title: null }}
        big={legendReached}
        crown
        locked={legendLocked}
      />
      <span
        className={cn(
          'font-bold text-[0.85rem] leading-tight',
          legendLocked ? 'text-muted-foreground' : 'text-(--dourado)',
        )}
      >
        Lenda
      </span>
      <span className="text-[0.85rem] text-muted-foreground leading-tight">
        {legendReached ? 'Você chegou' : legendHref ? 'As Maestrias' : 'Fim da jornada'}
      </span>
      {legendLocked ? <span className="sr-only">Ainda bloqueada</span> : null}
    </>
  )
  return (
    <ol
      aria-label="Etapas da jornada"
      // A linha rola por dentro sem empurrar a página no celular: `contain: inline-size` tira a
      // largura dela da conta de quem a contém (numa coluna flex), e `relative` prende os
      // rótulos `sr-only` (absolutos) dentro da rolagem.
      className="relative m-0 -mx-1 flex list-none gap-1 overflow-x-auto p-1 pb-2 [contain:inline-size]"
    >
      {items.map((item, index) => {
        const badge = { position: index + 1, total, title: item.title }
        if (item.state === 'bloqueada')
          return (
            <li key={item.key} className="flex min-w-[5.4rem] flex-1 flex-col items-center">
              <span className="flex flex-col items-center gap-2 px-1.5 py-1 text-center">
                <StageMedal badge={badge} locked />
                <span className="text-[0.85rem] text-muted-foreground leading-tight">
                  <span className="sr-only">Etapa {index + 1}: </span>
                  {item.title}
                  <span className="sr-only">. Ainda bloqueada</span>
                </span>
              </span>
            </li>
          )
        return (
          <li key={item.key} className="flex min-w-[5.4rem] flex-1 flex-col items-center">
            <Link
              href={item.href}
              prefetch={false}
              aria-current={item.state === 'aqui' ? 'step' : undefined}
              className="flex flex-col items-center gap-2 rounded-[0.8rem] px-1.5 py-1 text-center text-foreground no-underline focus-visible:outline-3 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
            >
              <StageMedal badge={badge} done={item.state === 'feita'} big={item.state === 'aqui'} />
              <span
                className={cn(
                  'text-[0.85rem] leading-tight',
                  item.state === 'aqui' ? 'font-bold' : 'text-(--texto-claro-2)',
                )}
              >
                <span className="sr-only">Etapa {index + 1}: </span>
                {item.title}
              </span>
              {item.state === 'aqui' ? (
                <span className="sz-chip sz-chip-novo">Você está aqui</span>
              ) : item.state === 'feita' ? (
                <span className="sz-chip sz-chip-ok">Concluída</span>
              ) : null}
            </Link>
          </li>
        )
      })}
      <li className="flex min-w-[5.4rem] flex-1 flex-col items-center">
        {legendHref && !legendLocked ? (
          <Link
            href={legendHref}
            prefetch={false}
            aria-current={legendReached ? 'step' : undefined}
            className="flex flex-col items-center gap-2 rounded-[0.8rem] px-1.5 py-1 text-center text-foreground no-underline focus-visible:outline-3 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
          >
            {legend}
          </Link>
        ) : (
          <span className="flex flex-col items-center gap-2 px-1.5 py-1 text-center">{legend}</span>
        )}
      </li>
    </ol>
  )
}

/**
 * O número da etapa dentro de um círculo na cor dela (com o fundo em volta, como o anel). A etapa
 * trancada perde a cor (o cinza do palco) e mostra o cadeado no lugar do número.
 */
export function StageMedal({
  badge,
  done = false,
  big = false,
  crown = false,
  locked = false,
}: {
  badge: StageBadge
  done?: boolean
  big?: boolean
  crown?: boolean
  locked?: boolean
}) {
  const color = locked ? 'var(--muted)' : stageColor(badge)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-full font-(family-name:--font-pixel) text-[1.1rem]',
        big ? 'size-16' : 'size-12',
      )}
      style={{
        background: color,
        color: locked ? 'var(--muted-foreground)' : stageInk(badge),
        boxShadow: `0 0 0 3px var(--card), 0 0 0 ${big ? 6 : 5}px ${color}`,
      }}
    >
      {locked ? (
        <Lock className="size-5" />
      ) : done ? (
        <Check className="size-6" />
      ) : crown || isLegend(badge) ? (
        <Crown className="size-6" />
      ) : (
        badge.position
      )}
    </span>
  )
}
