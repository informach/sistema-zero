import { buildWorkspaceStateFromIR, registerExtensionBlocks, unregisterBlocks } from '#blockly'
import type { Project } from '#core'
import type { ExtensionDefinition } from '#extensions'
import { type JSStatement, type SZIR, statementIsExtension } from '#ir'
import { findExtension, OFFICIAL_CATALOG } from '#official-extensions'
import { type ProjectStoreApi, useProjectStore } from './projectStore'

export { findExtension, OFFICIAL_CATALOG }

export function registerExtension(ext: ExtensionDefinition): void {
  registerExtensionBlocks(ext.blockly.blocks)
}

export function unregisterExtension(extId: string): void {
  const ext = findExtension(extId)
  if (!ext) return
  unregisterBlocks(ext.blockly.blocks.map((b) => b.type as string))
}

/**
 * Ao instalar: registra blocos no Blockly + adiciona no projeto. Idempotente
 * — instalar a mesma extensão duas vezes não cria duplicatas.
 */
export function installExtension(
  ext: ExtensionDefinition,
  store: ProjectStoreApi = useProjectStore,
): void {
  registerExtension(ext)
  store.getState().installExtension(ext.manifest.id, ext.manifest.version)
}

/**
 * Ao remover: tira blocos do Blockly + remove do projeto + limpa quaisquer
 * blocos do workspace serializados em blocksState (caller decide se filtra).
 */
export function removeExtension(extId: string, store: ProjectStoreApi = useProjectStore): void {
  unregisterExtension(extId)
  store.getState().removeExtension(extId)
}

/**
 * Conta quantos blocos de uma dada extensão estão atualmente no workspace.
 * Usado para mostrar o aviso "X blocos em uso" antes de remover.
 */
export function countExtensionBlocksInProject(project: Project, extId: string): number {
  const ext = findExtension(extId)
  if (!ext) return 0
  const blockTypes = new Set(ext.blockly.blocks.map((b) => b.type as string))
  const state = project.blocksState as { blocks?: { blocks?: unknown[] } } | null
  if (!state || typeof state !== 'object') return 0
  return countMatching(state.blocks?.blocks ?? [], blockTypes)
}

export function removeExtensionArtifacts(
  project: Project,
  extId: string,
): { ir: SZIR | null; blocksState: unknown | null } {
  const ir = project.ir ? removeExtensionFromIR(project.ir, extId) : null
  if (ir) return { ir, blocksState: buildWorkspaceStateFromIR(ir) }

  const ext = findExtension(extId)
  if (!ext) return { ir, blocksState: project.blocksState }
  const blockTypes = new Set(ext.blockly.blocks.map((b) => b.type as string))
  return { ir, blocksState: removeBlocksFromState(project.blocksState, blockTypes) }
}

function countMatching(nodes: unknown[], types: Set<string>): number {
  let n = 0
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const obj = node as {
      type?: string
      next?: { block?: unknown }
      inputs?: Record<string, unknown>
    }
    if (obj.type && types.has(obj.type)) n += 1
    if (obj.next && (obj.next as { block?: unknown }).block) {
      n += countMatching([(obj.next as { block?: unknown }).block], types)
    }
    if (obj.inputs) {
      for (const inp of Object.values(obj.inputs)) {
        const inObj = inp as { block?: unknown }
        if (inObj?.block) n += countMatching([inObj.block], types)
      }
    }
  }
  return n
}

function removeExtensionFromIR(ir: SZIR, extId: string): SZIR {
  return {
    ...ir,
    js: removeExtensionStatements(ir.js, extId),
    extensions: ir.extensions.filter((extension) => extension.extensionId !== extId),
  }
}

function removeExtensionStatements(statements: JSStatement[], extId: string): JSStatement[] {
  const cleaned: JSStatement[] = []
  for (const statement of statements) {
    if (statementIsExtension(statement, extId)) continue
    if (statement.type === 'event') {
      cleaned.push({ ...statement, body: removeExtensionStatements(statement.body, extId) })
      continue
    }
    if (statement.type === 'if') {
      cleaned.push({
        ...statement,
        then: removeExtensionStatements(statement.then, extId),
        else: statement.else ? removeExtensionStatements(statement.else, extId) : undefined,
      })
      continue
    }
    if (statement.type === 'repeat') {
      cleaned.push({ ...statement, body: removeExtensionStatements(statement.body, extId) })
      continue
    }
    if (statement.type === 'animationLoop') {
      cleaned.push({ ...statement, body: removeExtensionStatements(statement.body, extId) })
      continue
    }
    cleaned.push(statement)
  }
  return cleaned
}

function removeBlocksFromState(state: unknown, types: Set<string>): unknown | null {
  const root = state as { blocks?: { blocks?: unknown[] } } | null
  if (!root?.blocks) return state ?? null
  return {
    ...root,
    blocks: {
      ...root.blocks,
      blocks: removeMatching(root.blocks.blocks ?? [], types),
    },
  }
}

function removeMatching(nodes: unknown[], types: Set<string>): unknown[] {
  const out: unknown[] = []
  for (const node of nodes) {
    const cleaned = cleanBlockNode(node, types)
    if (Array.isArray(cleaned)) out.push(...cleaned)
    else if (cleaned) out.push(cleaned)
  }
  return out
}

function cleanBlockNode(node: unknown, types: Set<string>): unknown | unknown[] | null {
  if (!node || typeof node !== 'object') return node
  const obj = node as {
    type?: string
    next?: { block?: unknown }
    inputs?: Record<string, { block?: unknown }>
  }

  const nextBlocks = obj.next?.block ? removeMatching([obj.next.block], types) : []
  if (obj.type && types.has(obj.type)) return nextBlocks

  const inputs: Record<string, { block: unknown }> = {}
  if (obj.inputs) {
    for (const [name, input] of Object.entries(obj.inputs)) {
      const blocks = input.block ? removeMatching([input.block], types) : []
      if (blocks[0]) inputs[name] = { block: blocks[0] }
    }
  }

  return {
    ...obj,
    next: nextBlocks[0] ? { block: nextBlocks[0] } : undefined,
    inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
  }
}

/**
 * Re-registra blocos de TODAS as extensões instaladas no projeto. Chamar
 * sempre que carregar um projeto do IDB ou trocar de projeto, para garantir
 * que o Blockly conheça os blocos antes de des-serializar o workspace.
 */
export function reregisterInstalledExtensions(project: Pick<Project, 'installedExtensions'>): void {
  for (const inst of project.installedExtensions) {
    const ext = findExtension(inst.id)
    if (ext) registerExtensionBlocks(ext.blockly.blocks)
  }
}
