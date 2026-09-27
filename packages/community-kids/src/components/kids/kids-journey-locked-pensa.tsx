import { AI_APPS_MIN_LEVEL } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsJourneyLockedProduct } from './kids-journey-locked-product'

export function KidsJourneyLockedPensa() {
  return (
    <KidsJourneyLockedProduct
      title="Pensa"
      intro="No Pensa você planeja o seu jogo antes de construir: a ideia, as telas e as missões. 💡"
      minLevelSlug={AI_APPS_MIN_LEVEL}
    />
  )
}
