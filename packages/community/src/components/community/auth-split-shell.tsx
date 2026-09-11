import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Shell split-screen das páginas de autenticação (portado do
 * comunidade-sistema-zero): form + logo à esquerda, imagem da comunidade à
 * direita (só em telas grandes). Fundo único do tema, sem brilhos (a régua do Pen).
 */
export function AuthSplitShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,793fr)_minmax(0,803fr)]">
        <section className="flex min-h-screen items-center justify-center px-5 pt-[58px] pb-10 sm:px-8 lg:pb-0">
          <div className="w-full max-w-[432px]">
            <div className="mb-[30px] flex justify-center">
              <Link href="/" aria-label="Comunidade Sistema Zero">
                {/* O login é sempre claro: a versão de letras escuras, nos dois temas. */}
                <Image
                  src="/logo_white.svg"
                  width={515}
                  height={72}
                  alt="Comunidade Sistema Zero"
                  priority
                  className="block h-auto w-[340px] max-w-full"
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
