import Link from 'next/link'
import type { ReactNode } from 'react'
import { KidsLogo } from './kids-logo'
import { KidsMascot } from './mascot'

/**
 * Shell split-screen das páginas de autenticação: form + logo à esquerda;
 * à direita (telas grandes) o painel de MARCA — blobs em gradiente, o
 * mascote-faísca flutuando e a tagline (substituiu a foto da comunidade
 * adulta: este app é o kids).
 */
export function AuthSplitShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,var(--brand-gradient-start),transparent_24%),radial-gradient(circle_at_20%_80%,var(--brand-gradient-end),transparent_22%)] opacity-[0.08]" />

      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,793fr)_minmax(0,803fr)]">
        <section className="flex min-h-screen items-center justify-center px-5 pt-[58px] pb-10 sm:px-8 lg:pb-0">
          <div className="w-full max-w-[432px]">
            <div className="mb-[30px] flex justify-center">
              <Link href="/" aria-label="Sistema Zero Kids">
                <KidsLogo size="auth" priority />
              </Link>
            </div>
            {children}
          </div>
        </section>

        <section
          className="relative hidden min-h-screen items-center justify-center overflow-hidden bg-card lg:flex"
          aria-label="Sistema Zero Kids"
        >
          {/* Blobs decorativos nas cores da marca. */}
          <div
            className="kids-blob h-80 w-80"
            style={{ top: '8%', left: '12%', background: 'var(--kids-cyan)' }}
          />
          <div
            className="kids-blob h-96 w-96"
            style={{ bottom: '4%', right: '6%', background: 'var(--kids-lime)' }}
          />
          <div
            className="kids-blob h-64 w-64"
            style={{ top: '52%', left: '4%', backgroundImage: 'var(--sz-gradient)' }}
          />

          {/* Copy do propósito: criar, aprender e se divertir (decisão do
              usuário 06/2026 — sem amarrar a mensagem em IA). */}
          <div className="relative flex flex-col items-center gap-6 px-10 text-center">
            <KidsMascot expression="happy" className="kid-float size-40" />
            <p className="sz-display max-w-md text-3xl">Crie, aprenda e se divirta</p>
            <p className="max-w-sm text-base text-muted-foreground">
              Um lugar para criar coisas incríveis, aprender brincando e se divertir a cada aula.
            </p>
          </div>

          {/* Mini-faíscas decorativas (mesma estrela da logo, opacidade baixa). */}
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            className="absolute top-[14%] right-[16%] size-10 opacity-30"
          >
            <path
              d="M24 6Q27 19 40 24Q27 29 24 42Q21 29 8 24Q21 19 24 6Z"
              fill="var(--kids-cyan)"
            />
          </svg>
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            className="absolute bottom-[18%] left-[18%] size-7 opacity-30"
          >
            <path
              d="M24 6Q27 19 40 24Q27 29 24 42Q21 29 8 24Q21 19 24 6Z"
              fill="var(--kids-lime)"
            />
          </svg>
        </section>
      </div>
    </main>
  )
}
