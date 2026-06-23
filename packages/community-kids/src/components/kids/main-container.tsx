'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Container do conteúdo da área do aluno. A maioria das páginas usa uma largura
 * confortável de leitura (`max-w-5xl` centralizado); o **Estúdio** (`/estudio`) é
 * uma IDE e ocupa TODO o espaço disponível depois da sidebar — LARGURA total (sem o
 * `max-w-5xl`) E ALTURA total (`flex flex-col` para o editor preencher via `flex-1`),
 * com padding enxuto, para a criança ter o máximo de espaço de trabalho.
 */
export function MainContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const fullWidth = pathname?.startsWith('/estudio') ?? false
  return (
    <main
      className={
        fullWidth
          ? 'flex min-h-0 w-full flex-1 flex-col px-2 pt-4 pb-24 md:px-4 md:py-4 md:pb-4'
          : 'mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8'
      }
    >
      {children}
    </main>
  )
}
