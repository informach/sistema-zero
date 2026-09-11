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

/**
 * A partir disto a barra do editor escreve a MARCA ao lado do círculo de voltar (a tela-modelo).
 * Abaixo, a marca vira só nome acessível: com o menu do host, o selo da nuvem, o Zappy e o
 * Compartilhar na mesma linha, ela comia o espaço do NOME do projeto (medido no playground com o
 * chrome do host: a 1280px, com o selo dizendo "Não consegui guardar", sobravam 35px para o nome).
 * Subiu de 1360 para 1600 quando desfazer e refazer entraram na barra (+108px): com a marca, a
 * 1360px editando, o "Salvo" e a nuvem passavam por baixo do segmentado (full review, 11/09/2026).
 */
export const STUDIO_BRAND_MIN_PX = 1600

/**
 * No LARGO, abaixo disto, as pílulas da direita (Zappy, Compartilhar) e o segmentado dos modos
 * ficam só no ícone, com a barra ainda na altura larga. Medido com o chrome do host no pior caso
 * de texto ("Alterações não salvas" + "Não consegui guardar"): com os rótulos, a 1098px (o
 * notebook de 1366 com o menu aberto) o nome do projeto sumia e a 1024px a esquerda passava 73px
 * por baixo do segmentado.
 */
export const STUDIO_BAR_LABELS_MIN_PX = 1400

/**
 * Abaixo disto desfazer e refazer saem da barra e vão para a seção "Editar" do "⋯" (antes, só no
 * compacto): no estreito, com os dois círculos, a esquerda passava por baixo do segmentado a
 * partir de 640px (medido: 40px a 640, 120 a 560, 200 a 480).
 */
export const STUDIO_BAR_UNDO_MIN_PX = 720

/**
 * Abaixo disto a BARRA ganha o jeito compacto (o "Salvo" vira a bolinha, o nome perde o lápis e
 * os respiros encolhem) mesmo antes do `STUDIO_COMPACT_MAX_PX`, que também decide a paleta do
 * Blockly e por isso fica onde está. Entre 440 e 520px, com o menu do host, a barra estreita
 * passava 34px por baixo do segmentado (medido no playground com o chrome do host).
 */
export const STUDIO_BAR_COMPACT_MAX_PX = 520
