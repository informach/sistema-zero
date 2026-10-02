import { SNOW_IR } from '../../../examples/__gen_snowDescent_gk'
import { SNOW_DESCENT_ASSETS } from '../../../examples/snowDescentAssets'
import { SNOW_DESCRIPTION } from '../../../examples/snowDescentSource'
import type { ExtensionExample } from '../../../extensions/types'

export const snowDescentAdvancedExample: ExtensionExample = {
  name: 'Descida da Neve (Jogo 2D Avançado)',
  experience: 'game',
  description: `A mesma descida com camadas, perspectiva e avanço por delta de tempo no Jogo 2D Avançado. ${SNOW_DESCRIPTION}`,
  difficulty: 'intermediate',
  concepts: ['perspectiva', 'camadas', 'transparência', 'esqui', 'delta de tempo'],
  genre: 'corrida',
  ir: SNOW_IR,
  assets: SNOW_DESCENT_ASSETS,
}
