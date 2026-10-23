/** Etapas editoriais derivadas do jogo original, sem alterar suas regras. */
import { createRequire } from 'node:module'
import { registerExtensionBlocks } from '../../../packages/studio/src/blockly/blocks'
import { buildIRFromWorkspace } from '../../../packages/studio/src/blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../packages/studio/src/blockly/setup'
import { createEmptyProject } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { gameTwoDBlocks } from '../../../packages/studio/src/official-extensions/game-2d/blocks'
import { type Block, courseProjects } from './corre-dino-projetos-qa'

// Blockly pertence ao pacote studio, não às dependências da raiz do monorepo.
const studioRequire = createRequire(
  new URL('../../../packages/studio/package.json', import.meta.url),
)
const Blockly = studioRequire('blockly/core')
studioRequire('blockly/blocks')

export const ORDEM_DINO = Array.from(
  { length: 13 },
  (_, i) => `aula-${String(i + 1).padStart(2, '0')}`,
)

export function etapasDino() {
  return [
    { blocksState: { blocks: { languageVersion: 0, blocks: [] as Block[] } } },
    ...Object.values(courseProjects()),
  ] as { blocksState: { blocks: { languageVersion: number; blocks: Block[] } } }[]
}

export function projetoDino(etapa: number) {
  if (typeof document === 'undefined') {
    studioRequire('@happy-dom/global-registrator').GlobalRegistrator.register({
      settings: { disableIframePageLoading: true },
    })
  }
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  const state = etapasDino()[etapa]
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
        record.id = `dino-ref-${sequence++}`
      Object.values(record).forEach(identify)
    }
    identify(loadState)
    Blockly.serialization.workspaces.load(loadState, workspace)
    const ir = buildIRFromWorkspace(workspace)
    return {
      ...createEmptyProject(`manifest-dino-etapa-${etapa}`, 'Corre, Dino!'),
      createdAt: 0,
      updatedAt: 0,
      ir,
      blocksState: state.blocksState,
      files: generateProjectFiles({ ir, projectName: 'Corre, Dino!' }),
      installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
    }
  } finally {
    workspace.dispose()
  }
}
