import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createEmptyProject, PROJECT_ASSET_LIMITS } from '#core'

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
  // `update` é usado por settingsStore.ts. O registry de module mocks é GLOBAL na
  // suíte (não isolado por arquivo), então este export precisa existir aqui senão
  // settingsStore.ts quebra ("Export named 'update' not found") quando carregado
  // no mesmo processo de teste.
  update: mock(async () => undefined),
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
  update: idb.update,
}))

const {
  listAllProjects,
  listProjectSummariesLight,
  loadProjectSummaryById,
  persistProject,
  PROJECT_CHANGED_EVENT,
  renameProjectMeta,
} = await import('./persistence')
const { createProjectStore, MAX_BLOCKSTATE_BLOCKS, PROJECT_FILE_LIMITS, useProjectStore } =
  await import('./projectStore')
const { cancelPendingAutosavesFor, createPersistenceService, setAutosaveDelayForTests } =
  await import('../persistence/service')
const { createLocalPersistenceAdapter } = await import('../persistence/local')
const { setStorageNamespace } = await import('./persistence')
const { BEHAVIOR_AREAS_STATE_KEY, BEHAVIOR_AREAS_STATE_VERSION } = await import(
  '../blockly/blocksStateVersion'
)

// Sem fake timers no bun:test: encurta o debounce do autosave e espera com
// timers reais (folga de 5x para máquinas lentas/CI).
const AUTOSAVE_TEST_DELAY_MS = 10
const waitForAutosave = () => Bun.sleep(AUTOSAVE_TEST_DELAY_MS * 5)

// Serviço sobre a store DEFAULT (mesmo arranjo do fallback fora de um
// <Studio>); cada teste dá attach/detach.
const service = createPersistenceService(useProjectStore, createLocalPersistenceAdapter())

