'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

/**
 * Os dois temas do kids (11/09/2026): Padrão (a paleta do Pen, com o azul de ação) e Pink. Não
 * existe mais claro/escuro. O tema vai no atributo `data-tema` do <html>, que o `globals.css` lê.
 *
 * ⚠️ `storageKey` NOVO de propósito: o script do next-themes aplica o valor guardado sem conferir a
 * lista de temas, e quem tinha `theme=dark` salvo na chave antiga ficaria preso num tema que não
 * existe mais. Com a chave nova, todo mundo abre no Padrão.
 */
const TEMAS = ['padrao', 'pink']

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-tema"
      themes={TEMAS}
      defaultTheme="padrao"
      storageKey="sz-kids-tema"
      enableSystem={false}
      enableColorScheme={false}
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  )
}
