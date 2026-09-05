import { THREE_D_CREATION_MIN_LEVEL } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsCareerLockedProduct } from './kids-career-locked-product'

export function KidsCareerLockedMolda() {
  return (
    <KidsCareerLockedProduct
      title="Molda"
      intro="No Molda você monta modelos 3D, pinta texturas e cria céus para os seus jogos 3D. 🧊"
      minLevelSlug={THREE_D_CREATION_MIN_LEVEL}
    />
  )
}
