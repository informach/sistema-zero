import { metaFeita } from '../atelie-metas'
import type { GuiaLivre } from '../tipos'

/**
 * A `velocity` do Corre Dino em exploração livre (Aula 5, 02/11/2026): só a IDEIA. A velocidade para
 * o lado é "quanto o x do cacto muda em cada quadro", e o SINAL escolhe a direção; o campo do bloco e
 * a montagem ficam para o Estúdio. Antes do teste, a fala pergunta e diz o que observar; o resultado
 * (direita, esquerda, parado) só vem na fala de DEPOIS daquele teste. As chaves começam com
 * `velocity-dino-`.
 *
 * As metas no modo livre (o motor, `avancarNucleo`): `moves` é o número POSITIVO levando o cacto para
 * a direita, `left` o negativo para a esquerda (os dois com três quadros naquele sentido) e `stopped`
 * o zero depois de ter visto o cacto andar.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre do Dino (`scene-livre/dino/velocity.tsx`): os
 * números da velocidade para o lado (−5, 0 e 5), "Avançar 1 quadro" e "Voltar ao começo".
 */
const speech = {
  'velocity-dino-start':
    'O cacto está parado na pista. A velocidade para o lado diz quanto o x do cacto muda em cada quadro. O que você acha que acontece com um número positivo, como 5? Escolha 5 e clique em Avançar 1 quadro três vezes. Observe o cacto e o número do x. Quem quiser pode começar pelo −5.',
  'velocity-dino-positive':
    'A velocidade para o lado está num número positivo. Para que lado o cacto vai andar? Clique em Avançar 1 quadro três vezes, um de cada vez, e observe o cacto e o x em cada quadro.',
  'velocity-dino-negative':
    'A velocidade para o lado está num número negativo. Para que lado o cacto vai andar? Clique em Avançar 1 quadro três vezes, um de cada vez, e observe o cacto e o x em cada quadro.',
  'velocity-dino-right':
    'Com o número positivo, o x aumentou 5 em cada quadro, e o cacto foi para a direita. E com um número negativo, como −5, o que muda? Escolha −5 e clique em Avançar 1 quadro três vezes, observando o cacto e o x.',
  'velocity-dino-left':
    'Com o número negativo, o x diminuiu 5 em cada quadro, e o cacto foi para a esquerda: o sinal de menos inverte a direção. E com um número positivo, como 5, o que muda? Escolha 5 e clique em Avançar 1 quadro três vezes, observando o cacto e o x.',
  'velocity-dino-zero':
    'Com 5, o cacto foi para a direita; com −5, para a esquerda. E com a velocidade 0, o que acontece quando os quadros passam? Escolha 0 e clique em Avançar 1 quadro algumas vezes. Observe o cacto e o x.',
  'velocity-dino-stopped':
    'Com 5, o cacto foi para a direita, e com 0 ficou parado: juntar zero ao x não muda nada. E com um número negativo, como −5, o que muda? Escolha −5 e clique em Avançar 1 quadro três vezes, observando o cacto e o x.',
  'velocity-dino-complete':
    'Você comparou os três números. Em cada quadro, o jogo soma a velocidade ao x: com 5, o x aumenta e o cacto vai para a direita; com −5, o x diminui e o cacto vai para a esquerda; com 0, nada muda, e o cacto fica parado. Os cactos do jogo nascem na direita, por isso usam −5 para atravessar a pista. Pode continuar testando quando quiser.',
} as const

export type FalaDaVelocidadeDino = keyof typeof speech

const METAS = ['moves', 'left', 'stopped'] as const

/**
 * Qual fala vale agora. A ordem sugerida é a do roteiro (5, −5, 0), mas cada fala só explica o que a
 * criança JÁ viu: quem começa pelo −5 é acompanhado nele, e o zero só vale depois de ver o cacto andar.
 */
function guidance(...[state, has, activity]: Parameters<GuiaLivre['guidance']>) {
  const feita = metaFeita(activity, METAS, has)
  const direita = has('moves'),
    esquerda = has('left'),
    parado = has('stopped')
  if (feita('moves') && feita('left') && feita('stopped')) return 'velocity-dino-complete'
  if (direita && esquerda) return 'velocity-dino-zero'
  if (direita && parado) return 'velocity-dino-stopped'
  if (direita) return 'velocity-dino-right'
  if (esquerda) return 'velocity-dino-left'
  if (state.drive.vx > 0) return 'velocity-dino-positive'
  if (state.drive.vx < 0) return 'velocity-dino-negative'
  return 'velocity-dino-start'
}

export const guia: GuiaLivre = { speech, guidance }
