import { buildWorkspaceStateFromIR, registerExtensionBlocks } from '#blockly'
import type { Project } from '#core'
import type { ExtensionDefinition } from '#extensions'
import {
  type JSStatement,
  normalizeSZIR,
  type SZIRInput,
  type SZIRV2,
  statementIsExtension,
} from '#ir'
import { findExtension, OFFICIAL_CATALOG } from '#official-extensions'
import { findExtensionConflict } from '../extensions/compatibility'
import { type ProjectStoreApi, useProjectStore } from './projectStore'

export { findExtension, OFFICIAL_CATALOG }

export function registerExtension(ext: ExtensionDefinition): void {
  registerExtensionBlocks(ext.blockly.blocks)
}

/**
 * Ao instalar: registra blocos no Blockly + adiciona no projeto. Idempotente
 * — instalar a mesma extensão duas vezes não cria duplicatas.
 */
export function installExtension(
  ext: ExtensionDefinition,
  store: ProjectStoreApi = useProjectStore,
): { ok: true } | { ok: false; conflictId: string } {
  const installed = store.getState().project?.installedExtensions ?? []
  const conflictId = findExtensionConflict(
    { id: ext.manifest.id, conflictsWith: ext.conflictsWith },
    installed.map((entry) => ({
      id: entry.id,
      conflictsWith: findExtension(entry.id)?.conflictsWith,
    })),
  )
  if (conflictId) return { ok: false, conflictId }
  registerExtension(ext)
  store.getState().installExtension(ext.manifest.id, ext.manifest.version)
  return { ok: true }
}

/**
 * Ao remover: tira a extensão do projeto e limpa quaisquer blocos do workspace
 * serializados em blocksState (caller decide se filtra). NÃO desregistra os
 * blocos do Blockly: o registro `Blockly.Blocks` é um global de módulo (UMD)
 * COMPARTILHADO por todas as instâncias na página (invariante #5). Apagá-lo
 * num uninstall por-instância derrubaria as definições que outra instância
 * ainda usa — e ela nunca re-registraria (seu `installedExtensions` não mudou),
 * perdendo silenciosamente os blocos na próxima des-serialização. A toolbox é
 * reconstruída a partir do `installedExtensions`, então a categoria some sem
 * tocar no `Blockly.Blocks`; e `registerExtensionBlocks` é idempotente, então
 * deixar as definições registradas é seguro. `unregisterBlocks` (em #blockly)
 * fica disponível apenas para teardown de teste.
 */
export function removeExtension(extId: string, store: ProjectStoreApi = useProjectStore): void {
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
): { ir: SZIRInput | null; blocksState: unknown | null } {
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
      next?: { block?: unknown; shadow?: unknown }
      inputs?: Record<string, unknown>
    }
    if (obj.type && types.has(obj.type)) n += 1
    if (obj.next) n += countMatching(wrapperChildren(obj.next), types)
    if (obj.inputs) {
      for (const inp of Object.values(obj.inputs)) {
        n += countMatching(wrapperChildren(inp), types)
      }
    }
  }
  return n
}

/**
 * Filhos de um wrapper de input/next na serialização do Blockly: `{ block }`,
 * `{ shadow }` ou ambos (slot com sombra padrão + bloco real). Espelha
 * `getSerializedBlockWrapperChildren` do projectStore — percorrer só `.block`
 * deixava um bloco de extensão dentro de uma sombra escapar da contagem e da
 * limpeza, tropeçando depois na allowlist e resetando o layout.
 */
function wrapperChildren(wrapper: unknown): unknown[] {
  if (!wrapper || typeof wrapper !== 'object') return []
  const obj = wrapper as { block?: unknown; shadow?: unknown }
  const children: unknown[] = []
  if (obj.block) children.push(obj.block)
  if (obj.shadow) children.push(obj.shadow)
  return children
}

