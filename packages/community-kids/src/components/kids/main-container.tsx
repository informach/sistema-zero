'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Página de aula: `/cursos/<slug>/aulas/<lessonId>` (e sub-rotas). */
const LESSON_PATH = /^\/cursos\/[^/]+\/aulas\/[^/]+/

/**
 * Container do conteúdo da área do aluno. A maioria das páginas usa uma largura
 * confortável de leitura (`max-w-5xl` centralizado). Duas rotas ocupam TODA a
 * largura disponível depois da sidebar:
 *  - **Estúdio** (`/estudio`): IDE — largura E altura totais (`flex flex-col` para o
 *    editor preencher via `flex-1`), com padding enxuto.
 *  - **Página de aula** (`/cursos/.../aulas/...`): o conteúdo (vídeo, livro 3D,
 *    imagens) dividia espaço com o card de aulas à direita e ficava apertado num
 *    `max-w-5xl` — aqui ganha a largura inteira, em fluxo vertical normal.
 */
export function MainContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  // Pensa e Pinta seguem a régua do Estúdio: app embarcado quer largura E altura
  // totais (kanban/Modo Missão no Pensa; canvas + painéis de animação no Pinta).
  if (
    pathname.startsWith('/estudio') ||
    pathname.startsWith('/pensa') ||
    pathname.startsWith('/pinta')
  ) {
    // App embarcado = altura TRAVADA na viewport (rolagem só nas áreas internas
    // do app, nunca na janela). No mobile NÃO há sidebar para "fixar" a altura e a
    // raiz do `(app)` é `min-h-screen` (cresce) → sem uma altura explícita o app
    // empurraria a página inteira. `100dvh - 3.5rem` desconta a top bar sticky
    // (h-14); o `pb-24` já reserva a tab bar (fixed). No desktop a sidebar
    // `h-screen` já trava a linha → volta ao `flex-1`.
    return (
      <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full flex-col overflow-hidden px-2 pt-4 pb-24 md:h-auto md:flex-1 md:px-4 md:py-4 md:pb-4">
        {children}
      </main>
    )
  }
  return (
    <main
      className={
        LESSON_PATH.test(pathname)
          ? 'w-full flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8'
          : 'mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8'
      }
    >
      {children}
    </main>
  )
}
