import { expect, test } from 'bun:test'
import { createAsset } from '@sistemazero/pinta/assets'
import { createEditorStore } from '../../pinta/src/state/editorStore'
import {
  createLessonDraftCoordinator,
  type LessonDraftChannel,
  type LessonDraftEditor,
  LessonDraftSaveError,
  upToDateWorkspaceIds,
} from '../src/lib/lesson-draft-cloud'

function channel(
  confirm: LessonDraftChannel['confirm'],
  flush: LessonDraftChannel['flush'] = async () => {},
): LessonDraftChannel {
  return {
    supported: true,
    mark: () => null,
    setMark: () => {},
    peek: async () => null,
    enqueue: () => {},
    flush,
    confirm,
    getState: () => ({ status: 'idle', message: null }),
    subscribe: () => () => {},
  }
}

const editor = (
  save: () => Promise<void>,
  matchesSubmission: () => Promise<boolean> = async () => false,
): LessonDraftEditor => ({ save, matchesSubmission })

test('parte com envio em dia: guarda o desenho atual e espera o commit da conta', async () => {
  const asset = createAsset({ kind: 'pixel-background', name: 'Antes', width: 4, height: 4 })
  let disk = asset
  let uploaded = ''
  const commit = Promise.withResolvers<void>()
  const store = createEditorStore({
    asset,
    autosaveDelayMs: 60_000,
    persist: async (next) => {
      disk = next
    },
  })
  const cloud = createLessonDraftCoordinator({
    studio: channel(async () => {}),
    pinta: channel(async () => {
      uploaded = disk.name
      await commit.promise
    }),
  })
  cloud.registerEditor(
    'lesson',
    'pinta',
    'block',
    editor(async () => {
      const result = await store.getState().flush()
      if (!result.ok) throw new Error(result.error)
    }),
  )
  store.getState().commit({ ...asset, name: 'Último traço' })
  expect(disk.name).toBe('Antes')
  let advanced = false
  const advance = cloud.withSavedDrafts(
    'lesson',
    async () => {
      advanced = true
    },
    { confirm: ['block'] },
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(uploaded).toBe('Último traço')
  expect(advanced).toBe(false)
  expect(cloud.isSaving('lesson')).toBe(true)
  commit.resolve()
  await advance
  expect(advanced).toBe(true)
  expect(cloud.isSaving('lesson')).toBe(false)
})

test('sem envio em dia, a conta e o editor nunca prendem a criança', async () => {
  let flushed = 0
  const failing = channel(
    async () => {
      throw new Error('cota cheia')
    },
    async () => {
      flushed++
    },
  )
  const cloud = createLessonDraftCoordinator({ studio: failing, pinta: failing })
  cloud.registerEditor(
    'lesson',
    'studio',
    'block',
    editor(async () => {
      throw new Error('ainda carregando')
    }),
  )
  let advanced = 0
  await cloud.withSavedDrafts('lesson', async () => {
    advanced++
  })
  expect(advanced).toBe(1)
  // A subida ainda é tentada (com teto), como antes do coordenador.
  expect(flushed).toBe(1)
})

test.each([
  'local',
  'cloud',
] as const)('envio em dia, falha %s: impede o avanço e permite nova tentativa', async (failure) => {
  let fail = true
  const save = async () => {
    if (fail && failure === 'local') throw new Error('storage full')
  }
  const confirm = async () => {
    if (fail && failure === 'cloud') throw new Error('timeout')
  }
  const cloud = createLessonDraftCoordinator({ studio: channel(confirm), pinta: channel(confirm) })
  cloud.registerEditor('lesson', 'studio', 'block', editor(save))
  let advanced = 0
  const advance = () =>
    cloud.withSavedDrafts(
      'lesson',
      async () => {
        advanced++
      },
      { confirm: ['block'] },
    )
  const error = await advance().catch((e) => e)
  expect(error).toBeInstanceOf(LessonDraftSaveError)
  expect(error.viewerChanged).toBe(false)
  expect(advanced).toBe(0)
  expect(cloud.isSaving('lesson')).toBe(false)
  fail = false
  await advance()
  expect(advanced).toBe(1)
})

test('envio em dia sem a conta: segue quando o trabalho daqui é o que foi enviado', async () => {
  const failing = channel(async () => {
    throw Object.assign(new Error('Sua conta está sem espaço'), {
      code: 'CREATION_QUOTA_EXCEEDED',
    })
  })
  const cloud = createLessonDraftCoordinator({ studio: failing, pinta: failing })
  let matches = true
  cloud.registerEditor(
    'lesson',
    'studio',
    'block',
    editor(
      async () => {},
      async () => matches,
    ),
  )
  let advanced = 0
  const advance = () =>
    cloud.withSavedDrafts(
      'lesson',
      async () => {
        advanced++
      },
      { confirm: ['block'] },
    )
  await advance()
  expect(advanced).toBe(1)
  // Mudou depois de enviar e a conta não guarda: reenviar (que não depende da conta) destrava.
  matches = false
  await expect(advance()).rejects.toBeInstanceOf(LessonDraftSaveError)
  expect(advanced).toBe(1)
})

test('o perfil mudou na outra aba: recusa sem nova tentativa, mesmo batendo com o envio', async () => {
  const failing = channel(async () => {
    throw Object.assign(new Error('Trocou de perfil'), { code: 'VIEWER_MISMATCH' })
  })
  const cloud = createLessonDraftCoordinator({ studio: failing, pinta: failing })
  cloud.registerEditor(
    'lesson',
    'pinta',
    'block',
    editor(
      async () => {},
      async () => true,
    ),
  )
  const error = await cloud
    .withSavedDrafts('lesson', async () => {}, { confirm: ['block'] })
    .catch((e) => e)
  expect(error).toBeInstanceOf(LessonDraftSaveError)
  expect(error.viewerChanged).toBe(true)
  expect(error.code).toBe('VIEWER_CHANGED')
  expect(error.message).toBe('O perfil mudou. Abra a fase de novo.')
})

test('um salvamento travado vence o prazo: só a parte com envio em dia recusa', async () => {
  const cloud = createLessonDraftCoordinator({
    studio: channel(async () => {}),
    pinta: channel(async () => {}),
  })
  cloud.registerEditor(
    'lesson',
    'studio',
    'block',
    editor(() => new Promise<void>(() => {})),
  )
  let advanced = 0
  await cloud.withSavedDrafts(
    'lesson',
    async () => {
      advanced++
    },
    { timeoutMs: 20 },
  )
  expect(advanced).toBe(1)
  await expect(
    cloud.withSavedDrafts('lesson', async () => {}, { confirm: ['block'], timeoutMs: 20 }),
  ).rejects.toBeInstanceOf(LessonDraftSaveError)
  expect(cloud.isSaving('lesson')).toBe(false)
})

test('duas ações na mesma fase entram em fila e mantêm a edição parada até a resposta', async () => {
  const response = Promise.withResolvers<void>()
  const cloud = createLessonDraftCoordinator({
    studio: channel(async () => {}),
    pinta: channel(async () => {}),
  })
  const error = { code: 'SECTION_LOCKED' }
  const order: string[] = []
  const first = cloud
    .withSavedDrafts('lesson', async () => {
      order.push('concluir')
      await response.promise
    })
    .catch((e) => e)
  const second = cloud.withSavedDrafts('lesson', async () => {
    order.push('voltar')
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(order).toEqual(['concluir'])
  expect(cloud.isSaving('lesson')).toBe(true)
  response.reject(error)
  // A recusa do servidor passa sem embrulho; a segunda ação roda depois.
  expect(await first).toBe(error)
  await second
  expect(order).toEqual(['concluir', 'voltar'])
  expect(cloud.isSaving('lesson')).toBe(false)
})

test('não salva editores desmontados nem os de outra aula', async () => {
  const cloud = createLessonDraftCoordinator({
    studio: channel(async () => {}),
    pinta: channel(async () => {}),
  })
  const fail = editor(async () => {
    throw new Error('não deve rodar')
  })
  cloud.registerEditor('other-lesson', 'studio', 'block', fail)
  const unregister = cloud.registerEditor('lesson', 'pinta', 'old', fail)
  unregister()
  let called = false
  await cloud.withSavedDrafts(
    'lesson',
    async () => {
      called = true
    },
    { confirm: ['block', 'old'] },
  )
  expect(called).toBe(true)
})

test('as partes que cada ação fecha: avançar até o destino, voltar nada, concluir até o fim', () => {
  const sections = [
    { workspaceBlockId: null, completion: null },
    { workspaceBlockId: 'projeto', completion: {} },
    { workspaceBlockId: 'projeto', completion: { submissionUpToDate: true } },
    { workspaceBlockId: 'desenho', completion: { submissionUpToDate: true } },
    { workspaceBlockId: null, completion: {} },
  ]
  expect(upToDateWorkspaceIds(sections, 2, 3)).toEqual(['projeto'])
  expect(upToDateWorkspaceIds(sections, 1, 2)).toEqual([])
  expect(upToDateWorkspaceIds(sections, 4, 1)).toEqual([])
  expect(upToDateWorkspaceIds(sections, 3, sections.length)).toEqual(['desenho'])
  expect(upToDateWorkspaceIds(sections, 0, sections.length)).toEqual(['projeto', 'desenho'])
})
