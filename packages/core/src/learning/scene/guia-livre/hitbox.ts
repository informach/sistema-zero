import { sceneAreaPercent, sceneAreaWidth, sceneContact } from '../state'
import { falaDaSequencia, type PassoDaSequencia } from './dino-sequencia'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `hitbox` em exploração livre (Corre Dino, aulas 9 e 10, 02/11/2026): só a IDEIA. O
 * jogo não olha o desenho: olha a ÁREA DE CONTATO (o retângulo pontilhado), e o tamanho dela é
 * escolha de quem faz o jogo. Nada de bloco, "Distância do cacto" nem "Tamanho da área do Dino" (os
 * nomes dos campos do Estúdio ficam para a montagem).
 *
 * Duas experiências usam a cena com metas diferentes: a aula 9 só cobra o BATEU com os desenhos
 * separados (`contact`); a aula 10 cobra também a área menor (`area-contrast`) e a pequena demais
 * (`too-small`). A fala segue as metas do bloco (`falaDaSequencia`), e o fim da aula 9 não fala da
 * área que ela não testou.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/hitbox.tsx`): "Aproximar o cacto",
 * "Afastar o cacto", "100%", "80%" e "40%".
 */
export const HITBOX_SPEECH = {
  'hitbox-start':
    'O retângulo pontilhado em volta do Dino é a área de contato, e o cacto também tem a dele. Quando vai aparecer BATEU: antes de os desenhos se encostarem, ou só quando eles se tocarem? Com a área em 100%, clique em Aproximar o cacto, um toque de cada vez, e observe os desenhos e as áreas. Passou do ponto? Clique em Afastar o cacto.',
  'hitbox-area':
    'Apareceu BATEU, e os desenhos ainda tinham um vão entre eles: quem se encostou foram as áreas de contato, não os desenhos. E se a área do Dino for menor, com o cacto no mesmo lugar? Com o cacto onde bateu, clique em 80% e observe a indicação. Caso o cacto tenha saído dali, clique em 100% e em Aproximar o cacto ou Afastar o cacto até aparecer BATEU de novo.',
  // O cacto passou do primeiro BATEU: com 80% ainda bateria, e o contraste não apareceria.
  'hitbox-area-perto':
    'Apareceu BATEU, e os desenhos ainda tinham um vão entre eles: quem se encostou foram as áreas de contato, não os desenhos. Agora o cacto já entrou bem na área. Para comparar a área menor, volte ao primeiro BATEU: clique em Afastar o cacto até o BATEU sumir e em Aproximar o cacto uma vez, até ele voltar. Depois clique em 80% e observe a indicação.',
  'hitbox-small':
    'Com a área menor, e o cacto no mesmo lugar, a batida sumiu: o jogo olha a área, não o desenho. E se a área for bem pequena, com os desenhos se encostando? Clique em Aproximar o cacto até o cacto encostar no desenho do Dino e clique em 40%. Observe a indicação. Caso o cacto entre no desenho do Dino, clique em Afastar o cacto.',
  'hitbox-small-first':
    'E se a área do Dino for bem pequena, com os desenhos se encostando? Clique em Aproximar o cacto até o cacto encostar no desenho do Dino e clique em 40%. Observe a indicação. Caso o cacto entre no desenho do Dino, clique em Afastar o cacto.',
  'hitbox-complete':
    'Você comparou as três áreas. Com a área inteira, de 100%, apareceu BATEU com os desenhos ainda separados. Com a área menor, no mesmo lugar, a batida sumiu. E com a área bem pequena, os desenhos se tocaram e o jogo não marcou a batida. Quem decide a batida é a área de contato, e o tamanho dela é escolha sua: nem grande demais, nem pequena demais. Pode continuar testando.',
  'hitbox-complete-contact':
    'Apareceu BATEU com os desenhos ainda separados: quem se encostou foram as áreas de contato, não os desenhos. O jogo não olha o desenho, ele confere se as áreas se encostaram. Pode continuar aproximando e afastando o cacto.',
  'hitbox-complete-parcial':
    'Você fez os testes que esta experiência pede. Pode continuar aproximando e afastando o cacto e mudando a área.',
} as const

export type FalaDaArea = keyof typeof HITBOX_SPEECH

/** Os testes na ordem do curso. Os apelidos de caso (`early-hit`, `fair-hit`) contam no passo deles. */
export const PASSOS_DA_AREA: readonly PassoDaSequencia[] = [
  { chave: 'start', metas: ['contact', 'early-hit'] },
  // O contraste só cai depois de um BATEU visto (`redimensionarNaHitbox`).
  { chave: 'area', metas: ['area-contrast', 'fair-hit'], requer: 'start' },
  { chave: 'small', metas: ['too-small'] },
]

export const guia: GuiaLivre = {
  speech: HITBOX_SPEECH,
  guidance: (state, has, activity) => {
    const fala = falaDaSequencia({
      cena: 'hitbox',
      activity,
      has,
      passos: PASSOS_DA_AREA,
      fabrica: ['contact', 'area-contrast', 'too-small'],
      fimParcial: (chaves) =>
        chaves.length === 1 && chaves[0] === 'start'
          ? 'hitbox-complete-contact'
          : 'hitbox-complete-parcial',
    }) as FalaDaArea
    // ⚠️ Perto demais (com 80% ainda bateria), a tela destaca Afastar o cacto: a fala diz por quê.
    const c = state.contact
    const pertoDemais =
      sceneAreaPercent(c.width) === 100 &&
      sceneContact(c) &&
      sceneContact({ distance: c.distance, width: sceneAreaWidth(80) })
    return fala === 'hitbox-area' && pertoDemais ? 'hitbox-area-perto' : fala
  },
}
