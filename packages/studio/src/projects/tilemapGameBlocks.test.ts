import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { generateProjectFiles } from '#generators'
import { behaviorStatements, type SZIRInput } from '#ir'
import { platformPhysicsScenario } from '../../../pinta/scripts/homologacao/platforms'
import { exportPintaScene } from '../../../pinta/src/export/scene'
import { registerExtensionBlocks } from '../blockly/blocks'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { cssSourceCompatible } from '../state/cssSourceCompatibility'
import { htmlSourceCompatible } from '../state/htmlSourceCompatibility'
import { assembleTilemapGameProject, type TilemapGamePayload } from './tilemapGame'

/**
 * A "divergência histórica de IR" do ciclo autenticado de 21/11 (RPC107: a IR mudou ao atualizar
 * o mapa, com arquivos e blocos iguais). O "Jogar meu mapa" grava a IR do gerador (formato 1, sem
 * ids); ao abrir, o editor deriva a IR dos blocos (formato 2, com o id de cada bloco e uma regra de
 * CSS por bloco) e a próxima gravação guarda essa. É metadado derivado, não programa: estes testes
 * provam que a conversão não perde nada do que o gerador escreveu e que converge numa volta.
 */
beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

const DATA = 'data:image/png;base64,AAAA'
const SHEET = { dataUrl: DATA, width: 32, height: 16 }

function fromBlocks(state: unknown) {
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as Record<string, unknown>, workspace)
    return buildIRFromWorkspace(workspace)
  } finally {
    workspace.dispose()
  }
}

/** O estado dos blocos sem os ids que a IR derivada passa a carregar. */
function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, item]) => [key, withoutIds(item)]),
  )
}

/** O id do "a cada quadro" vira a chave interna do laço no motor (`quadro:<id>`). */
function loopId(ir: SZIRInput): string {
  const loop = behaviorStatements(ir).find((statement) => statement.type === 'g2d:updateEachFrame')
  if (!loop?.__id) throw new Error('Laço do jogo sem id na IR derivada.')
  return loop.__id
}

async function cases(): Promise<[string, TilemapGamePayload][]> {
  const fixture = platformPhysicsScenario()
  const scene = await exportPintaScene(
    fixture.map,
    (id) => fixture.assets.find((asset) => asset.id === id) ?? null,
    async () => DATA,
  )
  return [
    [
      'mapa com plataforma e camada da frente',
      {
        name: 'minha-fase',
        dataUrl: DATA,
        width: 64,
        height: 48,
        tilemap: {
          tileSize: 16,
          cols: 4,
          rows: 3,
          grid: '0 1 1 0;. . 2 .;0 0 0 0',
          solid: [1],
          platform: [2],
          tileset: SHEET,
        },
        tilemapFront: {
          tileSize: 16,
          cols: 4,
          rows: 3,
          grid: '. . . .;. . . .;1 . . .',
          solid: [],
          tileset: SHEET,
        },
      },
    ],
    ['cenário completo (cena 3)', { name: 'vila', dataUrl: DATA, width: 64, height: 48, scene }],
  ]
}

describe('Jogar meu mapa: a IR derivada dos blocos não perde o programa do gerador', () => {
  it('os arquivos que os blocos geram são os do gerador, a menos da ordem do CSS e da chave do laço', async () => {
    for (const [label, payload] of await cases()) {
      const project = assembleTilemapGameProject(payload)
      if (!project?.ir) throw new Error(`${label}: projeto sem IR`)
      const derived = fromBlocks(project.blocksState)
      const saved = generateProjectFiles({ ir: project.ir, projectName: project.name })
      const regenerated = generateProjectFiles({ ir: derived, projectName: project.name })
      expect(Object.keys(regenerated).sort()).toEqual(Object.keys(saved).sort())
      expect(htmlSourceCompatible(saved['index.html'], regenerated['index.html'])).toBe(true)
      expect(cssSourceCompatible(saved['style.css'], regenerated['style.css'])).toBe(true)
      expect(
        regenerated['script.js'].replace(
          `}, ${JSON.stringify(loopId(derived))});`,
          '}, "quadroDoJogo");',
        ),
      ).toBe(saved['script.js'])
      // Os mesmos blocos: só passam a ter os ids que a IR derivada guarda.
      expect(withoutIds(buildWorkspaceStateFromIR(derived))).toEqual(
        withoutIds(project.blocksState),
      )
    }
  })

  it('a IR derivada converge numa volta: reabrir de novo não muda IR, blocos nem arquivos', async () => {
    for (const [label, payload] of await cases()) {
      const project = assembleTilemapGameProject(payload)
      if (!project) throw new Error(`${label}: projeto ausente`)
      const once = fromBlocks(project.blocksState)
      const blocks = buildWorkspaceStateFromIR(once)
      const twice = fromBlocks(blocks)
      expect(twice).toEqual(once)
      expect(buildWorkspaceStateFromIR(twice)).toEqual(blocks)
      expect(generateProjectFiles({ ir: twice, projectName: project.name })).toEqual(
        generateProjectFiles({ ir: once, projectName: project.name }),
      )
    }
  })
})
