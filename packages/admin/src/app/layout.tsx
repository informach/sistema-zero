import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Admin | Sistema Zero',
  description: 'Painel administrativo da plataforma Sistema Zero',
  // Favicons portados do projeto de referência (comunidade-sistema-zero); o
  // favicon.ico em src/app/ é servido automaticamente pelo App Router.
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

/**
 * As letras da comunidade adulta também no admin ("A sala da equipe", 23/10/2026): a Atkinson
 * Hyperlegible Next no texto, a Bricolage Grotesque nos títulos e a Geist Mono nos rótulos,
 * números e códigos. Variáveis, sem `weight`, pela mesma razão da comunidade (todos os pesos num
 * arquivo só).
 */
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  variable: '--font-atkinson',
  // O Next não tem as métricas desta família para ajustar o fallback: a pilha fica declarada.
  adjustFontFallback: false,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
})
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${atkinson.variable} ${bricolage.variable} ${GeistMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background text-foreground antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
