import * as Blockly from 'blockly/core'
import type { PythonNode, PythonParsedDocument } from '../language/types'
import { PYTHON_AREA_INPUT, pythonAreaFrames } from './areaFrames'
import { PYTHON_AREA_FRAME_TYPES } from './areas'
import { pythonWorkspaceToVisual } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'
import { nodes, pythonSemanticTree } from './nodes'
import { pythonVisualToAST } from './projection'
import type { PythonWorkspaceOrigins } from './provenance'
import { readPythonWorkspaceState } from './readWorkspaceState'
import type { PythonWorkspaceDraft } from './workspaceDraft'
import { recoverPythonWorkspaceOrigins } from './workspaceState'

/**
 * Prepares display state only. Pending changes require an explicit restore action
 * in the editor; they still need a verified transaction before becoming source.
 */
export function preparePythonWorkspaceRestore(
  draft: PythonWorkspaceDraft,
  document: PythonParsedDocument,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
) {
  if (
    draft.path !== document.identity.path ||
    draft.baseSource !== document.source ||
    !document.tree ||
    document.diagnostics.length
  )
    throw new Error('O rascunho não corresponde ao código atual. O código foi mantido.')
  const tree = document.tree
  const typeIgnores: PythonNode[] = nodes(tree.fields.type_ignores) ? tree.fields.type_ignores : []
  let origins: PythonWorkspaceOrigins = new Map()
  const rootIds = [...draft.rootIds]
  const state = readPythonWorkspaceState(draft.workspace, codecs, (workspace) => {
    if (
      new Set(rootIds).size !== rootIds.length ||
      rootIds.some((id) => {
        const block = workspace.getBlockById(id)
        return !block || !!block.getParent()
      })
    )
      throw new Error('A ordem dos blocos do rascunho é inválida.')
    origins = recoverPythonWorkspaceOrigins(workspace, tree)
    if (!draft.pending) {
      const projection = pythonWorkspaceToVisual(workspace, rootIds, typeIgnores, codecs, origins)
      if (
        JSON.stringify(pythonSemanticTree(pythonVisualToAST(projection, codecs))) !==
        JSON.stringify(pythonSemanticTree(tree))
      )
        throw new Error('Os blocos salvos não correspondem à fonte autoritativa.')
    }
  })
  return { state, origins, rootIds }
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * Área VAZIA repetida nos rascunhos (salva antes da guarda que junta as áreas) fica uma só: ela
 * não muda o código, e a repetida travava o arquivo inteiro nos blocos.
 */
function withoutRepeatedAreas(raw: Record<string, unknown>) {
  const blocks = record(raw.blocks) ? raw.blocks.blocks : undefined
  if (!Array.isArray(blocks)) return raw
  const seen = new Set<string>()
  const kept = blocks.filter((block) => {
    if (
      !record(block) ||
      typeof block.type !== 'string' ||
      !PYTHON_AREA_FRAME_TYPES.has(block.type)
    )
      return true
    const inputs = record(block.inputs) ? block.inputs : {}
    const empty = !(
      record(inputs[PYTHON_AREA_INPUT]) &&
      record((inputs[PYTHON_AREA_INPUT] as Record<string, unknown>).block)
    )
    if (empty && seen.has(block.type)) return false
    seen.add(block.type)
    return true
  })
  return kept.length === blocks.length
    ? raw
    : { ...raw, blocks: { ...(raw.blocks as object), blocks: kept } }
}

/**
 * Os rascunhos que reabrem, bloco a bloco; os que não reabrem (salvos por uma versão com defeito,
 * de uma extensão que saiu) ficam CRUS em `kept`, e o editor os grava de volta junto dos novos:
 * o rascunho da criança nunca some porque não abriu (full review das áreas, 22/11/2026).
 */
export function preparePythonScratchRestoreKeeping(
  raw: Record<string, unknown> | undefined,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
): { apply?: (workspace: Blockly.Workspace) => void; kept: unknown[] } {
  if (!raw) return { kept: [] }
  try {
    return { apply: preparePythonScratchRestore(raw, codecs), kept: [] }
  } catch {
    // Um por um: o que passa sozinho volta; o resto fica guardado como estava.
  }
  const blocks = record(raw.blocks) && Array.isArray(raw.blocks.blocks) ? raw.blocks.blocks : []
  const good: unknown[] = []
  const kept: unknown[] = []
  for (const block of blocks) {
    try {
      preparePythonScratchRestore(
        { ...raw, blocks: { ...(raw.blocks as object), blocks: [block] } },
        codecs,
      )
      good.push(block)
    } catch {
      kept.push(block)
    }
  }
  if (!good.length) return { kept }
  try {
    const apply = preparePythonScratchRestore(
      { ...raw, blocks: { ...(raw.blocks as object), blocks: good } },
      codecs,
    )
    return { apply, kept }
  } catch {
    return { kept: blocks }
  }
}

/** Validate separately, then append after binding Program origins to the current source. */
export function preparePythonScratchRestore(
  raw: Record<string, unknown> | undefined,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
) {
  if (!raw) return
  let ids: string[] = []
  const state = readPythonWorkspaceState(withoutRepeatedAreas(raw), codecs, (workspace) => {
    // Só áreas VAZIAS acompanham os rascunhos (as com linhas são o programa).
    for (const frame of pythonAreaFrames(workspace).values())
      if (frame.getInputTargetBlock(PYTHON_AREA_INPUT))
        throw new Error('Rascunhos não podem conter uma área com linhas do programa.')
    ids = workspace.getAllBlocks(false).map((block) => block.id)
  })
  // The preflight validator checked every serialized block, including nested IDs.
  const blocks =
    (state.blocks as { blocks: Blockly.serialization.blocks.State[] } | undefined)?.blocks ?? []
  return (workspace: Blockly.Workspace) => {
    if (ids.some((id) => workspace.getBlockById(id)))
      throw new Error('Os rascunhos e o programa precisam ter identificadores distintos.')
    const present = new Set(workspace.getTopBlocks(false).map((block) => block.type))
    for (const block of blocks) {
      // Uma área vazia guardada não volta se o programa já tem essa área.
      if (PYTHON_AREA_FRAME_TYPES.has(block.type) && present.has(block.type)) continue
      Blockly.serialization.blocks.append(block, workspace)
      present.add(block.type)
    }
  }
}
