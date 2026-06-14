/**
 * Limiares de largura do PRÓPRIO Studio (medidos por ResizeObserver no root — o
 * componente é embarcado em largura variável dentro do host, então NÃO dá pra
 * usar o viewport). Ponto único de verdade compartilhado por Topbar, Shell e
 * NarrowLayout, para não haver drift entre CSS e JS.
 */

/** Abaixo disto, os painéis lado a lado viram abas (um por vez). */
export const STUDIO_NARROW_MAX_PX = 768

/** Abaixo disto, a identidade encolhe (logo só símbolo, badge vira bolinha). */
export const STUDIO_COMPACT_MAX_PX = 440
