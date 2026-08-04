import { CREATIVE_APPS_MIN_LEVEL } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsCareerLockedProduct } from './kids-career-locked-product'

/**
 * Pinta COMPRADO, mas ainda abaixo do degrau da carreira. Distinta do
 * `KidsLockedPinta` (que é "não tem o produto" e leva à assinatura): aqui a
 * família já pagou, então a tela fala de carreira, nunca de compra.
 */
export function KidsCareerLockedPinta() {
  return (
    <KidsCareerLockedProduct
      title="Pinta"
      intro="No Pinta você desenha os personagens, cenários e peças dos seus jogos. 🎨"
      minLevelSlug={CREATIVE_APPS_MIN_LEVEL}
    />
  )
}
