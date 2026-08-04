import { CREATIVE_APPS_MIN_LEVEL } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsCareerLockedProduct } from './kids-career-locked-product'

/**
 * Pensa COMPRADO, mas ainda abaixo do degrau da carreira. Distinta do
 * `KidsLockedPensa` (que é "não tem o produto" e leva à assinatura): aqui a
 * família já pagou, então a tela fala de carreira, nunca de compra.
 */
export function KidsCareerLockedPensa() {
  return (
    <KidsCareerLockedProduct
      title="Pensa"
      intro="No Pensa você planeja o seu jogo antes de construir: a ideia, as telas e as missões. 💡"
      minLevelSlug={CREATIVE_APPS_MIN_LEVEL}
    />
  )
}
