import {
  STUDIO_PRO_REVISION_LIMITS,
  type StudioProChange,
  studioProDigest,
} from '@sistemazero/core/studio/pro-revision'
import { buildProAssetBundle } from '../core/proAssets'
import type { ProExample } from '../core/proExamples'
import type { Project } from '../core/project'
import type { ProjectTree } from '../core/proProject'
import type { ProTextEdit } from '../monaco/pro/languageService'
import type { ProLanguageSession } from '../monaco/pro/session'
import { flushProjectOperations, projectPersistence } from './projectOperations'
import type { ProAssetEdit } from './projectStorageRevision'
import { captureProjectStorageScope } from './projectStorageRuntime'
import type { ProjectStoreApi } from './projectStore'
import { applyProEditorChange, captureProRevision } from './proRevision'
import { removeProNode, renameProNode, sanitizeProTree } from './proTree'

export type ProWorkspaceIntent =
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'delete'; path: string }
  | { kind: 'symbol'; path: string; offset: number; name: string }
  | { kind: 'material-delete'; id: string }
  | {
      kind: 'example'
      path: string
      source: string
      text: string
      label: string
      name: string
      asset?: ProExample['asset']
    }

export interface ProWorkspaceOperation {
  id: string
  projectId: string
  change: StudioProChange
  pathMap: Record<string, string>
  affected: string[]
  warnings: string[]
  before: Record<string, string>
  assetEdit?: ProAssetEdit
  context: {
    project: Project
    scope: ReturnType<typeof captureProjectStorageScope>
    adapter: ReturnType<typeof projectPersistence>
  }
}

/** All offsets address the captured text; edits are never applied by regex. */
export function applyProTextEdits(tree: ProjectTree, edits: readonly ProTextEdit[]): ProjectTree {
  const next = { ...tree }
  const byFile = new Map<string, ProTextEdit[]>()
  for (const edit of edits) {
    if (tree[edit.path]?.kind !== 'file' || edit.path.startsWith('node_modules/'))
      throw new Error('Esta mudança alcança um arquivo fora do projeto editável.')
    const list = byFile.get(edit.path) ?? []
    list.push(edit)
    byFile.set(edit.path, list)
  }
  for (const [path, changes] of byFile) {
    const node = tree[path]!
    if (node.kind !== 'file') throw new Error('Arquivo não encontrado.')
    let text = node.content
    let end = text.length
    for (const edit of changes.sort((a, b) => b.start - a.start)) {
      if (
        !Number.isSafeInteger(edit.start) ||
        !Number.isSafeInteger(edit.length) ||
        edit.start < 0 ||
        edit.length < 0 ||
        edit.start + edit.length > end
      )
        throw new Error('As posições desta mudança não correspondem ao arquivo.')
      text = text.slice(0, edit.start) + edit.text + text.slice(edit.start + edit.length)
      end = edit.start
    }
    next[path] = { kind: 'file', content: text }
  }
  return next
}

export async function describeProTreeChange(
  project: Project,
  next: ProjectTree,
  summary: string,
): Promise<StudioProChange> {
  const base = await captureProRevision(project)
  const patches: StudioProChange['patches'] = []
  for (const path of new Set([...Object.keys(project.tree ?? {}), ...Object.keys(next)])) {
    const before = project.tree?.[path],
      after = next[path]
    const oldText = before?.kind === 'file' ? before.content : null
    const newText = after?.kind === 'file' ? after.content : null
    if (oldText !== newText)
      patches.push({
        path,
        before: oldText === null ? null : await studioProDigest(oldText),
        content: newText,
      })
  }
  return {
    baseHash: base.hash,
    summary,
    patches,
    directories: {
      before: base.directories,
      after: Object.keys(next)
        .filter((path) => next[path]?.kind === 'dir')
        .sort(),
    },
  }
}

