import { casoDoOnceVsAlways, fichaDoOnceVsAlways, onceRunFinished } from '../../once-vs-always'
import { oncePreset } from '../../presets'
import { metaFeita } from '../atelie-metas'
import { guia as nave } from '../once-vs-always'
import type { GuiaLivre } from '../tipos'

/**
 * A `once-vs-always` do Corre Dino em exploração livre (02/11/2026): só a IDEIA ("uma vez, no
 * começo", "sempre, em todo quadro" e "na hora em que algo acontece") e o convite à investigação,
 * com o Dino. Nada de nome de área do Estúdio, bloco, regra, Se, então nem senão.
 *
 * Dois casos do Corre Dino:
 * - Aula 1 (`duas-caixas-nave`, a ficha "Mover o Dino um pouquinho"): o Dino que anda. A comparação
 *   do roteiro é o tênis que se calça uma vez e os passos que se repetem;
 * - Aula 4 (`tres-caixas-som`): o som do pulo, que espera a tecla. A comparação do roteiro é a
 *   campainha, quieta até alguém tocar. A meta da chuva (`flood`) só é cobrada se o bloco pedir.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/once-vs-always.tsx`): "Uma vez, no
 * começo", "Sempre, em todo quadro", "Na hora em que algo acontece", "Começar o jogo", "Jogar de
 * novo" e "Apertar a tecla". As chaves começam com `once-vs-always-dino-`.
 */
const speech = {
  // O Dino que anda (Aula 1).
  'once-vs-always-dino-start':
    'Quando o Dino anda um pouquinho? Escolha Uma vez, no começo, ou Sempre, em todo quadro. Depois clique em Começar o jogo e observe o Dino e os quadros.',
  'once-vs-always-dino-try-once':
    'O Dino vai andar um pouquinho uma vez, no começo. O que você acha que acontece nos outros quadros? Clique em Começar o jogo e observe o Dino e os quadros.',
  'once-vs-always-dino-try-always':
    'O Dino vai andar um pouquinho sempre, em todo quadro. O que você acha que muda? Clique em Começar o jogo e observe o Dino e os quadros.',
  'once-vs-always-dino-once':
    'No começo, o Dino andou um pouquinho uma vez só, e nos outros quadros ficou parado. E se o Dino andar sempre, em todo quadro? Escolha Sempre, em todo quadro, e clique em Começar o jogo.',
  'once-vs-always-dino-always':
    'Em todo quadro, o Dino andou mais um pouquinho, até sair da tela. E se o Dino andar uma vez só, no começo? Escolha Uma vez, no começo, e clique em Começar o jogo.',
  'once-vs-always-dino-complete':
    'Uma vez, no começo, o Dino andou um pouquinho e parou, como o tênis que a gente calça uma vez antes de correr. Sempre, em todo quadro, o Dino continuou andando até sair da tela, como os passos que se repetem a corrida inteira. Pode escolher de novo e comparar quando quiser.',
  // O som do pulo (Aula 4): a tecla é o acontecimento.
  'once-vs-always-dino-som-start':
    'Quando toca o som do pulo? Escolha um jeito: Uma vez, no começo, Sempre, em todo quadro, ou Na hora em que algo acontece. Depois clique em Começar o jogo e observe o contador de sons.',
  'once-vs-always-dino-som-try-event':
    'Agora o som do pulo está esperando uma coisa acontecer: a tecla ser apertada. O que você acha que acontece sem a tecla? Clique em Começar o jogo, deixe o jogo terminar sem clicar em Apertar a tecla e observe o contador de sons.',
  'once-vs-always-dino-som-event':
    'Sem a tecla, o som não tocou nenhuma vez: ficou esperando. E com a tecla, o que acontece? Clique em Apertar a tecla e observe o contador de sons e a notinha.',
  'once-vs-always-dino-som-key':
    'Na hora em que a tecla foi apertada, o som tocou. E sem a tecla, o que acontece? Clique em Jogar de novo, depois em Começar o jogo, e deixe o jogo terminar sem clicar em Apertar a tecla. Observe o contador de sons.',
  'once-vs-always-dino-som-event-loop':
    'Na hora em que a tecla foi apertada, o som tocou; sem a tecla, não tocou nenhuma vez. E se o som tocar sempre, em todo quadro? Escolha Sempre, em todo quadro, e clique em Começar o jogo.',
  'once-vs-always-dino-som-try-loop':
    'Agora o som vai tocar sempre, em todo quadro. O que você acha que acontece com o contador de sons? Clique em Começar o jogo e observe.',
  'once-vs-always-dino-som-loop':
    'Em todo quadro, o som tocou de novo, sem a tecla ser apertada. E se o som esperar a hora em que algo acontece? Escolha Na hora em que algo acontece e clique em Começar o jogo.',
  'once-vs-always-dino-som-try-start':
    'Agora o som vai tocar uma vez, no começo. O que você acha que acontece com o contador de sons? Clique em Começar o jogo e observe.',
  'once-vs-always-dino-som-once':
    'No começo, o som tocou uma vez, e depois mais nenhuma. E se o som esperar a hora em que algo acontece? Escolha Na hora em que algo acontece e clique em Começar o jogo.',
  'once-vs-always-dino-som-complete':
    'Na hora em que algo acontece, o som espera: sem a tecla, não toca nenhuma vez, e na hora em que a tecla é apertada, toca. Não toca no começo nem repete sozinho, como a campainha de casa, que fica quieta até alguém tocar. Pode testar os outros jeitos e comparar quando quiser.',
} as const

