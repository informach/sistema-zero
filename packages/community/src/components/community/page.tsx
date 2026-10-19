import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A faixa do topo de toda página adulta (direção de arte de 18/10/2026): o papel quadriculado de
 * quem desenha jogos, com o sobretítulo em mono, o título na Bricolage e a frase de apoio.
 */
export function PageBand({
  kicker,
  title,
  lead,
  back,
  actions,
  children,
  compact = false,
}: {
  kicker?: ReactNode
  title: ReactNode
  lead?: ReactNode
  back?: { href: string; label: string }
  actions?: ReactNode
  children?: ReactNode
  compact?: boolean
}) {
  return (
    <section className="sz-band">
      <div
        className={cn(
          'sz-page flex flex-col gap-3',
          compact ? 'py-7' : 'pt-10 pb-9 md:pt-12 md:pb-11',
        )}
      >
        {back ? <BackLink href={back.href} label={back.label} /> : null}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 max-w-4xl flex-1 basis-[28rem] flex-col gap-2.5">
            {kicker ? <span className="sz-kicker">{kicker}</span> : null}
            <h1 className={compact ? 'sz-h1-sm' : 'sz-h1'}>{title}</h1>
            {lead ? <p className="sz-lead">{lead}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  )
}

/** O conteúdo da página, abaixo da faixa. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('sz-page flex flex-col gap-12 pt-10 pb-16', className)}>{children}</div>
}

/** "Voltar a …" com a seta: texto sempre visível e alvo de 48 px. */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        'inline-flex min-h-[2.4rem] items-center gap-2 self-start font-bold text-foreground hover:text-(--link)',
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
      {label}
    </Link>
  )
}

/** Cabeçalho de seção: título à esquerda e, opcional, um link ou ação à direita. */
export function SectionHeader({
  title,
  id,
  action,
  as: Heading = 'h2',
}: {
  title: ReactNode
  id?: string
  action?: ReactNode
  as?: 'h2' | 'h3'
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <Heading id={id} className={Heading === 'h2' ? 'sz-h2' : 'sz-h3'}>
        {title}
      </Heading>
      {action}
    </div>
  )
}
