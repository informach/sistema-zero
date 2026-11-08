import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder "O baú dos símbolos" (symbol-sequence), Faísca.
 *
 * ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): falas curtas (no máximo 12
 * palavras), uma coisa por vez, na língua da tela nova: o personagem ANDA até as pedras, e chegar
 * numa pedra é tocar o símbolo. Como o baú decide é uma peça que se troca ("a ordem dos símbolos"
 * ou "só quantos foram tocados"). Nada de bloco, regra, Se, então, senão nem o nome `passo`: o
 * caderninho diz "Em que passo da placa?".
 *
 * ⚠️ As pedras ficam numa fileira, como no jogo: do sol à estrela o caminho passa pela lua, e por
 * isso a fala do "pular" sugere ir por cima dela.
 *
 * `-idea` e `-bridge` são a ideia e o "No seu jogo:" do cartão dourado do fim.
 */
export const SIMBOLOS_SPEECH = {
  'symbols-start': 'Ande até o sol, o primeiro da placa!',
  'symbols-sun': 'Aceso! E agora, a lua?',
  'symbols-follow': 'Siga a placa até o fim: sol, lua, estrela.',
  'symbols-skip': 'E se pular a lua? Vá do sol à estrela por cima.',
  'symbols-middle': 'Jogue de novo e comece pela lua.',
  'symbols-retry': 'Errou? Siga a placa de novo, sem recomeçar.',
  'symbols-place': 'E se o baú só contar? Troque a peça.',
  'symbols-count': 'Só contando: toque fora da ordem e olhe o baú.',
  'symbols-count-back': 'Troque de volta e compare as duas peças.',
  'symbols-idea':
    'O jogo guarda um passo: até onde a sequência chegou. Cada símbolo pergunta se é a vez dele; fora da vez, o passo volta ao começo.',
  'symbols-bridge':
    'No seu jogo: um número vai guardar o passo, e cada símbolo vai conferir se é a vez dele.',
  'symbols-complete': 'Na ordem, cada símbolo confere a vez. Só contando, não.',
} as const

/** As descobertas da experiência, na ordem da escada. */
export const SIMBOLOS_GOALS = [
  'step-moves',
  'right-order',
  'out-of-turn',
  'middle-start',
  'restart-works',
  'count-vs-order',
] as const

/** Qual fala vale agora, na ordem que a criança escolher. */
export function simbolosGuidance(
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof SIMBOLOS_SPEECH {
  const q = state.sequence
  if (SIMBOLOS_GOALS.every(has)) return 'symbols-complete'
  if (q.mode === 'count') return has('count-vs-order') ? 'symbols-count-back' : 'symbols-count'
  if (!has('step-moves')) return q.passo === 0 ? 'symbols-start' : 'symbols-sun'
  if (!has('right-order')) return 'symbols-follow'
  if (!has('out-of-turn')) return 'symbols-skip'
  if (!has('middle-start')) return 'symbols-middle'
  if (!has('restart-works')) return 'symbols-retry'
  return 'symbols-place'
}
