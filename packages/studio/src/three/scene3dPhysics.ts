import type { CenaNoThree } from '@sistemazero/molda-cenarios-motor/runtime'
import { Vector3 } from 'three'

interface Ponto {
  x: number
  y: number
  z: number
}

/** Borrowed collision queries; the installed scene retains ownership of its BVH. */
export interface FisicaDaCena3D {
  active(): boolean
  resolve(
    feet: Ponto,
    height: number,
    radius: number,
  ): {
    position: Ponto
    normals: readonly Ponto[]
  }
  raycast(from: Ponto, to: Ponto): { distance: number; normal: Ponto } | null
}

export function criarFisicaDaCena3D(
  cena: Pick<CenaNoThree, 'colisoes'>,
  active: () => boolean,
): FisicaDaCena3D {
  const ponto = new Vector3(),
    destino = new Vector3()
  return {
    active,
    resolve(feet, height, radius) {
      if (!active()) throw Error('O cenário físico foi descarregado.')
      const contato = cena.colisoes.resolver(ponto.set(feet.x, feet.y, feet.z), height, radius)
      return { position: contato.posicao, normals: contato.normais }
    },
    raycast(from, to) {
      if (!active()) throw Error('O cenário físico foi descarregado.')
      const contato = cena.colisoes.rastrear(
        ponto.set(from.x, from.y, from.z),
        destino.set(to.x, to.y, to.z),
      )
      return contato
        ? {
            distance: contato.distancia,
            normal: { x: contato.normal.x, y: contato.normal.y, z: contato.normal.z },
          }
        : null
    },
  }
}
