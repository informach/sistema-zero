import { Lock } from 'lucide-react'
import type { HubSpaceView } from '@/lib/types'
import { KidsBand } from './kids-band'
import { KidsMascot } from './mascot'

/**
 * Tela de "espaço bloqueado" (teaser): o servidor aparece no menu mas a criança
 * ainda não tem acesso (produto não comprado). Mostra só nome/ícone/descrição com
 * um recado gentil — NENHUM conteúdo (o backend também recusa /channels em 403).
 */
export function KidsLockedSpace({ space }: { space: HubSpaceView }) {
  return (
    <KidsBand
      tone="creme"
      innerClassName="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center"
    >
      <KidsMascot expression="sleeping" className="kid-float mx-auto size-24" />
      <h1 className="sz-display mt-4 text-[clamp(1.6rem,4vw,2.2rem)]">{space.name}</h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 font-semibold text-base text-muted-foreground">
        Este espaço ainda não está disponível para você. 😊 Peça pra um responsável dar uma olhada.
        Quando liberar, ele aparece aqui pra você!
      </p>
    </KidsBand>
  )
}
