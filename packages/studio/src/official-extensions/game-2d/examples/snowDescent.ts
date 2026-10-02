import { SNOW_IR } from '../../../examples/__gen_snowDescent_g2d'
import { SNOW_DESCENT_ASSETS } from '../../../examples/snowDescentAssets'
import { SNOW_DESCRIPTION } from '../../../examples/snowDescentSource'
import type { ExtensionExample } from '../../../extensions/types'

export const snowDescentExample: ExtensionExample = {
  name: 'Descida da Neve (Jogo 2D)',
  experience: 'game',
  description: `Camadas transparentes e pista em perspectiva com os blocos do Jogo 2D. ${SNOW_DESCRIPTION}`,
  difficulty: 'intermediate',
  concepts: ['perspectiva', 'camadas', 'transparência', 'esqui', 'profundidade'],
  genre: 'corrida',
  ir: SNOW_IR,
  assets: SNOW_DESCENT_ASSETS,
}
