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
  if (pathname.startsWith('/estudio')) {
    return (
      <main className="flex min-h-0 w-full flex-1 flex-col px-2 pt-4 pb-24 md:px-4 md:py-4 md:pb-4">
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
