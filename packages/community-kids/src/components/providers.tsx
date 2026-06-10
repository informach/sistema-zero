'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      // Kids abre no CLARO (paleta vibrante sobre creme); o toggle segue no menu.
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  )
}
