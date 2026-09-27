import Link from 'next/link'
import type { ReactNode } from 'react'
import { KidsLogo } from './kids-logo'
import { KidsMascot } from './mascot'

/**
 * Shell split-screen das páginas de autenticação: logo + formulário à esquerda e, em
 * telas grandes, o painel de MARCA à direita (o mascote e a frase do propósito).
 *
 * Não existe tela-modelo do login, então ela segue a régua das que existem (11/09/2026):
 * o chão da página, o formulário num cartão branco (`AUTH_CARD`) e o painel de marca no
 * desenho do HERÓI azul (`.kids-marca`, cantos de 28px e a sombra do herói). As bolhas e
 * as estrelinhas que enfeitavam o painel saíram: as telas-modelo não têm decoração.
 */
export function AuthSplitShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,793fr)_minmax(0,803fr)]">
        <section className="flex min-h-dvh items-center justify-center px-5 pt-[58px] pb-10 sm:px-8 lg:pb-0">
          <div className="w-full max-w-[432px]">
            <div className="mb-[30px] flex justify-center">
              <Link href="/" aria-label="Sistema Zero Kids">
                <KidsLogo size="auth" />
              </Link>
            </div>
            {children}
          </div>
        </section>

        <section className="hidden p-6 lg:flex xl:p-8" aria-label="Sistema Zero Kids">
          {/* Copy do propósito: criar, aprender e se divertir (decisão do usuário 06/2026,
              sem amarrar a mensagem em IA). A cor vem por classe: o azul da marca tem par
              de tinta que troca no escuro. */}
          <div className="kids-marca flex w-full flex-col items-center justify-center gap-6 rounded-[1.75rem] px-10 py-12 text-center shadow-(--sombra-heroi)">
            <KidsMascot expression="happy" className="kid-float size-40" />
            <p className="sz-display max-w-md text-[2.5rem]">Crie, aprenda e se divirta</p>
            <p className="kids-marca-suave max-w-sm font-medium text-[1.0625rem] leading-[1.6]">
              Um lugar para criar coisas incríveis, aprender brincando e se divertir a cada aula.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
