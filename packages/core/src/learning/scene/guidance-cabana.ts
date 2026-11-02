import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder (two-pieces), Faísca, 02/11/2026: só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 *
 * ⚠️ Nada de bloco, regra, evento, Se, então nem senão. O "e" e o "ou" aparecem como ideia: a
 * cabana pede as duas peças, ou pede uma das peças. Os blocos só aparecem na montagem do Estúdio.
 *
 * A escada respeita a situação que a criança preparou: se o caso de agora (sem peça, com uma ou
 * com as duas) ainda não foi testado, a fala propõe testá-lo; senão, explica o que já foi visto e
 * propõe o próximo caso que falta. O botão em destaque sai de `proximoGestoDaCabana` (member-shell).
 */
export const CABANA_SPEECH = {
  'cabin-start':
    'A cabana pede as duas peças: a chave e o emblema. O que você acha que ela faz quando o personagem chega sem nenhuma? Encoste na cabana sem pegar nada e observe a porta e o aviso.',
  'cabin-none':
    'O personagem está sem nenhuma peça, e a cabana pede as duas. O que você acha que ela faz? Encoste na cabana e observe a porta e o aviso.',
  'cabin-one':
    'O personagem está com uma peça só, e a cabana pede as duas. Será que uma basta? Encoste na cabana e observe a porta e o aviso.',
  'cabin-two':
    'Agora o personagem está com as duas peças. O que você acha que a cabana vai fazer? Encoste nela e observe a porta e o aviso.',
  'cabin-after-none':
    'Sem nenhuma peça, a cabana ficou fechada e avisou o que pede. E com uma peça só, será que basta? Pegue a chave ou o emblema e encoste na cabana.',
  'cabin-after-one':
    'Com uma peça só, a cabana ficou fechada e avisou o que pede. E sem nenhuma peça, o que ela faz? Recomece a partida e encoste na cabana sem pegar nada.',
  'cabin-after-closed':
    'Sem as duas peças, a cabana continuou fechada e avisou o que pede. E se o personagem tiver as duas? Pegue a peça que falta e encoste na cabana.',
  'cabin-restart':
    'A cabana ficou aberta do teste anterior. Para ver o que ela faz quando pede as duas peças, recomece a partida: a cabana fecha e as peças voltam ao chão.',
  'cabin-opened-closed':
    'Com as duas peças, a cabana abriu. E sem as duas, o que ela faz? Recomece a partida e encoste na cabana sem nenhuma peça ou com uma só.',
  'cabin-opened':
    'Com as duas peças, a cabana abriu. Será que a ordem das peças importa? Recomece a partida, pegue as peças na outra ordem e observe a cabana.',
  'cabin-order-try':
    'Desta vez as peças vieram na outra ordem. O que você acha que a cabana vai fazer? Encoste nela e observe.',
  'cabin-or':
    'Começando pela chave ou pelo emblema, a cabana abriu do mesmo jeito: a ordem das peças não importa. E se a cabana pedir só uma das peças? Clique em A cabana pede uma das peças, pegue uma peça só e encoste na cabana. O que você acha que acontece?',
  'cabin-or-try':
    'Agora a cabana pede uma das peças. O que você acha que ela faz com uma peça só? Numa partida com a cabana fechada, pegue uma peça só, encoste na cabana e observe.',
  'cabin-back-and':
    'Pedindo uma das peças, uma peça só já abriu a cabana. E quando ela pede as duas? Clique em A cabana pede as duas peças e continue comparando.',
  'cabin-complete':
    'Você comparou os casos. Quando a cabana pede as duas peças, ela só abre com a chave e o emblema, em qualquer ordem; sem uma delas, fica fechada e avisa. Quando pede uma das peças, uma só já basta. Pode continuar testando.',
} as const

export const CABANA_GOALS = [
  'none-closed',
  'one-closed',
  'both-open',
  'any-order',
  'and-vs-or',
] as const

export function cabanaGuidance(
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof CABANA_SPEECH {
  const p = state.pieces
  if (CABANA_GOALS.every(has)) return 'cabin-complete'
  if (p.rule === 'or') return has('and-vs-or') ? 'cabin-back-and' : 'cabin-or-try'
  const pecas = Number(p.temChave) + Number(p.temEmblema)
  if (p.door === 'closed') {
    // O caso de agora ainda não foi testado: a fala propõe testá-lo, na ordem que a criança escolheu.
    if (pecas === 0 && !has('none-closed'))
      return CABANA_GOALS.some(has) ? 'cabin-none' : 'cabin-start'
    if (pecas === 1 && !has('one-closed')) return 'cabin-one'
    if (pecas === 2 && !has('both-open')) return 'cabin-two'
    if (
      pecas === 2 &&
      !has('any-order') &&
      p.order[0] === (p.opened.keyFirst ? 'emblem' : 'key') &&
      (p.opened.keyFirst || p.opened.emblemFirst)
    )
      return 'cabin-order-try'
  }
  if (!has('none-closed') || !has('one-closed')) {
    if (has('both-open')) return 'cabin-opened-closed'
    // A cabana ficou aberta de um teste pedindo uma das peças: só uma partida nova a fecha.
    if (p.door === 'open') return 'cabin-restart'
    if (has('none-closed')) return 'cabin-after-none'
    return 'cabin-after-one'
  }
  if (!has('both-open')) return p.door === 'open' ? 'cabin-restart' : 'cabin-after-closed'
  if (!has('any-order')) return 'cabin-opened'
  return 'cabin-or'
}
