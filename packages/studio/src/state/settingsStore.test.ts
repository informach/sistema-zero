import { beforeEach, describe, expect, it, mock } from 'bun:test'

// settingsStore agora faz bail cedo se `indexedDB` não existir (igual ao
// gameStorage.ts — Firefox modo privado, contextos restritos). O happy-dom não
// registra `indexedDB`, então damos um stub para o caminho real (createStore→
// get/update mockados) continuar sendo exercitado.
const globalWithIdb = globalThis as { indexedDB?: unknown }
globalWithIdb.indexedDB = globalWithIdb.indexedDB ?? {}

// bun:test não hoista mocks (sem vi.hoisted): declara o objeto antes do
// mock.module e importa o módulo sob teste DEPOIS, dinamicamente.
// O mock de idb-keyval NÃO é restaurado no afterAll de propósito: o registry
// de módulos é compartilhado pela suíte toda e o IndexedDB real não existe no
// happy-dom — o no-op é a opção segura para os arquivos seguintes.
// ⚠️ Por ISSO o mock precisa exportar a superfície COMPLETA consumida em src/
// (persistence.ts importa getMany/setMany/delMany/keys): como o registry é
// global, o PRIMEIRO arquivo a mockar define o shape p/ a suíte toda — no Linux
// (ordem de arquivos ≠ Windows) um mock estreito quebrava o linker do CI com
// "Export named 'getMany' not found".
//
// update() modela a transação atômica do idb-keyval real: read-modify-write
// SERIALIZADO por chave (cada chamada espera a anterior na cauda da promise),
// para o teste de setters concorrentes provar que nenhum patch se perde.
const memory = new Map<unknown, unknown>()
let updateChain: Promise<void> = Promise.resolve()
const idb = {
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (key: unknown): Promise<unknown> => memory.get(key)),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async (key: unknown, value: unknown) => {
    memory.set(key, value)
  }),
  setMany: mock(async () => undefined),
  update: mock((key: unknown, updater: (old: unknown) => unknown): Promise<void> => {
    updateChain = updateChain.then(() => {
      memory.set(key, updater(memory.get(key)))
    })
    return updateChain
  }),
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
  CODE_FONT_SIZE_DEFAULT,
  CODE_FONT_SIZE_MIN,
  DEFAULT_AI_MODEL,
  normalizeAIModel,
  useSettingsStore,
} = await import('./settingsStore')

describe('normalizeAIModel', () => {
  it('migra o Claude 3.5 Sonnet legado para o modelo latest recomendado', () => {
    expect(normalizeAIModel('anthropic/claude-3.5-sonnet')).toBe(DEFAULT_AI_MODEL)
  })

  it('preserva modelos conhecidos e normaliza valores vazios ou desconhecidos', () => {
    expect(normalizeAIModel('anthropic/claude-sonnet-4.5')).toBe('anthropic/claude-sonnet-4.5')
    expect(normalizeAIModel('')).toBe(DEFAULT_AI_MODEL)
    expect(normalizeAIModel('provider/model-inexistente')).toBe(DEFAULT_AI_MODEL)
  })
})

