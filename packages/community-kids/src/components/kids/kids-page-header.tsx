import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { KidsEyebrow } from './kids-eyebrow'

/**
 * O cabeçalho de toda página da área da criança: pílula de contexto, título e
 * subtítulo. Existe para as ~20 rotas pararem de escrever o mesmo trio à mão com
 * escalas diferentes (hoje o mesmo papel aparece como `text-2xl`, `text-3xl` e
 * `text-4xl` dependendo da página).
 *
 * O título usa `clamp()` generoso porque é a mudança de maior efeito da rodada:
 * o `h1` do kids era ~40% menor que o da página de oferta, e é isso, mais que
 * qualquer cor, que fazia a plataforma parecer o "lado sério" do produto.
 */
export function KidsPageHeader({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  actions,
  align = 'left',
  className,
}: {
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
    <div
      className={cn(
        'flex flex-col gap-4',
        centro ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className={cn('min-w-0', centro && 'flex flex-col items-center')}>
        {eyebrow ? (
          <KidsEyebrow icon={eyebrowIcon} className="mb-3">
            {eyebrow}
          </KidsEyebrow>
        ) : null}
        <h1 className="sz-display text-[clamp(1.75rem,4.4vw,2.6rem)] text-foreground">{title}</h1>
        {subtitle ? (
          <p
            className={cn(
              // Peso 600 no corpo: é o que dá o ar infantil sem engordar nada, e
              // é o peso que o funil usa em todo texto de apoio.
              'mt-2 max-w-prose font-semibold text-base text-muted-foreground',
              centro && 'mx-auto',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
