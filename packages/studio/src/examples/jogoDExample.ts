import type { ExtensionExample } from '#extensions'
import { JOGO_D_IR } from './__gen_jogoD'
import { JOGO_D_ASSETS } from './jogoD.generated'

/**
 * O jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): o 2D de grande porte, um mundo
 * do Pinta com seis regiões, três cavernas e quatro casas. A entrada na galeria vem no lote 9.
 */
export const jogoDExample: ExtensionExample = {
  name: 'Mundo das Portas',
  experience: 'game',
  description:
    'Um mundo grande do Pinta com vila, floresta, montanha, lago, campo e ruínas, três cavernas e quatro casas. As portas levam para dentro e trazem de volta, o que você pegou continua pego, e a cama de cada casa guarda o jogo.',
  difficulty: 'advanced',
  concepts: ['Pinta', 'cenário', 'regiões', 'portas', 'grupos', 'guardar o jogo', 'câmera'],
  genre: 'aventura',
  ir: JOGO_D_IR,
  assets: JOGO_D_ASSETS,
}
