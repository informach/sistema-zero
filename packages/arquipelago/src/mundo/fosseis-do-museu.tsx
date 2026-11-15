import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { MoradaPieceView } from '@sistemazero/avatar-quarto/morada/piece'
import { Suspense } from 'react'
import { useEstado } from '../estado/contexto'
import { moradaMuseumExhibits } from '../sistemas/morada-colecoes'

/** Seis descobertas independentes, apresentadas por miniaturas da biblioteca Morada. */
export const LUGARES_NA_VITRINE: readonly [number, number][] = [
  [-0.45, -0.08],
  [0, -0.08],
  [0.45, -0.08],
  [-0.45, 0.08],
  [0, 0.08],
  [0.45, 0.08],
]
export const TAMPO_DA_VITRINE = 0.764
export function FosseisDoMuseu() {
  const save = useEstado((s) => s.salvamento)
  const visiting = useEstado((s) => s.visita !== null)
  if (visiting) return null
  return (
    <Suspense fallback={null}>
      {moradaMuseumExhibits(save).map(({ id, index, pieceId }) => {
        const piece = MORADA_CATALOG.pieces[pieceId]!
        // A miniatura cabe na sua célula e apoia no tampo, inclusive com origem autoral assimétrica.
        const scale = Math.min(0.22 / piece.size[0], 0.22 / piece.size[1], 0.14 / piece.size[2])
        const place = LUGARES_NA_VITRINE[index]!
        return (
          <group
            key={id}
            name={`museu-${id}`}
            position={[place[0], TAMPO_DA_VITRINE, place[1]]}
            scale={scale}
          >
            <MoradaPieceView
              instance={{
                id: `colecao-${id}`,
                pieceId,
                position: [
                  -(piece.min[0] + piece.max[0]) / 2,
                  -piece.min[1],
                  -(piece.min[2] + piece.max[2]) / 2,
                ],
                rotation: 0,
              }}
            />
          </group>
        )
      })}
    </Suspense>
  )
}
