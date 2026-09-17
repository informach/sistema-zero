import { renderedPalette } from '@sistemazero/core/palette'
import { paletteValueOf } from '@sistemazero/member-shell/lib/palette-cookie'
import { derive } from '@sistemazero/ui/tokens'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Providers } from '@/components/providers'
import { PALETTE_COOKIE } from '@/lib/cookies'
import './globals.css'

export const metadata: Metadata = {
  title: 'Comunidade | Sistema Zero',
  description: 'Área do aluno da plataforma Sistema Zero',
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

/** A cor do perfil, decidida no SERVIDOR. O proxy já deixou o espelho em dia antes do render. */
async function paletteAtual() {
  return renderedPalette(paletteValueOf((await cookies()).get(PALETTE_COOKIE)?.value))
}

/** A barra do navegador no celular acompanha a cor escolhida (mesma função que gera a folha). */
export async function generateViewport(): Promise<Viewport> {
  return { colorScheme: 'light', themeColor: derive(await paletteAtual()).menu }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-sz-palette={await paletteAtual()}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
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
