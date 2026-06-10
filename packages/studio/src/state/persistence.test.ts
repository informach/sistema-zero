import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createEmptyProject } from '#core'

// bun:test não hoista mocks (sem vi.hoisted): declara o objeto antes do
// mock.module e importa os módulos sob teste DEPOIS, dinamicamente.
// O mock de idb-keyval NÃO é restaurado no afterAll de propósito: o registry
// de módulos é compartilhado pela suíte toda e o IndexedDB real não existe no
// happy-dom — o no-op é a opção segura para os arquivos seguintes.
const idb = {
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  // Retorno tipado como `unknown` para permitir `mockResolvedValueOnce` com
  // qualquer payload persistido (inclusive objetos parciais/corrompidos nos testes).
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
}

mock.module('idb-keyval', () => ({
  createStore: idb.createStore,
  del: idb.del,
  delMany: idb.delMany,
  get: idb.get,
  getMany: idb.getMany,
  keys: idb.keys,
  set: idb.set,
  setMany: idb.setMany,
}))

const { listAllProjects } = await import('./persistence')
const { PROJECT_FILE_LIMITS, useProjectStore } = await import('./projectStore')
const { createPersistenceService, setAutosaveDelayForTests } = await import(
  '../persistence/service'
)
const { createLocalPersistenceAdapter } = await import('../persistence/local')

// Sem fake timers no bun:test: encurta o debounce do autosave e espera com
// timers reais (folga de 5x para máquinas lentas/CI).
const AUTOSAVE_TEST_DELAY_MS = 10
const waitForAutosave = () => Bun.sleep(AUTOSAVE_TEST_DELAY_MS * 5)

// Serviço sobre a store DEFAULT (mesmo arranjo do fallback fora de um
// <Studio>); cada teste dá attach/detach.
const service = createPersistenceService(useProjectStore, createLocalPersistenceAdapter())

