import { Lock } from 'lucide-react'
import type { HubSpaceView } from '@/lib/types'
import { KidsMascot } from './mascot'

/**
 * Tela de "espaço bloqueado" (teaser): o servidor aparece no menu mas a criança
 * ainda não tem acesso (produto não comprado). Mostra só nome/ícone/descrição com
 * um recado gentil — NENHUM conteúdo (o backend também recusa /channels em 403).
 */
export function KidsLockedSpace({ space }: { space: HubSpaceView }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">{space.name}</h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 text-muted-foreground">
        Este espaço ainda não está disponível para você. 😊 Peça pra um responsável dar uma olhada.
        Quando liberar, ele aparece aqui pra você!
      </p>
    </div>
  )
}
