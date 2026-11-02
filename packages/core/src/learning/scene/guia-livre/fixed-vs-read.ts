import type { GuiaLivre } from './tipos'

/**
 * A experiência `fixed-vs-read` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026):
 * só a IDEIA. O tiro precisa de um número que diga onde ele nasce: um número escrito fixo (400) é
 * sempre o mesmo, e um número lido de onde ele está guardado (o lugar da nave) é o de agora. Nada de
 * bloco, campo, regra nem código: os blocos ficam para a montagem do Estúdio.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/fixed-vs-read.tsx`): "Atirar", "Número
 * escrito: 400", "Número lido da nave", os lugares da nave e "Mostrar as marcas da nave".
 */
export const FIXED_READ_SPEECH = {
  'fixed-vs-read-start':
    'O tiro precisa de um número que diga onde ele nasce. Agora esse número está escrito: 400. Clique em Atirar, mude a nave de lugar e atire de novo. Onde nasce cada tiro? Observe as marcas.',
  'fixed-vs-read-start-read':
    'O tiro precisa de um número que diga onde ele nasce. Agora esse número é lido da nave. Clique em Atirar, mude a nave de lugar e atire de novo. Onde nasce cada tiro? Observe as marcas.',
  'fixed-vs-read-read':
    'Com o número escrito, os dois tiros nasceram no mesmo lugar, mesmo com a nave em outro lugar: 400 é sempre 400. E se o tiro ler o lugar da nave na hora de nascer? Escolha Número lido da nave, atire, mude a nave de lugar e atire de novo. Compare as marcas.',
  'fixed-vs-read-fixed':
    'Com o número lido, cada tiro nasceu onde a nave estava naquela hora. E com um número escrito, o que acontece? Escolha Número escrito: 400, atire, mude a nave de lugar e atire de novo. Compare as marcas.',
  'fixed-vs-read-after-marks':
    'O tiro saiu do meio da nave, da beirada de cima. E quando a nave muda de lugar, o tiro muda junto? Atire, mude a nave de lugar e atire de novo, com o número escrito e com o número lido. Compare as marcas.',
  'fixed-vs-read-marks':
    'O número escrito é sempre o mesmo, e o número lido é o de agora. Mas de que ponto da nave o tiro sai? Clique em Mostrar as marcas da nave e, com o número lido, atire. Observe de onde o tiro sai.',
  'fixed-vs-read-complete':
    'Você comparou os dois números. Escrito, o 400 não muda, e o tiro nasce sempre no mesmo lugar. Lido, o número vem de onde ele está guardado, o lugar da nave, e o tiro nasce no meio dela, na beirada de cima, onde quer que ela esteja. Pode continuar testando.',
} as const

export type FalaDoNumeroDoTiro = keyof typeof FIXED_READ_SPEECH

export const guia: GuiaLivre = {
  speech: FIXED_READ_SPEECH,
  /**
   * A ordem sugerida é a do curso (escrito, lido, marcas da nave), mas cada fala só explica o que a
   * criança JÁ testou: quem começa pelo número lido é convidada depois ao número escrito.
   */
  guidance: (state, has): FalaDoNumeroDoTiro => {
    const escrito = has('same-spot'),
      lido = has('follows'),
      marcas = has('box-marks')
    if (escrito && lido && marcas) return 'fixed-vs-read-complete'
    if (escrito && lido) return 'fixed-vs-read-marks'
    if (escrito) return 'fixed-vs-read-read'
    if (lido) return 'fixed-vs-read-fixed'
    if (marcas) return 'fixed-vs-read-after-marks'
    return state.fixedRead.source === 'read' ? 'fixed-vs-read-start-read' : 'fixed-vs-read-start'
  },
}