export type FalaDoOnceVsAlwaysDino = keyof typeof speech

const METAS_DO_SOM = ['on-event', 'key-fires', 'flood'] as const

function guidance(...[state, has, activity]: Parameters<GuiaLivre['guidance']>): string {
  const preset = oncePreset(activity.setup?.preset)
  const caso = casoDoOnceVsAlways(preset)
  // O Corre Dino não usa o caso das vidas: se um bloco o usar, valem as falas da Nave.
  if (caso === 'vidas') return nave.guidance(state, has, activity)
  const lugar = state.once.placement[fichaDoOnceVsAlways(preset)]
  if (caso === 'nave') {
    const vez = has('once'),
      sempre = has('always')
    if (vez && sempre) return 'once-vs-always-dino-complete'
    if (lugar === 'start') return vez ? 'once-vs-always-dino-once' : 'once-vs-always-dino-try-once'
    if (lugar === 'loop')
      return sempre ? 'once-vs-always-dino-always' : 'once-vs-always-dino-try-always'
    return vez
      ? 'once-vs-always-dino-once'
      : sempre
        ? 'once-vs-always-dino-always'
        : 'once-vs-always-dino-start'
  }
  // ⚠️ Segue as metas do BLOCO (`metaFeita`): a Aula 4 não pede a chuva de sons.
  const feita = metaFeita(activity, METAS_DO_SOM, has)
  const espera = has('on-event'),
    tecla = has('key-fires'),
    chuva = has('flood')
  if (feita('on-event') && feita('key-fires') && feita('flood'))
    return 'once-vs-always-dino-som-complete'
  if (lugar === 'event') {
    if (!espera && !tecla) return 'once-vs-always-dino-som-try-event'
    if (!tecla) return 'once-vs-always-dino-som-event'
    if (!espera) return 'once-vs-always-dino-som-key'
    return 'once-vs-always-dino-som-event-loop'
  }
  if (lugar === 'loop')
    return chuva ? 'once-vs-always-dino-som-loop' : 'once-vs-always-dino-som-try-loop'
  if (lugar === 'start')
    return onceRunFinished(state.once, preset)
      ? 'once-vs-always-dino-som-once'
      : 'once-vs-always-dino-som-try-start'
  return 'once-vs-always-dino-som-start'
}

export const guia: GuiaLivre = { speech, guidance }