describe('PersistenceService', () => {
  beforeEach(() => {
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)
    idb.createStore.mockClear()
    idb.del.mockClear()
    idb.delMany.mockClear()
    idb.get.mockClear()
    idb.getMany.mockClear()
    idb.keys.mockClear()
    idb.set.mockClear()
    idb.setMany.mockClear()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    setAutosaveDelayForTests(null)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('persiste o projeto quando o debounce de autosave completa', async () => {
    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-1', 'Projeto 1'))

    await waitForAutosave()

    expect(idb.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['sz:project-meta:project-1', expect.objectContaining({ id: 'project-1' })],
        ['sz:project-files:project-1', expect.objectContaining({ id: 'project-1' })],
        ['sz:project-state:project-1', expect.objectContaining({ id: 'project-1' })],
      ]),
      expect.anything(),
    )

    detach()
  })

  it('mantém o snapshot pendente quando o projeto é descarregado antes do debounce', async () => {
    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-1', 'Projeto 1'))
    useProjectStore.getState().unloadProject()

    await waitForAutosave()

    expect(idb.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['sz:project-meta:project-1', expect.objectContaining({ id: 'project-1' })],
        ['sz:project-files:project-1', expect.objectContaining({ id: 'project-1' })],
        ['sz:project-state:project-1', expect.objectContaining({ id: 'project-1' })],
      ]),
      expect.anything(),
    )

    detach()
  })

  it('cancela autosave pendente ao excluir o projeto carregado', async () => {
    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-1', 'Projeto 1'))

    await useProjectStore.getState().deleteProject('project-1')
    await waitForAutosave()

    expect(idb.delMany).toHaveBeenCalledWith(
      [
        'sz:project-meta:project-1',
        'sz:project-files:project-1',
        'sz:project-state:project-1',
        'sz:project:project-1',
      ],
      expect.anything(),
    )
    expect(idb.setMany).not.toHaveBeenCalled()

    detach()
  })

  it('força gravação pendente quando a página está saindo', async () => {
    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-pagehide', 'Projeto'))

    window.dispatchEvent(new Event('pagehide'))

    expect(idb.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['sz:project-meta:project-pagehide', expect.objectContaining({ id: 'project-pagehide' })],
        ['sz:project-files:project-pagehide', expect.objectContaining({ id: 'project-pagehide' })],
        ['sz:project-state:project-pagehide', expect.objectContaining({ id: 'project-pagehide' })],
      ]),
      expect.anything(),
    )

    await waitForAutosave()
    expect(idb.setMany).toHaveBeenCalledTimes(1)

    detach()
  })

  it('flusha o autosave pendente no detach (unmount não perde a última edição)', async () => {
    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-2', 'Projeto 2'))

    detach()
    expect(idb.setMany).toHaveBeenCalledTimes(1)

    await waitForAutosave()
    expect(idb.setMany).toHaveBeenCalledTimes(1)
  })

  it('emite onChange no debounce com o snapshot completo, mesmo com persistence none', async () => {
    const noneService = createPersistenceService(useProjectStore, null)
    const changes: string[] = []
    noneService.handlers = { onChange: (project) => changes.push(project.id) }
    const detach = noneService.attach()

    useProjectStore.getState().setProject(createEmptyProject('project-7', 'Projeto 7'))
    await waitForAutosave()

    expect(changes).toEqual(['project-7'])
    expect(idb.setMany).not.toHaveBeenCalled()
    // Snapshot entregue ao host conta como salvo (badge "Salvo").
    expect(useProjectStore.getState().isDirty).toBe(false)

    detach()
  })

  it('onSave rejeitado marca erro no badge, notifica onError e propaga', async () => {
    const failing = createPersistenceService(useProjectStore, null)
    const errors: string[] = []
    failing.handlers = {
      onSave: async () => {
        throw new Error('host recusou')
      },
      onError: (error) => errors.push(error.message),
    }
    useProjectStore.getState().setProject(createEmptyProject('project-8', 'Projeto 8'))

    expect(failing.save()).rejects.toThrow('host recusou')
    await Bun.sleep(0)

    expect(useProjectStore.getState().saveError).toContain('host recusou')
    expect(errors).toHaveLength(1)
  })

  it('não marca como salvo se uma edição nova acontece enquanto a persistência anterior está em voo', async () => {
    let resolvePersist: (() => void) | undefined
    idb.setMany.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          resolvePersist = () => resolve(undefined)
        }),
    )

    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-3', 'Projeto 3'))

    await waitForAutosave()
    expect(idb.setMany).toHaveBeenCalledTimes(1)

    useProjectStore.getState().setFile('script.js', 'console.log("nova edição");\n')
    expect(useProjectStore.getState().isDirty).toBe(true)

    resolvePersist?.()
    await Bun.sleep(0)

    expect(useProjectStore.getState().isDirty).toBe(true)

    detach()
  })

  it('mantém o projeto sujo e registra erro quando o autosave falha', async () => {
    idb.setMany.mockRejectedValueOnce(new Error('QuotaExceededError'))

    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-4', 'Projeto 4'))

    await waitForAutosave()

    expect(useProjectStore.getState().isDirty).toBe(true)
    expect(useProjectStore.getState().saveError).toContain('QuotaExceededError')

    detach()
  })

  it('salvar manualmente cancela o autosave pendente', async () => {
    const detach = service.attach()
    useProjectStore.getState().setProject(createEmptyProject('project-5', 'Projeto 5'))

    await service.save()
    await waitForAutosave()

    expect(idb.setMany).toHaveBeenCalledTimes(1)
    expect(idb.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['sz:project-meta:project-5', expect.objectContaining({ id: 'project-5' })],
        ['sz:project-files:project-5', expect.objectContaining({ id: 'project-5' })],
        ['sz:project-state:project-5', expect.objectContaining({ id: 'project-5' })],
      ]),
      expect.anything(),
    )

    detach()
  })

  it('salvar manualmente não marca salvo se outro snapshot entra enquanto persiste', async () => {
    let resolvePersist: (() => void) | undefined
    idb.setMany.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          resolvePersist = () => resolve(undefined)
        }),
    )

    useProjectStore.getState().setProject(createEmptyProject('project-6', 'Projeto 6'))
    const savePromise = service.save()
    useProjectStore.getState().setFile('script.js', 'console.log("nova edição");\n')

    resolvePersist?.()
    await savePromise

    expect(useProjectStore.getState().isDirty).toBe(true)
  })
})

