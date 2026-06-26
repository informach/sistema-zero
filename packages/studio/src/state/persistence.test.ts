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

const { listAllProjects, persistProject, renameProjectMeta } = await import('./persistence')
const { createProjectStore, MAX_BLOCKSTATE_BLOCKS, PROJECT_FILE_LIMITS, useProjectStore } =
  await import('./projectStore')
const { cancelPendingAutosavesFor, createPersistenceService, setAutosaveDelayForTests } =
  await import('../persistence/service')
const { createLocalPersistenceAdapter } = await import('../persistence/local')
const { setStorageNamespace } = await import('./persistence')

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
    const list = createLocalPersistenceAdapter().list
    if (!list) throw new Error('adapter local sem list()') // narrow p/ o typecheck (list é opcional na interface)
    idb.createStore.mockClear()
    setStorageNamespace('perfil-A')
    await list()
    expect(idb.createStore).toHaveBeenCalledWith('sistema-zero-studio-perfil-A', 'kv')

    idb.createStore.mockClear()
    setStorageNamespace('') // sem perfil → store padrão (lição/adulto)
    await list()
    expect(idb.createStore).toHaveBeenCalledWith('sistema-zero-studio', 'kv')
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
        'sz:project:project-1',
        // Armazenamento do programa do aluno (blocos "guardar/ler") deste projeto.
        'sz:game-storage:project-1',
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
    // O descarte (silencioso antes) agora vira aviso para a UI mostrar.
    expect(warnings.some((w) => w.includes('blocos não foram carregados'))).toBe(true)
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
