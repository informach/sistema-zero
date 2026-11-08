import { COIN_COUNTER } from './actions'
import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder "Moedas no caminho" (coin-counter), Faísca.
 *
 * ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): falas curtas (no máximo 12
 * palavras), uma coisa por vez, na língua da tela nova: passar numa moeda é pegar, sair de perto é
 * se afastar, chegar ao baú é ele perguntar. O sumiço é um interruptor, e o que o baú pergunta é uma
 * peça que se troca ("Tem pelo menos 5 moedas?" ou "Tem exatamente 5 moedas?"). Nada de bloco,
 * regra, grupo, então nem senão.
 *
 * `-idea` e `-bridge` são a ideia e o "No seu jogo:" do cartão dourado do fim.
 */
export const MOEDAS_SPEECH = {
  'coin-start': 'Moedas no caminho! Pegue uma e olhe o número.',
  'coin-first': 'Somou! E outra moeda?',
  'coin-away': 'E longe das moedas, o número continua?',
  'coin-back': 'Passe de novo onde já pegou uma moeda.',
  'coin-compare-off': 'E se a moeda não sumir? Desligue o sumiço.',
  'coin-compare-again': 'Sem sumiço: passe de novo na mesma moeda.',
  'coin-compare-on': 'E se a moeda sumir? Ligue o sumiço.',
  'coin-chest': 'Com menos de 5, o baú abre? Vá até ele.',
  'coin-chest-restart': 'Jogue de novo e leve menos de 5 ao baú.',
  'coin-chest-take': 'Pegue algumas moedas, menos de 5, e vá ao baú.',
  'coin-rules': 'Junte mais de 5 moedas e teste as duas perguntas.',
  'coin-rules-go': 'Mais de 5 moedas! Vá até o baú.',
  'coin-rules-swap': 'Troque a peça do baú e veja o que muda.',
  'coin-free': 'Pegue moedas e compare.',
  'coin-idea':
    'O jogo guarda quantas moedas foram pegas: cada moeda soma 1. O baú olha esse número para decidir se abre.',
  'coin-bridge': 'No seu jogo: um número vai contar as moedas, e o baú vai abrir com pelo menos 5.',
  'coin-complete': 'Cada moeda soma 1. O baú confere o número.',
} as const

export const MOEDAS_GOALS = [
  'each-adds',
  'kept',
  'no-double',
  'counts-again',
  'below-goal',
  'compare-rules',
] as const

/**
 * Qual fala vale agora, na ordem que a criança escolher. Com o personagem parado no baú (`at` é
 * `chest`), trocar a peça faz o baú perguntar de novo na hora: a fala pede a troca.
 */
export function moedasGuidance(
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof MOEDAS_SPEECH {
  const c = state.coins
  if (MOEDAS_GOALS.every(has)) return 'coin-complete'
  if (!has('each-adds')) return c.adds === 0 ? 'coin-start' : 'coin-first'
  if (!has('kept')) return 'coin-away'
  if (!has('no-double') && c.disappear) return 'coin-back'
  if (!has('counts-again')) return c.disappear ? 'coin-compare-off' : 'coin-compare-again'
  // Sem o sumiço, a moeda que não some só aparece religando ele.
  if (!has('no-double')) return 'coin-compare-on'
  if (!has('below-goal'))
    return c.moedas === 0
      ? 'coin-chest-take'
      : c.moedas < COIN_COUNTER.goal
        ? 'coin-chest'
        : 'coin-chest-restart'
  if (!has('compare-rules')) {
    if (c.moedas <= COIN_COUNTER.goal) return 'coin-rules'
    return c.at === 'chest' ? 'coin-rules-swap' : 'coin-rules-go'
  }
  return 'coin-free'
}