export async function prepareProWorkspaceOperation(
  store: ProjectStoreApi,
  projectId: string,
  language: Pick<ProLanguageSession, 'requestForTree'> | null,
  intent: ProWorkspaceIntent,
): Promise<ProWorkspaceOperation> {
  const scope = captureProjectStorageScope(),
    adapter = projectPersistence(store)
  await flushProjectOperations(store, projectId)
  if (captureProjectStorageScope() !== scope || projectPersistence(store) !== adapter)
    throw new Error('O perfil mudou. Abra a operação novamente neste perfil.')
  const project = store.getState().project
  if (store.getState().editingAccess === 'observer')
    throw new Error('Esta sessão está apenas observando.')
  if (!project || project.id !== projectId || project.kind !== 'pro' || !project.tree)
    throw new Error('O projeto aberto mudou.')
  const tree = project.tree
  if (intent.kind === 'material-delete') {
    const index = project.assets?.findIndex((asset) => asset.id === intent.id) ?? -1
    const asset = project.assets?.[index]
    if (!asset) throw new Error('Material não encontrado.')
    const bundle = await buildProAssetBundle(project.assets, tree)
    const url = bundle.manifest.assets.find((entry) => entry.id === asset.id)?.url
    const references = Object.entries(tree).flatMap(([path, node]) =>
      node.kind === 'file' && [asset.id, url].some((value) => value && node.content.includes(value))
        ? [path]
        : [],
    )
    const base = await captureProRevision(project)
    const cover = project.coverAssetName ?? null
    return {
      id: `editor:${crypto.randomUUID()}`,
      projectId,
      pathMap: {},
      affected: [],
      before: {},
      change: { baseHash: base.hash, summary: `Excluir material ${asset.name}`, patches: [] },
      assetEdit: {
        id: asset.id,
        index,
        value: null,
        cover: { before: cover, after: cover === asset.name ? null : cover },
      },
      warnings: [
        references.length
          ? `Referências ao ID ou caminho em: ${references.slice(0, 20).join(', ')}${references.length > 20 ? '…' : ''}.`
          : 'Nenhuma referência literal ao ID ou caminho foi encontrada nos arquivos do projeto.',
        'Caminhos montados pelo código não entram nesta busca. A recuperação fica em Ferramentas → Recuperar arquivos e materiais; ela exige que o projeto ainda corresponda à revisão escolhida.',
      ],
      context: { project, scope, adapter },
    }
  }
  if (!language) throw new Error('A análise do código ainda não está pronta.')
  let next: ProjectTree
  const pathMap: Record<string, string> = {}
  let summary: string
  const warnings: string[] = []
  if (intent.kind === 'rename') {
    const result = renameProNode(tree, intent.from, intent.to)
    if (result.error || !result.tree)
      throw new Error(result.error ?? 'Não foi possível mover o item.')
    if (result.tree === tree) throw new Error('Escolha um caminho diferente.')
    for (const path of Object.keys(tree))
      if (path === intent.from || path.startsWith(`${intent.from}/`))
        pathMap[path] = intent.to + path.slice(intent.from.length)
    const edits = await language.requestForTree(tree, 'renameFile', intent.from, intent.to)
    const edited = applyProTextEdits(tree, edits)
    const moved = renameProNode(edited, intent.from, intent.to)
    if (!moved.tree) throw new Error(moved.error)
    next = moved.tree
    summary = `Mover ${intent.from} para ${intent.to}`
    warnings.push(
      'Imports JavaScript e TypeScript serão atualizados. Confira referências em HTML, CSS e caminhos montados pelo código antes de jogar.',
    )
    if (
      Object.keys(pathMap).some((path) =>
        /(^|\/)(?:index\.html|package\.json|[jt]sconfig\.json|vite\.config\.[cm]?[jt]s|main\.[cm]?[jt]sx?)$/.test(
          path,
        ),
      )
    )
      warnings.push(
        'Este item pode ser uma entrada ou configuração do jogo. Confira também os comandos e entradas após a mudança.',
      )
  } else if (intent.kind === 'delete') {
    if (!tree[intent.path]) throw new Error('Item não encontrado.')
    const dependents = await language.requestForTree(
      tree,
      'renameFile',
      intent.path,
      `${intent.path}.removed`,
    )
    const paths = [...new Set(dependents.map((item) => item.path))].filter(
      (path) => path !== intent.path && !path.startsWith(`${intent.path}/`),
    )
    if (paths.length)
      warnings.push(
        `Referências conhecidas em: ${paths.join(', ')}. Esses arquivos podem precisar de ajustes.`,
      )
    warnings.push(
      'Referências em HTML, CSS e caminhos dinâmicos exigem conferência manual. A recuperação fica disponível no histórico local.',
    )
    next = removeProNode(tree, intent.path)
    summary = `Excluir ${intent.path}`
  } else if (intent.kind === 'example') {
    if (intent.asset) {
      const bundle = await buildProAssetBundle(project.assets, tree)
      if (
        !bundle.manifest.assets.some(
          (asset) =>
            asset.id === intent.asset!.id &&
            asset.url === intent.asset!.url &&
            asset.sha256 === intent.asset!.sha256,
        )
      )
        throw new Error('O material mudou. Abra seu exemplo novamente.')
    }
    const file = tree[intent.path]
    if (
      file?.kind !== 'file' ||
      file.content !== intent.source ||
      !/\.[cm]?[jt]sx?$/.test(intent.path)
    )
      throw new Error('O arquivo escolhido mudou. Abra o exemplo novamente.')
    const symbols = await language.requestForTree(tree, 'symbols', intent.path)
    if (symbols.some((symbol) => symbol.name === intent.name))
      throw new Error(
        `Já existe ${intent.name} neste arquivo. Escolha outro arquivo ou renomeie essa função antes de inserir.`,
      )
    next = applyProTextEdits(tree, [
      { path: intent.path, start: file.content.length, length: 0, text: `\n\n${intent.text}\n` },
    ])
    summary = `Inserir ${intent.label} no fim de ${intent.path}`
    warnings.push(
      'O exemplo cria uma função. Confira a chamada indicada nos comentários e conecte-a ao seu jogo; inserir não executa a função automaticamente.',
    )
  } else {
    next = applyProTextEdits(
      tree,
      await language.requestForTree(tree, 'renameSymbol', intent.path, intent.offset, intent.name),
    )
    summary = `Renomear símbolo para ${intent.name}`
  }
  const valid = sanitizeProTree(next)
  if (!valid) throw new Error('A mudança ultrapassa os limites ou cria caminhos incompatíveis.')
  const change = await describeProTreeChange(project, valid, summary)
  if (change.patches.length > STUDIO_PRO_REVISION_LIMITS.maxPatches)
    throw new Error(
      `Esta operação altera mais de ${STUDIO_PRO_REVISION_LIMITS.maxPatches} arquivos. Organize uma pasta menor por vez para manter a recuperação completa.`,
    )
  if (
    store.getState().project !== project ||
    captureProjectStorageScope() !== scope ||
    projectPersistence(store) !== adapter
  )
    throw new Error('O projeto mudou. Revise a operação novamente; suas edições foram preservadas.')
  if (
    !change.patches.length &&
    JSON.stringify(change.directories?.before) === JSON.stringify(change.directories?.after)
  )
    throw new Error('Nenhuma mudança encontrada.')
  return {
    id: `editor:${crypto.randomUUID()}`,
    projectId,
    change,
    pathMap,
    affected: change.patches.map((patch) => patch.path),
    warnings,
    context: { project, scope, adapter },
    before: Object.fromEntries(
      Object.entries(tree).flatMap(([path, node]) =>
        node.kind === 'file' ? [[path, node.content]] : [],
      ),
    ),
  }
}

/** A preview belongs to the exact document, adapter and profile that produced it. */
export function applyPreparedProWorkspaceOperation(
  store: ProjectStoreApi,
  operation: ProWorkspaceOperation,
  onPublish?: (tree: ProjectTree) => void,
) {
  if (
    store.getState().project !== operation.context.project ||
    captureProjectStorageScope() !== operation.context.scope ||
    projectPersistence(store) !== operation.context.adapter
  )
    throw new Error('O projeto ou perfil mudou. Confira a operação novamente antes de aplicar.')
  return applyProEditorChange(
    store,
    operation.projectId,
    {
      operationId: operation.id,
      change: operation.change,
      pathMap: operation.pathMap,
      ...(operation.assetEdit ? { assetEdit: operation.assetEdit } : {}),
    },
    onPublish,
  )
}
