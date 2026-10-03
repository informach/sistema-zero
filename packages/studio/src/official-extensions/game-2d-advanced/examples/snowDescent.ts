import { SNOW_IR } from '../../../examples/__gen_snowDescent_gk'
import { SNOW_DESCENT_ASSETS } from '../../../examples/snowDescentAssets'
import { SNOW_ADVANCED_DESCRIPTION } from '../../../examples/snowDescentSource'
import type { ExtensionExample } from '../../../extensions/types'

export const snowDescentAdvancedExample: ExtensionExample = {
  name: 'Descida da Neve (Jogo 2D Avançado)',
  experience: 'game',
  description: SNOW_ADVANCED_DESCRIPTION,
  difficulty: 'intermediate',
  concepts: [
    'perspectiva',
    'camadas',
    'animação',
    'controles',
    'encontros',
    'placar',
    'telas',
    'condições',
  ],
  genre: 'corrida',
  ir: SNOW_IR,
  assets: SNOW_DESCENT_ASSETS,
}
