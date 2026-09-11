'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

/** Os dois temas da plataforma (11/09/2026): o Padrão, do Pen, e o Pink. Não existe escuro. */
const TEMAS = ['padrao', 'pink']

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-tema"
      themes={TEMAS}
      defaultTheme="padrao"
      // Chave NOVA de propósito: o script do next-themes aplica o valor guardado sem conferir a
      // lista de temas, e quem tinha `theme=dark` salvo ficaria preso num tema que não existe.
      storageKey="sz-tema"
      enableSystem={false}
      enableColorScheme={false}
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  )
}
