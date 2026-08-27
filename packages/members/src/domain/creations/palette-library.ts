/**
 * O item ESPECIAL do canal de creations que carrega a biblioteca "Minhas
 * paletas" do Pinta (o kids o sobe com estes valores; ver o wrapper
 * `pinta-cloud-persistence.ts` de lá). A identidade inteira vem do contrato
 * compartilhado em `@sistemazero/core`, evitando divergência silenciosa entre
 * cliente, serviço de cota e consulta administrativa.
 */
export {
  classifyPintaPaletteLibraryCreation,
  isPintaPaletteLibraryCreation,
  PINTA_PALETTE_LIBRARY_ITEM_ID as PALETTE_LIBRARY_ITEM_ID,
  PINTA_PALETTE_LIBRARY_KIND as PALETTE_LIBRARY_KIND,
  PINTA_PALETTE_LIBRARY_TOOL as PALETTE_LIBRARY_TOOL,
} from '@sistemazero/core/creations'
