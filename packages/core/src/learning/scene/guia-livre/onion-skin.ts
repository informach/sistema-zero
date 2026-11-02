import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `onion-skin` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `onion-skin-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/onion-skin.tsx`): "Quadro 1", "Quadro 2",
 * o Fantasma, "Fogo 2 menor" e "Fogo 2 maior". `even-step` só cai com o Fantasma ligado, então quem a
 * fez já viu o fogo tracejado (`ghost-on`).
 */
const METAS = ['blind-move', 'ghost-on', 'even-step'] as const

export const guia: GuiaLivre = {
  speech: {
    'onion-skin-start':
      'No quadro 2, o fogo precisa ficar um pouco maior que o fogo do quadro 1. Sem ver o quadro 1, dá para saber o tamanho certo? Vá para o Quadro 2, deixe o Fantasma desligado e mude o tamanho do fogo 2. Observe o que você consegue comparar.',
    'onion-skin-ghost':
      'Sem o Fantasma, só o fogo 2 aparece na tela, e o tamanho do fogo 1 fica na sua memória. E com o Fantasma ligado, o que aparece junto no quadro 2? Ligue o Fantasma e observe o fogo.',
    'onion-skin-blind-late':
      'O fogo tracejado é o fogo do quadro 1, desenhado por cima do quadro 2 só para comparar. E sem ele, como fica? Desligue o Fantasma, mude o tamanho do fogo 2 e observe o que dá para comparar.',
    'onion-skin-step':
      'O fogo tracejado é o fogo do quadro 1, desenhado por cima do quadro 2 só para comparar: agora dá para ver os dois juntos. Com Fogo 2 menor e Fogo 2 maior, deixe o fogo 2 um pouco maior que o tracejado. Observe a ponta do fogo e a borda do quadro.',
    'onion-skin-complete':
      'Com o Fantasma, você viu os dois fogos juntos e deixou o fogo 2 um pouco maior, sem passar da borda. O Fantasma não é um desenho: ele só aparece para comparar e não entra na animação. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const feito = metaFeita(activity, METAS, has)
    if (METAS.every(feito)) return 'onion-skin-complete'
    if (!feito('blind-move')) return has('ghost-on') ? 'onion-skin-blind-late' : 'onion-skin-start'
    if (!feito('ghost-on')) return 'onion-skin-ghost'
    return 'onion-skin-step'
  },
}
