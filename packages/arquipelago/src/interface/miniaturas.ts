import {
  GALERIA,
  type IdDaGaleria,
  MOVEIS,
  type Movel,
  type ObjetoDaCasa,
  type PisoDaCasa,
  type PisoDoQuintal,
} from '@sistemazero/arquipelago-contracts'
import { MORADA_CATALOG, moradaFileUrl } from '@sistemazero/avatar-quarto/morada/catalog'
import type { TipoDeJanela } from '../sistemas/construcao/ferramentas'
import { MORADA_FUNCTION, moradaFunctionPiece } from '../sistemas/morada'

function thumbnail(id: string) {
  const p = MORADA_CATALOG.pieces[id]
  if (!p) throw new Error(`Miniatura Morada inexistente: ${id}`)
  return moradaFileUrl(p.thumb)
}
export const MINIATURA_DO_OBJETO = Object.fromEntries(
  Object.entries(MORADA_FUNCTION).map(([id, piece]) => [id, thumbnail(piece)]),
) as Record<ObjetoDaCasa, string>
export const MINIATURA_DA_JANELA: Record<TipoDeJanela, string> = {
  'janela-grande': thumbnail('construcao/janela_2m'),
  'janela-arco': thumbnail('construcao/janela_arco_2m'),
  'janela-redonda': thumbnail('construcao/janela_quadrada_1m'),
}
export const MINIATURA_DO_PISO: Record<PisoDaCasa, string> = {
  tabua: thumbnail('construcao/chao_4m'),
  ladrilho: thumbnail('construcao/chao_4m'),
  azulejo: thumbnail('construcao/chao_4m'),
}
export const MINIATURA_DO_CAMINHO: Record<PisoDoQuintal, string> = {
  pedra: thumbnail('construcao/caminho_pedras_1m'),
  grama: thumbnail('construcao/chao_4m'),
}
export const MINIATURA_DO_MOVEL = Object.fromEntries(
  MOVEIS.map((id) => {
    const piece = Object.values(MORADA_CATALOG.pieces).find(
      (p) => p.id.includes(id.split('-')[0] ?? id) && p.kind === 'furniture',
    )
    return [id, piece ? moradaFileUrl(piece.thumb) : MINIATURA_DO_OBJETO['planta-interior']]
  }),
) as Record<Movel, string>
export function miniaturaDaAparencia(id: IdDaGaleria) {
  return thumbnail(moradaFunctionPiece(GALERIA[id].objeto, { origem: 'galeria', id }))
}
