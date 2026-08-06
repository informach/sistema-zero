import { describe, expect, it } from 'bun:test'
import { FULL_LEARNING_PROFILE } from '../core/levels'
import { gameTwoDToolboxCategory } from '../official-extensions/game-2d/blocks'
import { gameKitToolboxCategory } from '../official-extensions/game-2d-advanced/blocks'
import { gameThreeDToolboxCategory } from '../official-extensions/game-3d/blocks'
import { gameKit3DToolboxCategory } from '../official-extensions/game-3d-advanced/blocks'
import { world3DToolboxCategory } from '../official-extensions/world-3d/blocks'
import { SERVER_BLOCK_CATALOG } from './blockCatalog'
import { PALETTE_PATH_BY_TYPE } from './paletteMap'
import { buildCoreToolbox } from './toolbox'

interface Node {
  kind?: string
  name?: string
  type?: string
  custom?: string
  contents?: Node[]
}

/** Caminho real de cada bloco na árvore que a criança vê. */
function walkToolbox(nodes: Node[], trail: string[], out: Map<string, string[]>): void {
  for (const node of nodes) {
    if (node.kind === 'block' && node.type) {
      if (!out.has(node.type)) out.set(node.type, trail)
      continue
    }
    if (node.kind === 'category' && node.name) {
      walkToolbox(node.contents ?? [], [...trail, node.name], out)
    }
  }
}

const toolbox = buildCoreToolbox(
  [
    gameTwoDToolboxCategory,
    gameKitToolboxCategory,
    gameThreeDToolboxCategory,
    gameKit3DToolboxCategory,
    world3DToolboxCategory,
  ] as never,
  FULL_LEARNING_PROFILE,
)
const real = new Map<string, string[]>()
walkToolbox(toolbox.contents as Node[], [], real)

describe('paletteMap × paleta real', () => {
  it('todo bloco da paleta tem o MESMO caminho no mapa', () => {
    // Este é o freio contra deriva: um `pushSub` novo no toolbox.ts sem entrada
    // aqui volta a fazer o Zappy mandar a criança ao lugar errado, em silêncio.
    const divergentes: string[] = []
    for (const [type, caminho] of real) {
      const mapeado = PALETTE_PATH_BY_TYPE.get(type)
      if (!mapeado || mapeado.join(' › ') !== caminho.join(' › ')) {
        divergentes.push(
          `${type}: paleta="${caminho.join(' › ')}" mapa="${mapeado?.join(' › ') ?? '(ausente)'}"`,
        )
      }
    }
    expect(divergentes).toEqual([])
  })

  it('a paleta e o mapa cobrem o mesmo conjunto de blocos', () => {
    // 🧩 Funções e 🏛️ Classes são flyouts DINÂMICOS (`custom:`): não têm conteúdo
    // estático para andar, então o mapa conhece blocos que a árvore não mostra.
    const dinamicas = new Set(
      [...PALETTE_PATH_BY_TYPE.entries()]
        .filter(([, caminho]) => caminho[1] === '🧩 Funções' || caminho[1] === '🏛️ Classes')
        .map(([type]) => type),
    )
    const soNoMapa = [...PALETTE_PATH_BY_TYPE.keys()].filter(
      (type) => !real.has(type) && !dinamicas.has(type),
    )
    expect(soNoMapa).toEqual([])
  })

  it('todo bloco do catálogo do Zappy sabe onde mora', () => {
    const semCaminho = SERVER_BLOCK_CATALOG.filter((entry) => entry.palettePath.length === 0)
    expect(semCaminho.map((entry) => entry.type)).toEqual([])
  })

  it('as subcategorias do núcleo que a criança vê chegam ao catálogo', () => {
    // O caso concreto da queixa: "Programação › Programação" era o que saía.
    const byType = new Map(SERVER_BLOCK_CATALOG.map((entry) => [entry.type, entry]))
    const variavel = byType.get('sz_js_var_declare')
    expect(variavel?.palettePath).toEqual(['Programação', '🏷️ Variáveis'])
    // E as 6 subcategorias que o `category` promovia a categoria de topo.
    for (const [type, esperado] of [
      ['sz_math_random_int', ['Programação', '🔢 Matemática']],
      ['sz_val_number', ['Programação', '🔣 Valores']],
    ] as const) {
      const entry = byType.get(type)
      if (entry) expect(entry.palettePath).toEqual([...esperado])
    }
  })

  it('nenhum caminho repete o nome do pai no filho', () => {
    const repetidos = [...PALETTE_PATH_BY_TYPE.entries()].filter(
      ([, caminho]) => caminho.length > 1 && caminho[0] === caminho[1],
    )
    expect(repetidos.map(([type]) => type)).toEqual([])
  })
})
