import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `motion-amount` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite
 * à investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `motion-amount-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/motion-amount.tsx`): "O tanto que a
 * cratera anda", "O tanto que a pedra inteira anda", "Tocar a Prévia" e "Parar a Prévia". A fala diz
 * "desenho" e não "quadro": aqui a Prévia troca os dois DESENHOS da pedra, e o quadro do jogo é outra
 * coisa. No modo livre a Prévia abre PARADA (`openScene`): é o "Tocar a Prévia" da criança que testa.
 */
const METAS = ['no-change', 'local-move', 'too-much'] as const

export const guia: GuiaLivre = {
  speech: {
    'motion-amount-start':
      'A Prévia troca dois desenhos da pedra, um depois do outro. Com os dois desenhos iguais, o que você vê? Deixe O tanto que a cratera anda e O tanto que a pedra inteira anda em 0, clique em Tocar a Prévia e observe a pedra.',
    'motion-amount-still-late':
      'Você já viu a pedra mudar na Prévia. E com os dois desenhos iguais, o que acontece? Deixe O tanto que a cratera anda e O tanto que a pedra inteira anda em 0 e observe a Prévia tocando.',
    'motion-amount-local':
      'Com os dois desenhos iguais, a Prévia troca, mas a pedra fica parada: nada mudou de um desenho para o outro. E se só a cratera andar um pouco no segundo desenho? Deixe a pedra inteira em 0, ponha a cratera em 4 e observe a Prévia tocando.',
    'motion-amount-much':
      'Com só a cratera andando um pouco, a pedra parece girar, e o corpo dela continua no lugar. E se a pedra inteira andar muito no segundo desenho? Ponha O tanto que a pedra inteira anda em 10 e observe a Prévia tocando.',
    'motion-amount-complete':
      'Você comparou os três casos. Desenhos iguais deixam a pedra parada. Um detalhe que anda um pouco faz a pedra parecer girar. E a pedra inteira andando muito faz o desenho pular. Na animação, o tanto que muda de um desenho para o outro decide o movimento. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const feito = metaFeita(activity, METAS, has)
    if (METAS.every(feito)) return 'motion-amount-complete'
    if (!feito('no-change'))
      return has('local-move') || has('too-much')
        ? 'motion-amount-still-late'
        : 'motion-amount-start'
    if (!feito('local-move')) return 'motion-amount-local'
    return 'motion-amount-much'
  },
}
