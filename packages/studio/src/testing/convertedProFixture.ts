import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject, type Project, type ProjectAsset } from '../core/project'
import type { ProjectTree } from '../core/proProject'
import {
  currentProEngineCopies,
  type ProEngineExtensionId,
  type ProEngineInventory,
  type ProEngineVariant,
  proEngineCopyPath,
} from '../modes/pro/proEngineCopies'
import { convertClassicToProTree } from '../state/convertToPro'
import { persistProject } from '../state/persistence'
import { setProHistoryRecorder } from '../state/proHistoryRecorder'
import { registerProjectPersistence } from '../state/projectOperations'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { createProjectStore, loadSanitizedProjectById } from '../state/projectStore'
import { type ProHistoryTrigger, recordProHistoryVersion } from '../state/proProjectHistory'

/**
 * Um jogo 2D convertido para o Pro, como a criança o tem: a árvore que a conversão escreve (com a
 * cópia do motor em `public/sz-ext/<id>.js`, perto de 400 mil caracteres), gravado num IndexedDB
 * próprio e aberto num editor com persistência local e com o Histórico do projeto ligado.
 */

const stores: ReturnType<typeof createProjectStore>[] = []

/** Desliga o Histórico dos editores abertos por `openConvertedPro` (chame no `afterEach`). */
export function releaseConvertedPros(): void {
  for (const store of stores.splice(0)) setProHistoryRecorder(store, null)
}

export function localProjectScope(): ProjectStorageScope {
  const identity = `pro-convertido-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: '',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}

const image: ProjectAsset = {
  id: 'heroi',
  name: 'heroi',
  kind: 'image',
  source: 'upload',
  proPath: 'public/heroi.png',
  width: 1,
  height: 1,
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
}
const blocksState = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'sz_js_console_log_text',
        id: 'bloco-da-crianca',
        x: 10,
        y: 20,
        fields: { VALUE: 'oi' },
      },
    ],
  },
}

/** Um motor "antigo": o texto de agora com outra assinatura, reconhecido só pelo inventário dado. */
export async function olderEngine(id: ProEngineExtensionId, variant: ProEngineVariant) {
  const content = `/* motor publicado antes */\n${(await currentProEngineCopies(id))[variant]}`
  const digest = await studioProDigest(content)
  const hashes = (wanted: ProEngineVariant) => (wanted === variant ? [digest] : [])
  const listed = { completo: hashes('completo'), 'sem-cenario-pinta': hashes('sem-cenario-pinta') }
  const none = { completo: [], 'sem-cenario-pinta': [] }
  const known: ProEngineInventory = {
    'game-2d': id === 'game-2d' ? listed : none,
    'game-2d-advanced': id === 'game-2d-advanced' ? listed : none,
  }
  return { content, known }
}

export interface HistoryEntry {
  tree: ProjectTree
  trigger: ProHistoryTrigger
  label?: string
  restoredFrom?: number
}

export async function openConvertedPro(
  id: ProEngineExtensionId,
  engine: (current: string) => string,
  options: { tree?: (tree: ProjectTree) => ProjectTree } = {},
) {
  const scope = localProjectScope()
  const classic: Project = {
    ...createEmptyProject(`convertido-${id}`, 'Meu jogo'),
    assets: [image],
    blocksState,
    installedExtensions: [{ id, version: '2.0.0', installedAt: 1 }],
    files: {
      'index.html': '<canvas id="jogo"></canvas>',
      'style.css': 'body{margin:0}',
      'script.js': 'window.PROGRAMA_DA_CRIANCA = "continua";',
    },
  }
  const converted = await convertClassicToProTree(classic)
  const path = proEngineCopyPath(id)
  const node = converted[path]
  if (node?.kind !== 'file') throw new Error('A conversão não escreveu o motor.')
  const tree = { ...converted, [path]: { kind: 'file' as const, content: engine(node.content) } }
  const project: Project = {
    ...classic,
    kind: 'pro',
    mode: 'code',
    tree: options.tree ? options.tree(tree) : tree,
    proMeta: {
      templateId: 'vanilla-vite',
      devScript: 'dev',
      origin: { projectId: classic.id, revision: 0 },
    },
  }
  await persistProject(project, {}, scope)
  const store = createProjectStore()
  stores.push(store)
  const opened = await loadSanitizedProjectById(project.id, scope)
  if (!opened) throw new Error('O projeto convertido não reabriu.')
  store.getState().hydrateProject(opened)
  let failure: Error | null = null
  registerProjectPersistence(store, {
    localScope: scope,
    scopeIdentity: scope.identity,
    load: (projectId) => loadSanitizedProjectById(projectId, scope),
    save: async (next) => {
      if (failure) throw failure
      await persistProject(next, {}, scope)
    },
  })
  // O Histórico do projeto de verdade (o IndexedDB deste projeto), como a área de trabalho do Pro
  // o liga; a lista guarda o que chegou, na ordem.
  const history: HistoryEntry[] = []
  const recording: Promise<unknown>[] = []
  setProHistoryRecorder(store, (before, trigger, info) => {
    history.push({
      tree: before,
      trigger,
      ...(info.label ? { label: info.label } : {}),
      ...(info.restoredFrom !== undefined ? { restoredFrom: info.restoredFrom } : {}),
    })
    recording.push(
      recordProHistoryVersion(scope, info.projectId, before, trigger, {
        ...(info.label ? { label: info.label } : {}),
        ...(info.restoredFrom !== undefined ? { restoredFrom: info.restoredFrom } : {}),
      }),
    )
  })
  return {
    scope,
    store,
    path,
    history,
    original: store.getState().project!,
    stored: () => loadSanitizedProjectById(project.id, scope),
    /** Espera as versões pedidas ao Histórico chegarem ao IndexedDB. */
    recorded: () => Promise.all(recording.splice(0)),
    failSaves(error: Error) {
      failure = error
    },
  }
}
