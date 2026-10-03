import { SNOW_IR } from '../../../examples/__gen_snowDescent_g2d'
import { SNOW_DESCENT_ASSETS } from '../../../examples/snowDescentAssets'
import { SNOW_DESCRIPTION } from '../../../examples/snowDescentSource'
import type { ExtensionExample } from '../../../extensions/types'

export const snowDescentExample: ExtensionExample = {
  name: 'Descida da Neve (Jogo 2D)',
  experience: 'game',
  description: `Sprites animados, controles prontos e encontros na pista, sem funções nem listas. ${SNOW_DESCRIPTION}`,
  difficulty: 'beginner',
  concepts: ['perspectiva', 'camadas', 'transparência', 'esqui', 'profundidade'],
  genre: 'corrida',
  ir: SNOW_IR,
  assets: SNOW_DESCENT_ASSETS,
}
