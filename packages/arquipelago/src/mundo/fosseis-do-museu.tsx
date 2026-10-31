import { FOSSEIS_DO_VALE } from '@sistemazero/arquipelago-contracts'
import { useMemo } from 'react'
import propsGlb from '../assets/ilhas/vale-dos-dinos-props.glb'
import { useEstado } from '../estado/contexto'
import { fosseisAchados } from '../sistemas/fosseis'
import { ComReserva, copiarNo, useModelo } from './modelos'

const URL_DOS_PROPS = new URL(propsGlb, import.meta.url).href

/**
 * Os fósseis achados no Vale em cima da vitrine do museu de casa (B4): seis lugares em duas
 * fileiras, na ordem em que a areia os mostra. A vitrine do `museu.glb` vai de x 0,57 a 1,43 e de z
 * -0,64 a -0,16, com o tampo a 0,83 (as três versões da galeria têm a mesma caixa).
 */
export const LUGARES_NA_VITRINE: readonly [number, number][] = [
  [0.72, -0.52],
  [1.0, -0.52],
  [1.28, -0.52],
  [0.72, -0.28],
  [1.0, -0.28],
  [1.28, -0.28],
]
export const TAMPO_DA_VITRINE = 0.83
/** O maior fóssil mede 0,6 m: na vitrine fica com uns 21 cm. */
export const ESCALA_NA_VITRINE = 0.35

export function FosseisDoMuseu() {
  // Na casa de outra pessoa, os fósseis seriam os de quem visita.
  const achados = useEstado((s) => (s.visita ? '' : fosseisAchados(s.salvamento).join(',')))
  if (!achados) return null
  return (
    <ComReserva reserva={null}>
      <FosseisCarregados ids={achados.split(',')} />
    </ComReserva>
  )
}

function FosseisCarregados({ ids }: { ids: string[] }) {
  const raiz = useModelo(URL_DOS_PROPS)
  const copias = useMemo(
    () =>
      FOSSEIS_DO_VALE.flatMap((id, i) =>
        ids.includes(id) ? [{ id, no: copiarNo(raiz, id), lugar: LUGARES_NA_VITRINE[i] }] : [],
      ),
    [raiz, ids],
  )
  return (
    <>
      {copias.map(({ id, no, lugar }) => (
        <group
          key={id}
          name={`museu-${id}`}
          position={[lugar?.[0] ?? 1, TAMPO_DA_VITRINE, lugar?.[1] ?? -0.4]}
          scale={ESCALA_NA_VITRINE}
        >
          <primitive object={no} dispose={null} />
        </group>
      ))}
    </>
  )
}