describe('setStorageNamespace — isolamento por perfil', () => {
  // Volta ao store padrão p/ não vazar o namespace p/ os outros testes do arquivo.
  afterEach(() => setStorageNamespace(''))

  it('namespace → DB próprio por perfil; vazio → DB histórico compartilhado', async () => {
    setStorageNamespace('perfil-A')
    idb.createStore.mockClear()
    const list = createLocalPersistenceAdapter().list
    if (!list) throw new Error('adapter local sem list()') // narrow p/ o typecheck (list é opcional na interface)
    await list()
    expect(idb.createStore).toHaveBeenCalledWith('sistema-zero-studio-perfil-A', 'kv')

    idb.createStore.mockClear()
    setStorageNamespace('') // sem perfil → store padrão (lição/adulto)
    const defaultList = createLocalPersistenceAdapter().list
    if (!defaultList) throw new Error('adapter local sem list()')
    await defaultList()
    expect(idb.createStore).toHaveBeenCalledWith('sistema-zero-studio', 'kv')
  })

  it('adapter capturado para A continua lendo A depois de o namespace global mudar para B', async () => {
    setStorageNamespace('perfil-A')
    const adapterA = Reflect.apply(createLocalPersistenceAdapter, null, [
      { namespace: 'perfil-A' },
    ]) as ReturnType<typeof createLocalPersistenceAdapter>
    const listA = adapterA.list
    if (!listA) throw new Error('adapter local sem list()')

    idb.createStore.mockClear()
    setStorageNamespace('perfil-B')
    await listA()

    expect(idb.createStore).not.toHaveBeenCalledWith('sistema-zero-studio-perfil-B', 'kv')
  })
})

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
        'sz:project-blocks:project-1',
        // 4ª partição: assets embutidos (imagens/sprites).
        'sz:project-assets:project-1',
        // 5ª partição: miniatura do card.
        'sz:project-thumb:project-1',
        'sz:project:project-1',
        // Armazenamento do programa do aluno (blocos "guardar/ler") deste projeto.
        'sz:game-storage:project-1',
      ],
      expect.anything(),
    )
    expect(idb.setMany).not.toHaveBeenCalled()

    detach()
  })

  it('excluir num namespace não cancela o mesmo id aberto em outro namespace', async () => {
    const storeA = createProjectStore()
    const storeB = createProjectStore()
    const savedA: string[] = []
    const savedB: string[] = []
    const adapterA = {
      scopeIdentity: 'scope-a',
      load: async () => null,
      save: async (project: ReturnType<typeof createEmptyProject>) => {
        savedA.push(project.id)
      },
    }
    const adapterB = {
      scopeIdentity: 'scope-b',
      load: async () => null,
      save: async (project: ReturnType<typeof createEmptyProject>) => {
        savedB.push(project.id)
      },
    }
    const serviceA = createPersistenceService(storeA, adapterA)
    const serviceB = createPersistenceService(storeB, adapterB)
    const detachA = serviceA.attach()
    const detachB = serviceB.attach()

    storeA.getState().setProject(createEmptyProject('shared-id', 'Alice'))
    storeB.getState().setProject(createEmptyProject('shared-id', 'Bob'))
    cancelPendingAutosavesFor('shared-id', 'scope-a')
    await waitForAutosave()

    expect(savedA).toEqual([])
    expect(storeA.getState().project).toBeNull()
    expect(savedB).toEqual(['shared-id'])
    expect(storeB.getState().project?.name).toBe('Bob')

    detachA()
    detachB()
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
    // O adapter.save agora corre DENTRO do mutex por id (#12), ou seja, numa
    // microtask — esperamos um tick para a task encadeada chamar o setMany e
    // capturar `resolvePersist` ANTES de tentarmos resolvê-lo. Sem isso ele seria
    // undefined aqui e o save ficaria pendurado (promise nunca settla).
    await Bun.sleep(0)
    useProjectStore.getState().setFile('script.js', 'console.log("nova edição");\n')

    resolvePersist?.()
    await savePromise

    expect(useProjectStore.getState().isDirty).toBe(true)
  })

  it('não re-persiste o projeto excluído quando o delete chega com o save em voo', async () => {
    // Adapter lento/remoto: o save fica em voo (resolve sob comando), abrindo a
    // janela em que o delete chega DEPOIS do debounce — quando a entrada já saiu
    // de `pending` e cancelar timers não acha nada. Sem a marca de excluído, o
    // save em voo marcaria salvo (e re-persistiria) o projeto recém-apagado.
    let resolvePersist: (() => void) | undefined
    const slowAdapter = {
      load: async () => null,
      save: () =>
        new Promise<void>((resolve) => {
          resolvePersist = resolve
        }),
    }
    const slowService = createPersistenceService(useProjectStore, slowAdapter)
    const detach = slowService.attach()

    useProjectStore.getState().setProject(createEmptyProject('project-del', 'Projeto'))
    await waitForAutosave()
    // O autosave disparou e o save está pendurado, com o projeto ainda sujo.
    expect(useProjectStore.getState().isDirty).toBe(true)
    expect(resolvePersist).toBeDefined()

    // Delete fora do ciclo do serviço marca o id como excluído (mesma chamada
    // que `deleteProject` faz via state/persistence). Além de cercar o id, o
    // fan-out agora DESCARREGA o projeto desta instância (fecha a janela de
    // ressurreição além da janela de graça): project vira null, isDirty false.
    cancelPendingAutosavesFor('project-del')
    expect(useProjectStore.getState().project).toBeNull()

    // O save em voo resolve: o projeto já NÃO está mais carregado (=== project
    // não casa) E a cerca está ativa, então não há markSaved nem re-persistência.
    resolvePersist?.()
    await Bun.sleep(0)

    // Permanece descarregado — o save em voo não ressuscitou o projeto apagado.
    expect(useProjectStore.getState().project).toBeNull()
    expect(useProjectStore.getState().isDirty).toBe(false)

    detach()
  })

  it('não agenda gravação ao hidratar/carregar um projeto (isDirty:false não escreve)', async () => {
    const detach = service.attach()

    // Hidratar instala um novo Project com isDirty:false — não pode disparar um
    // write redundante dos mesmos bytes (round-trip à toa em adapters remotos).
    useProjectStore.getState().hydrateProject(createEmptyProject('project-hydrate', 'Projeto'))
    await waitForAutosave()
    expect(idb.setMany).not.toHaveBeenCalled()

    // Uma edição genuína (isDirty:true) volta a agendar normalmente.
    useProjectStore.getState().setFile('script.js', 'console.log("editado");\n')
    await waitForAutosave()
    expect(idb.setMany).toHaveBeenCalledTimes(1)

    detach()
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

    const { project: imported } = await useProjectStore.getState().importProjectFromJSON({
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

  it('descarta blocksState importado com tipo de bloco desconhecido (com aviso)', async () => {
    const { project: imported, warnings } = await useProjectStore.getState().importProjectFromJSON({
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
    // O descarte (silencioso antes) vira aviso — e, quando a queda é por TIPO
    // desconhecido, o aviso NOMEIA o bloco culpado.
    expect(warnings.some((w) => w.includes('controls_eval'))).toBe(true)
  })

  it('avisa quando imagens não cabem; importa o resto; sem avisos quando tudo cabe', async () => {
    // Mais imagens que o teto de quantidade → as excedentes caem com aviso.
    const tiny = 'data:image/png;base64,AAAA'
    const over = PROJECT_ASSET_LIMITS.maxAssetsCount + 5
    const many = await useProjectStore.getState().importProjectFromJSON({
      name: 'Muitas imagens',
      files: { 'index.html': '<h1>ok</h1>', 'style.css': '', 'script.js': '' },
      assets: Array.from({ length: over }, (_, i) => ({
        kind: 'image',
        name: `img-${i}`,
        dataUrl: tiny,
      })),
    })
    expect(many.project.assets?.length).toBe(PROJECT_ASSET_LIMITS.maxAssetsCount)
    expect(many.warnings.some((w) => w.includes('imagem'))).toBe(true)

    const clean = await useProjectStore.getState().importProjectFromJSON({
      name: 'Projeto simples',
      files: { 'index.html': '<h1>ok</h1>', 'style.css': '', 'script.js': '' },
    })
    expect(clean.warnings).toEqual([])
  })

  it('preserva kind/tree/proMeta de um projeto profissional no export→import', async () => {
    // Regressão: importProjectFromJSON dropava kind/tree/proMeta, rebaixando todo
    // projeto pro exportado para classic vazio. Agora reconstrói via os mesmos
    // sanitizers do load (sanitizeProTree/sanitizeProMeta).
    const { project: imported } = await useProjectStore.getState().importProjectFromJSON({
      name: 'Pro exportado',
      kind: 'pro',
      mode: 'blocks', // ignorado: pro força 'code'
      tree: {
        'package.json': { kind: 'file', content: '{}' },
        src: { kind: 'dir' },
        'src/main.ts': { kind: 'file', content: 'export {}' },
      },
      proMeta: { devScript: 'dev', templateId: 'react-ts' },
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
    })

    expect(imported.kind).toBe('pro')
    expect(imported.mode).toBe('code')
    expect(imported.proMeta?.templateId).toBe('react-ts')
    expect(imported.tree?.['src/main.ts']?.kind).toBe('file')
    // O registro persistido (meta) carrega kind/proMeta.
    const lastArgs = idb.setMany.mock.calls.at(-1) as unknown as unknown[]
    const records = (lastArgs?.[0] ?? []) as [string, Record<string, unknown>][]
    const meta = records.find(([k]) => k.startsWith('sz:project-meta:'))?.[1]
    expect(meta?.kind).toBe('pro')
  })

  it('rebaixa para classic um pro importado com tree inválida (node_modules)', async () => {
    const { project: imported } = await useProjectStore.getState().importProjectFromJSON({
      name: 'Pro quebrado',
      kind: 'pro',
      tree: { 'node_modules/evil.js': { kind: 'file', content: 'x' } },
      proMeta: { devScript: 'dev', templateId: 'react-ts' },
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
    })

    expect(imported.kind).toBeUndefined()
    expect(imported.tree).toBeUndefined()
  })

  it('rejeita blocksState importado com blocos demais antes de persistir', async () => {
    const blocks = Array.from({ length: MAX_BLOCKSTATE_BLOCKS + 1 }, (_, index) => ({
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

describe('renameProjectMeta — serializado contra persistProject (mesmo id)', () => {
  beforeEach(() => {
    idb.get.mockClear()
    idb.set.mockClear()
    idb.setMany.mockClear()
  })

  it('o get-then-set do rename NÃO intercala com um persistProject em voo do mesmo id', async () => {
    // persistProject usa setMany; deixamos a 1ª chamada PENDENTE para manter a
    // escrita em voo. O renameProjectMeta do MESMO id deve ficar ENFILEIRADO na
    // cadeia de escrita por id — sem chamar `get` até o persist resolver.
    let resolvePersist: (() => void) | undefined
    idb.setMany.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          resolvePersist = () => resolve(undefined)
        }),
    )

    const persisting = persistProject({
      ...createEmptyProject('rename-race', 'v1'),
    })
    await Bun.sleep(0)
    // O persist está em voo (setMany pendente).
    expect(idb.setMany).toHaveBeenCalledTimes(1)

    // Dispara o rename: encadeado atrás do persist, ainda não leu o meta.
    const renaming = renameProjectMeta('rename-race', 'v2')
    await Bun.sleep(0)
    expect(idb.get).not.toHaveBeenCalled()
    expect(idb.set).not.toHaveBeenCalled()

    // Libera o persist → só então o rename roda seu get-then-set.
    idb.get.mockResolvedValueOnce({ id: 'rename-race', name: 'v1' })
    resolvePersist?.()
    await persisting
    await renaming

    expect(idb.get).toHaveBeenCalledTimes(1)
    expect(idb.set).toHaveBeenCalledTimes(1)
    // O set grava o nome novo por cima do meta lido DEPOIS do persist (não antes).
    const setArgs = idb.set.mock.calls.at(-1) as unknown as unknown[]
    expect((setArgs?.[1] as { name?: string })?.name).toBe('v2')
  })

  it('renames concorrentes do mesmo id serializam (último vence, sem perder leitura)', async () => {
    // Dois renames em sequência imediata: cada um lê o meta corrente e grava.
    // Sem serialização, ambos leriam o MESMO meta e o 2º get poderia rodar antes
    // do 1º set. Com a cadeia, a ordem é get1→set1→get2→set2.
    const order: string[] = []
    idb.get.mockImplementation(async () => {
      order.push('get')
      return { id: 'rename-seq', name: 'base' }
    })
    idb.set.mockImplementation(async () => {
      order.push('set')
      return undefined
    })

    await Promise.all([renameProjectMeta('rename-seq', 'a'), renameProjectMeta('rename-seq', 'b')])

    expect(order).toEqual(['get', 'set', 'get', 'set'])

    idb.get.mockReset()
    idb.set.mockReset()
    idb.get.mockImplementation(async (): Promise<unknown> => undefined)
    idb.set.mockImplementation(async () => undefined)
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
    // Quase enche o espaço restante do teto combinado com o 1º extra (dinâmico
    // sobre os tetos, com folga p/ não esbarrar no limite por-arquivo), de modo que
    // o 2º extra (maior que a folga) estoure o limite combinado.
    const room = PROJECT_FILE_LIMITS.maxTotalChars - 3 * PROJECT_FILE_LIMITS.maxFileChars
    useProjectStore.getState().setExtraFile('helper.js', 'd'.repeat(room - 1000))
    useProjectStore.setState({ isDirty: false, saveError: null })

    useProjectStore.getState().setExtraFile('more.js', 'e'.repeat(2000))

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

  it('preserva kind/tree/proMeta de projeto profissional no roundtrip persist→load', async () => {
    // Regressão: a serialização particionada (meta/files/state) dropava os
    // campos do modo profissional, rebaixando todo projeto pro para classic no
    // reload. Persiste um pro e recarrega pelos MESMOS registros gravados.
    const proProject = {
      ...createEmptyProject('pro-1', 'Pro'),
      mode: 'code' as const,
      kind: 'pro' as const,
      tree: {
        'package.json': { kind: 'file' as const, content: '{}' },
        src: { kind: 'dir' as const },
        'src/main.ts': { kind: 'file' as const, content: 'export {}' },
      },
      proMeta: { devScript: 'dev', templateId: 'react-ts' },
    }
    await persistProject(proProject)
    const lastArgs = idb.setMany.mock.calls.at(-1) as unknown as unknown[]
    const records = (lastArgs?.[0] ?? []) as [string, unknown][]
    const byKey = new Map(records.map(([k, v]) => [k, v]))
    idb.getMany.mockResolvedValueOnce([
      byKey.get('sz:project-meta:pro-1'),
      byKey.get('sz:project-files:pro-1'),
      byKey.get('sz:project-state:pro-1'),
    ])

    const loaded = await useProjectStore.getState().loadProject('pro-1')

    expect(loaded?.kind).toBe('pro')
    expect(loaded?.mode).toBe('code')
    expect(loaded?.proMeta?.templateId).toBe('react-ts')
    expect(loaded?.tree?.['src/main.ts']?.kind).toBe('file')
  })

  it('persiste blocksState fora do registro leve de state', async () => {
    const blocksState = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'sz_js_console_log_text', fields: { VALUE: 'oi' } }],
      },
    }
    await persistProject({ ...createEmptyProject('split-blocks', 'Projeto'), blocksState })

    const lastArgs = idb.setMany.mock.calls.at(-1) as unknown as unknown[]
    const records = (lastArgs?.[0] ?? []) as [string, Record<string, unknown>][]
    const byKey = new Map(records.map(([key, value]) => [key, value]))

    expect(byKey.get('sz:project-meta:split-blocks')?.storageVersion).toBe(2)
    expect(byKey.get('sz:project-state:split-blocks')).toMatchObject({
      id: 'split-blocks',
      ir: expect.anything(),
    })
    expect(byKey.get('sz:project-state:split-blocks')).not.toHaveProperty('blocksState')
    expect(byKey.get('sz:project-blocks:split-blocks')?.blocksState).toEqual(blocksState)
  })

  it('load rápido local não lê state/blocks pesados e preserva o modo salvo', async () => {
    // Abertura rápida: ir/blocksState voltam null (restaurados em segundo plano por
    // hydrateAfterLoad). Ler o blocksState (enorme) aqui travava "Carregando projeto…".
    idb.getMany.mockResolvedValueOnce([
      {
        id: 'fast-open',
        name: 'Projeto rápido',
        createdAt: 10,
        updatedAt: 20,
        mode: 'blocks',
        installedExtensions: [],
      },
      {
        id: 'fast-open',
        files: {
          'index.html': '<h1>ok</h1>',
          'style.css': '',
          'script.js': '',
        },
        extraFiles: [],
      },
      undefined,
    ])

    const loaded = await createLocalPersistenceAdapter().load('fast-open')

    expect(idb.getMany).toHaveBeenCalledWith(
      ['sz:project-meta:fast-open', 'sz:project-files:fast-open', 'sz:project-assets:fast-open'],
      expect.anything(),
    )
    expect(loaded).toMatchObject({
      id: 'fast-open',
      mode: 'blocks',
      ir: null,
      blocksState: null,
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
    })
  })

  it('load rápido local não lê state mesmo no storage v2', async () => {
    idb.getMany.mockResolvedValueOnce([
      {
        id: 'fast-open-v2',
        name: 'Projeto rápido v2',
        createdAt: 10,
        updatedAt: 20,
        mode: 'blocks',
        installedExtensions: [],
        storageVersion: 2,
      },
      {
        id: 'fast-open-v2',
        files: {
          'index.html': '<h1>ok</h1>',
          'style.css': '',
          'script.js': '',
        },
        extraFiles: [],
      },
      undefined,
    ])

    const loaded = await createLocalPersistenceAdapter().load('fast-open-v2')

    expect(idb.getMany).toHaveBeenCalledWith(
      [
        'sz:project-meta:fast-open-v2',
        'sz:project-files:fast-open-v2',
        'sz:project-assets:fast-open-v2',
      ],
      expect.anything(),
    )
    expect(idb.get).not.toHaveBeenCalled()
    expect(loaded).toMatchObject({
      id: 'fast-open-v2',
      mode: 'blocks',
      ir: null,
      blocksState: null,
    })
  })

  it('restore em segundo plano recupera blocksState de projeto LEGADO (junto do IR)', async () => {
    // Projetos salvos ANTES do split guardam blocksState dentro de sz:project-state.
    // O fallback do loadBlocksState evita que o restore devolva null (e o autosave
    // seguinte grave vazio por cima, perdendo os blocos do aluno).
    const blocksState = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'sz_js_console_log_text', fields: { VALUE: 'oi' }, x: 0, y: 0 }],
      },
    }
    // 1º get (partição nova sz:project-blocks) ausente; 2º get (sz:project-state legado) tem o blocksState.
    idb.get.mockResolvedValueOnce(undefined)
    idb.get.mockResolvedValueOnce({ id: 'legacy-blocks', ir: null, blocksState })

    const restored = await createLocalPersistenceAdapter().loadBlocksState?.({
      ...createEmptyProject('legacy-blocks', 'Legado'),
      blocksState: null,
    })

    expect(idb.get).toHaveBeenCalledWith('sz:project-blocks:legacy-blocks', expect.anything())
    expect(idb.get).toHaveBeenCalledWith('sz:project-state:legacy-blocks', expect.anything())
    expect(restored).toEqual(blocksState)
  })

  it('adapter local restaura blocksState pela partição separada', async () => {
    const blocksState = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'sz_js_console_log_text', fields: { VALUE: 'oi' }, x: 320, y: 180 }],
      },
    }
    idb.get.mockResolvedValueOnce({ id: 'fast-open-blocks', blocksState })

    const restored = await createLocalPersistenceAdapter().loadBlocksState?.({
      ...createEmptyProject('fast-open-blocks', 'Projeto'),
      blocksState: null,
    })

    expect(idb.get).toHaveBeenCalledWith('sz:project-blocks:fast-open-blocks', expect.anything())
    expect(restored).toEqual(blocksState)
  })

  it('loads sobrepostos: o mais NOVO vence mesmo resolvendo por último (guard de geração)', async () => {
    // Store próprio: o contador de geração vive no closure do factory (por
    // instância), então isolamos do default para o teste ser determinístico.
    const store = createProjectStore()

    const partitioned = (id: string, name: string) => [
      { id, name, createdAt: 10, updatedAt: 20, mode: 'blocks', installedExtensions: [] },
      {
        id,
        files: { 'index.html': '<h1>ok</h1>', 'style.css': '', 'script.js': '' },
        extraFiles: [],
      },
      { id, ir: null, blocksState: null },
    ]

    // getMany do load A fica PENDURADO; o do load B resolve já. O aluno clicou A
    // e logo B — B é o mais novo e deve ganhar, mesmo se A resolver depois.
    let resolveA: ((value: unknown[]) => void) | undefined
    idb.getMany
      .mockImplementationOnce(
        () =>
          new Promise<unknown[]>((resolve) => {
            resolveA = resolve as (value: unknown[]) => void
          }),
      )
      .mockResolvedValueOnce(partitioned('proj-b', 'Projeto B'))

    const loadA = store.getState().loadProject('proj-a')
    const loadB = store.getState().loadProject('proj-b')

    // B resolve primeiro e instala no store.
    await loadB
    expect(store.getState().project?.id).toBe('proj-b')

    // A resolve por ÚLTIMO (out-of-order): NÃO pode sobrescrever B nem zerar nada.
    resolveA?.(partitioned('proj-a', 'Projeto A'))
    await loadA

    expect(store.getState().project?.id).toBe('proj-b')
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
      // D2: projeto básico legado salvo em 'code' carrega coagido para 'bridge'
      // (o básico só tem Blocos/Ponte; o Código standalone virou exclusivo do pro).
      mode: 'bridge',
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
    // 2 getMany: os metas + as miniaturas (partição própria) — nunca o projeto inteiro.
    expect(idb.getMany).toHaveBeenCalledTimes(2)
    expect(idb.getMany).toHaveBeenCalledWith(
      ['sz:project-meta:a', 'sz:project-meta:b'],
      expect.anything(),
    )
    expect(idb.getMany).toHaveBeenCalledWith(
      ['sz:project-thumb:a', 'sz:project-thumb:b'],
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

  it('a lista LEVE (`listProjectSummariesLight`) não lê as capas; `loadProjectSummaryById` relê meta + capa de UM projeto', async () => {
    idb.keys.mockResolvedValueOnce(['sz:project-meta:a', 'sz:project-meta:b'])
    idb.getMany.mockResolvedValueOnce([
      { id: 'a', name: 'Projeto A', createdAt: 10, updatedAt: 20 },
      { id: 'b', name: 'Projeto B', createdAt: 30, updatedAt: 40 },
    ])
    const light = await listProjectSummariesLight()
    expect(light.map((p) => p.id)).toEqual(['b', 'a'])
    // Um getMany só (os metas): nenhuma chave `sz:project-thumb:` foi pedida.
    expect(idb.getMany).toHaveBeenCalledTimes(1)
    const asked = (idb.getMany.mock.calls as unknown[][]).flatMap((call) => call[0] as string[])
    expect(asked.some((key) => key.startsWith('sz:project-thumb:'))).toBe(false)

    idb.getMany.mockClear()
    idb.getMany.mockResolvedValueOnce([
      { id: 'a', name: 'Projeto A', createdAt: 10, updatedAt: 99 },
      { id: 'a', dataUrl: 'data:image/jpeg;base64,AAA' },
    ])
    await expect(loadProjectSummaryById('a')).resolves.toEqual({
      id: 'a',
      name: 'Projeto A',
      createdAt: 10,
      updatedAt: 99,
      mode: 'blocks',
      thumbDataUrl: 'data:image/jpeg;base64,AAA',
    })
    expect(idb.getMany).toHaveBeenCalledWith(
      ['sz:project-meta:a', 'sz:project-thumb:a'],
      expect.anything(),
    )
    // Apagado: `null` (sem cair no legado quando nem ele existe).
    idb.getMany.mockResolvedValueOnce([undefined, undefined])
    idb.get.mockResolvedValueOnce(undefined)
    await expect(loadProjectSummaryById('sumiu')).resolves.toBeNull()
  })

  it('toda escrita/apagamento local avisa a página (`PROJECT_CHANGED_EVENT` com o id), inclusive o restauro silencioso', async () => {
    const seen: Array<{ id: string; deleted?: boolean }> = []
    const onChanged = (event: Event) => {
      seen.push((event as CustomEvent<{ id: string; deleted?: boolean }>).detail)
    }
    window.addEventListener(PROJECT_CHANGED_EVENT, onChanged)
    try {
      const project = createEmptyProject('01J00000000000000000000EVT', 'Nave')
      await persistProject(project)
      await persistProject(project, { silent: true })
      idb.get.mockResolvedValueOnce({ id: project.id, name: 'Nave', updatedAt: 1 })
      await renameProjectMeta(project.id, 'Nave 2')
      await deleteProject(project.id)
      expect(seen).toEqual([
        { id: project.id, deleted: false },
        { id: project.id, deleted: false },
        { id: project.id, deleted: false },
        { id: project.id, deleted: true },
      ])
    } finally {
      window.removeEventListener(PROJECT_CHANGED_EVENT, onChanged)
    }
  })
})

describe('persistProject — assets só reescritos quando a referência muda', () => {
  beforeEach(() => {
    idb.setMany.mockClear()
  })

  // Chaves passadas no ÚLTIMO setMany (cada par é [chave, registro]).
  const lastSetManyKeys = (): string[] => {
    const args = idb.setMany.mock.calls.at(-1) as unknown as unknown[]
    const pairs = (args?.[0] ?? []) as [string, unknown][]
    return pairs.map(([key]) => key)
  }

  it('1ª gravação SEMPRE materializa a partição de assets', async () => {
    const project = createEmptyProject('assets-first', 'Projeto')
    await persistProject(project)

    expect(lastSetManyKeys()).toContain('sz:project-assets:assets-first')
  })

  it('reescreve meta/files/state mas NÃO assets quando a referência de assets não mudou', async () => {
    const project = createEmptyProject('assets-stable', 'Projeto')
    await persistProject(project)
    idb.setMany.mockClear()

    // Mesma referência de `assets` (mesmo objeto Project): só uma edição de texto.
    await persistProject({ ...project, updatedAt: project.updatedAt + 1 })

    const keys = lastSetManyKeys()
    expect(keys).toContain('sz:project-meta:assets-stable')
    expect(keys).toContain('sz:project-files:assets-stable')
    expect(keys).toContain('sz:project-state:assets-stable')
    // A partição grande NÃO é reescrita à toa no autosave debounced.
    expect(keys).not.toContain('sz:project-assets:assets-stable')
  })

  it('reescreve a partição de assets quando a referência muda (edição de imagem)', async () => {
    const project = createEmptyProject('assets-changed', 'Projeto')
    await persistProject(project)
    idb.setMany.mockClear()

    // `addAsset`/`removeAsset` substituem `assets` por uma NOVA referência: o
    // dirty-check por referência detecta e reescreve a partição.
    const withNewAssets = { ...project, assets: [...(project.assets ?? [])] }
    await persistProject(withNewAssets)

    expect(lastSetManyKeys()).toContain('sz:project-assets:assets-changed')
  })

  it('reescreve a partição de assets na 1ª gravação após uma falha de write (ref não registrada)', async () => {
    const project = createEmptyProject('assets-retry', 'Projeto')
    // 1º write falha (ex.: quota): a referência NÃO é registrada, então o retry
    // precisa reescrever a partição de assets.
    idb.setMany.mockRejectedValueOnce(new Error('QuotaExceededError'))
    await expect(persistProject(project)).rejects.toThrow('QuotaExceededError')
    idb.setMany.mockClear()

    await persistProject({ ...project, updatedAt: project.updatedAt + 1 })

    expect(lastSetManyKeys()).toContain('sz:project-assets:assets-retry')
  })
})

const { setStudioCloudMirror, deleteProject, persistProjectAssets } = await import('./persistence')

describe('espelho da nuvem ("guardado na sua conta")', () => {
  afterEach(() => {
    setStudioCloudMirror(null)
    useProjectStore.setState({ project: null })
  })

  it('persistProjectAssets avisa o espelho E bumpa o `updatedAt` do meta (é a régua da nuvem)', async () => {
    const changed: string[] = []
    setStudioCloudMirror({ onChanged: (id) => changed.push(id), onDeleted: () => {} })
    idb.set.mockClear()
    idb.get.mockResolvedValueOnce({ id: 'assets-sync', name: 'Nave', updatedAt: 1 })
    const before = Date.now()
    await persistProjectAssets('assets-sync', [])
    expect(changed).toEqual(['assets-sync'])
    const metaWrite = idb.set.mock.calls.find(
      (call) => (call as unknown[])[0] === 'sz:project-meta:assets-sync',
    ) as unknown[] | undefined
    expect(metaWrite).toBeDefined()
    const meta = metaWrite?.[1] as { updatedAt: number; name: string }
    expect(meta.name).toBe('Nave')
    expect(meta.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('espelho `null` (aula, playground) não chama nada e não quebra', async () => {
    setStudioCloudMirror(null)
    const project = createEmptyProject('01J00000000000000000000NUL', 'Nave')
    await expect(persistProject(project)).resolves.toBeUndefined()
    await expect(deleteProject(project.id)).resolves.toBeUndefined()
  })

  it('persistProjectAssets NÃO recria a partição de um projeto que já foi apagado (meta ausente): nada gravado, espelho não acordado', async () => {
    const changed: string[] = []
    setStudioCloudMirror({ onChanged: (id) => changed.push(id), onDeleted: () => {} })
    idb.set.mockClear()
    idb.get.mockResolvedValueOnce(undefined) // meta não existe mais
    await persistProjectAssets('apagado-no-meio', [])
    expect(idb.set).not.toHaveBeenCalled()
    expect(changed).toEqual([])
  })

  it('loadProjectSnapshotForCloud devolve os assets SANEADOS (a mesma forma do loadProjectAssetsById): o hash da parte que sobe é o mesmo que a descida compara', async () => {
    const { loadProjectSnapshotForCloud } = await import('../projects/importSnapshot')
    const base = createEmptyProject('01J00000000000000000000SAN', 'Com assets')
    idb.getMany.mockResolvedValueOnce([
      { id: base.id, name: base.name, createdAt: 1, updatedAt: 2, mode: 'blocks' },
      { id: base.id, files: base.files },
      { id: base.id, ir: null, blocksState: null },
      undefined,
      {
        id: base.id,
        assets: [
          { id: 'a1', name: 'Nave', kind: 'image', dataUrl: 'data:image/png;base64,AAAA' },
          { id: 'a2', name: 'Nave', kind: 'image', dataUrl: 'data:image/png;base64,BBBB' },
          { id: 'a3', name: 'Doc', kind: 'pdf', dataUrl: 'data:application/pdf;base64,CCCC' },
        ],
      },
    ])
    const project = await loadProjectSnapshotForCloud(base.id)
    expect(project?.assets?.map((asset) => asset.id)).toEqual(['a1'])
  })

  it('loadProjectSummariesByIds lê os resumos de vários projetos num `getMany` só (meta + capa de cada) e devolve null para quem não existe', async () => {
    const { loadProjectSummariesByIds } = await import('./persistence')
    idb.getMany.mockClear()
    idb.get.mockClear()
    idb.getMany.mockResolvedValueOnce([
      { id: 'p1', name: 'Um', createdAt: 1, updatedAt: 5, mode: 'blocks' },
      { id: 'p1', dataUrl: 'data:image/jpeg;base64,CAPA' },
      undefined,
      undefined,
    ])
    const [um, sumiu] = await loadProjectSummariesByIds(['p1', 'p2'])
    expect(um?.name).toBe('Um')
    expect(um?.thumbDataUrl).toBe('data:image/jpeg;base64,CAPA')
    expect(sumiu).toBeNull()
    expect(idb.getMany).toHaveBeenCalledTimes(1)
    expect((idb.getMany.mock.calls[0] as unknown[])[0]).toEqual([
      'sz:project-meta:p1',
      'sz:project-thumb:p1',
      'sz:project-meta:p2',
      'sz:project-thumb:p2',
    ])
  })

  it('loadProjectAssetsSnapshotForCloud lê SÓ a partição de assets, no DB do perfil pedido (a descida em partes reaproveita o que já está aqui)', async () => {
    const { loadProjectAssetsSnapshotForCloud } = await import('../projects/importSnapshot')
    idb.createStore.mockClear()
    idb.get.mockClear()
    idb.getMany.mockClear()
    idb.get.mockResolvedValueOnce({
      id: 'jogo-p',
      assets: [
        { id: 'a1', name: 'Nave', kind: 'image', dataUrl: 'data:image/png;base64,AAAA' },
        { id: 'a2', name: 'Nave', kind: 'image', dataUrl: 'data:image/png;base64,BBBB' },
        { id: 'a3', name: 'Doc', kind: 'pdf', dataUrl: 'data:application/pdf;base64,CCCC' },
      ],
    })
    const assets = await loadProjectAssetsSnapshotForCloud('jogo-p', { namespace: 'perfil-Z' })
    // Saneado como o resto do pacote (nome repetido e tipo desconhecido caem) e lido do DB do perfil.
    expect(assets.map((asset) => asset.id)).toEqual(['a1'])
    expect(idb.createStore).toHaveBeenCalledWith('sistema-zero-studio-perfil-Z', 'kv')
    expect(idb.get).toHaveBeenCalledTimes(1)
    expect((idb.get.mock.calls[0] as unknown[])[0]).toBe('sz:project-assets:jogo-p')
    expect(idb.getMany).not.toHaveBeenCalled()
    // Sem partição (legado) → lista vazia, sem lançar.
    idb.get.mockResolvedValueOnce(undefined)
    expect(await loadProjectAssetsSnapshotForCloud('legado', { namespace: 'perfil-Z' })).toEqual([])
  })

  it('o restauro SUBSTITUI: apaga a partição de blocos quando o snapshot não traz blocos, e a capa antiga', async () => {
    idb.delMany.mockClear()
    const raw = {
      ...createEmptyProject('01J00000000000000000000RPL', 'Sem blocos'),
      blocksState: null,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
    }
    await useProjectStore.getState().restoreProjectSnapshot(raw)
    const deleted = idb.delMany.mock.calls.flatMap((call) => (call as unknown[])[0] as string[])
    expect(deleted).toContain('sz:project-blocks:01J00000000000000000000RPL')
    expect(deleted).toContain('sz:project-thumb:01J00000000000000000000RPL')
  })

  it('o restauro é ESTRITO: bloco que esta versão não reconhece RECUSA (nada gravado, partição de blocos intacta); canvas VAZIO da origem passa sem aviso e apaga a partição', async () => {
    idb.setMany.mockClear()
    idb.delMany.mockClear()
    const base = createEmptyProject('01J00000000000000000000STR', 'Novo demais')
    // Um jogo salvo por um bundle mais novo (bloco desconhecido aqui): antes virava
    // "aviso" + `replace` apagando os blocos locais; agora recusa antes de tocar no disco.
    await expect(
      useProjectStore.getState().restoreProjectSnapshot(
        {
          ...base,
          blocksState: {
            blocks: {
              languageVersion: 0,
              blocks: [{ type: 'bloco_do_futuro', fields: {} }],
            },
          },
          createdAt: 1,
          updatedAt: 2,
        },
        { expectedId: base.id },
      ),
    ).rejects.toThrow(/não reconhece/)
    expect(idb.setMany).not.toHaveBeenCalled()
    expect(idb.delMany).not.toHaveBeenCalled()
    // A validação SEM gravar (o que o adaptador da nuvem chama no fetch) recusa igual.
    const { validateCloudProjectSnapshot } = await import('../projects/importSnapshot')
    expect(() =>
      validateCloudProjectSnapshot(
        { ...base, ir: { versao: 'do futuro' } },
        { expectedId: base.id },
      ),
    ).toThrow(/não reconhece/)
    // Canvas VAZIO (o que o Blockly grava com o canvas limpo): não é "blocos descartados".
    const { project, warnings } = await useProjectStore.getState().restoreProjectSnapshot(
      {
        ...base,
        blocksState: { [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION },
        createdAt: 1,
        updatedAt: 2,
      },
      { expectedId: base.id },
    )
    expect(warnings).toEqual([])
    expect(project.blocksState).toBeNull()
    expect(idb.setMany).toHaveBeenCalled()
    const deleted = idb.delMany.mock.calls.flatMap((call) => (call as unknown[])[0] as string[])
    expect(deleted).toContain('sz:project-blocks:01J00000000000000000000STR')
    // O `validate` do mesmo snapshot devolve o mesmo projeto, sem gravar nada a mais.
    idb.setMany.mockClear()
    const validated = validateCloudProjectSnapshot(
      { ...base, blocksState: { [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION } },
      { expectedId: base.id },
    )
    expect(validated.project.id).toBe(base.id)
    expect(validated.warnings).toEqual([])
    expect(idb.setMany).not.toHaveBeenCalled()
  })

  it('o restauro recusa projeto aberto em QUALQUER store (as por instância do editor, não só a default)', async () => {
    idb.setMany.mockClear()
    const instance = createProjectStore()
    instance.setState({
      project: createEmptyProject('01J00000000000000000000INS', 'Aberto na instância'),
    })
    const raw = {
      ...createEmptyProject('01J00000000000000000000INS', 'Da nuvem'),
      createdAt: 1,
      updatedAt: 2,
    }
    await expect(
      useProjectStore.getState().restoreProjectSnapshot(raw, {
        expectedId: '01J00000000000000000000INS',
      }),
    ).rejects.toThrow(/aberto/)
    expect(idb.setMany).not.toHaveBeenCalled()
    // Fechou (trocou de projeto): o restauro passa.
    instance.setState({ project: null })
    await expect(
      useProjectStore.getState().restoreProjectSnapshot(raw, {
        expectedId: '01J00000000000000000000INS',
      }),
    ).resolves.toBeDefined()
  })

  it('o restauro recusa id inesperado ou inválido ANTES de gravar, e recusa projeto ABERTO', async () => {
    idb.setMany.mockClear()
    const raw = {
      ...createEmptyProject('01J00000000000000000000EXP', 'Nave'),
      createdAt: 1,
      updatedAt: 2,
    }
    await expect(
      useProjectStore.getState().restoreProjectSnapshot(raw, { expectedId: 'outro-id' }),
    ).rejects.toThrow(/id do projeto/)
    await expect(
      useProjectStore.getState().restoreProjectSnapshot({ ...raw, id: 'id com espaços!' }),
    ).rejects.toThrow(/id do projeto/)
    expect(idb.setMany).not.toHaveBeenCalled()

    // Aberto no editor: recusa (a memória viva subiria por cima).
    useProjectStore.setState({
      project: createEmptyProject('01J00000000000000000000EXP', 'Aberto'),
    })
    await expect(
      useProjectStore.getState().restoreProjectSnapshot(raw, {
        expectedId: '01J00000000000000000000EXP',
      }),
    ).rejects.toThrow(/aberto/)
    expect(idb.setMany).not.toHaveBeenCalled()
  })

  it('persistProject/renameProjectMeta/deleteProject avisam o espelho; `silent` e o restauro não', async () => {
    const changed: string[] = []
    const deleted: string[] = []
    setStudioCloudMirror({
      onChanged: (id) => changed.push(id),
      onDeleted: (id) => deleted.push(id),
    })
    const project = createEmptyProject('01J00000000000000000000MIR', 'Nave')

    await persistProject(project)
    expect(changed).toEqual([project.id])

    idb.get.mockResolvedValueOnce({ id: project.id, name: 'Nave', updatedAt: 1 })
    await renameProjectMeta(project.id, 'Nave 2')
    expect(changed).toEqual([project.id, project.id])

    await persistProject(project, { silent: true })
    expect(changed).toHaveLength(2)

    await deleteProject(project.id)
    expect(deleted).toEqual([project.id])

    // O restauro grava com o MESMO id e as datas de origem, em silêncio.
    const raw = {
      ...createEmptyProject('01J00000000000000000000RST', 'Vinda da nuvem'),
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
    }
    const { project: restored } = await useProjectStore.getState().restoreProjectSnapshot(raw)
    expect(restored.id).toBe('01J00000000000000000000RST')
    expect(restored.createdAt).toBe(1_700_000_000_000)
    expect(restored.updatedAt).toBe(1_700_000_100_000)
    expect(restored.name).toBe('Vinda da nuvem')
    expect(changed).toHaveLength(2)
    expect(idb.setMany).toHaveBeenCalled()
  })

  it('um espelho que lança não derruba a gravação local', async () => {
    setStudioCloudMirror({
      onChanged: () => {
        throw new Error('nuvem fora do ar')
      },
      onDeleted: () => {
        throw new Error('nuvem fora do ar')
      },
    })
    const project = createEmptyProject('01J00000000000000000000ERR', 'Nave')
    await expect(persistProject(project)).resolves.toBeUndefined()
    await expect(deleteProject(project.id)).resolves.toBeUndefined()
  })

  it('o import de .szproject.json continua mintando id NOVO e avisa o espelho', async () => {
    const changed: string[] = []
    setStudioCloudMirror({ onChanged: (id) => changed.push(id), onDeleted: () => {} })
    const raw = createEmptyProject('01J00000000000000000000IMP', 'Importado')
    const { project } = await useProjectStore.getState().importProjectFromJSON(raw)
    expect(project.id).not.toBe('01J00000000000000000000IMP')
    expect(changed).toEqual([project.id])
  })
})
