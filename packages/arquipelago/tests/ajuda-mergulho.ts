import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { type Object3D, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { CORPO } from '../src/sistemas/corpo'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

const require = createRequire(import.meta.url)
export const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', { paths: [require.resolve('@react-three/rapier')] }),
)
export type P = { x: number; y: number; z: number }

/** Grade de conferência, fora do jogo. Consulta a cápsula real contra os colisores reais. */
export async function caminhoSubmerso(
  nome: 'navio' | 'labirinto',
  alvo: string,
  arquivo?: string,
): Promise<P[]> {
  await R.init()
  const cena = await carregarGlb(arquivo ?? arquivoDaIlha(`recife-${nome}.glb`))
  cena.updateMatrixWorld(true)
  const inicio = cena.getObjectByName('entrada')!.getWorldPosition(new Vector3())
  const fim = cena.getObjectByName(alvo)!.getWorldPosition(new Vector3())
  const world = mundoSubmerso(cena)
  try {
    const shape = new R.Capsule(CORPO.meiaAltura, CORPO.raio + CORPO.folga)
    const q = { x: 0, y: 0, z: 0, w: 1 }
    const passo = 0.25,
      nx = 97,
      nz = 81,
      ny = 9
    const ponto = (i: number): P => ({
      x: (i % nx) * passo - 12,
      y: Math.floor(i / (nx * nz)) * passo - 2.5,
      z: (Math.floor(i / nx) % nz) * passo - 10,
    })
    const indice = (p: P) =>
      Math.round((p.x + 12) / passo) +
      nx * Math.round((p.z + 10) / passo) +
      nx * nz * Math.round((p.y + 2.5) / passo)
    const livre = new Int8Array(nx * nz * ny)
    const cabe = (i: number) => {
      if (livre[i]) return livre[i] === 1
      let bate = false
      world.intersectionsWithShape(ponto(i), q, shape, () => {
        bate = true
        return false
      })
      livre[i] = bate ? -1 : 1
      return !bate
    }
    const primeiro = indice({ ...inicio, y: nome === 'labirinto' ? -2.25 : -2 })
    if (!cabe(primeiro)) throw new Error(`${nome}: entrada bloqueada para a cápsula`)
    const pais = new Int32Array(livre.length).fill(-1),
      fila = [primeiro]
    pais[primeiro] = primeiro
    for (let cursor = 0; cursor < fila.length; cursor++) {
      const i = fila[cursor]!,
        p = ponto(i)
      if (
        Math.hypot(p.x - fim.x, p.z - fim.z) < 1.0 &&
        Math.abs(p.y - fim.y - CORPO.doCentroAoPe) < 0.35
      ) {
        const caminho: P[] = []
        let j = i
        while (j !== primeiro) {
          caminho.push(ponto(j))
          j = pais[j]!
        }
        caminho.push(ponto(primeiro))
        return caminho.reverse()
      }
      const ix = i % nx,
        iz = Math.floor(i / nx) % nz,
        iy = Math.floor(i / (nx * nz))
      for (const [d, permitido] of [
        [1, ix < nx - 1],
        [-1, ix > 0],
        [nx, iz < nz - 1],
        [-nx, iz > 0],
        [nx * nz, iy < ny - 1],
        [-nx * nz, iy > 0],
      ] as const) {
        const j = i + d
        if (permitido && pais[j] === -1 && cabe(j)) {
          pais[j] = i
          fila.push(j)
        }
      }
    }
    throw new Error(`${nome}: não há caminho da entrada até ${alvo} para a cápsula`)
  } finally {
    world.free()
  }
}

export function mundoSubmerso(cena: Object3D) {
  const world = new R.World({ x: 0, y: 0, z: 0 })
  for (const c of lerColisores(cena)) {
    if (c.forma === 'malha') {
      world.createCollider(R.ColliderDesc.trimesh(c.vertices, c.indices))
      continue
    }
    const d =
      c.forma === 'caixa'
        ? R.ColliderDesc.cuboid(...c.meio)
        : R.ColliderDesc.cylinder(c.meiaAltura, c.raio)
    d.setTranslation(...c.posicao).setRotation({
      x: c.rotacao[0],
      y: c.rotacao[1],
      z: c.rotacao[2],
      w: c.rotacao[3],
    })
    world.createCollider(d)
  }
  world.step()
  return world
}
