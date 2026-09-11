import { Lock } from 'lucide-react'
import type { HubSpaceView } from '@/lib/types'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

/**
 * Tela de "espaço bloqueado" (teaser): o servidor aparece no menu mas a criança
 * ainda não tem acesso (produto não comprado). Mostra só nome/ícone/descrição com
 * um recado gentil — NENHUM conteúdo (o backend também recusa /channels em 403).
 */
export function KidsLockedSpace({ space }: { space: HubSpaceView }) {
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Ainda não liberado"
      chipIcon={Lock}
      title={space.name}
    >
      <p>
        Este espaço ainda não está disponível para você. 😊 Peça pra um responsável dar uma olhada.
        Quando liberar, ele aparece aqui pra você!
      </p>
    </KidsRecado>
  )
}
