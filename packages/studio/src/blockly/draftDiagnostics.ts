import type * as Blockly from 'blockly/core'
import { isProjectAreaType } from './blockContracts'

const DRAFT_WARNING_ID = 'sz-project-draft'
const DRAFT_CLASS = 'sz-draft-block'
export const DRAFT_WARNING_TEXT =
  'Rascunho — esta pilha está salva, mas só funciona quando for colocada em uma Área do projeto.'

type DraftBlock = Blockly.Block & {
  getSvgRoot?: () => SVGGElement
}

/** Só o `getCanvas` interessa aqui, e ele só existe no workspace COM tela. */
type DraftWorkspace = Blockly.Workspace & {
  getCanvas?: () => SVGGElement
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

/**
 * Quem HOJE carrega a marca, lido do PRÓPRIO canvas (o Blockly escreve o id do
 * bloco em `data-id`).
 *
 * ⚠️ O conjunto em memória (`previousDraftIds`) é só um atalho para não varrer
 * todos os blocos, e ele DIVERGE do canvas: quando um bloco marcado não está na
 * bancada no momento de uma varredura (recarga do projeto, desfazer, troca de
 * projeto), o `continue` abaixo o pula e a varredura seguinte o regrava como
 * "não era rascunho" — o id some do rastreio e NADA mais consegue limpá-lo. O
 * sintoma é exatamente o que a criança vê: o bloco está encaixado dentro da
 * Área do projeto, gera código e é salvo, mas segue com o contorno tracejado e o
 * aviso "Rascunho" até a página ser recarregada. Lendo a marca do canvas,
 * qualquer divergência se cura na varredura seguinte.
 */
function markedBlockIds(workspace: Blockly.Workspace): string[] {
  const canvas = (workspace as DraftWorkspace).getCanvas?.()
  if (!canvas) return []
  const ids: string[] = []
  for (const node of canvas.querySelectorAll(`.${DRAFT_CLASS}`)) {
    const id = node.getAttribute('data-id')
    if (id) ids.push(id)
  }
  return ids
}

/** Aplica o aviso sem apagar outros diagnósticos presos ao mesmo bloco. */
export function applyDraftDiagnostics(workspace: Blockly.Workspace): string[] {
  const drafts = findDraftStacks(workspace)
  const draftIds = new Set(drafts.map((block) => block.id))
  const changedIds = new Set([
    ...(previousDraftIds.get(workspace) ?? []),
    ...markedBlockIds(workspace),
    ...draftIds,
  ])

  // Só raízes que eram, estão ou viraram rascunho podem mudar de aparência.
  // Varreduras de todos os milhares de blocos a cada gesto tornavam a bancada
  // progressivamente mais lenta em projetos grandes.
  for (const blockId of changedIds) {
    const block = workspace.getBlockById(blockId) as DraftBlock | null
    if (!block) continue
    const isDraft = draftIds.has(block.id)
    block.setWarningText(isDraft ? DRAFT_WARNING_TEXT : null, DRAFT_WARNING_ID)
    block.getSvgRoot?.().classList.toggle(DRAFT_CLASS, isDraft)
  }

  previousDraftIds.set(workspace, draftIds)

  return drafts.map((block) => block.id)
}
