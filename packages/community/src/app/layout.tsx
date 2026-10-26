import { renderedPalette } from '@sistemazero/core/palette'
import { paletteValueOf } from '@sistemazero/member-shell/lib/palette-cookie'
import { GeistMono } from 'geist/font/mono'
import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, Silkscreen } from 'next/font/google'
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

/**
 * As letras da comunidade adulta (direção de arte de 18/10/2026): a Atkinson Hyperlegible Next no
 * texto, desenhada para quem enxerga com dificuldade, a Bricolage Grotesque nos títulos e, desde o
 * "Estúdio à noite" (25/10/2026), a Silkscreen nos rótulos curtos. O público são adultos iniciantes, com o leitor de 50 a 70 anos como régua
 * de leitura: a letra base é de 20 px (`globals.css`).
 * As duas famílias são variáveis: sem `weight`, todos os pesos vêm num arquivo só (com só 400 e
 * 700, o `font-medium` e o `font-semibold` dos componentes compartilhados caíam nos vizinhos).
 */
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  variable: '--font-atkinson',
  // O Next não tem as métricas desta família para ajustar o fallback (avisava no build): a pilha
  // do sistema fica declarada aqui, sem o ajuste.
  adjustFontFallback: false,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
})
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
})
/** A letra de pixel do "Estúdio à noite" (25/10/2026), a mesma do funil adulto: só em rótulos
 *  curtos (sobretítulo, número da aula), nunca em texto corrido. */
const silkscreen = Silkscreen({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-silkscreen',
})

/** A cor do perfil, decidida no SERVIDOR. O proxy já deixou o espelho em dia antes do render. */
async function paletteAtual() {
  return renderedPalette(paletteValueOf((await cookies()).get(PALETTE_COOKIE)?.value))
}

/** A barra do navegador no celular acompanha a barra escura do app (o `--noite-2` do `globals.css`,
 *  o "Estúdio à noite" de 25/10/2026: o escuro não segue a cor escolhida). */
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#10142a' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-sz-palette={await paletteAtual()}
      className={`${atkinson.variable} ${bricolage.variable} ${silkscreen.variable} ${GeistMono.variable}`}
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
