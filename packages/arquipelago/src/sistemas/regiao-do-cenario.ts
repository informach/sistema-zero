import { Plane, Vector3 } from 'three'
import { ARQUIPELAGO, ilhaDoArquipelago, type TerritorioId } from './geografia-do-arquipelago'

/** Limites entre os centros já aprovados; não altera costa, relevo, tamanho ou localização.
 * A mesma região seleciona as partes do pacote e seus metadados em coordenadas globais. */
export function regiaoDoCenario(id: TerritorioId) {
  const ilha = ilhaDoArquipelago(id)
  const planos = ARQUIPELAGO.filter((i) => i.id !== id).map((vizinha) => {
    const normal = new Vector3(
      ilha.centro.x - vizinha.centro.x,
      0,
      ilha.centro.z - vizinha.centro.z,
    ).normalize()
    const meio = new Vector3(
      (ilha.centro.x + vizinha.centro.x) / 2,
      0,
      (ilha.centro.z + vizinha.centro.z) / 2,
    )
    return new Plane(normal, -normal.dot(meio))
  })
  function contem(x: number, z: number) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false
    return planos.every((p) => p.normal.x * x + p.normal.z * z + p.constant >= -1e-6)
  }
  function volume(caixa: {
    min: { x: number; z: number }
    max: { x: number; z: number }
  }): 'dentro' | 'fora' | 'cruza' {
    if (caixa.min.x > caixa.max.x || caixa.min.z > caixa.max.z) return 'fora'
    if (![caixa.min.x, caixa.min.z, caixa.max.x, caixa.max.z].every(Number.isFinite))
      throw Error('Os limites da região do cenário são inválidos.')
    let cruza = false
    for (const plano of planos) {
      const n = plano.normal
      const minimo =
        n.x * (n.x >= 0 ? caixa.min.x : caixa.max.x) +
        n.z * (n.z >= 0 ? caixa.min.z : caixa.max.z) +
        plano.constant
      const maximo =
        n.x * (n.x >= 0 ? caixa.max.x : caixa.min.x) +
        n.z * (n.z >= 0 ? caixa.max.z : caixa.min.z) +
        plano.constant
      if (maximo < -1e-6) return 'fora'
      if (minimo < -1e-6) cruza = true
    }
    return cruza ? 'cruza' : 'dentro'
  }
  return { ilha: structuredClone(ilha), planos, contem, volume }
}
export type RegiaoDoCenario = ReturnType<typeof regiaoDoCenario>