function removeExtensionFromIR(input: SZIRInput, extId: string): SZIRV2 {
  const ir = normalizeSZIR(input)
  return {
    ...ir,
    behavior: {
      start: removeExtensionStatements(ir.behavior.start, extId),
      events: removeExtensionStatements(ir.behavior.events, extId),
      loops: removeExtensionStatements(ir.behavior.loops, extId),
    },
    extensions: ir.extensions.filter((extension) => extension.extensionId !== extId),
  }
}

function removeExtensionStatements(statements: JSStatement[], extId: string): JSStatement[] {
  const cleaned: JSStatement[] = []
  for (const statement of statements) {
    if (statementIsExtension(statement, extId)) continue
    // Recursão em TODOS os tipos que carregam corpos de statements aninhados.
    // Sem isto, um bloco de extensão (g2d:/g3d:) solto DENTRO de um laço/try/fetch
    // sobrevivia à desinstalação: o preview re-emitia chamadas do runtime já
    // removido (quebra) e o blocksState rebuildado ficava com tipos fora da
    // allowlist. Espelha os tipos-contêiner de `countJSStatement` (projectStore).
    if (
      statement.type === 'event' ||
      statement.type === 'repeat' ||
      statement.type === 'animationLoop' ||
      statement.type === 'while' ||
      statement.type === 'doWhile' ||
      statement.type === 'forOf' ||
      statement.type === 'forRange'
    ) {
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
    if (statement.type === 'tryCatch') {
      cleaned.push({
        ...statement,
        body: removeExtensionStatements(statement.body, extId),
        handler: removeExtensionStatements(statement.handler, extId),
        finalizer: statement.finalizer
          ? removeExtensionStatements(statement.finalizer, extId)
          : undefined,
      })
      continue
    }
    if (statement.type === 'fetchJson') {
      cleaned.push({
        ...statement,
        body: removeExtensionStatements(statement.body, extId),
        catchBody: statement.catchBody
          ? removeExtensionStatements(statement.catchBody, extId)
          : undefined,
      })
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
    next?: { block?: unknown; shadow?: unknown }
    inputs?: Record<string, { block?: unknown; shadow?: unknown }>
  }

  // Filhos sobreviventes do `next` (achatados em `block` + `shadow`): se o
  // próprio bloco for removido, eles são promovidos para o lugar dele.
  const nextBlocks = obj.next ? removeMatching(wrapperChildren(obj.next), types) : []
  if (obj.type && types.has(obj.type)) return nextBlocks

  const inputs: Record<string, { block?: unknown; shadow?: unknown }> = {}
  if (obj.inputs) {
    for (const [name, input] of Object.entries(obj.inputs)) {
      const cleaned = cleanWrapper(input, types)
      if (cleaned) inputs[name] = cleaned
    }
  }

  return {
    ...obj,
    // Pai sobrevive: limpa o `next` com a MESMA lógica dos inputs, preservando a
    // distinção block/shadow. Reconstruir `{ block: nextBlocks[0] }` promovia uma
    // sombra a bloco real (shadow→real) e descartava o segundo filho do wrapper.
    next: obj.next ? (cleanWrapper(obj.next, types) ?? undefined) : undefined,
    inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
  }
}

/**
 * Limpa um wrapper de input preservando a distinção `block`/`shadow`. Devolve
 * `null` se nenhum filho sobreviver. Espelha `wrapperChildren`/`countMatching`
 * para que um bloco de extensão dentro de uma sombra também seja removido.
 */
function cleanWrapper(
  wrapper: { block?: unknown; shadow?: unknown },
  types: Set<string>,
): { block?: unknown; shadow?: unknown } | null {
  const out: { block?: unknown; shadow?: unknown } = {}
  if (wrapper.block) {
    const blocks = removeMatching([wrapper.block], types)
    if (blocks[0]) out.block = blocks[0]
  }
  if (wrapper.shadow) {
    const shadows = removeMatching([wrapper.shadow], types)
    if (shadows[0]) out.shadow = shadows[0]
  }
  return out.block || out.shadow ? out : null
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
