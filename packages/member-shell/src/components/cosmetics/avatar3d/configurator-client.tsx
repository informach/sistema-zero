'use client'

import type { MoldeDoVestuario } from '@sistemazero/arquipelago-contracts'
import dynamic from 'next/dynamic'
import type { AvatarReturnPath } from '../../../lib/avatar-return'
import { KidsMascot } from '../presentation'
import type { CosmeticsSkin } from '../skin'

/**
 * Carrega o configurador 3D SÓ no cliente (`ssr:false`): three/fiber/drei + o `<Canvas>`
 * não rodam no SSR e o chunk pesado só baixa nesta rota. Espelha o `studio-full-client`.
 * ⚠️ São DOIS `dynamic`: a tela de espera do `dynamic` não recebe props (o adulto não pode ver o
 * Zappy nem o texto do Kids enquanto o 3D baixa) e a tela adulta mora num módulo próprio (o Kids
 * não a baixa).
 */
const AvatarConfigurator = dynamic(
  () => import('./configurator').then((m) => m.AvatarConfigurator),
  { ssr: false, loading: () => <ConfiguratorLoading /> },
)
const AdultAvatarConfiguratorLoader = dynamic(
  () => import('./configurator-adult-entry').then((m) => m.AdultAvatarConfiguratorEntry),
  { ssr: false, loading: () => <AdultConfiguratorLoading /> },
)

function AdultConfiguratorLoading() {
  return (
    <div className="sz-cos-av" data-state="loading">
      <p role="status" className="sz-cos-muted text-[17px]">
        Carregando o seu avatar…
      </p>
    </div>
  )
}

function ConfiguratorLoading() {
  return (
    // Espelha a raiz do configurador: imersivo no celular, em fluxo a partir do `md` (senão o
    // esqueleto cobriria a barra da esquerda enquanto o 3D carrega).
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background md:static md:z-auto md:h-full md:min-h-0 md:flex-1">
      <KidsMascot expression="thinking" className="size-24 animate-pulse" />
      <p className="[font-family:var(--font-display)] font-bold text-muted-foreground">
        Preparando seu avatar 3D…
      </p>
    </div>
  )
}

/** `skin="adult"`: a pele da comunidade adulta (padrão: a do Kids, como sempre foi). */
export function AvatarConfiguratorClient({
  returnTo,
  skin = 'kids',
  onReturn,
  festa,
}: {
  returnTo: AvatarReturnPath
  skin?: CosmeticsSkin
  onReturn?: (saved: boolean) => void
  festa?: MoldeDoVestuario['festa']
}) {
  // Fundo da cena casa com o tema DA COMUNIDADE (hoje só claro), não com a
  // preferência do SO — igual ao Estúdio (`studio-full-client`). Cosmético; `resolvedTheme` pode
  // vir `undefined` na 1ª render (pré-hidratação) → claro por padrão, ajusta ao montar.
  // ⚠️ O tema escuro não existe nesta plataforma desde 11/09/2026: este valor era uma
  // CONSTANTE calculada por um hook. Trocar por literal é apagar código morto, não mudar
  // comportamento. Se o eixo claro/escuro voltar, ele volta com atributo e hook próprios.
  if (skin === 'adult')
    return (
      <AdultAvatarConfiguratorLoader
        dark={false}
        returnTo={returnTo}
        onReturn={onReturn}
        festa={festa}
      />
    )
  return <AvatarConfigurator dark={false} returnTo={returnTo} onReturn={onReturn} festa={festa} />
}
