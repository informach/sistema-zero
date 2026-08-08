import { CREATIVE_APPS_MIN_LEVEL } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsCareerLockedProduct } from './kids-career-locked-product'

export function KidsCareerLockedPensa() {
  return (
    <KidsCareerLockedProduct
      title="Pensa"
      intro="No Pensa você planeja o seu jogo antes de construir: a ideia, as telas e as missões. 💡"
      minLevelSlug={CREATIVE_APPS_MIN_LEVEL}
    />
  )
}
