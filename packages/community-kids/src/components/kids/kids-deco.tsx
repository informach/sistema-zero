import { cn } from '@/lib/cn'

/**
 * Decoração de fundo das faixas: estrelas e bolhas de cor. Tudo em CSS/SVG, zero
 * asset — é como as páginas de oferta fazem, e é o que separa "fundo colorido" de
 * "página que parece feita para criança".
 *
 * O reset global de `prefers-reduced-motion` (fim do globals.css) já para a
 * flutuação; nada aqui precisa repetir a guarda.
 */

/** A estrela de quatro pontas da logo. Estava escrita à mão duas vezes no auth. */
export function KidsStar({
  className,
  color = 'var(--kids-cyan)',
}: {
  className?: string
  color?: string
}) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path d="M24 6Q27 19 40 24Q27 29 24 42Q21 29 8 24Q21 19 24 6Z" fill={color} />
    </svg>
  )
}

export interface DecoSpot {
  /** Posição em % dentro da faixa, para a decoração acompanhar qualquer largura. */
  top?: string
  bottom?: string
  left?: string
  right?: string
  /** Diâmetro (utilitária de tamanho do Tailwind, ex. `size-40`). */
  size: string
  color: string
  /** `estrela` desenha a faísca; `bolha` desenha o círculo pastel. */
  kind: 'estrela' | 'bolha'
  /** `0` a `2`: velocidades diferentes para as peças não subirem em bloco. */
  ritmo?: 0 | 1 | 2
}

const RITMO = ['kid-float', 'kid-float-lento', 'kid-float kid-float-rev'] as const

/**
 * Camada de decoração absoluta. Vai DENTRO de uma `KidsBand` (que precisa então de
 * `relative overflow-hidden`) e fica atrás do conteúdo, que é `relative`.
 */
export function KidsDeco({ spots, className }: { spots: DecoSpot[]; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
      {spots.map((spot, i) => {
        const estilo = {
          top: spot.top,
          bottom: spot.bottom,
          left: spot.left,
          right: spot.right,
        }
        const movimento = RITMO[spot.ritmo ?? 0]
        return spot.kind === 'bolha' ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: lista puramente decorativa e fixa
            key={i}
            className={cn('kids-bolha', spot.size, movimento)}
            style={{ ...estilo, background: spot.color }}
          />
        ) : (
          <KidsStar
            // biome-ignore lint/suspicious/noArrayIndexKey: lista puramente decorativa e fixa
            key={i}
            color={spot.color}
            className={cn('absolute opacity-30', spot.size, movimento)}
          />
        )
      })}
    </div>
  )
}
