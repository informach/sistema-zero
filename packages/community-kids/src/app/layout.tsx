import { GeistMono } from 'geist/font/mono'
import type { Metadata, Viewport } from 'next'
import { Baloo_2, Nunito } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

// Tipografia kids: Baloo 2 (display arredondada/amigável, boa cobertura PT-BR)
// + Nunito (corpo — x-height alto, legibilidade comprovada em material
// infanto-juvenil) + Geist Mono (blocos de código das aulas de IA).
const baloo = Baloo_2({ subsets: ['latin'], variable: '--font-baloo' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'Sistema Zero Kids',
  description: 'Plataforma de cursos infanto-juvenil do Sistema Zero',
  // Favicons do PackLogo do kids (11/09/2026: o O com a estrela), gerados do favicon.svg
  // do pacote; o favicon.ico em src/app/ é o do próprio pacote. A logo é a `KidsLogo`.
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

// Os temas Padrão e Pink são os dois claros (o escuro saiu em 11/09/2026). A barra do
// navegador no celular fica na cor do menu, a âncora escura que no celular é a barra do topo
// (o navy do Padrão; no Pink o menu é ameixa, e o meta não segue o tema sem script).
export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#121a30',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${baloo.variable} ${nunito.variable} ${GeistMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background text-(--tinta) antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
