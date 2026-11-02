import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder "Moedas no caminho" (coin-counter), Faísca, 02/11/2026:
 * só a IDEIA (o número moedas que cresce como um cofrinho, a moeda que some e conta uma vez só, e a
 * pergunta do baú, "pelo menos" ou "exatamente") e o convite à investigação. Antes do teste, a fala
 * pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele. Nada de bloco, regra,
 * grupo, então nem senão: eles ficam para a montagem do Estúdio.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-poder-moedas.tsx`): os números das
 * moedas ("Encostar na moeda"), "Afastar", "Encostar no baú", "Ligar o sumiço da moeda",
 * "Desligar o sumiço da moeda", "Pelo menos 5", "Exatamente 5" e "Recomeçar a partida".
 */
export const MOEDAS_SPEECH = {
  'coin-start':
    'Observe o número moedas, no canto do jogo. Encoste numa moeda: o que muda? Depois encoste em outra moeda e compare.',
  'coin-first':
    'Uma moeda somou 1 em moedas: o número de antes, mais 1, dá o número de agora. E com outra moeda, diferente, quanto o número muda? Encoste em outra moeda e observe moedas.',
  'coin-away':
    'Cada moeda nova somou 1 em moedas. E se o personagem se afastar das moedas, o que acontece com o número? Clique em Afastar e observe moedas.',
  'coin-back':
    'Longe das moedas, o número continuou guardado. E se o personagem voltar ao lugar de uma moeda que ele já pegou, o que acontece com moedas? Volte a uma moeda que você já pegou e observe o número.',
  'coin-compare-off':
    'A moeda que sumiu não contou de novo: moedas continuou igual. E se a moeda não sumir ao ser pega? Clique em Desligar o sumiço da moeda. Depois pegue uma moeda, encoste em outra e volte à primeira, observando moedas.',
  'coin-compare-on':
    'Sem sumir, a mesma moeda contou de novo: moedas subiu outra vez. E se a moeda sumir ao ser pega? Clique em Ligar o sumiço da moeda. Depois pegue uma moeda, encoste em outra e volte à primeira, observando moedas.',
  'coin-chest':
    'Quando a moeda some, ela conta uma vez só. Agora o baú, que faz uma pergunta sobre moedas. O que ele faz quando o personagem chega com menos de 5? Com uma a quatro moedas, clique em Encostar no baú e observe o baú e o aviso.',
  'coin-rules':
    'Com menos de 5, o baú ficou fechado e avisou o que faltava. E com mais de 5 moedas, as duas perguntas do baú dão a mesma resposta? Junte mais de 5 moedas e clique em Encostar no baú com Pelo menos 5 e depois com Exatamente 5.',
  'coin-rules-equals':
    'Com mais de 5 moedas e a pergunta Pelo menos 5, o baú abriu. E com Exatamente 5, o que acontece com as mesmas moedas? Escolha Exatamente 5 e clique em Encostar no baú de novo.',
  'coin-rules-atleast':
    'Com mais de 5 moedas e a pergunta Exatamente 5, o baú ficou fechado. E com Pelo menos 5, o que acontece com as mesmas moedas? Escolha Pelo menos 5 e clique em Encostar no baú de novo.',
  'coin-complete':
    'Você comparou todos os casos. Cada moeda nova soma 1 em moedas, e o número continua guardado longe delas. Quando a moeda some, ela conta uma vez só; sem sumir, ela conta de novo. Com mais de 5 moedas, Pelo menos 5 abre o baú, e Exatamente 5 não, porque mais de 5 não é exatamente 5. Pode continuar testando quando quiser.',
} as const

/**
 * Qual fala vale agora. A ordem sugerida é a do cofrinho (somar, guardar, contar uma vez só) e
 * depois a do baú, mas cada fala só explica o que a criança JÁ testou: quem compara primeiro com o
 * sumiço desligado é convidado a ligá-lo, e quem testa uma pergunta do baú é convidado à outra.
 */
export function moedasGuidance(
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof MOEDAS_SPEECH {
  const c = state.coins
  const cada = has('each-adds'),
    umaVez = has('no-double'),
    deNovo = has('counts-again'),
    guardado = has('kept'),
    abaixo = has('below-goal'),
    regras = has('compare-rules')
  if (cada && umaVez && deNovo && guardado && abaixo && regras) return 'coin-complete'
  if (!cada) return c.adds > 0 ? 'coin-first' : 'coin-start'
  if (!guardado) return 'coin-away'
  if (!umaVez && !deNovo) return 'coin-back'
  if (!deNovo) return 'coin-compare-off'
  if (!umaVez) return 'coin-compare-on'
  if (!abaixo) return 'coin-chest'
  if (!regras)
    return c.compared.atLeast
      ? 'coin-rules-equals'
      : c.compared.equals
        ? 'coin-rules-atleast'
        : 'coin-rules'
  // Só falta algo que esta atividade não cobra: a fala de conclusão.
  return 'coin-complete'
}
