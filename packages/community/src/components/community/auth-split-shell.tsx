import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Shell split-screen das páginas de autenticação (portado do
 * comunidade-sistema-zero): form + logo à esquerda, imagem da comunidade à
 * direita (só em telas grandes), com radial-gradient sutil da marca ao fundo.
 */
export function AuthSplitShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,var(--brand-gradient-start),transparent_24%),radial-gradient(circle_at_20%_80%,var(--brand-gradient-end),transparent_22%)] opacity-[0.05]" />

      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,793fr)_minmax(0,803fr)]">
        <section className="flex min-h-screen items-center justify-center px-5 pt-[58px] pb-10 sm:px-8 lg:pb-0">
          <div className="w-full max-w-[432px]">
            <div className="mb-[30px] flex justify-center">
              <Link href="/" aria-label="Comunidade Sistema Zero">
                <Image
                  src="/logo_dark.svg"
                  width={515}
                  height={75}
                  alt="Comunidade Sistema Zero"
                  priority
                  className="hidden h-auto w-[340px] max-w-full dark:block"
                />
                <Image
                  src="/logo_white.svg"
                  width={515}
                  height={72}
                  alt="Comunidade Sistema Zero"
                  priority
                  className="block h-auto w-[340px] max-w-full dark:hidden"
                />
              </Link>
            </div>
            {children}
          </div>
        </section>

        <section
          className="relative hidden min-h-screen overflow-hidden bg-card lg:block"
          aria-label="Comunidade Sistema Zero"
        >
          <Image
            src="/community.png"
            fill
            sizes="50vw"
            alt="Comunidade Sistema Zero reunida"
            priority
            className="object-cover object-center"
          />
        </section>
      </div>
    </main>
  )
}
