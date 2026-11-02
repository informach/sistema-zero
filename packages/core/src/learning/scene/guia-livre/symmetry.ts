import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `symmetry` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `symmetry-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/symmetry.tsx`), com os nomes do Pinta:
 * "Espelho lado a lado", "Espelho de cima e de baixo", "Pintar a asa" e "Balde de tinta: encher a
 * asa". O motor só conta `axis-decides` depois de `two-sides` (a tela deixa o espelho de cima e de
 * baixo fechado até lá, com o motivo).
 */
const METAS = ['one-side', 'two-sides', 'axis-decides', 'fill-ignores-mirror'] as const

export const guia: GuiaLivre = {
  speech: {
    'symmetry-start':
      'Com os dois espelhos desligados, onde aparece o que você pinta? Clique em Pintar a asa e conte quantas asas aparecem na grade.',
    'symmetry-off-late':
      'Você já viu um espelho ligado. E com os dois espelhos desligados, onde aparece o que você pinta? Desligue os espelhos, clique em Pintar a asa e conte as asas na grade.',
    'symmetry-mirror':
      'Sem espelho, a asa apareceu só onde você pintou. E com o Espelho lado a lado ligado, o que acontece com o mesmo traço? Ligue só o Espelho lado a lado, clique em Pintar a asa e olhe a grade inteira.',
    'symmetry-axis':
      'Com o Espelho lado a lado, a asa ganhou uma cópia do outro lado da linha do meio, virada como num espelho. E o Espelho de cima e de baixo, onde ele põe a cópia? Desligue o lado a lado, ligue só o de cima e de baixo e clique em Pintar a asa.',
    'symmetry-fill':
      'Com o Espelho de cima e de baixo, a cópia caiu do outro lado da linha deitada. Cada espelho dobra o desenho numa linha diferente. E a tinta do Balde, o espelho copia também? Deixe só o Espelho lado a lado ligado e clique em Balde de tinta: encher a asa. Compare as duas asas.',
    'symmetry-complete':
      'Você comparou todos os casos. Desligado, o traço fica só onde você pinta. Cada espelho copia o traço do outro lado de uma linha do meio: em pé no lado a lado, deitada no de cima e de baixo. E o Balde enche só a parte em que você clica: o espelho não copia a tinta. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const feito = metaFeita(activity, METAS, has)
    if (METAS.every(feito)) return 'symmetry-complete'
    if (!feito('one-side'))
      return METAS.some((id) => id !== 'one-side' && has(id))
        ? 'symmetry-off-late'
        : 'symmetry-start'
    if (!feito('two-sides')) return 'symmetry-mirror'
    if (!feito('axis-decides')) return 'symmetry-axis'
    return 'symmetry-fill'
  },
}
