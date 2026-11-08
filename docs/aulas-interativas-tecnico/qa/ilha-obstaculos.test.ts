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
import { montarProjetoIlha } from './ilha-do-farol-projeto'

const root = resolve(import.meta.dirname, '../../..')
const modelos = JSON.parse(
  readFileSync(resolve(root, 'docs/design/ilha-do-farol-blender/modelos.json'), 'utf8'),
) as Record<string, { sha: string; center: number[]; size: number }>
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))

/** Lê os números realmente usados no projeto, inclusive seu tamanho didático. */
function configuracao(objeto: string) {
  const nodes: Record<string, any>[] = []
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    nodes.push(v as Record<string, any>)
    for (const child of Object.values(v)) visit(child)
  }
  visit(montarProjetoIlha('inicio').ir)
  const created = nodes.find((n) => n.type === 'g3d:createModelFile' && n.varName === objeto)!
  const placed = nodes.find((n) => n.type === 'g3d:setPosition' && n.objVar === objeto)!
  return { size: created.size.value, x: placed.x.value, z: placed.z.value }
}

/** Os sólidos publicados, centralizados e escalados como no carregador real do Estúdio. */
async function solidos(id: string, objeto: string) {
  const s = readFileSync(
    resolve(root, `packages/studio/src/core/course-models/m-${modelos[id]!.sha}.generated.ts`),
    'utf8',
  )
  const doc = await io.readBinary(Buffer.from(s.match(/base64,([A-Za-z0-9+/=]+)/)![1]!, 'base64'))
  const config = configuracao(objeto)
  const model = modelos[id]!
  const scale = config.size / model.size
  return doc
    .getRoot()
    .listNodes()
    .filter((n: Node) => n.getMesh() && !(n.getExtras() as { szSemCaixa?: boolean }).szSemCaixa)
    .map((n: Node) => {
      const { min, max } = getBounds(n)
      // `+ 0` tira o -0 do arredondamento.
      const r = (v: number) => +v.toFixed(1) + 0
      return {
        minX: r((min[0]! - model.center[0]!) * scale + config.x),
        maxX: r((max[0]! - model.center[0]!) * scale + config.x),
        minZ: r((min[2]! - model.center[2]!) * scale + config.z),
        maxZ: r((max[2]! - model.center[2]!) * scale + config.z),
      }
    })
}

describe('os obstáculos da Ilha', () => {
  test('são os pedaços sólidos da pedra e dos coqueiros publicados', async () => {
    const pedra = await solidos('pedras', 'pedra')
    const coqueiros = await solidos('cenario-praia-tropical', 'cenario')
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
    expect(dentro(-6.5, 0.8)).toBe(true)
    expect(dentro(-1, 1.6)).toBe(true)
    expect(dentro(0.6, 0.75)).toBe(true)
    // Atrás da pedra (o esconderijo do começo do curso) e no canto da chave da parte 2.
    expect(dentro(-2, -3.6)).toBe(true)
    expect(dentro(-3.75, -2.25)).toBe(true)
    // Sem obstáculos, o recorte devolve as áreas como estão.
    expect(recortarObstaculos(ILHA_AREAS, [])).toEqual(ILHA_AREAS)
  })
})
