'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { KidsMascot } from '../mascot'

/**
 * Carrega o configurador 3D SÓ no cliente (`ssr:false`): three/fiber/drei + o `<Canvas>`
 * não rodam no SSR e o chunk pesado só baixa nesta rota. Espelha o `studio-full-client`.
 */
const AvatarConfigurator = dynamic(
  () => import('./configurator').then((m) => m.AvatarConfigurator),
  { ssr: false, loading: () => <ConfiguratorLoading /> },
)

function ConfiguratorLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
      <KidsMascot expression="thinking" className="size-24 animate-pulse" />
      <p className="[font-family:var(--font-display)] font-bold text-muted-foreground">
        Preparando seu avatar 3D…
      </p>
    </div>
  )
}

export function AvatarConfiguratorClient() {
  // Fundo da cena casa com o tema DA COMUNIDADE (toggle do app via next-themes), não com a
  // preferência do SO — igual ao Estúdio (`studio-full-client`). Cosmético; `resolvedTheme` pode
  // vir `undefined` na 1ª render (pré-hidratação) → claro por padrão, ajusta ao montar.
  const { resolvedTheme } = useTheme()
  return <AvatarConfigurator dark={resolvedTheme === 'dark'} />
}
