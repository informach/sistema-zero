import { FREE_CREATION_MIN_LEVEL } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsCareerLockedProduct } from './kids-career-locked-product'

export function KidsCareerLockedPinta() {
  return (
    <KidsCareerLockedProduct
      title="Pinta"
      intro="No Pinta você desenha os personagens, cenários e peças dos seus jogos. 🎨"
      minLevelSlug={FREE_CREATION_MIN_LEVEL}
    />
  )
}
