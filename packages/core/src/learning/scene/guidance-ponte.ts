import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder "A ponte apressada" (timed-bridge), Faísca, 02/11/2026:
 * só a IDEIA (a alavanca, a ponte, ponteAberta e o relógio que conta 4 segundos) e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de
 * DEPOIS dele. Nada de bloco, regra, então, senão nem o nome do bloco que espera: eles ficam para a
 * montagem do Estúdio.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-poder-ponte.tsx`): "Encostar na ponte",
 * "Puxar a alavanca", "Esperar 1 segundo", "Recomeçar a partida", "Quando puxa a alavanca" e
 * "Quando a partida começa".
 */
export const PONTE_SPEECH = {
  'bridge-start':
    'A ponte está levantada, e ponteAberta está falso. O que você acha que acontece se o personagem for até a ponte agora? Clique em Encostar na ponte e observe a ponte e o aviso. Se preferir, puxe a alavanca primeiro e compare depois.',
  'bridge-closed':
    'Com a ponte levantada e ponteAberta falso, o personagem não atravessou, e o aviso pediu para puxar a alavanca. E se você puxar a alavanca, o que muda? Clique em Puxar a alavanca e observe a ponte, ponteAberta e o relógio.',
  'bridge-lowered':
    'A alavanca baixa a ponte, e ponteAberta vira verdadeiro. E a ponte fica baixada para sempre? Com a ponte baixada, clique em Esperar 1 segundo, um de cada vez, e observe a ponte e o relógio. Se preferir, vá até a ponte antes de o relógio chegar a 4.',
  'bridge-rose':
    'No quarto segundo, a ponte subiu sozinha, e ponteAberta voltou a falso. Ninguém precisou puxar nada para ela subir. E se o personagem chegar antes do quarto segundo? Puxe a alavanca e clique em Encostar na ponte antes de o relógio chegar a 4.',
  'bridge-crossed':
    'Com a ponte baixada e ponteAberta verdadeiro, o personagem atravessou e o sino tocou. E se ele demorar para ir até a ponte? Recomece a partida, puxe a alavanca e clique em Esperar 1 segundo até o relógio chegar a 4. Observe a ponte e ponteAberta.',
  'bridge-again':
    'Você viu os dois casos: chegando a tempo, o personagem atravessa; atrasado, a ponte já subiu. E se você puxar a alavanca de novo, quando a ponte já subiu? Puxe de novo e observe a ponte e o relógio.',
  'bridge-place':
    'Puxar de novo baixou a ponte outra vez, e o relógio começou a contar de novo: ele começa a cada puxada. E se o relógio começasse junto com a partida, e não na alavanca? Escolha Quando a partida começa, deixe o relógio chegar a 4, puxe a alavanca e continue clicando em Esperar 1 segundo, observando a ponte e o relógio.',
  'bridge-clock-start':
    'Agora o relógio começa junto com a partida, e não na alavanca. O que você acha que muda? Deixe o relógio chegar a 4, puxe a alavanca e continue clicando em Esperar 1 segundo, observando a ponte e o relógio.',
  'bridge-clock-back':
    'Com o relógio começando junto com a partida, ele contou uma vez só. Depois disso, a ponte baixou com a alavanca e ficou baixada. Para os outros testes, escolha de novo Quando puxa a alavanca.',
  'bridge-closed-last':
    'Falta um teste: o que acontece se o personagem for até a ponte antes de alguém puxar a alavanca? Recomece a partida e clique em Encostar na ponte, sem puxar. Observe a ponte e o aviso.',
  'bridge-complete':
    'Você comparou todos os casos. A alavanca baixa a ponte, e ponteAberta vira verdadeiro. Quatro segundos depois da puxada, a ponte sobe sozinha, e ponteAberta volta a falso. Por isso, só atravessa quem chega a tempo. Quando o relógio começa junto com a partida, ele conta uma vez só, e a ponte não sobe mais. Pode continuar testando quando quiser.',
} as const

/**
 * Qual fala vale agora. A ordem sugerida é a da história (a ponte fechada, a alavanca, o relógio, a
 * travessia a tempo, a puxada de novo e onde o relógio começa), mas cada fala só explica o que a
 * criança JÁ testou: quem puxa a alavanca antes de testar a ponte fechada recebe esse teste no fim, e
 * quem escolhe o relógio da partida antes da hora é acompanhado nessa comparação.
 */
export function ponteGuidance(
  state: SceneState,
  has: (id: string) => boolean,
): keyof typeof PONTE_SPEECH {
  const fechada = has('closed-start'),
    alavanca = has('lever-opens'),
    aTempo = has('in-time'),
    subiu = has('rises-alone'),
    deNovo = has('pull-again'),
    relogio = has('timer-place')
  if (fechada && alavanca && aTempo && subiu && deNovo && relogio) return 'bridge-complete'
  // O relógio da partida é uma comparação própria: enquanto ele está escolhido, a fala é dele.
  if (state.bridge.place === 'start') return relogio ? 'bridge-clock-back' : 'bridge-clock-start'
  // Sem puxada ainda, a ponte fechada é o primeiro teste (antes de puxar não há outro jeito de vê-la).
  if (!alavanca) return fechada ? 'bridge-closed' : 'bridge-start'
  if (!subiu && !aTempo) return 'bridge-lowered'
  if (!aTempo) return 'bridge-rose'
  if (!subiu) return 'bridge-crossed'
  if (!deNovo) return 'bridge-again'
  if (!relogio) return 'bridge-place'
  return 'bridge-closed-last'
}
