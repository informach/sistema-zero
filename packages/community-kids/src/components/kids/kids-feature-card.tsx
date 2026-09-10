import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Card com CABEÇALHO COLORIDO e selo no canto: as quatro oficinas do Criar e as
 * portas da Comunidade. É o card que dá cor à página sem pintar o fundo inteiro.
 *
 * A cor entra por `--card-cor`/`--card-tinta` (o par de assinatura da oficina, ver
 * `--tool-*` no globals) e não por classe, porque o par é escolhido no call site a
 * partir de um mapa literal — Tailwind não gera classe de template string.
 *
 * ⚠️⚠️ O QUE PODE E O QUE NÃO PODE IR NO CABEÇALHO, medido no CSS compilado.
 * As quatro cores dão de 3,68 a 4,23:1 contra o branco. Isso:
 *  - PASSA para o ícone (gráfico, régua 3:1 da WCAG 1.4.11);
 *  - PASSA para o título, porque ele é `text-xl` (20px) em peso 700, e a WCAG
 *    trata 14pt (18,66px) em negrito como texto GRANDE, também a 3:1;
 *  - REPROVA para qualquer texto miúdo. Por isso a DESCRIÇÃO mora no corpo
 *    branco do card, e não no cabeçalho — foi assim que a primeira versão
 *    quebrou, com `text-sm text-white/90` em cima da cor.
 * Escurecer as quatro até o branco miúdo passar custaria justamente a cor que a
 * página foi buscar. Mover o texto miúdo não custa nada.
 */
export function KidsFeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  color,
  ink,
  children,
  footer,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Selo do canto do cabeçalho ("Liberado", "Novo"). */
  badge?: ReactNode
  /** Fundo do cabeçalho, ex. `var(--tool-pinta)`. */
  color: string
  /** Mesma cor em versão tinta, ex. `var(--tool-pinta-texto)`. */
  ink: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('kids-carta flex flex-col overflow-hidden', className)}
      style={{ '--card-cor': color, '--card-tinta': ink } as CSSProperties}
    >
      <div className="flex items-center gap-3 bg-(--card-cor) px-5 py-4 text-white">
        <Icon className="size-7 shrink-0" aria-hidden />
        <h3 className="sz-display min-w-0 flex-1 text-xl leading-tight">{title}</h3>
        {badge ? (
          // ⚠️ A tinta do selo é a tinta ESCURA da marca, e não `--card-tinta`.
          // A pílula é branca nos DOIS temas (ela vive sobre a cor do cabeçalho, que
          // também não muda), mas `--card-tinta` clareia no escuro para poder ser lida
          // sobre o corpo navy do cartão — e aí saía tinta clara sobre pílula branca.
          // A cor do selo já está no cabeçalho inteiro atrás dele; o rótulo de 12px
          // não precisa repeti-la. Medido: 12,96:1.
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 font-bold text-(--sz-kids-tinta) text-xs">
            {badge}
          </span>
        ) : null}
      </div>
      {description || children ? (
        <div className="flex-1 px-5 py-4">
          {description ? (
            <p className="font-semibold text-muted-foreground text-sm">{description}</p>
          ) : null}
          {children ? <div className={description ? 'mt-3' : undefined}>{children}</div> : null}
        </div>
      ) : null}
      {footer ? (
        <div className="border-(--linha-carta) border-t px-5 py-3 font-bold text-(--card-tinta) text-sm">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
