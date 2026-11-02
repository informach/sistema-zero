import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `pixel-vector` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `pixel-vector-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/pixel-vector.tsx`): a Lupa, com
 * "Aproximar" e "Afastar". As metas são as do catálogo: `stairs` (lupa em 4), `smooth` (lupa em 6) e
 * `alike` (de volta a 1 ou 2, depois de `stairs`).
 */
const METAS = ['stairs', 'smooth', 'alike'] as const

export const guia: GuiaLivre = {
  speech: {
    'pixel-vector-start':
      'As duas pedras têm a mesma forma: uma foi desenhada em pixel, e a outra, em vetor. De longe, você vê alguma diferença? Clique em Aproximar, uma vez de cada vez, e observe a borda de cada pedra. Em que momento as bordas ficam diferentes?',
    'pixel-vector-stairs':
      'De perto, a borda da pedra de pixel virou degraus: ela é feita de quadradinhos, e aproximar só deixa cada quadradinho maior. E a borda da pedra de vetor, o que ela mostra se você chegar ainda mais perto? Continue clicando em Aproximar e observe a borda da pedra de vetor.',
    'pixel-vector-far':
      'Bem de perto, a borda da pedra de vetor continua lisa, e aparecem os pontos que guardam a curva: o vetor é desenhado por pontos e linhas, e não por quadradinhos. E de longe outra vez, dá para ver essa diferença? Clique em Afastar até a Lupa voltar para 1 ou 2 e compare as duas pedras.',
    'pixel-vector-close-late':
      'De longe, as duas voltaram a parecer a mesma pedra: os degraus da pedra de pixel só aparecem de perto. E a borda da pedra de vetor, o que ela mostra bem de perto? Clique em Aproximar até a Lupa chegar a 6 e observe a borda da pedra de vetor.',
    'pixel-vector-complete':
      'Você comparou de perto e de longe. A pedra de pixel é feita de quadradinhos, e de perto a borda vira degraus. A de vetor guarda a curva em pontos e continua lisa em qualquer tamanho. De longe, as duas parecem a mesma pedra. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const feito = metaFeita(activity, METAS, has)
    if (METAS.every(feito)) return 'pixel-vector-complete'
    if (!feito('stairs')) return 'pixel-vector-start'
    if (!feito('smooth')) return feito('alike') ? 'pixel-vector-close-late' : 'pixel-vector-stairs'
    return 'pixel-vector-far'
  },
}
