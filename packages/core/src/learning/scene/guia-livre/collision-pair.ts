import type { SceneState } from '../state'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `collision-pair` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite
 * à investigação. A ideia é "quando os dois se encostam", quem sai do jogo: o grupo inteiro, ou só o
 * tiro e a pedra que encostaram. O bloco da colisão e os nomes que ele dá a cada um ficam para a
 * montagem do Estúdio. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na
 * fala de DEPOIS daquele teste. As chaves das falas começam com `collision-pair-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/collision-pair.tsx`): "O grupo dos
 * tiros", "O tiro que encostou", "O grupo das pedras", "A pedra que encostou" e "Passar 1 segundo".
 */
export const PAIR_SPEECH = {
  'collision-pair-start':
    'Três tiros sobem e três pedras descem, mas só o tiro do meio vai encostar numa pedra. Quando os dois se encostarem, o jogo vai tirar o grupo dos tiros e o grupo das pedras. Quantos você acha que vão sair do jogo? Clique em Passar 1 segundo e observe os dois contadores.',
  'collision-pair-start-alias':
    'Três tiros sobem e três pedras descem, mas só o tiro do meio vai encostar numa pedra. Quando os dois se encostarem, o jogo vai tirar só o tiro e a pedra que encostaram. E os outros? Clique em Passar 1 segundo e observe os dois contadores.',
  'collision-pair-mixed':
    'Agora um lado tira o grupo inteiro e o outro tira só quem encostou. Para comparar, escolha os dois do mesmo jeito: primeiro O grupo dos tiros e O grupo das pedras. Depois clique em Passar 1 segundo e observe os contadores.',
  'collision-pair-group':
    'Tirando os grupos, saíram todos os tiros e todas as pedras, mesmo só um par tendo se encostado. E se o jogo tirar só o tiro e a pedra que encostaram? Escolha O tiro que encostou e A pedra que encostou, clique em Passar 1 segundo e compare os contadores.',
  'collision-pair-watch':
    'Tirando só quem encostou, saíram só o tiro e a pedra que se bateram. E as outras duas pedras, o que acontece com elas depois da trombada? Continue clicando em Passar 1 segundo e observe as pedras.',
  'collision-pair-watch-again':
    'Falta ver o que acontece com as outras pedras depois de uma trombada que tira só quem encostou. Escolha O tiro que encostou e A pedra que encostou, passe o tempo até a trombada e continue observando as pedras.',
  'collision-pair-alias':
    'Tirando só quem encostou, saíram só o tiro e a pedra que se bateram, e as outras pedras seguiram o caminho delas até a borda de baixo. E se o jogo tirar os grupos inteiros? Escolha O grupo dos tiros e O grupo das pedras, clique em Passar 1 segundo e compare os contadores.',
  'collision-pair-complete':
    'Você comparou os dois jeitos. Tirando o grupo, sai todo mundo dele, até quem não encostou em nada. Tirando só quem encostou, saem o tiro e a pedra daquela trombada, e os outros seguem o caminho deles. Pode continuar testando quando quiser.',
} as const

export type FalaDaTrombada = keyof typeof PAIR_SPEECH

/**
 * Qual fala vale agora. A ordem sugerida é a da aula (os grupos, depois só quem encostou), mas cada
 * fala só explica o que a criança JÁ testou. "As outras seguem" só se vê no mesmo teste da trombada
 * que tira só quem encostou, então a fala pede para continuar olhando antes de trocar.
 */
export function pairGuidance(
  state: Pick<SceneState, 'collisionPair'>,
  has: (meta: string) => boolean,
): FalaDaTrombada {
  const grupos = has('whole-group'),
    par = has('just-the-pair'),
    outras = has('others-stay')
  const p = state.collisionPair
  if (grupos && par && outras) return 'collision-pair-complete'
  if (par && !outras) return p.pairedAliases ? 'collision-pair-watch' : 'collision-pair-watch-again'
  if (!grupos && !par) {
    if (p.shotTarget !== p.rockTarget) return 'collision-pair-mixed'
    return p.shotTarget === 'alias' ? 'collision-pair-start-alias' : 'collision-pair-start'
  }
  if (!par) return 'collision-pair-group'
  return 'collision-pair-alias'
}

export const guia: GuiaLivre = {
  speech: PAIR_SPEECH,
  guidance: (state, has) => pairGuidance(state, has),
}
