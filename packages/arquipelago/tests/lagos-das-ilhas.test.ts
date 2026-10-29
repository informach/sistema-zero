import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, DoubleSide, type Mesh, type Object3D, Raycaster, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TOPO_DO_BOSQUE } from '../src/mundo/bosque'
import { TAMPO } from './ajuda-colisores'

/**
 * Os lagos de nadar têm fundo na colisão (`cavar_bacia` em `arte/ilhas/lib_ilhas.py`): fundos no
 * meio, com rampa que dá para subir até a beira. Mede o `col-terreno` com raios de cima para baixo.
 * O jogo lê o nó `agua` (uma malha só: a elipse e a altura da superfície).
 */
const LAGOS = [
  // `bosque.py`: `FUNDO_DO_LAGO`; a bacia acaba em 1,25 raio (debaixo da areia molhada).
  { ilha: 'Bosque', arquivo: 'bosque.glb', topo: TOPO_DO_BOSQUE, fim: 1.25 },
  // `recife.py`: `FUNDO_DA_LAGOA`; a bacia acaba em 1,08 raio, antes dos corais grandes.
  { ilha: 'Recife', arquivo: 'recife.glb', topo: TAMPO, fim: 1.08 },
] as const
/** As duas bacias têm a mesma fundura. */
const FUNDO = 0.85
/** O personagem sobe rampa de até 52°; a bacia fica abaixo disso. */
const RAMPA_MAXIMA = (50 * Math.PI) / 180

for (const lago of LAGOS) {
  let raiz: Object3D
  let chao: Mesh
  let meio: { x: number; z: number }
  let raios: { x: number; z: number }
  let superficie: number
  const raio = new Raycaster()

  /** A altura do chão de colisão em (x, z) do modelo. */
  function alturaEm(x: number, z: number): number {
    raio.set(new Vector3(x, lago.topo + 5, z), new Vector3(0, -1, 0))
    const [h] = raio.intersectObject(chao, false)
    if (!h) throw new Error(`sem chão em ${x}, ${z}`)
    return h.point.y
  }

  beforeAll(async () => {
    const buf = readFileSync(join(import.meta.dir, '..', 'src', 'assets', 'ilhas', lago.arquivo))
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    raiz = (await new GLTFLoader().parseAsync(ab, '')).scene
    raiz.updateMatrixWorld(true)
    chao = raiz.getObjectByName('col-terreno') as Mesh
    ;(Array.isArray(chao.material) ? chao.material : [chao.material]).forEach((m) => {
      m.side = DoubleSide
    })
    const agua = raiz.getObjectByName('agua') as Object3D
    const caixa = new Box3().setFromObject(agua)
    meio = { x: (caixa.min.x + caixa.max.x) / 2, z: (caixa.min.z + caixa.max.z) / 2 }
    raios = { x: (caixa.max.x - caixa.min.x) / 2, z: (caixa.max.z - caixa.min.z) / 2 }
    superficie = caixa.max.y
  })

  describe(`o lago do ${lago.ilha}`, () => {
    test('a água é uma malha só (o jogo lê a elipse e a altura dela)', () => {
      expect((raiz.getObjectByName('agua') as Mesh).isMesh).toBe(true)
    })

    test('é fundo no meio: a cintura da criança passa da linha da água', () => {
      expect(alturaEm(meio.x, meio.z)).toBeCloseTo(lago.topo - FUNDO, 1)
      // Em pé no fundo, a cintura (0,55 acima dos pés) fica bem abaixo da superfície: nada.
      expect(lago.topo - FUNDO + 0.55).toBeLessThan(superficie - 0.2)
    })

    test('fora da beira o chão é o tampo de sempre', () => {
      for (const [dx, dz] of [
        [lago.fim + 0.1, 0],
        [-(lago.fim + 0.1), 0],
        [0, lago.fim + 0.1],
        [0, -(lago.fim + 0.1)],
      ] as const) {
        expect(alturaEm(meio.x + dx * raios.x, meio.z + dz * raios.z)).toBeCloseTo(lago.topo, 2)
      }
    })

    test('a rampa dá para subir em todas as direções (nenhum trecho passa de 50°)', () => {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2
        let antes = alturaEm(meio.x, meio.z)
        let px = meio.x
        let pz = meio.z
        for (let i = 1; i <= 30; i++) {
          const t = (i / 30) * (lago.fim + 0.1)
          const x = meio.x + Math.cos(a) * raios.x * t
          const z = meio.z + Math.sin(a) * raios.z * t
          const y = alturaEm(x, z)
          const subida = Math.atan2(Math.abs(y - antes), Math.hypot(x - px, z - pz))
          expect(subida).toBeLessThan(RAMPA_MAXIMA)
          antes = y
          px = x
          pz = z
        }
      }
    })
  })
}
