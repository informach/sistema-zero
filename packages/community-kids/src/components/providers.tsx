'use client'

import { Toaster } from 'sonner'

/**
 * A cor da plataforma NÃO passa mais por aqui.
 *
 * Até 17/09/2026 este arquivo montava o `next-themes` com os dois temas (Padrão e Pink). Ele
 * saiu inteiro: o valor dele era do APARELHO (localStorage) enquanto a preferência é do PERFIL,
 * e o script de "no-flash" dele lê um armazenamento que o servidor não enxerga — era daí que
 * vinha o flash medido no F5. Hoje quem decide a cor é o servidor, que emite `data-sz-palette`
 * no `<html>` a partir de um espelho em cookie hidratado pelo proxy.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
