/**
 * Os obstáculos que o robô do executor contorna (`ILHA_OBSTACULOS`) são os pedaços sólidos dos
 * modelos publicados: os quatro blocos da pedra e os troncos dos coqueiros da praia tropical. Se o
 * Blender mudar uma forma, este teste avisa antes de o robô empacar num lugar que não conhece.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getBounds, Logger, type Node, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import {
  ILHA_AREAS,
  ILHA_CAMINHOS,
  ILHA_OBSTACULOS,
  recortarObstaculos,
} from './ilha-do-farol-observacao'

const root = resolve(import.meta.dirname, '../../..')
const modelos = JSON.parse(
  readFileSync(resolve(root, 'docs/design/ilha-do-farol-blender/modelos.json'), 'utf8'),
) as Record<string, { sha: string }>
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))

/** Os pedaços sólidos (nós com malha e sem `szSemCaixa`), no chão do jogo, deslocados de `onde`. */
async function solidos(id: string, onde: [number, number]) {
  const s = readFileSync(
    resolve(root, `packages/studio/src/core/course-models/m-${modelos[id]!.sha}.generated.ts`),
    'utf8',
  )
  const doc = await io.readBinary(Buffer.from(s.match(/base64,([A-Za-z0-9+/=]+)/)![1]!, 'base64'))
  return doc
    .getRoot()
    .listNodes()
    .filter((n: Node) => n.getMesh() && !(n.getExtras() as { szSemCaixa?: boolean }).szSemCaixa)
    .map((n: Node) => {
      const { min, max } = getBounds(n)
      // `+ 0` tira o -0 do arredondamento.
      const r = (v: number) => +v.toFixed(1) + 0
      return {
        minX: r(min[0]! + onde[0]),
        maxX: r(max[0]! + onde[0]),
        minZ: r(min[2]! + onde[1]),
        maxZ: r(max[2]! + onde[1]),
      }
    })
}

describe('os obstáculos da Ilha', () => {
  test('são os pedaços sólidos da pedra e dos coqueiros publicados', async () => {
    // A pedra fica em (-2, -1) no jogo (o centro da caixa vai para lá, e a caixa do arquivo é a do
    // Blender: o deslocamento é o mesmo). O cenário fica na origem.
    const pedra = await solidos('pedras', [-2, -1])
    const coqueiros = await solidos('cenario-praia-tropical', [0, 0])
    expect(pedra).toHaveLength(4)
    expect(coqueiros).toHaveLength(2)
    expect([...pedra, ...coqueiros]).toEqual(ILHA_OBSTACULOS)
  })

  test('o caminho do robô não passa por dentro de nenhum obstáculo, e a chave escondida fica ao alcance', () => {
    const dentro = (x: number, z: number) =>
      ILHA_CAMINHOS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ)
    for (const o of ILHA_OBSTACULOS)
      expect(dentro((o.minX + o.maxX) / 2, (o.minZ + o.maxZ) / 2)).toBe(false)
    // O começo, a trilha na frente da pedra e a entrada do cais continuam livres.
    expect(dentro(-6.5, 0.75)).toBe(true)
    expect(dentro(-1, 1.6)).toBe(true)
    expect(dentro(0.6, 0.75)).toBe(true)
    // Atrás da pedra (o esconderijo do começo do curso) e no canto da chave da parte 2.
    expect(dentro(-2, -3.6)).toBe(true)
    expect(dentro(-3.75, -2.25)).toBe(true)
    // Sem obstáculos, o recorte devolve as áreas como estão.
    expect(recortarObstaculos(ILHA_AREAS, [])).toEqual(ILHA_AREAS)
  })
})
