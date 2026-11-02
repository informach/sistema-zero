import type { GuiaLivre } from './tipos'

/**
 * A experiência `random` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. A ideia é "o jogo sorteia" onde cada pedra nasce; o bloco do sorteio fica para a
 * montagem do Estúdio. Antes do teste, a fala pergunta e diz o que observar; o resultado (lugares
 * diferentes, a pedra nascendo acima da tela) só vem na fala de DEPOIS daquele teste.
 * As chaves das falas começam com `random-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/random.tsx`): "Sortear um lugar" e
 * "Passar 1 segundo".
 */
export const RANDOM_SPEECH = {
  'random-start':
    'Cada pedra nova nasce num lugar que o jogo escolhe na hora. Ele escolhe sempre o mesmo lugar? Clique em Sortear um lugar algumas vezes e observe as marquinhas na régua e o x da pedra.',
  'random-once':
    'Saiu um lugar, e a régua ganhou uma marquinha. E no próximo sorteio, que lugar sai? Clique de novo em Sortear um lugar e compare as marquinhas.',
  'random-places':
    'Cada sorteio pode dar um lugar diferente, sempre entre x 90 e x 390: o jogo sorteia, e ninguém sabe antes onde a pedra vai aparecer. E na hora em que nasce, a pedra fica dentro ou fora da tela? Clique em Passar 1 segundo e observe a pedra e a borda de cima.',
  'random-above':
    'A pedra nasce acima da borda de cima, fora da tela, e entra caindo: assim ninguém vê a pedra surgir do nada. E o lugar onde ela nasce é sempre o mesmo? Clique em Sortear um lugar algumas vezes e compare as marquinhas na régua.',
  'random-complete':
    'Você viu as duas coisas. O jogo sorteia o x de cada pedra, entre 90 e 390, e cada sorteio pode dar um lugar diferente. E a pedra nasce acima da tela e entra caindo. Pode continuar sorteando quando quiser.',
} as const

export type FalaDoSorteio = keyof typeof RANDOM_SPEECH

/**
 * Qual fala vale agora. A ordem sugerida é a da aula (sortear, depois ver a pedra entrar), mas cada
 * fala só explica o que a criança JÁ testou: quem solta o tempo antes é acompanhado na queda.
 */
export function randomGuidance(
  state: { speed: { spots: readonly number[] } },
  has: (meta: string) => boolean,
): FalaDoSorteio {
  const lugares = has('positions'),
    acima = has('above')
  if (lugares && acima) return 'random-complete'
  if (lugares) return 'random-places'
  if (acima) return 'random-above'
  return state.speed.spots.some((n) => n > 0) ? 'random-once' : 'random-start'
}

export const guia: GuiaLivre = {
  speech: RANDOM_SPEECH,
  guidance: (state, has) => randomGuidance(state, has),
}
