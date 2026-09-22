import { FREE_CREATION_MIN_LEVEL } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsJourneyLockedProduct } from './kids-journey-locked-product'

export function KidsJourneyLockedPinta() {
  return (
    <KidsJourneyLockedProduct
      title="Pinta"
      intro="No Pinta você desenha os personagens, cenários e peças dos seus jogos. 🎨"
      minLevelSlug={FREE_CREATION_MIN_LEVEL}
    />
  )
}
