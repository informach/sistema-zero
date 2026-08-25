/**
 * O item ESPECIAL do canal de creations que carrega a biblioteca "Minhas
 * paletas" do Pinta (o kids o sobe com estes valores; ver o wrapper
 * `pinta-cloud-persistence.ts` de lá). O members precisa conhecer o KIND para
 * o `creationsUsageByUsers` do admin NÃO contar a biblioteca como "+1 desenho".
 *
 * ⚠️ O par é ESPELHADO no kids (`PALETTE_LIBRARY_*` no wrapper) — o members não
 * pode importar o kids, então quem trava o lockstep é o conformance test DO
 * KIDS (`tests/palette-library-conformance.test.ts`), que importa este módulo
 * por caminho relativo (precedente: `badge-conformance.test.ts`). Renomear de
 * um lado sem o outro faria o filtro do admin parar de casar EM SILÊNCIO.
 */
export const PALETTE_LIBRARY_KIND = 'palette-library'
export const PALETTE_LIBRARY_ITEM_ID = 'sz-pinta-palettes'
