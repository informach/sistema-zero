import type * as Blockly from 'blockly/core'
import { isProjectAreaType } from './blockContracts'

const DRAFT_WARNING_ID = 'sz-project-draft'
export const DRAFT_WARNING_TEXT =
  'Rascunho — esta pilha está salva, mas só funciona quando for colocada em uma Área do projeto.'

type DraftBlock = Blockly.Block & {
  getSvgRoot?: () => SVGGElement
}

const previousDraftIds = new WeakMap<Blockly.Workspace, Set<string>>()

/**
 * Pilhas executáveis soltas são rascunhos. Blocos de valor continuam livres na
 * bancada porque a criança pode estar montando uma expressão antes de encaixá-la.
 */
export function findDraftStacks(workspace: Blockly.Workspace): Blockly.Block[] {
  return workspace
    .getTopBlocks(true)
    .filter((block) => !block.isInsertionMarker())
    .filter((block) => !isProjectAreaType(block.type))
    .filter((block) => block.outputConnection == null)
}

/** Aplica o aviso sem apagar outros diagnósticos presos ao mesmo bloco. */
export function applyDraftDiagnostics(workspace: Blockly.Workspace): string[] {
  const drafts = findDraftStacks(workspace)
  const draftIds = new Set(drafts.map((block) => block.id))
  const changedIds = new Set([...(previousDraftIds.get(workspace) ?? []), ...draftIds])

  // Só raízes que eram ou viraram rascunho podem mudar de aparência. Varreduras
  // de todos os milhares de blocos a cada gesto tornavam a bancada progressivamente
  // mais lenta em projetos grandes.
  for (const blockId of changedIds) {
    const block = workspace.getBlockById(blockId) as DraftBlock | null
    if (!block) continue
    const isDraft = draftIds.has(block.id)
    block.setWarningText(isDraft ? DRAFT_WARNING_TEXT : null, DRAFT_WARNING_ID)
    block.getSvgRoot?.().classList.toggle('sz-draft-block', isDraft)
  }

  previousDraftIds.set(workspace, draftIds)

  return drafts.map((block) => block.id)
}
