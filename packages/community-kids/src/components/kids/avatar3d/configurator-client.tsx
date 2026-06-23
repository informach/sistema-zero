'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
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
  // Fundo da cena casa com o tema (claro/escuro da marca). Detecção simples por mídia;
  // o ajuste fino é só cosmético (não bloqueia nada).
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return <AvatarConfigurator dark={dark} />
}
