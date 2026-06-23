/**
 * Limiares de largura do PRÓPRIO Studio (medidos por ResizeObserver no root — o
 * componente é embarcado em largura variável dentro do host, então NÃO dá pra
 * usar o viewport). Ponto único de verdade compartilhado por Topbar, Shell e
 * NarrowLayout, para não haver drift entre CSS e JS.
 */

/** Abaixo disto, os painéis lado a lado viram abas (um por vez). Generoso de
 * propósito (≈ tablets e janelas médias caem nas abas): split lado a lado só
 * compensa com bastante largura — telas médias ficam apertadas com 2-3 painéis. */
export const STUDIO_NARROW_MAX_PX = 1024

/** Abaixo disto, a identidade encolhe (logo só símbolo, badge vira bolinha). */
export const STUDIO_COMPACT_MAX_PX = 440
