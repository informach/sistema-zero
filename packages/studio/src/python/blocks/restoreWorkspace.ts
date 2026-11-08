import * as Blockly from 'blockly/core'
import type { PythonNode, PythonParsedDocument } from '../language/types'
import { pythonWorkspaceToVisual } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'
import { nodes, pythonSemanticTree } from './nodes'
import { pythonProgramArea } from './programArea'
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

/** Validate separately, then append after binding Program origins to the current source. */
export function preparePythonScratchRestore(
  raw: Record<string, unknown> | undefined,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
) {
  if (!raw) return
  let ids: string[] = []
  const state = readPythonWorkspaceState(raw, codecs, (workspace) => {
    if (pythonProgramArea(workspace))
      throw new Error('Rascunhos não podem conter uma área Programa.')
    ids = workspace.getAllBlocks(false).map((block) => block.id)
  })
  // The preflight validator checked every serialized block, including nested IDs.
  const blocks =
    (state.blocks as { blocks: Blockly.serialization.blocks.State[] } | undefined)?.blocks ?? []
  return (workspace: Blockly.Workspace) => {
    if (ids.some((id) => workspace.getBlockById(id)))
      throw new Error('Os rascunhos e o Programa precisam ter identificadores distintos.')
    for (const block of blocks) Blockly.serialization.blocks.append(block, workspace)
  }
}
