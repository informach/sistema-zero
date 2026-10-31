import { nivelDaFlorada } from '@sistemazero/arquipelago-contracts'
import { useMemo } from 'react'
import floradaGlb from '../assets/mundo/florada.glb'
import { useEstado } from '../estado/contexto'
import { ComReserva, copiarNo, useModelo } from './modelos'

const URL_DA_FLORADA = new URL(floradaGlb, import.meta.url).href
export const PONTOS_DA_FLORADA = 24

/**
 * A sua ilha que floresce (B6; a proposta: "fazer a ilha florescer"). Cada flor colhida no jardim
 * do céu vai para a `florada`; com 1, 6 e 15 flores a ilha passa aos níveis 1, 2 e 3 do
 * `florada.glb`, uma cópia do nível em cada um dos 24 `ponto-florada-N` do gramado (em
 * coordenadas do mundo, miúdas, sem colisão). Na visita, a ilha é a de outra pessoa: nada aparece.
 */
export function FloradaDaIlha() {
  const nivel = useEstado((s) => (s.visita ? 0 : nivelDaFlorada(s.salvamento.florada)))
  if (nivel === 0) return null
  return (
    <ComReserva reserva={null}>
      <FloradaNoNivel nivel={nivel} />
    </ComReserva>
  )
}

function FloradaNoNivel({ nivel }: { nivel: number }) {
  const raiz = useModelo(URL_DA_FLORADA)
  const copias = useMemo(
    () =>
      Array.from({ length: PONTOS_DA_FLORADA }, (_, i) => {
        const ponto = raiz.getObjectByName(`ponto-florada-${i + 1}`)
        return ponto
          ? { i, no: copiarNo(raiz, `florada-${nivel}`), p: ponto.position, giro: i * 2.3 }
          : null
      }).filter((c) => c !== null),
    [raiz, nivel],
  )
  return (
    <group name="florada-da-ilha">
      {copias.map(({ i, no, p, giro }) => (
        <group key={i} position={[p.x, p.y, p.z]} rotation-y={giro}>
          <primitive object={no} dispose={null} />
        </group>
      ))}
    </group>
  )
}
