import { renderedPalette } from '@sistemazero/core/palette'
import { paletteValueOf } from '@sistemazero/member-shell/lib/palette-cookie'
import { derive } from '@sistemazero/ui/tokens'
import { GeistMono } from 'geist/font/mono'
import type { Metadata, Viewport } from 'next'
import { Baloo_2, Nunito } from 'next/font/google'
import { cookies } from 'next/headers'
import { Providers } from '@/components/providers'
import { PALETTE_COOKIE } from '@/lib/cookies'
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

/** A cor do perfil, decidida no SERVIDOR. O proxy já deixou o espelho em dia antes do render. */
async function paletteAtual() {
  return renderedPalette(paletteValueOf((await cookies()).get(PALETTE_COOKIE)?.value))
}

/**
 * A barra do navegador no celular acompanha a cor escolhida.
 *
 * ⚠️ Era um `#121a30` congelado, e ele JÁ estava errado no tema Pink (lá o menu é ameixa) — o
 * `viewport` estático não tinha como seguir o tema. Com a cor resolvida no servidor, ele segue:
 * `derive()` é a MESMA função que gera a folha de estilo, então não há espelho manual de
 * hexadecimal para divergir quando entra uma cor nova.
 */
export async function generateViewport(): Promise<Viewport> {
  return { colorScheme: 'light', themeColor: derive(await paletteAtual()).menu }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-sz-palette={await paletteAtual()}
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
