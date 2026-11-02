import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `fill-stroke` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `fill-stroke-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/fill-stroke.tsx`), com os nomes do Pinta:
 * Preenchimento, Contorno e Sem cor.
 */
const METAS = ['only-fill', 'only-stroke', 'both'] as const

export const guia: GuiaLivre = {
  speech: {
    'fill-stroke-start':
      'A pedra tem duas partes com cor: o Preenchimento, por dentro, e o Contorno, na borda. Se o Contorno ficar em Sem cor, o que sobra da pedra? Clique em Contorno para deixá-lo em Sem cor e observe.',
    'fill-stroke-stroke':
      'Com o Contorno em Sem cor, sobrou a cor de dentro, sem a linha da borda. E se for o Preenchimento a ficar em Sem cor, o que sobra? Volte a cor do Contorno, deixe o Preenchimento em Sem cor e observe.',
    'fill-stroke-fill-late':
      'Com o Preenchimento em Sem cor, sobrou só a linha da borda, vazia por dentro. E se for o Contorno a ficar em Sem cor, o que sobra? Volte a cor do Preenchimento, deixe o Contorno em Sem cor e observe.',
    'fill-stroke-both':
      'Com o Preenchimento em Sem cor, sobrou só a linha da borda, vazia por dentro. E com as duas partes com cor de novo, como a pedra fica? Volte a cor das duas partes e compare as três versões.',
    'fill-stroke-complete':
      'Você comparou as três versões. O Preenchimento é a cor de dentro, e o Contorno é a linha da borda: são duas partes, e cada uma pode ficar em Sem cor sem levar a outra junto. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const feito = metaFeita(activity, METAS, has)
    if (METAS.every(feito)) return 'fill-stroke-complete'
    if (!feito('only-fill'))
      return has('only-stroke') ? 'fill-stroke-fill-late' : 'fill-stroke-start'
    if (!feito('only-stroke')) return 'fill-stroke-stroke'
    return 'fill-stroke-both'
  },
}
