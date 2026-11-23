import { afterEach, describe, expect, test } from 'bun:test'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { prepareRuntimeDependencyLock } from '../../../studio-runtime/src/dependency-lock'
import { javaScriptProject } from '../core/editableProject'
import type { ProjectTree } from '../core/proProject'
import {
  currentProEngineCopies,
  type ProEngineInventory,
  proEngineCopyPath,
} from '../modes/pro/proEngineCopies'
import type { ProWorkspaceLanguage } from '../modes/pro/workspace/language'
import { olderEngine, openConvertedPro, releaseConvertedPros } from '../testing/convertedProFixture'
import { PRO_ENGINE_UPDATE_LABEL, updateProEngineCopies } from './proEngineUpdate'
import { listProHistory, readProHistoryTree } from './proProjectHistory'
import {
  applyProEditorChange,
  captureProRevision,
  captureProRevisionPayload,
  undoProApplication,
} from './proRevision'
import { updateProToolchainBeforeExecution } from './proToolchainUpdate'
import {
  applyPreparedProWorkspaceOperation,
  describeProTreeChange,
  prepareProWorkspaceOperation,
} from './proWorkspaceOperations'

/**
 * O motor 2D de um jogo convertido para o Pro (`public/sz-ext/<id>.js`) tem perto de 400 mil
 * caracteres, acima do teto de 256 mil por arquivo da revisão do Pro. Uma cópia que o Estúdio
 * escreveu (a de agora ou uma publicada) é da plataforma: fica na revisão e no hash, mas fora do
 * orçamento dos arquivos da criança. Uma cópia editada é dela e continua com o teto de sempre.
 */
afterEach(releaseConvertedPros)

const REFUSED = 'A revisão ultrapassou os limites de arquivos.'

/** A exclusão consulta só quem importa o arquivo (ninguém, aqui): a análise do TypeScript não entra. */
const language: Pick<ProWorkspaceLanguage, 'requestForTree' | 'referencesToFile'> = {
  referencesToFile: async () => [],
  requestForTree: () => Promise.reject(new Error('A exclusão não renomeia arquivos.')),
}

const text = (tree: ProjectTree | undefined, path: string) => {
  const node = tree?.[path]
  if (node?.kind !== 'file') throw new Error(`${path} não é um arquivo.`)
  return node.content
}

type Opened = Awaited<ReturnType<typeof openConvertedPro>>

/** "Voltar para esta versão", pelo mesmo caminho da área de trabalho (`useProOperations`). */
async function restoreVersion(opened: Opened, versionId: string, engines?: ProEngineInventory) {
  const project = opened.store.getState().project!
  const version = (await listProHistory(opened.scope, project.id)).find(
    (entry) => entry.id === versionId,
  )
  if (!version) throw new Error('A versão não está no Histórico.')
  const tree = await readProHistoryTree(opened.scope, project.id, version.id)
  return applyProEditorChange(opened.store, project.id, {
    operationId: `editor:${crypto.randomUUID()}`,
    change: await describeProTreeChange(project, tree, 'Voltar para a versão'),
    history: { trigger: 'restore', restoredFrom: version.createdAt },
    ...(engines ? { engines } : {}),
  })
}

/** O package.json de um jogo convertido antes da atualização segura do Vite (20/10/2026). */
const legacyVite = (tree: ProjectTree): ProjectTree => {
  const manifest = JSON.parse(text(tree, 'package.json'))
  return {
    ...tree,
    'package.json': {
      kind: 'file',
      content: JSON.stringify({
        ...manifest,
        devDependencies: { ...manifest.devDependencies, vite: '8.0.16' },
      }),
    },
  }
}

