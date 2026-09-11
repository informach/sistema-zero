import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Card com CABEÇALHO COLORIDO e selo no canto: as oficinas do Criar e as portas da
 * Comunidade. É o card que dá cor à página sem pintar o fundo inteiro.
 *
 * O desenho é o das telas-modelo (11/09/2026): a faixa colorida leva SÓ o ladrilho
 * translúcido com o ícone e o selo branco no canto; o título, a descrição e o link
 * moram no corpo branco. Foi assim que o problema de contraste acabou de vez: o
 * texto nunca fica sobre a cor.
 *
 * As cores entram por variável (`--card-cor` e as tintas), e não por classe, porque
 * são escolhidas no call site a partir de um mapa literal — Tailwind não gera classe
 * de template string.
 */
export function KidsFeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  color,
  ink,
  fg = 'var(--sz-tool-on-sig)',
  seloInk = 'var(--sz-kids-tinta)',
  children,
  footer,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Selo do canto do cabeçalho ("Liberado", "4 conversas novas"). */
  badge?: ReactNode
  /** Fundo do cabeçalho, ex. `var(--tool-pinta)`. */
  color: string
  /** A cor como TINTA sobre o corpo (o link do rodapé), ex. `var(--tool-pinta-texto)`. */
  ink: string
  /** A tinta do ÍCONE sobre o fundo: branca, e escura no âmbar do Pensa. */
  fg?: string
  /**
   * A tinta do selo branco. A pílula é branca nos dois temas, então esta tinta não
   * pode clarear no escuro (é o `-selo` da oficina, não o `-texto`).
   */
  seloInk?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('kids-carta flex flex-col overflow-hidden', className)}
      style={
        {
          '--card-cor': color,
          '--card-tinta': ink,
          '--card-fg': fg,
          '--card-selo': seloInk,
        } as CSSProperties
      }
    >
      <div className="flex min-h-[5.5rem] items-center justify-between gap-3 bg-(--card-cor) px-5 py-5">
        {/* O ladrilho é branco TRANSLÚCIDO nos quatro fundos (inclusive no âmbar), como
            nas telas-modelo; o que muda por oficina é só a tinta do ícone. */}
        {/* Canto de 12px, medido. (`rounded-xl` no kids é 20px: o `--radius` daqui é
            maior que o do Tailwind, então os cantos da régua vão por valor.) */}
        <span className="grid size-12 shrink-0 place-items-center rounded-[0.75rem] bg-white/25">
          <Icon className="size-6 text-(--card-fg)" aria-hidden />
        </span>
        {badge ? (
          <span className="min-w-0 truncate rounded-full bg-white px-3 py-1 font-bold text-(--card-selo) text-xs">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-5 pt-5 pb-5">
        {/* 24px no extra-negrito da `.sz-display`: medido 216px para "Clube dos
            Criadores" no modelo (a 22px/700 dava 191px). */}
        <h3 className="sz-display text-2xl">{title}</h3>
        {description ? (
          <p className="mt-2 font-medium text-muted-foreground text-sm">{description}</p>
        ) : null}
        {children ? <div className={description ? 'mt-3' : 'mt-2'}>{children}</div> : null}
        {footer ? (
          <div className="mt-auto pt-4 font-bold text-(--card-tinta) text-sm">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
