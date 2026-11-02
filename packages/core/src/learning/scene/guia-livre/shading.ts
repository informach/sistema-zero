import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `shading` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `shading-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/shading.tsx`), com os nomes do Pinta:
 * "A sombra e a luz" e "O sol". `flat` só cai desligando depois de ter ligado; `side` com os tons
 * ligados e o sol em dois lados.
 */
const METAS = ['volume', 'flat', 'side'] as const

export const guia: GuiaLivre = {
  speech: {
    'shading-start':
      'A bola está pintada com um tom só de azul. O que muda nela se ganhar um azul mais escuro e um mais claro? Clique em A sombra e a luz e observe a forma da bola.',
    'shading-flat':
      'Com a sombra e a luz, a bola ganhou três tons de azul e parece redonda, como uma bola de verdade. E sem esses tons, como ela fica? Desligue A sombra e a luz e compare.',
    'shading-side':
      'Sem os tons, a bola voltou a ficar chapada, como um adesivo. E se o sol mudar de lado, o que acontece com o azul claro e o escuro? Com A sombra e a luz ligadas, clique em O sol para trocar de lado e observe.',
    'shading-flat-late':
      'Com o sol do outro lado, o azul claro e o escuro trocaram de lado: o claro fica virado para o sol. E sem esses tons, como a bola fica? Desligue A sombra e a luz e compare.',
    'shading-complete':
      'Você comparou tudo. Um azul mais claro do lado do sol e um mais escuro do outro lado deixam a bola redonda; sem eles, ela fica chapada. E quando o sol muda de lado, a luz e a sombra mudam junto. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const feito = metaFeita(activity, METAS, has)
    if (METAS.every(feito)) return 'shading-complete'
    if (!feito('volume')) return 'shading-start'
    if (!feito('flat')) return has('side') ? 'shading-flat-late' : 'shading-flat'
    return 'shading-side'
  },
}
