import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder (symbol-sequence), Faísca, 02/11/2026: só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 *
 * ⚠️ Nada de bloco, regra, evento, Se, então nem senão: a pergunta de cada símbolo é "é a minha
 * vez?", e o número que o jogo guarda é passo (o nome da variável, um conceito). Os blocos só
 * aparecem na montagem do Estúdio.
 *
 * A escada segue a ordem que a criança escolheu: a fala explica o que ela já testou e propõe o
 * próximo caso que falta (a vez certa, fora da vez, começar pelo meio, errar e tentar de novo, e o
 * baú que só conta). O botão em destaque sai de `proximoGestoDosSimbolos` (member-shell).
 */
export const SIMBOLOS_SPEECH = {
  'symbols-start':
    'Cada símbolo faz uma pergunta: é a minha vez? Toque o símbolo que a placa mostra primeiro e observe o número passo. O que acontece com ele?',
  'symbols-sun':
    'O sol acendeu, e passo agora vale 1. E se você tocar a lua agora, o que acontece com passo? Toque a lua e observe.',
  'symbols-sun-again':
    'O sol começou a sequência de novo: passo vale 1, mesmo com outro símbolo ainda aceso. E se você tocar a lua agora, o que acontece com passo? Toque a lua e observe.',
  'symbols-moon':
    'Era a vez da lua: ela acendeu, e passo foi para 2. Falta a estrela. O que você acha que acontece com o baú? Toque a estrela e observe.',
  'symbols-retry':
    'Não era a vez desse símbolo, e a tentativa recomeçou: passo está em 0 e nada ficou aceso. Tente de novo pelo símbolo que a placa mostra primeiro e observe passo a cada toque.',
  'symbols-opened':
    'Na ordem da placa, passo foi de 0 para 1 e para 2, e a estrela abriu o baú. E se um símbolo vier fora da vez? Com o sol aceso, pule a lua e toque a estrela. Observe passo e os símbolos acesos.',
  'symbols-middle':
    'Fora da vez, passo voltou para 0 e os símbolos apagaram: a tentativa recomeçou. E se a tentativa começar pelo meio, sem nada aceso? Toque a lua ou a estrela antes do sol e observe passo.',
  'symbols-again':
    'Começando pelo meio, nada acendeu e passo continuou 0. E depois de errar, será que a ordem da placa ainda abre o baú? Sem recomeçar a partida, toque os símbolos na ordem da placa e observe.',
  'symbols-again-err':
    'Começando pelo meio, nada acendeu e passo continuou 0. E depois de errar, será que a ordem da placa ainda abre o baú? Erre a ordem primeiro e, sem recomeçar a partida, toque os símbolos na ordem da placa. Observe.',
  'symbols-count':
    'Depois de errar, a ordem da placa abriu o baú do mesmo jeito: cada tentativa recomeça pelo sol. Agora compare com outro baú, que só conta quantos símbolos foram tocados. Clique em O baú só conta e toque os símbolos fora da ordem da placa. O que você acha que acontece?',
  'symbols-count-early':
    'Este baú só conta quantos símbolos foram tocados. Para comparar, veja primeiro o outro baú responder: clique em O baú confere a vez, toque os símbolos e observe passo.',
  'symbols-count-try':
    'Este baú só conta quantos símbolos foram tocados. E se os símbolos vierem fora da ordem da placa? O que você acha que acontece com o baú? Toque os símbolos fora da ordem e observe.',
  'symbols-count-back':
    'No baú que só conta, a ordem errada também abriu. E no baú que confere a vez, o que mais dá para comparar? Clique em O baú confere a vez e continue testando.',
  'symbols-complete':
    'Você comparou os casos. Na ordem da placa, passo anda de 0 para 1 e para 2, e a estrela abre o baú. Fora da vez, passo volta a 0 e tudo apaga. O baú que só conta abre em qualquer ordem: é passo que faz o jogo lembrar de quem é a vez. Pode continuar testando.',
} as const

/** A ordem da escada: o primeiro caso que falta é o que a fala propõe. */
export const SIMBOLOS_GOALS = [
  'step-moves',
  'right-order',
  'out-of-turn',
  'middle-start',
  'restart-works',
  'count-vs-order',
] as const

/** O baú que confere a vez já respondeu: o primeiro termo da comparação com o baú que só conta. */
const VEZ_VISTA = ['right-order', 'out-of-turn', 'middle-start'] as const

export function simbolosGuidance(
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof SIMBOLOS_SPEECH {
  const q = state.sequence
  if (SIMBOLOS_GOALS.every(has)) return 'symbols-complete'
  const falta = SIMBOLOS_GOALS.find((id) => !has(id))
  if (q.mode === 'count') {
    // A comparação pede o primeiro termo: o baú que confere a vez já respondeu (o motor exige o
    // mesmo). Antes disso, o Zappy chama de volta para ele (a escolha continua livre).
    if (has('count-vs-order')) return 'symbols-count-back'
    return VEZ_VISTA.some(has) ? 'symbols-count-try' : 'symbols-count-early'
  }
  if (falta === 'count-vs-order') return 'symbols-count'
  if (!has('right-order')) {
    // Antes da ordem certa, o baú da ordem está fechado: o passo diz em que ponto a criança está.
    if (q.passo === 2) return 'symbols-moon'
    // Tocar o sol de novo deixa passo em 1 com a lua ainda acesa: a fala não diz "de 0 para 1".
    if (q.passo === 1) return q.lit.length > 1 ? 'symbols-sun-again' : 'symbols-sun'
    return q.missed ? 'symbols-retry' : 'symbols-start'
  }
  if (!has('out-of-turn')) return 'symbols-opened'
  if (!has('middle-start')) return 'symbols-middle'
  // Depois de errar nesta partida, o próximo teste é a ordem da placa; sem erro, primeiro errar.
  return q.missed ? 'symbols-again' : 'symbols-again-err'
}
