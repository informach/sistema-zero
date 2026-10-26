import { BrandLogo } from '@sistemazero/ui/brand-logo'
import { CircleHelp, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * A moldura das páginas de entrada (direção de arte de 18/10/2026): o formulário à esquerda, com a
 * logo, e o painel azul-marinho à direita, que diz o que a pessoa encontra depois de entrar. O
 * painel é de cada página (`aside`) e só aparece a partir de 1024 px: no celular o formulário
 * ocupa a tela inteira. Sem `aside`, a coluna do formulário fica sozinha e centrada.
 */
export function AuthSplitShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="flex min-h-screen bg-background">
      <div className="flex min-w-0 flex-1 justify-center px-4 pt-10 pb-14 sm:px-6 sm:pt-14">
        <div className="flex w-full max-w-[26rem] flex-col gap-6">
          <Link
            href="/login"
            aria-label="Comunidade Sistema Zero: ir para Entrar"
            className="self-start rounded-md focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            <BrandLogo
              fundo="claro"
              label="Comunidade Sistema Zero"
              className="block h-auto w-[15rem] max-w-full"
            />
          </Link>
          {children}
        </div>
      </div>
      {aside ? (
        <aside className="sz-palco hidden min-w-0 flex-[0_1_46%] items-center justify-center bg-(--palco) px-12 py-16 lg:flex">
          {aside}
        </aside>
      ) : null}
    </main>
  )
}

export interface AuthAsideItem {
  /** Ícone do item; sem ele, o número da ordem. */
  icon?: LucideIcon
  title?: string
  text: ReactNode
}

/** O conteúdo do painel azul: um título e até três itens curtos. */
export function AuthAside({
  label,
  title,
  lead,
  items,
}: {
  label: string
  title: string
  lead?: string
  items: AuthAsideItem[]
}) {
  return (
    <section aria-label={label} className="flex max-w-[26rem] flex-col gap-7">
      <div className="flex flex-col gap-3">
        <h2 className="sz-h1-sm text-white">{title}</h2>
        {lead ? <p className="m-0 text-(--texto-claro-2)">{lead}</p> : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-5 p-0">
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <li key={item.title ?? i} className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="inline-flex size-[2.6rem] flex-none items-center justify-center rounded-xl bg-(--carta) font-(family-name:--font-pixel) text-(--cta)"
              >
                {Icon ? <Icon className="size-6" /> : i + 1}
              </span>
              <span className="text-(--texto-claro-2)">
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
      <Heading className="sz-h1-sm">{title}</Heading>
      {lead ? <p className="m-0 text-muted-foreground">{lead}</p> : null}
    </div>
  )
}
