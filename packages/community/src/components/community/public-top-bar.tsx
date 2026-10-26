import { BrandLogo } from '@sistemazero/ui/brand-logo'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * A barra escura das páginas públicas ("Estúdio à noite", 25/10/2026): a logo clara sobre a noite e,
 * à direita, a ação da página (Entrar, Ir para o início). Serve a quem está ou não logado: a ajuda
 * para entrar, a validação do certificado e as telas de recado (404 e erro).
 */
export function PublicTopBar({
  href,
  label = 'Comunidade Sistema Zero',
  children,
}: {
  /** Para onde a logo leva; sem ele, a logo não é link (a validação do certificado). */
  href?: string
  label?: string
  /** A ação à direita (opcional). */
  children?: ReactNode
}) {
  return (
    <header className="sz-palco border-(--linha-escura) border-b bg-(--topo) bg-none">
      <div className="sz-page flex min-h-20 flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3">
        {href ? (
          <Link
            href={href}
            aria-label={label}
            className="rounded-md focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            <BrandLogo fundo="escuro" label={label} className="block h-auto w-32 sm:w-40" />
          </Link>
        ) : (
          <BrandLogo fundo="escuro" label={label} className="block h-auto w-32 sm:w-40" />
        )}
        {children}
      </div>
    </header>
  )
}
