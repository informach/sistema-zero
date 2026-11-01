import { renderedPalette } from '@sistemazero/core/palette'
import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'
import { Baloo_2, Nunito } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

// As mesmas fontes do Kids: a aula gravada é a que a criança vê.
const baloo = Baloo_2({ subsets: ['latin'], variable: '--font-baloo' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'Palco de gravação · Sistema Zero',
  description: 'As aulas do Kids para a equipe gravar, sem salvar nada.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      // A cor padrão do Kids: o palco não tem perfil de criança.
      data-sz-palette={renderedPalette(null)}
      className={`${baloo.variable} ${nunito.variable} ${GeistMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="palco min-h-screen bg-background text-(--tinta) antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