describe('importProjectFromJSON', () => {
  beforeEach(() => {
    idb.createStore.mockClear()
    idb.del.mockClear()
    idb.delMany.mockClear()
    idb.get.mockClear()
    idb.getMany.mockClear()
    idb.keys.mockClear()
    idb.set.mockClear()
    idb.setMany.mockClear()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('rejeita IR importada com complexidade excessiva', async () => {
    const tooManyStatements = Array.from({ length: 20_001 }, () => ({
      type: 'consoleLog',
      value: { type: 'str', value: 'ok' },
    }))

    await expect(
      useProjectStore.getState().importProjectFromJSON({
        name: 'Projeto pesado',
        files: {
          'index.html': '<h1>ok</h1>',
          'style.css': '',
          'script.js': '',
        },
        ir: {
          html: [],
          css: [],
          js: tooManyStatements,
          extensions: [],
        },
      }),
    ).rejects.toThrow('IR excede o tamanho ou a complexidade máxima')

    expect(idb.setMany).not.toHaveBeenCalled()
  })

  it('preserva blocksState importado quando a estrutura usa blocos conhecidos', async () => {
    const blocksState = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_js_console_log_text',
            id: 'log_1',
            x: 24,
            y: 48,
            fields: { VALUE: 'oi' },
          },
        ],
      },
    }

    const imported = await useProjectStore.getState().importProjectFromJSON({
      name: 'Projeto com blocos',
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
      blocksState,
    })

    expect(imported.blocksState).toEqual(blocksState)
  })

  it('descarta blocksState importado com tipo de bloco desconhecido', async () => {
    const imported = await useProjectStore.getState().importProjectFromJSON({
      name: 'Projeto com bloco inválido',
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
      blocksState: {
        blocks: {
          languageVersion: 0,
          blocks: [{ type: 'controls_eval', fields: { CODE: 'while (true) {}' } }],
        },
      },
    })

    expect(imported.blocksState).toBeNull()
  })

  it('rejeita blocksState importado com blocos demais antes de persistir', async () => {
    const blocks = Array.from({ length: 5_001 }, (_, index) => ({
      type: 'sz_js_console_log_text',
      id: `log_${index}`,
      fields: { VALUE: 'oi' },
    }))

    await expect(
      useProjectStore.getState().importProjectFromJSON({
        name: 'Projeto com blocos demais',
        files: {
          'index.html': '<h1>ok</h1>',
          'style.css': '',
          'script.js': '',
        },
        blocksState: { blocks: { languageVersion: 0, blocks } },
      }),
    ).rejects.toThrow('blocksState excede o tamanho ou a complexidade máxima')

    expect(idb.setMany).not.toHaveBeenCalled()
  })
})

describe('live project mutation limits', () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: createEmptyProject('project-live', 'Projeto'),
      isDirty: false,
      saveError: null,
    })
  })

  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('bloqueia edicao canonica maior que o limite por arquivo', () => {
    const previousScript = useProjectStore.getState().project?.files['script.js']
    useProjectStore
      .getState()
      .setFile('script.js', 'x'.repeat(PROJECT_FILE_LIMITS.maxFileChars + 1))

    const state = useProjectStore.getState()
    expect(state.project?.files['script.js']).toBe(previousScript)
    expect(state.saveError).toContain('excede o limite')
    expect(state.isDirty).toBe(false)
  })

  it('bloqueia edicao de arquivo extra que ultrapassa o limite total do projeto', () => {
    expect(useProjectStore.getState().addExtraFile('helper.js')).toBeNull()
    expect(useProjectStore.getState().addExtraFile('more.js')).toBeNull()

    useProjectStore.getState().setFiles({
      'index.html': 'a'.repeat(PROJECT_FILE_LIMITS.maxFileChars),
      'style.css': 'b'.repeat(PROJECT_FILE_LIMITS.maxFileChars),
      'script.js': 'c'.repeat(PROJECT_FILE_LIMITS.maxFileChars),
    })
    useProjectStore.getState().setExtraFile('helper.js', 'd'.repeat(1_500_000))
    useProjectStore.setState({ isDirty: false, saveError: null })

    useProjectStore.getState().setExtraFile('more.js', 'e'.repeat(1_500_000))

    const state = useProjectStore.getState()
    expect(state.project?.extraFiles?.find((file) => file.name === 'more.js')?.content).toBe(
      '// JavaScript extra\n',
    )
    expect(state.saveError).toContain('limite total')
    expect(state.isDirty).toBe(false)
  })

  it('normaliza renomeacao feita pela UI', () => {
    useProjectStore.getState().rename(`  ${'x'.repeat(240)}  `)

    const name = useProjectStore.getState().project?.name ?? ''
    expect(name).toHaveLength(200)
    expect(name.startsWith('x')).toBe(true)
  })
})

