import { casoDoOnceVsAlways, fichaDoOnceVsAlways, onceRunFinished } from '../once-vs-always'
import { oncePreset } from '../presets'
import type { SceneState } from '../state'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `once-vs-always` em exploração livre (Construtor, 02/11/2026): só a IDEIA ("uma vez, no
 * começo", "sempre, em todo quadro" e "na hora em que algo acontece") e o convite à investigação. Antes
 * do teste, a fala pergunta e diz o que observar; o resultado só vem depois. As chaves das falas
 * começam com `once-vs-always-`. Nada de nome de área do Estúdio, bloco, regra, Se, então nem senão.
 *
 * São três casos da Nave contra Asteroides, cada um com as suas falas (o assunto muda: a nave que
 * anda, as vidas, o tiro). ⚠️ Os rótulos citados são os da tela livre (`scene-livre/once-vs-always.tsx`):
 * "Uma vez, no começo", "Sempre, em todo quadro", "Na hora em que algo acontece", "Começar o jogo",
 * "Jogar de novo" e "Apertar a tecla". As falas são estáticas (a voz é gravada na autoria) e falam
 * da nave, o elenco do curso.
 */
const speech = {
  // A nave que anda (Primeira nave, `duas-caixas-nave`).
  'once-vs-always-nave-start':
    'Quando a nave anda um pouquinho? Escolha Uma vez, no começo, ou Sempre, em todo quadro. Depois clique em Começar o jogo e observe a nave e os quadros.',
  'once-vs-always-nave-try-once':
    'A nave vai andar um pouquinho uma vez, no começo. O que você acha que acontece nos outros quadros? Clique em Começar o jogo e observe a nave e os quadros.',
  'once-vs-always-nave-try-always':
    'A nave vai andar um pouquinho sempre, em todo quadro. O que você acha que muda? Clique em Começar o jogo e observe a nave e os quadros.',
  'once-vs-always-nave-once':
    'No começo, a nave andou um pouquinho uma vez só, e nos outros quadros ficou parada. E se ela andar sempre, em todo quadro? Escolha Sempre, em todo quadro, e comece o jogo.',
  'once-vs-always-nave-always':
    'Em todo quadro, a nave andou mais um pouquinho, até sair da tela. E se ela andar uma vez só, no começo? Escolha Uma vez, no começo, e comece o jogo.',
  'once-vs-always-nave-complete':
    'Uma vez, no começo, a nave andou um pouquinho e parou. Sempre, em todo quadro, ela continuou andando até sair da tela. Pode escolher de novo e comparar quando quiser.',
  // As vidas (Dia 4, `uma-ficha-vidas`): o asteroide bate de tempos em tempos.
  'once-vs-always-vidas-start':
    'Quando a nave ganha três vidas? Escolha Uma vez, no começo, ou Sempre, em todo quadro. Depois clique em Começar o jogo e observe as vidas e as batidas do asteroide.',
  'once-vs-always-vidas-try-once':
    'A nave vai ganhar três vidas uma vez, no começo. O que você acha que acontece com as vidas quando o asteroide bater? Clique em Começar o jogo e observe as vidas e as batidas.',
  'once-vs-always-vidas-try-always':
    'A nave vai ganhar três vidas sempre, em todo quadro. O que você acha que acontece com as vidas quando o asteroide bater? Clique em Começar o jogo e observe as vidas e as batidas.',
  'once-vs-always-vidas-once':
    'No começo, a nave ganhou três vidas uma vez só, e cada batida tirou uma. E se ela ganhar três vidas sempre, em todo quadro? Escolha Sempre, em todo quadro, e comece o jogo.',
  'once-vs-always-vidas-always':
    'Em todo quadro, as vidas voltaram a ser três, mesmo depois das batidas. E se a nave ganhar as vidas uma vez só, no começo? Escolha Uma vez, no começo, e comece o jogo.',
  'once-vs-always-vidas-complete':
    'Uma vez, no começo, as vidas chegam uma vez só, e as batidas vão tirando até acabar. Sempre, em todo quadro, as vidas voltam a encher depois de cada batida. Pode escolher de novo e comparar quando quiser.',
  // O tiro (Dia 2, `tres-caixas-tiro`): a criança decide só quando sai o tiro.
  'once-vs-always-tiro-start':
    'Quando sai um tiro? Escolha um jeito: Uma vez, no começo, Sempre, em todo quadro, ou Na hora em que algo acontece. Depois clique em Começar o jogo e observe os tiros.',
  'once-vs-always-tiro-try-event':
    'Agora o tiro está esperando uma coisa acontecer: a tecla ser apertada. O que você acha que acontece sem a tecla? Clique em Começar o jogo, deixe o jogo terminar sem clicar em Apertar a tecla e observe os tiros.',
  'once-vs-always-tiro-event':
    'Sem a tecla, nenhum tiro saiu: o tiro ficou esperando. E com a tecla? Clique em Apertar a tecla e observe os tiros.',
  'once-vs-always-tiro-key':
    'Na hora em que a tecla foi apertada, saiu um tiro. E sem a tecla, o que acontece? Clique em Jogar de novo, depois em Começar o jogo, e deixe o jogo terminar sem clicar em Apertar a tecla. Observe os tiros.',
  'once-vs-always-tiro-event-flood':
    'Na hora em que a tecla foi apertada, saiu um tiro; sem a tecla, nenhum. E se o tiro sair sempre, em todo quadro? Escolha Sempre, em todo quadro, e comece o jogo.',
  'once-vs-always-tiro-try-loop':
    'Agora o tiro vai sair sempre, em todo quadro. O que você acha que vai aparecer? Clique em Começar o jogo e observe os tiros.',
  'once-vs-always-tiro-flood':
    'Em todo quadro saiu mais um tiro, sem a tecla. E se o tiro sair na hora em que algo acontece? Escolha Na hora em que algo acontece e comece o jogo.',
  'once-vs-always-tiro-try-start':
    'Agora o tiro vai sair uma vez, no começo. O que você acha que vai aparecer? Clique em Começar o jogo e observe os tiros.',
  'once-vs-always-tiro-once':
    'No começo saiu um tiro, e depois mais nenhum. E com os outros jeitos? Escolha Sempre, em todo quadro, ou Na hora em que algo acontece, e comece o jogo.',
  'once-vs-always-tiro-complete':
    'Uma vez, no começo, sai um tiro só. Sempre, em todo quadro, sai um tiro novo a cada quadro. Na hora em que algo acontece, o tiro espera e sai quando a tecla é apertada. Pode escolher de novo e comparar quando quiser.',
} as const

export type FalaDoOnceVsAlways = keyof typeof speech

const FALAS_DA_COMPARACAO = {
  nave: {
    start: 'once-vs-always-nave-start',
    tryOnce: 'once-vs-always-nave-try-once',
    tryAlways: 'once-vs-always-nave-try-always',
    once: 'once-vs-always-nave-once',
    always: 'once-vs-always-nave-always',
    complete: 'once-vs-always-nave-complete',
  },
  vidas: {
    start: 'once-vs-always-vidas-start',
    tryOnce: 'once-vs-always-vidas-try-once',
    tryAlways: 'once-vs-always-vidas-try-always',
    once: 'once-vs-always-vidas-once',
    always: 'once-vs-always-vidas-always',
    complete: 'once-vs-always-vidas-complete',
  },
} as const satisfies Record<'nave' | 'vidas', Record<string, FalaDoOnceVsAlways>>

/**
 * Qual fala vale agora. Cada jeito escolhido tem a fala de ANTES do teste (pergunta e o que
 * observar) e a de DEPOIS (o que aconteceu e o próximo jeito a comparar). Quem começa por qualquer
 * jeito é acompanhado na comparação com os outros.
 */
function guidance(
  state: SceneState,
  has: (meta: string) => boolean,
  activity: Parameters<GuiaLivre['guidance']>[2],
): FalaDoOnceVsAlways {
  const preset = oncePreset(activity.setup?.preset)
  const caso = casoDoOnceVsAlways(preset)
  const lugar = state.once.placement[fichaDoOnceVsAlways(preset)]
  if (caso !== 'tiro') {
    const f = FALAS_DA_COMPARACAO[caso]
    const vez = has('once'),
      sempre = has(caso === 'vidas' ? 'lives-loop' : 'always')
    if (vez && sempre) return f.complete
    if (lugar === 'start') return vez ? f.once : f.tryOnce
    if (lugar === 'loop') return sempre ? f.always : f.tryAlways
    return vez ? f.once : sempre ? f.always : f.start
  }
  const espera = has('on-event'),
    tecla = has('key-fires'),
    chuva = has('flood')
  if (espera && tecla && chuva) return 'once-vs-always-tiro-complete'
  if (lugar === 'event') {
    if (!espera && !tecla) return 'once-vs-always-tiro-try-event'
    if (!tecla) return 'once-vs-always-tiro-event'
    if (!espera) return 'once-vs-always-tiro-key'
    return 'once-vs-always-tiro-event-flood'
  }
  if (lugar === 'loop') return chuva ? 'once-vs-always-tiro-flood' : 'once-vs-always-tiro-try-loop'
  if (lugar === 'start')
    return onceRunFinished(state.once, preset)
      ? 'once-vs-always-tiro-once'
      : 'once-vs-always-tiro-try-start'
  return 'once-vs-always-tiro-start'
}

export const guia: GuiaLivre = { speech, guidance }
