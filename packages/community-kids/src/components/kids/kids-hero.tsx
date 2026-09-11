import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Herói azul sólido, a peça que abre as páginas nas telas-modelo. Duas formas:
 *
 * - `alto`: bloco alto com a copy à esquerda e uma ilustração à direita. Abre a
 *   página quando há uma história para contar (Criar, Comunidade).
 * - `faixa`: barra horizontal com ladrilho de ícone, uma linha de texto e botões
 *   à direita. É o resumo do estado da criança (o card do topo do perfil).
 *
 * O desenho é o das telas-modelo de 11/09/2026: azul CHAPADO da marca (sem a
 * textura de pontinhos), cantos de 28px e a ÚNICA sombra das páginas, difusa,
 * medida escurecendo o creme logo abaixo dele.
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
  titleAs: Title = 'h2',
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
  /**
   * `h1` quando o herói É o título da página (o Clube: na tela-modelo o nome do espaço
   * mora dentro do azul, sem título solto acima). Padrão `h2`.
   */
  titleAs?: 'h1' | 'h2'
  description?: ReactNode
  actions?: ReactNode
  /** Linha de apoio abaixo do texto (o aviso de sequência/ranking no perfil). */
  footer?: ReactNode
  /** Ilustração da variante `alto`, à direita. */
  art?: ReactNode
  className?: string
}) {
  const alto = variant === 'alto'
  return (
    <div
      className={cn(
        'kids-marca relative rounded-[1.75rem] shadow-(--sombra-heroi)',
        // Só a forma ALTA corta o que passa (a ilustração nos cantos). A FAIXA não pode: o
        // sino do Clube abre a lista dele para fora do azul, e cortada ela sumia no meio do
        // herói (full review de 11/09/2026).
        alto ? 'overflow-hidden p-6 md:p-7 md:pl-10' : 'p-5 md:p-7',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex',
          alto
            ? 'flex-col items-start gap-6 md:flex-row md:items-center md:justify-between'
            : 'flex-col gap-5 md:flex-row md:items-center md:gap-6',
        )}
      >
        {/* Na FAIXA o ladrilho é o de 84px do herói do Clube (medido a 1440px). */}
        {!alto && Icon ? (
          <span className="kids-marca-tile grid size-16 shrink-0 place-items-center rounded-[1.25rem] md:size-[5.25rem] md:rounded-[1.375rem]">
            <Icon className="size-8 md:size-11" strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
        <div className={cn('min-w-0 flex-1', alto && 'md:py-3')}>
          {/* Respiros medidos pixel a pixel no herói do Mural (1440px): ~23px de tinta a
              tinta entre sobretítulo, título e texto, e ~18px do texto ao botão. */}
          {eyebrow ? (
            <p className="kids-marca-suave mb-3.5 font-bold text-[0.8125rem] uppercase tracking-[0.12em]">
              {eyebrow}
            </p>
          ) : null}
          <Title className="sz-display text-[clamp(1.6rem,2.8vw,2.25rem)]">{title}</Title>
          {description ? (
            <p className={cn('kids-marca-suave max-w-prose text-base', alto ? 'mt-4' : 'mt-2.5')}>
              {description}
            </p>
          ) : null}
          {footer ? <div className="mt-3">{footer}</div> : null}
          {/* Na forma ALTA os botões moram na coluna de texto, como na referência:
              copy à esquerda com o CTA no fim dela, ilustração à direita. Na FAIXA
              eles são irmãos do texto e encostam na borda direita. */}
          {alto && actions ? <div className="mt-3.5 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {!alto && actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
        {alto && art ? <div className="relative shrink-0">{art}</div> : null}
      </div>
    </div>
  )
}
