'use client'

import { type ReactNode, useId, useState } from 'react'
import { cn } from '../../lib/cn'

interface HeadingDisclosureProps {
  /** Nível do título (o que o leitor de tela lista entre os títulos da página). */
  headingLevel?: 2 | 3
  defaultOpen?: boolean
  /** Antes do texto: um selo ou número decorativo (quem passa marca `aria-hidden`). */
  leading?: ReactNode
  /** Acima do título, no mesmo nome do botão ("Nível II"). */
  kicker?: ReactNode
  /** Ao lado do kicker; vira a descrição do botão ("Atual", "Concluído"). */
  status?: ReactNode
  title: ReactNode
  /** Abaixo do título; também vira a descrição do botão (pílulas do que falta). */
  details?: ReactNode
  /** Depois do texto: a seta (gire com `group-data-open/<grupo>:rotate-180`). */
  trailing?: ReactNode
  className?: string
  buttonClassName?: string
  titleClassName?: string
  detailsClassName?: string
  panelClassName?: string
  children: ReactNode
}

/**
 * Uma seção que abre e fecha com o título de verdade: `<hN><button aria-expanded>` e o painel
 * logo abaixo. O `<summary>` vira botão para o leitor de tela e apaga o título que mora dentro
 * dele, então quem precisa de título navegável usa esta peça no lugar de `<details>`.
 * O nome do botão é o kicker + o título; o estado e os detalhes são a descrição. O painel
 * fechado continua no DOM (`hidden`): um formulário pela metade não se perde ao fechar.
 */
export function HeadingDisclosure({
  headingLevel = 2,
  defaultOpen = false,
  leading,
  kicker,
  status,
  title,
  details,
  trailing,
  className,
  buttonClassName,
  titleClassName,
  detailsClassName,
  panelClassName,
  children,
}: HeadingDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const ids = {
    kicker: `${id}-kicker`,
    status: `${id}-status`,
    title: `${id}-title`,
    details: `${id}-details`,
    panel: `${id}-panel`,
  }
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  const labelledBy = [kicker ? ids.kicker : null, ids.title].filter(Boolean).join(' ')
  const describedBy = [status ? ids.status : null, details ? ids.details : null]
    .filter(Boolean)
    .join(' ')
  return (
    <div data-sz-disclosure="" data-open={open ? '' : undefined} className={className}>
      <Heading className="m-0 font-[inherit] text-[length:inherit]">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={ids.panel}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy || undefined}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'flex w-full cursor-pointer items-start gap-4 border-0 bg-transparent p-0 text-left text-inherit',
            buttonClassName,
          )}
        >
          {leading}
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            {kicker || status ? (
              <span className="flex flex-wrap items-center gap-2">
                {kicker ? <span id={ids.kicker}>{kicker}</span> : null}
                {status ? <span id={ids.status}>{status}</span> : null}
              </span>
            ) : null}
            <span id={ids.title} className={cn('block', titleClassName)}>
              {title}
            </span>
            {details ? (
              <span id={ids.details} className={cn('flex flex-wrap gap-2', detailsClassName)}>
                {details}
              </span>
            ) : null}
          </span>
          {trailing}
        </button>
      </Heading>
      <div
        id={ids.panel}
        role="region"
        aria-labelledby={labelledBy}
        hidden={!open}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  )
}
