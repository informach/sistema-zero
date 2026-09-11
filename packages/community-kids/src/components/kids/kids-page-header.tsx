import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { KidsBackButton } from './back-button'
import { KidsEyebrow } from './kids-eyebrow'

/**
 * O cabeçalho de toda página da área da criança: seta de voltar (páginas internas),
 * pílula de contexto, título e subtítulo. Existe para as ~20 rotas pararem de
 * escrever o mesmo trio à mão com escalas diferentes.
 *
 * A escala é a das telas-modelo (11/09/2026, medida a 1440px): o título em Baloo
 * extra-negrito chega a 44px, 12px abaixo da pílula, e o subtítulo tem 16px.
 */
export function KidsPageHeader({
  back,
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  actions,
  align = 'left',
  className,
}: {
  /**
   * A setinha das páginas INTERNAS, que volta para a página principal da seção. Vem
   * de `backToSection` (`nav.ts`), nunca escrita à mão na página.
   */
  back?: { href: string; label: string } | null
  eyebrow?: ReactNode
  eyebrowIcon?: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  /** Botões à direita no desktop, abaixo do texto no celular. */
  actions?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  const centro = align === 'center'
  return (
    <div className={cn('flex flex-col', centro && 'items-center', className)}>
      {back ? (
        <KidsBackButton href={back.href} label={back.label} showLabel className="mb-5" />
      ) : null}
      <div
        className={cn(
          'flex w-full flex-col gap-4',
          centro ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
        )}
      >
        <div className={cn('min-w-0', centro && 'flex flex-col items-center')}>
          {eyebrow ? (
            <KidsEyebrow icon={eyebrowIcon} className="mb-3">
              {eyebrow}
            </KidsEyebrow>
          ) : null}
          {/* Peso 800 por estilo INLINE, e não `font-extrabold`: a `.sz-display` fica
              fora de camada e fixa 700, então venceria a utilitária sem avisar (a
              armadilha registrada no CLAUDE.md). O Baloo 2 é variável, o 800 existe. */}
          <h1
            className="sz-display text-[clamp(2rem,3.4vw,2.75rem)] text-foreground leading-[1.1]"
            style={{ fontWeight: 800 }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={cn(
                'mt-3 max-w-prose font-medium text-base text-muted-foreground',
                centro && 'mx-auto',
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
