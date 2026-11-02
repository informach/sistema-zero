import type { GuiaLivre } from './tipos'

/**
 * A experiência `velocity` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. A velocidade é "quanto o tiro anda em cada quadro, e para que lado"; o nome do campo
 * do bloco e a montagem ficam para o Estúdio. Antes do teste, a fala pergunta e diz o que observar;
 * o resultado (sobe ou desce, o y diminui ou aumenta) só vem na fala de DEPOIS daquele teste.
 * As chaves das falas começam com `velocity-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/velocity.tsx`): os números da
 * velocidade para baixo (−9, −3, 0, 3 e 9), "Avançar 1 quadro" e "Voltar ao começo".
 */
export const VELOCITY_SPEECH = {
  'velocity-start':
    'O tiro está parado no meio da tela. A velocidade para baixo diz quanto o y do tiro muda em cada quadro. O que você acha que acontece com um número negativo, como −9? Escolha −9 e clique em Avançar 1 quadro algumas vezes. Observe o tiro e o número do y. Quem quiser pode começar por um número positivo.',
  'velocity-negative':
    'A velocidade para baixo está num número negativo. Para que lado o tiro vai andar? Clique em Avançar 1 quadro, um de cada vez, e observe o tiro e o y em cada quadro.',
  'velocity-positive':
    'A velocidade para baixo está num número positivo. Para que lado o tiro vai andar? Clique em Avançar 1 quadro, um de cada vez, e observe o tiro e o y em cada quadro.',
  'velocity-up':
    'Com o número negativo, o y diminuiu um pouco em cada quadro, e o tiro subiu: na tela, y menor fica mais para cima. E com um número positivo, como 9, o que muda? Escolha 9 e avance alguns quadros, observando o tiro e o y.',
  'velocity-down':
    'Com o número positivo, o y aumentou um pouco em cada quadro, e o tiro desceu: na tela, y maior fica mais para baixo. E com um número negativo, como −9, o que muda? Escolha −9 e avance alguns quadros, observando o tiro e o y.',
  'velocity-complete':
    'Você comparou os dois sentidos. Em cada quadro, o jogo soma a velocidade ao y: com um número negativo, o y diminui e o tiro sobe; com um número positivo, o y aumenta e o tiro desce. Quanto maior o número, maior o passo de cada quadro. Pode continuar testando quando quiser.',
} as const

export type FalaDaVelocidade = keyof typeof VELOCITY_SPEECH

/**
 * Qual fala vale agora. A ordem sugerida começa pelo número negativo (o tiro do jogo sobe), mas cada
 * fala só explica o sentido que a criança JÁ viu: quem começa pelo positivo é acompanhado nele.
 */
export function velocityGuidance(
  state: { drive: { vy: number } },
  has: (meta: string) => boolean,
): FalaDaVelocidade {
  const sobe = has('up'),
    desce = has('down')
  if (sobe && desce) return 'velocity-complete'
  if (sobe) return 'velocity-up'
  if (desce) return 'velocity-down'
  if (state.drive.vy < 0) return 'velocity-negative'
  if (state.drive.vy > 0) return 'velocity-positive'
  return 'velocity-start'
}

export const guia: GuiaLivre = {
  speech: VELOCITY_SPEECH,
  guidance: (state, has) => velocityGuidance(state, has),
}
