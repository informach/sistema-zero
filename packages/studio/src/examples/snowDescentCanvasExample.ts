import { SNOW_IR } from './__gen_snowDescent_canvas'
import type { CoreExample } from './core'
import { SNOW_DESCENT_ASSETS } from './snowDescentAssets'
import { SNOW_DESCRIPTION } from './snowDescentSource'

export const snowDescentCanvasExample: CoreExample = {
  name: 'Descida da Neve (Canvas)',
  experience: 'game',
  description: `Perspectiva feita na mão com Canvas, contas e listas, sem extensão. ${SNOW_DESCRIPTION}`,
  ir: SNOW_IR,
  assets: SNOW_DESCENT_ASSETS,
  workspaceOptions: { collapseFunctions: true },
}
