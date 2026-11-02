import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `frames` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `frames-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/frames.tsx`), com os nomes do Pinta:
 * "Quadro 1", "Quadro 2", "Tocar a Prévia", "Parar a Prévia", a Velocidade (em quadros por segundo) e
 * "Quadro 2 igual ao quadro 1". Aqui "quadro" é sempre o DESENHO da animação (o nome do Pinta), e a
 * fala o apresenta assim na abertura.
 */
const METAS = ['two-drawings', 'movement', 'paused-one', 'slow-shows-two', 'same-frames'] as const

export const guia: GuiaLivre = {
  speech: {
    'frames-start':
      'A animação da nave tem dois desenhos: o quadro 1 e o quadro 2. Com a Prévia parada, o que muda de um desenho para o outro? Clique em Quadro 1 e em Quadro 2 e compare a nave.',
    'frames-start-late':
      'Você já viu a Prévia tocar. E com ela parada, o que tem em cada quadro? Clique em Quadro 1 e em Quadro 2 e compare os dois desenhos da nave.',
    'frames-fast':
      'Parados, os dois quadros são dois desenhos: o corpo da nave fica igual, e só o fogo muda de tamanho. E se a Prévia trocar esses desenhos bem rápido, o que você vê? Escolha a Velocidade 8, clique em Tocar a Prévia e observe o fogo.',
    'frames-pause':
      'Rápido, o fogo pulsou: a troca rápida dos dois desenhos parece movimento. Mas o que fica na tela em cada instante? Com a Prévia tocando rápido, clique em Parar a Prévia e observe o que ficou.',
    'frames-slow':
      'Parada, a Prévia mostrou um quadro só: na tela existe um desenho de cada vez, e é a troca rápida que vira movimento. E devagar, o que você vê? Escolha a Velocidade 2, clique em Tocar a Prévia e observe duas trocas.',
    'frames-same':
      'Devagar, dá para ver um quadro e depois o outro, cada um parado. E se os dois quadros forem iguais, o que a Prévia rápida mostra? Ligue Quadro 2 igual ao quadro 1, escolha a Velocidade 8 e toque a Prévia.',
    'frames-complete':
      'Você comparou tudo. Cada quadro é um desenho parado, e a troca rápida entre desenhos diferentes faz o fogo pulsar. Devagar dá para ver cada um, parada a Prévia mostra um só, e com os dois iguais a troca acontece, mas nada se mexe. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const feito = metaFeita(activity, METAS, has)
    if (METAS.every(feito)) return 'frames-complete'
    if (!feito('two-drawings'))
      return METAS.some((id) => id !== 'two-drawings' && has(id))
        ? 'frames-start-late'
        : 'frames-start'
    if (!feito('movement')) return 'frames-fast'
    if (!feito('paused-one')) return 'frames-pause'
    if (!feito('slow-shows-two')) return 'frames-slow'
    return 'frames-same'
  },
}