describe('useSettingsStore persistence', () => {
  beforeEach(() => {
    idb.createStore.mockClear()
    idb.get.mockClear()
    idb.set.mockClear()
    idb.update.mockClear()
    memory.clear()
    updateChain = Promise.resolve()
    useSettingsStore.setState({
      aiApiKey: '',
      aiApiKeyStorage: 'session',
      aiModel: DEFAULT_AI_MODEL,
      theme: 'dark',
      codeFontSize: CODE_FONT_SIZE_DEFAULT,
      loaded: false,
    })
  })

  it('sanitiza settings corrompidas antes de hidratar a store', async () => {
    idb.get.mockResolvedValueOnce({
      aiApiKey: 123,
      aiApiKeyStorage: 'disk',
      aiModel: 'provider/model-inexistente',
      theme: 'sepia',
      codeFontSize: -10,
    })

    await useSettingsStore.getState().load()

    const state = useSettingsStore.getState()
    expect(state.aiApiKey).toBe('')
    expect(state.aiApiKeyStorage).toBe('session')
    expect(state.aiModel).toBe(DEFAULT_AI_MODEL)
    expect(state.theme).toBe('dark')
    expect(state.codeFontSize).toBe(CODE_FONT_SIZE_MIN)
    expect(state.loaded).toBe(true)
  })

  it('mantem chave persistida legada como persistente quando storage nao existe', async () => {
    idb.get.mockResolvedValueOnce({ aiApiKey: 'sk-or-v1-old' })

    await useSettingsStore.getState().load()

    expect(useSettingsStore.getState().aiApiKey).toBe('sk-or-v1-old')
    expect(useSettingsStore.getState().aiApiKeyStorage).toBe('persistent')
  })

  it('não grava a chave quando o modo da chave é somente sessão', async () => {
    await useSettingsStore.getState().setAIApiKey(' sk-session ', { storage: 'session' })

    expect(useSettingsStore.getState().aiApiKey).toBe('sk-session')
    expect(useSettingsStore.getState().aiApiKeyStorage).toBe('session')
    expect(idb.update).toHaveBeenCalledWith('sz:settings', expect.any(Function), expect.anything())
    expect(memory.get('sz:settings')).toEqual({ aiApiKeyStorage: 'session' })
  })

  it('remove a chave persistida quando o usuário limpa a configuração', async () => {
    memory.set('sz:settings', {
      aiApiKey: 'sk-or-v1-old',
      aiApiKeyStorage: 'persistent',
    })

    await useSettingsStore.getState().clearAIApiKey()

    expect(useSettingsStore.getState().aiApiKey).toBe('')
    expect(memory.get('sz:settings')).toEqual({ aiApiKeyStorage: 'persistent' })
  })

  it('é idempotente: re-load preserva a chave de sessão em memória (2ª montagem não rebaixa o provider)', async () => {
    // 1ª carga: storage vazio → store hidratada com loaded=true.
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().loaded).toBe(true)

    // Usuário digita a chave no modo SESSÃO (vive só em memória, não vai pro IDB).
    await useSettingsStore.getState().setAIApiKey('sk-session-only', { storage: 'session' })
    expect(useSettingsStore.getState().aiApiKey).toBe('sk-session-only')

    // 2ª montagem de <Studio>/<ProjectList> re-chama load(): deve sair cedo e
    // NÃO rodar o setState destrutivo que zeraria a chave de sessão.
    idb.get.mockClear()
    await useSettingsStore.getState().load()

    expect(useSettingsStore.getState().aiApiKey).toBe('sk-session-only')
    expect(useSettingsStore.getState().aiApiKeyStorage).toBe('session')
    // Saiu cedo: nem leu o IndexedDB de novo.
    expect(idb.get).not.toHaveBeenCalled()
  })

  it('coalesce primeiras cargas concorrentes numa única leitura/hidratação', async () => {
    memory.set('sz:settings', { aiModel: 'anthropic/claude-haiku-4.5', theme: 'light' })
    idb.get.mockClear()

    // Duas montagens simultâneas disparam load() antes de qualquer setState.
    await Promise.all([useSettingsStore.getState().load(), useSettingsStore.getState().load()])

    expect(useSettingsStore.getState().loaded).toBe(true)
    expect(useSettingsStore.getState().aiModel).toBe('anthropic/claude-haiku-4.5')
    expect(useSettingsStore.getState().theme).toBe('light')
    // Coalescido: só uma leitura do IndexedDB, não duas.
    expect(idb.get).toHaveBeenCalledTimes(1)
  })

  it('leitura do IndexedDB que LANÇA cai nos defaults com loaded:true (não pendura)', async () => {
    // Firefox modo privado / IDB bloqueado: o get() rejeita. Sem o try/catch no
    // loader a store ficava loaded:false para sempre e todo awaiter coalescido
    // rejeitava. Agora caímos para os defaults em memória, loaded:true, sem throw.
    idb.get.mockRejectedValueOnce(new Error('InvalidStateError: IDB bloqueado'))

    await expect(useSettingsStore.getState().load()).resolves.toBeUndefined()

    const state = useSettingsStore.getState()
    expect(state.loaded).toBe(true)
    expect(state.aiModel).toBe(DEFAULT_AI_MODEL)
    expect(state.theme).toBe('dark')
    expect(state.codeFontSize).toBe(CODE_FONT_SIZE_DEFAULT)
  })

  it('persiste os dois patches quando setters concorrentes se sobrepõem', async () => {
    // get+set separado fazia ambos lerem o mesmo estado vazio e o último
    // gravava por cima; o update() atômico enfileira e mescla os dois.
    await Promise.all([
      useSettingsStore.getState().setTheme('light'),
      useSettingsStore.getState().setAIModel('anthropic/claude-haiku-4.5'),
    ])

    const persisted = memory.get('sz:settings')
    expect(persisted).toMatchObject({
      theme: 'light',
      aiModel: 'anthropic/claude-haiku-4.5',
    })
    // Estado em memória continua imediato para os dois.
    expect(useSettingsStore.getState().theme).toBe('light')
    expect(useSettingsStore.getState().aiModel).toBe('anthropic/claude-haiku-4.5')
  })
})
