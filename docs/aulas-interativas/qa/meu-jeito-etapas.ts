/** Etapas editoriais derivadas do jogo original, sem alterar suas regras. */
import { createRequire } from 'node:module'
import { registerExtensionBlocks } from '../../../packages/studio/src/blockly/blocks'
import { buildIRFromWorkspace } from '../../../packages/studio/src/blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../packages/studio/src/blockly/setup'
import { createEmptyProject } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { gameTwoDBlocks } from '../../../packages/studio/src/official-extensions/game-2d/blocks'
import { artesReferencia } from '../recursos/meu-jeito/artes-referencia'
import { courseProjects } from './meu-jeito-projetos-qa'

// Blockly pertence ao pacote studio, não às dependências da raiz do monorepo.
const studioRequire = createRequire(
  new URL('../../../packages/studio/package.json', import.meta.url),
)
const Blockly = studioRequire('blockly/core')
studioRequire('blockly/blocks')

export const ORDEM_MEU_JEITO = Array.from(
  { length: 8 },
  (_, i) => `aula-${String(i + 1).padStart(2, '0')}`,
)

export function etapasMeuJeito() {
  const original = courseProjects()
  return Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [i + 1, structuredClone(original[i < 5 ? 1 : i + 1]!)]),
  ) as ReturnType<typeof courseProjects>
}

export function projetoMeuJeito(etapa: number) {
  if (typeof document === 'undefined') {
    studioRequire('@happy-dom/global-registrator').GlobalRegistrator.register({
      settings: { disableIframePageLoading: true },
    })
  }
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  const state = etapasMeuJeito()[etapa]
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
        record.id = `meu-jeito-ref-${sequence++}`
      Object.values(record).forEach(identify)
    }
    identify(loadState)
    Blockly.serialization.workspaces.load(loadState, workspace)
    const ir = buildIRFromWorkspace(workspace)
    return {
      ...createEmptyProject(`manifest-meu-jeito-etapa-${etapa}`, 'O Jogo do Meu Jeito'),
      createdAt: 0,
      updatedAt: 0,
      ir,
      assets: etapa >= 6 ? artesReferencia() : [],
      blocksState: state.blocksState,
      files: generateProjectFiles({ ir, projectName: 'O Jogo do Meu Jeito' }),
      installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
    }
  } finally {
    workspace.dispose()
  }
}