describe('loadProject', () => {
  beforeEach(() => {
    idb.createStore.mockClear()
    idb.del.mockClear()
    idb.delMany.mockClear()
    idb.get.mockClear()
    idb.getMany.mockClear()
    idb.keys.mockClear()
    idb.set.mockClear()
    idb.setMany.mockClear()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('rejeita projeto persistido sem arquivos canonicos validos', async () => {
    idb.get.mockResolvedValueOnce({
      id: 'project-1',
      name: 'Corrompido',
      files: { 'index.html': '<h1>ok</h1>' },
    })

    const loaded = await useProjectStore.getState().loadProject('project-1')

    expect(loaded).toBeNull()
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('normaliza projeto persistido antes de entrar no store', async () => {
    idb.get.mockResolvedValueOnce({
      id: 'id-dentro-do-json',
      name: '  Projeto salvo  ',
      createdAt: Number.NaN,
      updatedAt: 'ontem',
      mode: 'modo-invalido',
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
        'debug.txt': 'descartar',
      },
      extraFiles: [
        { name: '../unsafe.js', content: 'alert(1)' },
        { name: 'helper.js', content: 'export const ok = true;' },
      ],
      installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: Number.NaN }],
      blocksState: {
        blocks: {
          languageVersion: 0,
          blocks: [{ type: 'controls_eval', fields: { CODE: 'alert(1)' } }],
        },
      },
      ir: { html: [], css: [], js: [], extensions: [] },
    })

    const loaded = await useProjectStore.getState().loadProject('project-1')

    expect(loaded).toMatchObject({
      id: 'project-1',
      name: 'Projeto salvo',
      mode: 'blocks',
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
      extraFiles: [
        { name: 'helper.js', language: 'javascript', content: 'export const ok = true;' },
      ],
      blocksState: null,
    })
    expect(loaded?.files).not.toHaveProperty('debug.txt')
    expect(Number.isFinite(loaded?.createdAt)).toBe(true)
    expect(Number.isFinite(loaded?.updatedAt)).toBe(true)
    expect(Number.isFinite(loaded?.installedExtensions[0]?.installedAt)).toBe(true)
    expect(useProjectStore.getState().project).toBe(loaded)
  })

  it('carrega projeto salvo em registros particionados antes do formato legado', async () => {
    idb.getMany.mockResolvedValueOnce([
      {
        id: 'project-split',
        name: 'Projeto particionado',
        createdAt: 10,
        updatedAt: 20,
        mode: 'code',
        installedExtensions: [],
      },
      {
        id: 'project-split',
        files: {
          'index.html': '<h1>ok</h1>',
          'style.css': '',
          'script.js': '',
        },
        extraFiles: [],
      },
      { id: 'project-split', ir: null, blocksState: null },
    ])

    const loaded = await useProjectStore.getState().loadProject('project-split')

    expect(loaded).toMatchObject({
      id: 'project-split',
      name: 'Projeto particionado',
      mode: 'code',
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
    })
    expect(idb.get).not.toHaveBeenCalled()
  })
})

describe('listAllProjects', () => {
  beforeEach(() => {
    idb.createStore.mockClear()
    idb.del.mockClear()
    idb.delMany.mockClear()
    idb.get.mockClear()
    idb.getMany.mockClear()
    idb.keys.mockClear()
    idb.set.mockClear()
    idb.setMany.mockClear()
  })

  it('lista summaries indexados sem carregar projetos inteiros', async () => {
    idb.keys.mockResolvedValueOnce([
      'sz:settings',
      'sz:project-meta:a',
      'sz:project-meta:b',
      'sz:project:a',
    ])
    idb.getMany.mockResolvedValueOnce([
      { id: 'a', name: 'Projeto A', createdAt: 10, updatedAt: 20 },
      { id: 'b', name: 'Projeto B', createdAt: 30, updatedAt: 40 },
    ])

    await expect(listAllProjects()).resolves.toEqual([
      { id: 'b', name: 'Projeto B', createdAt: 30, updatedAt: 40, mode: 'blocks' },
      { id: 'a', name: 'Projeto A', createdAt: 10, updatedAt: 20, mode: 'blocks' },
    ])
    expect(idb.get).not.toHaveBeenCalled()
    expect(idb.getMany).toHaveBeenCalledTimes(1)
    expect(idb.getMany).toHaveBeenCalledWith(
      ['sz:project-meta:a', 'sz:project-meta:b'],
      expect.anything(),
    )
  })

  it('mantém fallback para projetos legados sem summary indexado', async () => {
    idb.keys.mockResolvedValueOnce(['sz:project:legacy'])
    idb.getMany.mockResolvedValueOnce([{ name: 'Legado', createdAt: 1, updatedAt: 2 }])

    await expect(listAllProjects()).resolves.toEqual([
      { id: 'legacy', name: 'Legado', createdAt: 1, updatedAt: 2, mode: 'blocks' },
    ])
    expect(idb.getMany).toHaveBeenCalledWith(['sz:project:legacy'], expect.anything())
  })
})