describe('Pro convertido com o motor 2D intacto', () => {
  for (const [id, variant] of [
    ['game-2d', 'sem-cenario-pinta'],
    ['game-2d-advanced', 'completo'],
  ] as const) {
    test(`${id} (${variant}): excluir um arquivo, voltar para a versão de antes e recuperar a volta`, async () => {
      const engine = (await currentProEngineCopies(id))[variant]
      expect(engine.length).toBeGreaterThan(STUDIO_PRO_BUILD_LIMITS.maxFileChars)
      const opened = await openConvertedPro(id, () => engine)
      const { store, path, original } = opened
      const operation = await prepareProWorkspaceOperation(store, original.id, language, {
        kind: 'delete',
        path: 'public/style.css',
      })
      expect(operation.affected).toEqual(['public/style.css'])
      expect((await applyPreparedProWorkspaceOperation(store, operation)).status).toBe('saved')
      const deleted = store.getState().project!
      expect(deleted.tree?.['public/style.css']).toBeUndefined()
      expect(text(deleted.tree, path)).toBe(engine)
      expect((await opened.stored())?.tree).toEqual(deleted.tree)

      // O Histórico guardou a árvore de antes, com o motor inteiro.
      await opened.recorded()
      const [before] = await listProHistory(opened.scope, original.id)
      expect(before?.trigger).toBe('operation')
      expect(await readProHistoryTree(opened.scope, original.id, before!.id)).toEqual(
        original.tree!,
      )

      const back = await restoreVersion(opened, before!.id)
      expect(back.status).toBe('saved')
      expect(store.getState().project!.tree).toEqual(original.tree!)
      expect((await opened.stored())?.tree).toEqual(original.tree!)
      for (const key of ['assets', 'blocksState', 'installedExtensions', 'proMeta'] as const)
        expect(store.getState().project![key]).toEqual(original[key])

      // A volta também se recupera.
      await undoProApplication(store, original.id, back.operationId)
      expect(store.getState().project!.tree).toEqual(deleted.tree!)
    })

    test(`${id} (${variant}): a atualização do Vite troca só o package.json e o lock`, async () => {
      const engine = (await currentProEngineCopies(id))[variant]
      const opened = await openConvertedPro(id, () => engine, { tree: legacyVite })
      const { store, path, original } = opened
      const receipt = await updateProToolchainBeforeExecution(
        store,
        async ({ packageJson }) => prepareRuntimeDependencyLock(packageJson),
        new AbortController().signal,
      )
      expect(receipt?.status).toBe('saved')
      const updated = store.getState().project!
      expect(JSON.parse(text(updated.tree, 'package.json')).devDependencies.vite).toBe('8.1.6')
      expect(text(updated.tree, 'package-lock.json').length).toBeGreaterThan(0)
      for (const [file, node] of Object.entries(original.tree!))
        if (file !== 'package.json') expect(updated.tree![file]).toEqual(node)
      expect(text(updated.tree, path)).toBe(engine)
      await undoProApplication(store, original.id, receipt!.operationId)
      expect(store.getState().project!.tree).toEqual(original.tree!)
    })

    test(`${id} (${variant}): voltar da versão que o "Atualizar o motor" registrou devolve o motor antigo byte a byte`, async () => {
      const older = await olderEngine(id, variant)
      const opened = await openConvertedPro(id, () => older.content)
      const { store, path, original } = opened
      expect(await updateProEngineCopies(store, { known: older.known })).toBe(true)
      const updated = store.getState().project!
      expect(text(updated.tree, path)).toBe((await currentProEngineCopies(id))[variant])
      await opened.recorded()
      const [version] = await listProHistory(opened.scope, original.id)
      expect(version?.label).toBe(PRO_ENGINE_UPDATE_LABEL)

      const back = await restoreVersion(opened, version!.id, older.known)
      expect(back.status).toBe('saved')
      const restored = text(store.getState().project!.tree, path)
      expect(restored).toBe(older.content)
      expect(await studioProDigest(restored)).toBe(await studioProDigest(older.content))
      expect(store.getState().project!.tree).toEqual(original.tree!)
      expect((await opened.stored())?.tree).toEqual(original.tree!)

      // E recuperar a volta põe o motor de agora outra vez.
      await undoProApplication(store, original.id, back.operationId, undefined, undefined, {
        engines: older.known,
      })
      expect(store.getState().project!.tree).toEqual(updated.tree!)
    })
  }
})

describe('o que continua recusado', () => {
  test('um motor editado acima do teto é da criança: operação, Vite e revisão seguem recusados', async () => {
    const opened = await openConvertedPro('game-2d', (engine) => `${engine}\n// meu ajuste`, {
      tree: legacyVite,
    })
    const { store, original } = opened
    await expect(captureProRevision(original)).rejects.toThrow(REFUSED)
    await expect(
      prepareProWorkspaceOperation(store, original.id, language, {
        kind: 'delete',
        path: 'public/style.css',
      }),
    ).rejects.toThrow(REFUSED)
    await expect(
      updateProToolchainBeforeExecution(
        store,
        async ({ packageJson }) => prepareRuntimeDependencyLock(packageJson),
        new AbortController().signal,
      ),
    ).rejects.toThrow(REFUSED)
    expect(store.getState().project).toBe(original)
    expect((await opened.stored())?.tree).toEqual(original.tree!)
  })

  test('voltar para uma versão com o motor editado acima do teto é recusado e nada muda', async () => {
    const opened = await openConvertedPro('game-2d-advanced', (engine) => engine)
    const { store, path, original } = opened
    const edited = {
      ...original.tree!,
      [path]: { kind: 'file' as const, content: `${text(original.tree, path)} ` },
    }
    await expect(
      applyProEditorChange(store, original.id, {
        operationId: `editor:${crypto.randomUUID()}`,
        change: await describeProTreeChange(original, edited, 'Voltar para a versão'),
      }),
    ).rejects.toThrow(REFUSED)
    expect(store.getState().project).toBe(original)
    expect(opened.history).toEqual([])
  })

  test('o texto de um motor noutro caminho do motor não é cópia da plataforma', async () => {
    const original = javaScriptProject(
      (await openConvertedPro('game-2d', (engine) => engine)).original,
    )
    if (!original?.tree) throw new Error('O jogo convertido é um projeto JavaScript do Pro.')
    const tree = {
      ...original.tree,
      [proEngineCopyPath('game-2d-advanced')]: {
        kind: 'file' as const,
        content: (await currentProEngineCopies('game-2d')).completo,
      },
    }
    await expect(captureProRevision({ ...original, tree })).rejects.toThrow(REFUSED)
  })

  test('o pedido ao Zappy segue o contrato do compilador remoto: a cópia do motor não vai ao servidor', async () => {
    // O construtor remoto (e o servidor que relê a revisão) aplica o teto a todo arquivo; aceitar
    // o motor lá depende do servidor. Até lá o pedido é recusado aqui, antes de sair do aparelho.
    const opened = await openConvertedPro('game-2d', (engine) => engine)
    await expect(captureProRevisionPayload(opened.original)).rejects.toThrow(REFUSED)
  })
})
