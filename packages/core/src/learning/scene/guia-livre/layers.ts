import { emCamadas } from '../pilha'
import type { SceneState } from '../state'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `layers` em exploração livre (Construtor, 02/11/2026): só a IDEIA ("quem é desenhado
 * por último fica na frente") e o convite à investigação. Antes do teste, a fala pergunta e diz o que
 * observar; o resultado só vem depois. As chaves das falas começam com `layers-`.
 *
 * São duas apresentações (`pilha`), cada uma com as suas falas:
 * - a da Nave (Dia 1, a nave e o fundo de estrelas): "Desenhar a nave por último" e "Desenhar o fundo
 *   de estrelas por último", os botões da tela livre;
 * - a do Meu Jeito (aula 5, `pilha: 'camadas'`, a pedra e a chama): a lista Camadas e os botões
 *   "Uma camada para a frente" e "Uma camada para trás", que são os nomes da ferramenta Pinta.
 * As falas são estáticas e falam do elenco de cada curso. Nada de bloco, regra, Se, então nem senão.
 */
const speech = {
  'layers-start':
    'Só um pedacinho da nave aparece. Agora o fundo de estrelas é desenhado por último. O que você acha que acontece se a nave for desenhada por último? Clique em Desenhar a nave por último e observe a tela.',
  'layers-front':
    'Com a nave desenhada por último, a nave apareceu inteira, na frente do fundo de estrelas. E se o fundo de estrelas voltar a ser desenhado por último, o que acontece com a nave? Clique em Desenhar o fundo de estrelas por último e observe.',
  'layers-covered':
    'Só a ordem mudou, e a nave ficou escondida de novo: nada foi apagado. No jogo, a nave precisa aparecer na frente das estrelas. Clique em Desenhar a nave por último e observe.',
  'layers-complete':
    'Quem é desenhado por último fica na frente. Por isso, no jogo, o fundo de estrelas é desenhado primeiro, e a nave depois. Pode trocar a ordem quantas vezes quiser.',
  'layers-camadas-start':
    'Só um pedacinho da pedra aparece. Na lista Camadas, a chama está em cima. O que você acha que acontece se a pedra subir na lista? Na linha da pedra, clique em Uma camada para a frente e observe o desenho.',
  'layers-camadas-front':
    'A pedra subiu na lista Camadas e apareceu inteira, na frente da chama. E se a pedra descer de novo na lista, o que acontece com a pedra? Na linha da pedra, clique em Uma camada para trás e observe.',
  'layers-camadas-covered':
    'Só a ordem das camadas mudou, e a pedra ficou escondida de novo: nada foi apagado. No jogo, a pedra precisa aparecer na frente. Na linha da pedra, clique em Uma camada para a frente.',
  'layers-camadas-complete':
    'A de cima na lista Camadas fica na frente, porque é desenhada por último. Pode subir e descer as camadas quantas vezes quiser.',
} as const

export type FalaDasCamadas = keyof typeof speech

function guidance(
  _state: SceneState,
  has: (meta: string) => boolean,
  activity: Parameters<GuiaLivre['guidance']>[2],
): FalaDasCamadas {
  const f = emCamadas('layers', activity.pilha) ? FALAS.camadas : FALAS.blocos
  // As três metas caem em ordem no motor (a frente, escondida de novo, de volta à frente).
  if (!has('front')) return f.start
  if (!has('covered')) return f.front
  return has('back-in-front') ? f.complete : f.covered
}

const FALAS = {
  blocos: {
    start: 'layers-start',
    front: 'layers-front',
    covered: 'layers-covered',
    complete: 'layers-complete',
  },
  camadas: {
    start: 'layers-camadas-start',
    front: 'layers-camadas-front',
    covered: 'layers-camadas-covered',
    complete: 'layers-camadas-complete',
  },
} as const satisfies Record<string, Record<string, FalaDasCamadas>>

export const guia: GuiaLivre = { speech, guidance }
