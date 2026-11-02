import type { SceneState } from '../state'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `invincibility` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite
 * à investigação. A ideia é "um tempinho de proteção depois de bater", que conta para trás em quadros;
 * a montagem fica para o Estúdio. Antes do teste, a fala pergunta e diz o que observar; quantas vidas
 * sobram com cada proteção só vem na fala de DEPOIS daquele teste. As chaves começam com `invincibility-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/invincibility.tsx`): "Nenhuma",
 * "15 quadros", "45 quadros", "Avançar até a próxima pedra" e "Voltar ao começo".
 */
export const SHIELD_SPEECH = {
  'invincibility-start':
    'Três pedras vão bater na nave, nos quadros 1, 10 e 30. Agora a nave não ganha proteção nenhuma depois de bater. Quantas vidas você acha que sobram? Clique em Avançar até a próxima pedra, uma pedra de cada vez, e observe as vidas.',
  'invincibility-try':
    'Agora, depois de bater, a nave ganha um tempinho de proteção, que conta para trás, um quadro de cada vez. Quantas vidas você acha que sobram depois das três pedras? Clique em Avançar até a próxima pedra e observe as vidas e a proteção.',
  'invincibility-running':
    'Continue clicando em Avançar até a próxima pedra até a terceira pedra bater. Observe as vidas e quantos quadros de proteção ainda restam em cada batida.',
  'invincibility-none':
    'Sem proteção, cada pedra tirou uma vida: as três batidas levaram as três vidas. E se a nave ganhar um tempinho de proteção depois de bater? Escolha 45 quadros e avance pedra por pedra, observando as vidas e a proteção.',
  'invincibility-long':
    'Com 45 quadros de proteção, só a primeira pedra tirou vida: as outras chegaram com a nave ainda protegida. E sem proteção nenhuma, o que muda? Escolha Nenhuma e avance pedra por pedra, observando as vidas.',
  'invincibility-short':
    'Com 15 quadros, a proteção acabou antes da terceira pedra, e ela tirou outra vida. E sem proteção nenhuma, o que muda? Escolha Nenhuma e avance pedra por pedra, observando as vidas.',
  'invincibility-none-long':
    'Sem proteção, as três pedras levaram as três vidas; com 45 quadros, só a primeira tirou vida. E com uma proteção curta, de 15 quadros? A pedra do quadro 30 chega antes ou depois de a proteção acabar? Escolha 15 quadros e avance pedra por pedra.',
  'invincibility-none-short':
    'Sem proteção, as três pedras levaram as três vidas; com 15 quadros, a proteção acabou antes da terceira pedra. E com uma proteção longa, de 45 quadros? Escolha 45 quadros e avance pedra por pedra, observando as vidas e a proteção.',
  'invincibility-long-short':
    'Com 45 quadros, só a primeira pedra tirou vida; com 15, a proteção acabou antes da terceira pedra. E sem proteção nenhuma? Escolha Nenhuma e avance pedra por pedra, observando as vidas.',
  'invincibility-complete':
    'Você comparou as três. Sem proteção, cada batida tira uma vida. Com proteção, a nave fica um tempinho sem perder vida depois de bater, e a proteção conta para trás: se ela acaba antes da próxima pedra, a nave perde outra vida. A proteção é um respiro com prazo, não um escudo para sempre. Pode continuar testando quando quiser.',
} as const

export type FalaDaProtecao = keyof typeof SHIELD_SPEECH

/** A meta que cada proteção da tela mostra. */
const META_DA_PROTECAO: Partial<Record<number, string>> = {
  0: 'no-shield',
  45: 'window',
  15: 'expires',
}

/**
 * Qual fala vale agora. A ordem sugerida é a da aula (0, 45 e 15), mas cada fala só explica o que a
 * criança JÁ testou, e no meio de um teste ainda não visto a fala só acompanha até a terceira pedra.
 */
export function shieldGuidance(
  state: Pick<SceneState, 'invincibility'>,
  has: (meta: string) => boolean,
): FalaDaProtecao {
  const nenhuma = has('no-shield'),
    longa = has('window'),
    curta = has('expires')
  if (nenhuma && longa && curta) return 'invincibility-complete'
  const sh = state.invincibility
  const meta = META_DA_PROTECAO[sh.protection]
  if (meta && !has(meta) && sh.frames > 0 && sh.struck.length < 3) return 'invincibility-running'
  if (!nenhuma && !longa && !curta)
    return sh.protection === 0 ? 'invincibility-start' : 'invincibility-try'
  if (nenhuma && longa) return 'invincibility-none-long'
  if (nenhuma && curta) return 'invincibility-none-short'
  if (longa && curta) return 'invincibility-long-short'
  if (nenhuma) return 'invincibility-none'
  return longa ? 'invincibility-long' : 'invincibility-short'
}

export const guia: GuiaLivre = {
  speech: SHIELD_SPEECH,
  guidance: (state, has) => shieldGuidance(state, has),
}
