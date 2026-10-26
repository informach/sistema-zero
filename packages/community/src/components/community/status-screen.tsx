import { BrandLogo } from '@sistemazero/ui/brand-logo'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * A tela inteira de recado (direção de arte de 18/10/2026; no palco desde o "Estúdio à noite",
 * 25/10/2026): a barra escura só com a logo (serve a quem está ou não logado) e o recado no meio,
 * com os caminhos para seguir. Usada pela página não
 * encontrada e pela página de erro.
 */
export function StatusScreen({
  big,
  icon: Icon,
  title,
  text,
  children,
}: {
  /** Um número grande decorativo (o 404). */
  big?: string
  icon?: LucideIcon
  title: string
  text: ReactNode
  /** Os botões. */
  children: ReactNode
}) {
  return (
    // O recado inteiro no palco (Estúdio à noite): a barra com a logo e o número grande em pixel.
    <div className="sz-palco flex min-h-dvh flex-col">
      <header className="border-(--linha-escura) border-b bg-(--topo)">
        <div className="sz-page flex min-h-20 items-center">
          <Link
            href="/"
            aria-label="Comunidade Sistema Zero: ir para o início"
            className="rounded-md focus-visible:outline-3 focus-visible:outline-(--sz-community-action-light) focus-visible:outline-offset-2"
          >
            <BrandLogo
              fundo="escuro"
              label="Comunidade Sistema Zero"
              className="block h-auto w-40"
            />
          </Link>
        </div>
      </header>
      <main className="sz-page flex flex-1 items-center justify-center py-14">
        <section
          aria-labelledby="recado-titulo"
          className="flex max-w-[36rem] flex-col items-center gap-4 text-center"
        >
          {big ? (
            <span
              aria-hidden="true"
              className="text-(--cta) text-[6.5rem] leading-none [font-family:var(--font-pixel)] [text-shadow:0.3rem_0.3rem_0_var(--cta-degrau)]"
            >
              {big}
            </span>
          ) : null}
          {Icon ? (
            <span
              aria-hidden="true"
              className="inline-flex size-16 items-center justify-center rounded-2xl bg-(--aviso-tint) text-(--aviso-texto)"
            >
              <Icon className="size-8" />
            </span>
          ) : null}
          <h1 id="recado-titulo" className="sz-h1-sm">
            {title}
          </h1>
          <p className="sz-lead">{text}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>
        </section>
      </main>
    </div>
  )
}
