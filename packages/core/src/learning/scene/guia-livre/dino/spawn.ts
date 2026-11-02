import { metaFeita } from '../atelie-metas'
import type { GuiaLivre } from '../tipos'

/**
 * A `spawn` do Corre Dino em exploração livre (Aula 5, 02/11/2026): só a IDEIA ("um cacto novo a
 * cada tanto tempo": em todo quadro, ou esperando um tempo no relógio, em segundos) e o convite à
 * investigação. O bloco que cria o cacto e o relógio do Estúdio ficam para a montagem. Antes do
 * teste, a fala pergunta e diz o que observar; o resultado (a parede colada, o espaço entre os
 * cactos) só vem na fala de DEPOIS daquele teste. A comparação do fim é a do roteiro (a fila na
 * porta, cada um esperando a sua vez). As chaves começam com `spawn-dino-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre do Dino (`scene-livre/dino/spawn.tsx`): "Em todo
 * quadro", "A cada 1,4 segundo" (e os outros tempos do relógio) e "Passar 1 segundo".
 */
const speech = {
  'spawn-dino-start':
    'Neste jogo, os cactos nascem na direita e vêm correndo pela pista. Agora nasce um cacto novo em todo quadro. Quantos cactos você acha que nascem em um segundo, e como ficam na pista? Clique em Passar 1 segundo e observe os cactos e quantos nasceram.',
  'spawn-dino-wait':
    'Agora cada cacto novo espera um tempo no relógio para nascer. O que você acha que muda na pista? Clique em Passar 1 segundo até nascerem dois cactos e observe onde cada um aparece.',
  'spawn-dino-wall':
    'Em todo quadro nasceu um cacto novo: em um segundo foram uns trinta, um colado no outro, como uma parede, e o Dino não teria como pular. E se cada cacto novo esperar um tempo no relógio para nascer? Escolha A cada 1,4 segundo e clique em Passar 1 segundo até nascerem dois cactos. Observe os cactos.',
  'spawn-dino-gap':
    'Com a espera, nasceu um cacto de cada vez, e sobrou espaço entre um e outro. E se um cacto novo nascer em todo quadro, sem esperar? Escolha Em todo quadro, clique em Passar 1 segundo e observe os cactos.',
  'spawn-dino-complete':
    'Você comparou os dois jeitos. Em todo quadro, nascem uns trinta cactos por segundo, colados, como uma parede. Esperando um tempo no relógio, nasce um de cada vez, com espaço para o Dino pular, como numa fila em que cada um espera a sua vez de passar pela porta. Pode continuar testando outros tempos quando quiser.',
} as const

export type FalaDoNascimentoDino = keyof typeof speech

const METAS = ['every-frame', 'with-timer'] as const

/**
 * Qual fala vale agora. A ordem sugerida é a da aula (em todo quadro, depois com o relógio), mas cada
 * fala só explica o que a criança JÁ testou: quem começa pelo relógio é acompanhado nele.
 */
function guidance(...[state, has, activity]: Parameters<GuiaLivre['guidance']>) {
  const feita = metaFeita(activity, METAS, has)
  const parede = feita('every-frame'),
    espera = feita('with-timer')
  if (parede && espera) return 'spawn-dino-complete'
  if (!has('every-frame') && !has('with-timer'))
    return state.crowd.timer ? 'spawn-dino-wait' : 'spawn-dino-start'
  return espera ? 'spawn-dino-gap' : 'spawn-dino-wall'
}

export const guia: GuiaLivre = { speech, guidance }
