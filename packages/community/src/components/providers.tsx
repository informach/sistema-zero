'use client'

import { StudioPreviewShellProvider } from '@sistemazero/member-shell/lib/studio-preview-shell'
import { Toaster } from 'sonner'

/**
 * A cor da plataforma NÃO passa mais por aqui.
 *
 * Até 17/09/2026 este arquivo montava o `next-themes` com os dois temas (Padrão e Pink). Ele
 * saiu inteiro: o valor dele era do APARELHO (localStorage) enquanto a preferência é do PERFIL,
 * e o script de "no-flash" dele lê um armazenamento que o servidor não enxerga. Hoje quem decide
 * a cor é o servidor, que emite `data-sz-palette` no `<html>` a partir do espelho em cookie.
 */
export function Providers({
  children,
  previewShellUrl = null,
}: {
  children: React.ReactNode
  /** A casca da prévia do Clássico em outro site, quando o servidor a ligou (`classicShellUrlFromEnv`). */
  previewShellUrl?: string | null
}) {
  return (
    <StudioPreviewShellProvider value={previewShellUrl}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </StudioPreviewShellProvider>
  )
}
