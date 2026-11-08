import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder "O segredo da cabana" (two-pieces), Faísca.
 *
 * ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): falas curtas (no máximo 12
 * palavras), uma coisa por vez, na língua da tela nova: passar na chave ou no emblema é pegar, e
 * chegar à porta é a cabana perguntar. A pergunta aparece inteira ("Tem a chave e tem o emblema?"),
 * e a peça do meio se troca por "ou". Nada de bloco, regra, Se, então, senão nem os nomes
 * `temChave`/`temEmblema`: o caderninho tem as duas linhas.
 *
 * `-idea` e `-bridge` são a ideia e o "No seu jogo:" do cartão dourado do fim.
 */
export const CABANA_SPEECH = {
  'cabin-start': 'A cabana pede duas peças. Vá até ela sem nada!',
  'cabin-start-restart': 'Jogue de novo e vá até a cabana sem nada.',
  'cabin-one': 'Uma peça! Leve até a cabana.',
  'cabin-one-take': 'Pegue uma peça só e vá até a cabana.',
  'cabin-one-restart': 'Jogue de novo e leve uma peça só.',
  'cabin-both': 'E com as duas? Pegue a outra e vá até a cabana.',
  'cabin-order': 'Jogue de novo e comece pela outra peça.',
  'cabin-rule': 'E se trocar o "e" pelo "ou"? Toque na peça.',
  'cabin-or': 'Com "ou": leve uma peça só até a cabana.',
  'cabin-or-back': 'Troque de volta e compare o "e" com o "ou".',
  'cabin-idea':
    'O jogo guarda as duas peças, e a cabana faz uma pergunta que junta as duas: com "e", precisa das duas; com "ou", basta uma.',
  'cabin-bridge':
    'No seu jogo: a porta da cabana vai perguntar se o personagem tem a chave e o emblema.',
  'cabin-complete': 'Com "e", precisa das duas. Com "ou", basta uma.',
} as const

/** As descobertas da experiência, na ordem da escada. */
export const CABANA_GOALS = [
  'none-closed',
  'one-closed',
  'both-open',
  'any-order',
  'and-vs-or',
] as const

/** Qual fala vale agora, na ordem que a criança escolher. */
export function cabanaGuidance(
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof CABANA_SPEECH {
  const p = state.pieces
  if (CABANA_GOALS.every(has)) return 'cabin-complete'
  if (p.rule === 'or') return has('and-vs-or') ? 'cabin-or-back' : 'cabin-or'
  const pecas = Number(p.temChave) + Number(p.temEmblema)
  if (!has('none-closed')) return pecas === 0 ? 'cabin-start' : 'cabin-start-restart'
  if (!has('one-closed'))
    return pecas === 1 ? 'cabin-one' : pecas === 0 ? 'cabin-one-take' : 'cabin-one-restart'
  if (!has('both-open')) return 'cabin-both'
  if (!has('any-order')) return 'cabin-order'
  return 'cabin-rule'
}
