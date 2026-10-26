import { BrandLogo } from '@sistemazero/ui/brand-logo'
import { CircleHelp, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A moldura das páginas de entrada ("Estúdio à noite", 25/10/2026): o PALCO à esquerda, com a logo
 * escura e o painel de cada página (`aside`), e a bancada clara à direita, com o formulário numa
 * folha branca. O palco só aparece a partir de 1024 px: no celular a logo clara fica acima da folha.
 * Sem `aside`, a folha fica sozinha e centrada.
 */
export function AuthSplitShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="flex min-h-screen bg-background">
      {aside ? (
        <aside className="sz-palco hidden min-w-0 flex-[0_1_52%] flex-col gap-12 px-14 py-12 lg:flex xl:px-16">
          <Link
            href="/login"
            aria-label="Comunidade Sistema Zero: ir para Entrar"
            className="self-start rounded-md focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            <BrandLogo
              fundo="escuro"
              label="Comunidade Sistema Zero"
              className="block h-auto w-[13rem] max-w-full"
            />
          </Link>
          <div className="flex flex-1 items-center">{aside}</div>
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-1 justify-center px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:items-center lg:py-12">
        <div className="flex w-full max-w-[32rem] flex-col gap-6">
          <Link
            href="/login"
            aria-label="Comunidade Sistema Zero: ir para Entrar"
            className={cn(
              'self-start rounded-md focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2',
              aside && 'lg:hidden',
            )}
          >
            <BrandLogo
              fundo="claro"
              label="Comunidade Sistema Zero"
              className="block h-auto w-[10rem] max-w-full sm:w-[12rem]"
            />
          </Link>
          <div className="sz-card px-5 py-7 sm:px-9 sm:py-9">{children}</div>
        </div>
      </div>
    </main>
  )
}

export interface AuthAsideItem {
  /** Ícone do item; sem ele, o número da ordem, em pixel. */
  icon?: LucideIcon
  title?: string
  text: ReactNode
}

/** As cores dos números do painel, na ordem: o amarelo, o rosa e o menta do palco. */
const NUMBER_TONES = ['text-(--cta)', 'text-(--rosa)', 'text-(--menta)'] as const

/** O conteúdo do palco: um sobretítulo em pixel, o título grande, a frase e até três itens. */
export function AuthAside({
  label,
  kicker,
  title,
  lead,
  items,
}: {
  label: string
  kicker?: string
  title: string
  lead?: string
  items: AuthAsideItem[]
}) {
  return (
    <section aria-label={label} className="flex max-w-[36rem] flex-col gap-9">
      <div className="flex flex-col gap-4">
        {kicker ? (
          <span className="font-(family-name:--font-pixel) text-(--menta) text-[0.9rem] uppercase tracking-[0.06em]">
            {kicker}
          </span>
        ) : null}
        <h2 className="sz-h1">{title}</h2>
        {lead ? <p className="sz-lead m-0">{lead}</p> : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <li key={item.title ?? i} className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex size-[2.4rem] flex-none items-center justify-center rounded-xl bg-(--carta) font-(family-name:--font-pixel)',
                  NUMBER_TONES[i % NUMBER_TONES.length],
                )}
              >
                {Icon ? <Icon className="size-6" /> : i + 1}
              </span>
              <span className="pt-1.5 text-(--texto-claro-2)">
                {item.title ? <strong className="text-white">{item.title} </strong> : null}
                {item.text}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** O atalho para a ajuda pública de quem não consegue entrar. */
export function AuthHelpLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/ajuda/entrar" className="sz-link inline-flex min-h-12 items-center gap-2.5">
      <CircleHelp aria-hidden="true" className="size-5 flex-none" />
      {children}
    </Link>
  )
}

/** Título e frase de apoio de cada página de entrada. */
export function AuthHeading({
  kicker,
  title,
  lead,
  as = 'h1',
}: {
  kicker?: string
  title: string
  lead?: ReactNode
  as?: 'h1' | 'h2'
}) {
  const Heading = as
  return (
    <div className="flex flex-col gap-2">
      {kicker ? <span className="sz-kicker">{kicker}</span> : null}
      <Heading className="sz-h2">{title}</Heading>
      {lead ? <p className="m-0 text-muted-foreground">{lead}</p> : null}
    </div>
  )
}
