import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Herói azul sólido, a peça que abre as páginas na referência. Duas formas:
 *
 * - `alto`: bloco alto com a copy à esquerda e uma ilustração à direita. Abre a
 *   página quando há uma história para contar (Criar, Comunidade).
 * - `faixa`: barra horizontal com ladrilho de ícone, uma linha de texto e botões
 *   à direita. É o resumo do estado da criança (o card do topo do perfil).
 *
 * O azul é o da marca, sem gradiente: a referência usa chapado, e é o que faz o
 * botão invertido por cima ter contraste de verdade.
 *
 * ⚠️ A cor vem por CLASSE (`.kids-marca`), nunca por `bg-(--sz-primary)` +
 * `text-white`. `--sz-primary` tem PAR: no tema escuro ele é o azul CLARO e a tinta
 * é escura. A primeira versão fixou branco e o herói inteiro reprovava no escuro
 * (2,45:1, medido). As `.kids-marca-*` carregam o par junto.
 */
export function KidsHero({
  variant = 'faixa',
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  footer,
  art,
  className,
}: {
  variant?: 'alto' | 'faixa'
  /** Só na variante `faixa`: o ladrilho branco translúcido à esquerda. */
  icon?: LucideIcon
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Linha de apoio abaixo do texto (o aviso de sequência/ranking no perfil). */
  footer?: ReactNode
  /** Ilustração da variante `alto`. Recorte transparente, sem moldura. */
  art?: ReactNode
  className?: string
}) {
  const alto = variant === 'alto'
  return (
    <div
      className={cn(
        'kids-marca relative overflow-hidden rounded-[var(--raio-carta)]',
        'shadow-[var(--sombra-carta)]',
        alto ? 'px-6 py-8 md:px-10 md:py-12' : 'px-5 py-5 md:px-8 md:py-6',
        className,
      )}
    >
      <div aria-hidden="true" className="kids-marca-pontos pointer-events-none absolute inset-0" />
      <div
        className={cn(
          'relative flex gap-6',
          alto
            ? 'flex-col items-start md:flex-row md:items-center md:justify-between'
            : 'flex-col md:flex-row md:items-center',
        )}
      >
        {!alto && Icon ? (
          <span className="kids-marca-tile grid size-14 shrink-0 place-items-center rounded-2xl">
            <Icon className="size-7" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="kids-marca-suave mb-2 font-bold text-sm uppercase tracking-[0.06em]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className={cn('sz-display', alto ? 'text-[clamp(1.6rem,3.8vw,2.3rem)]' : 'text-2xl')}>
            {title}
          </h2>
          {description ? (
            <p className="kids-marca-suave mt-2 max-w-prose font-semibold text-base">
              {description}
            </p>
          ) : null}
          {footer ? <div className="mt-3">{footer}</div> : null}
          {/* Na forma ALTA os botões moram na coluna de texto, como na referência:
              copy à esquerda com o CTA no fim dela, ilustração à direita. Na FAIXA
              eles são irmãos do texto e encostam na borda direita. */}
          {alto && actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {!alto && actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 md:flex-col md:items-stretch">
            {actions}
          </div>
        ) : null}
        {alto && art ? <div className="relative shrink-0">{art}</div> : null}
      </div>
    </div>
  )
}
