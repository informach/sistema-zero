import { STAGE_TARGET } from '../actions'
import type { SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `stage-size` em exploração livre (Corre Dino, Aula 1, 02/11/2026): só a IDEIA. A
 * tela do jogo tem uma largura e uma altura, e a borda mostra onde ela acaba; o nome do bloco que
 * prepara a tela e o da borda ficam para a montagem do Estúdio. Antes de cada teste a fala pergunta e
 * diz o que observar; o que a borda mostra e o que acontece com ela quando o número muda só vêm na
 * fala de DEPOIS. As chaves começam com `stage-size-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/stage-size.tsx`): "Ligar a borda",
 * "Largura 800/600/480" e "Altura 480/300/270".
 */
export const STAGE_SIZE_SPEECH = {
  'stage-size-start':
    'A tela do jogo tem uma largura e uma altura, e agora ela mede 800 por 480. Olhe o palco: dá para saber onde a tela do jogo acaba? Clique em Ligar a borda e observe o palco.',
  'stage-size-sized-hidden':
    'Você mudou um número da tela. E no palco, alguma coisa mudou? Clique em Ligar a borda e observe o palco de novo.',
  'stage-size-border':
    'Com a borda ligada, apareceu um contorno em volta da tela do jogo: a borda mostra onde a tela acaba. E se a largura ou a altura mudar, o que acontece com esse contorno? Clique em Largura 600 e observe a borda.',
  'stage-size-border-600':
    'Com a borda ligada, apareceu um contorno em volta da tela do jogo: a borda mostra onde a tela acaba. E se a largura mudar, o que acontece com esse contorno? Clique em Largura 800 e observe a borda.',
  'stage-size-border-off':
    'A borda está desligada, e sem ela a tela tem a mesma cor do espaço em volta. Clique em Ligar a borda antes de mudar a largura ou a altura, para ver o que acontece com a tela.',
  'stage-size-resized':
    'O número mudou, e o contorno da borda mudou junto: a tela do jogo ficou de outro tamanho. Agora deixe a tela do tamanho do seu jogo, 480 por 270. Clique em Largura 480 e em Altura 270 e observe a borda em cada clique.',
  'stage-size-at-target-hidden':
    'A tela já está em 480 por 270, mas a borda só apareceu depois. Para ver a borda chegar nesse tamanho, clique em Largura 600 e depois em Largura 480, observando o contorno.',
  'stage-size-complete':
    'Você testou a tela do jogo. A largura e a altura dizem o tamanho da tela, e a borda mostra onde ela acaba: mudou o número, a borda muda junto. Em 480 por 270 a tela fica menor que a de 800 por 480, e tudo o que o jogo mostrar vai caber dentro dela. Pode continuar testando.',
} as const

export type FalaDaTela = keyof typeof STAGE_SIZE_SPEECH

const METAS = ['border-on', 'resized', 'target'] as const

/**
 * Qual fala vale agora. A ordem sugerida começa pela borda (sem ela, mudar o número não mostra nada),
 * mas a criança pode mexer nos números antes: a fala acompanha e devolve o convite da borda.
 */
export function stageSizeGuidance(
  state: Pick<SceneState, 'stage'>,
  feita: (meta: string) => boolean,
): FalaDaTela {
  const { border, width, height, tried } = state.stage
  if (METAS.every(feita)) return 'stage-size-complete'
  if (!feita('border-on')) return tried > 0 ? 'stage-size-sized-hidden' : 'stage-size-start'
  if (!border) return 'stage-size-border-off'
  if (!feita('resized')) return width === 600 ? 'stage-size-border-600' : 'stage-size-border'
  const noAlvo = width === STAGE_TARGET.width && height === STAGE_TARGET.height
  return noAlvo ? 'stage-size-at-target-hidden' : 'stage-size-resized'
}

export const guia: GuiaLivre = {
  speech: STAGE_SIZE_SPEECH,
  guidance: (state, has, activity) => stageSizeGuidance(state, metaFeita(activity, METAS, has)),
}
