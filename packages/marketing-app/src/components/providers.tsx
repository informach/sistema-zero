'use client'

import { Toaster } from 'sonner'

/**
 * A cor NÃO passa mais por aqui.
 *
 * Até 17/09/2026 este arquivo montava o `next-themes` com claro/escuro (padrão escuro). Os dois
 * eixos saíram: o console veste a paleta do Pen, num tema só, como o resto do ecossistema. Os
 * tokens vêm de `@sistemazero/ui/console.css`, gerado do registro em `packages/ui/src/tokens`.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
