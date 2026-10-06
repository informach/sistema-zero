/** Etapas editoriais derivadas do jogo original, sem alterar suas regras. */
import { createRequire } from 'node:module'
import { registerExtensionBlocks } from '../../../packages/studio/src/blockly/blocks'
import { buildIRFromWorkspace } from '../../../packages/studio/src/blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../packages/studio/src/blockly/setup'
import { createEmptyProject } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { gameTwoDBlocks } from '../../../packages/studio/src/official-extensions/game-2d/blocks'
import { type Block, courseProjects } from './nave-contra-asteroides-projetos-qa'

// Blockly pertence ao pacote studio, não às dependências da raiz do monorepo.
const studioRequire = createRequire(
  new URL('../../../packages/studio/package.json', import.meta.url),
)
const Blockly = studioRequire('blockly/core')
studioRequire('blockly/blocks')

export const ORDEM_NAVE = [
  'primeira-nave',
  'dia-1',
  'dia-2',
  'chuva-de-asteroides',
  'dia-3',
  'pontos',
  'dia-4',
  'comecar-partida',
  'dia-5',
] as const

/** Remove uma instrução ligando a anterior à seguinte, inclusive dentro de entradas. */
function remove(roots: Block[], predicate: (block: Block) => boolean) {
  const visit = (block: Block | undefined): Block | undefined => {
    if (!block) return undefined
    const next = visit(block.next?.block)
    if (predicate(block)) return next
    if (next) block.next = { block: next }
    else delete block.next
    for (const input of Object.values(block.inputs ?? {})) {
      if (input.block) {
        const child = visit(input.block)
        if (child) input.block = child
        else delete input.block
      }
    }
    return block
  }
  return roots.map(visit).filter((b): b is Block => !!b)
}

export function etapasNave() {
  const original = courseProjects()
  const copy = (n: number) => structuredClone(original[n]!)
  const primeira = copy(1)
  primeira.blocksState.blocks.blocks = remove(primeira.blocksState.blocks.blocks, (b) =>
    ['sz_g2d_clear', 'sz_g2d_starfield', 'sz_g2d_arrows_x', 'sz_g2d_clamp_to_screen'].includes(
      b.type,
    ),
  )
  const chuva = copy(3)
  chuva.blocksState.blocks.blocks = remove(
    chuva.blocksState.blocks.blocks,
    (b) => b.type === 'sz_g2d_on_group_overlap',
  )
  const pontos = copy(4)
  pontos.blocksState.blocks.blocks = remove(pontos.blocksState.blocks.blocks, (b) =>
    ['sz_g2d_set_health', 'sz_g2d_on_sprite_group_overlap', 'sz_g2d_draw_sprite_health'].includes(
      b.type,
    ),
  )
  const inicio = copy(5)
  inicio.blocksState.blocks.blocks = remove(inicio.blocksState.blocks.blocks, (b) => {
    if (b.type === 'sz_js_const_create') return true
    if (b.type !== 'sz_js_if_else') return false
    const condition = b.inputs?.COND?.block
    if (condition?.type === 'sz_val_compare' || condition?.type === 'sz_g2d_health_depleted')
      return true
    const state = condition?.fields?.SCENE
    if (state === 'jogando' && b.extraState) {
      for (const i of [1, 2]) {
        delete b.inputs![`ELSEIF_COND${i}`]
        delete b.inputs![`ELSEIF_THEN${i}`]
      }
      b.extraState = { elseIf: 1, hasElse: false }
    }
    if (state === 'inicio') {
      for (const i of [0, 1]) {
        delete b.inputs![`ELSEIF_COND${i}`]
        delete b.inputs![`ELSEIF_THEN${i}`]
      }
      delete b.extraState
    }
    return false
  })
  return [
    { blocksState: { blocks: { languageVersion: 0, blocks: [] as Block[] } } },
    primeira,
    copy(1),
    copy(2),
    chuva,
    copy(3),
    pontos,
    copy(4),
    inicio,
    copy(5),
  ]
}

export function projetoNave(etapa: number) {
  if (typeof document === 'undefined') {
    studioRequire('@happy-dom/global-registrator').GlobalRegistrator.register({
      settings: { disableIframePageLoading: true },
    })
  }
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  const state = etapasNave()[etapa]
  if (!state) throw new Error(`Etapa inexistente: ${etapa}`)
  const workspace = new Blockly.Workspace()
  try {
    // IDs de autoria estáveis evitam que cada geração mude IR e chaves dos eventos.
    // A cópia canônica de blocksState continua exatamente igual ao programa original.
    const loadState = structuredClone(state.blocksState)
    let sequence = 0
    const identify = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      if (Array.isArray(value)) {
        value.forEach(identify)
        return
      }
      const record = value as Record<string, unknown>
      if (typeof record.type === 'string' && record.type.startsWith('sz_'))
        record.id = `nave-ref-${sequence++}`
      Object.values(record).forEach(identify)
    }
    identify(loadState)
    Blockly.serialization.workspaces.load(loadState, workspace)
    const ir = buildIRFromWorkspace(workspace)
    return {
      ...createEmptyProject(`manifest-nave-etapa-${etapa}`, 'Nave contra Asteroides'),
      createdAt: 0,
      updatedAt: 0,
      ir,
      blocksState: state.blocksState,
      files: generateProjectFiles({ ir, projectName: 'Nave contra Asteroides' }),
      installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
    }
  } finally {
    workspace.dispose()
  }
}
