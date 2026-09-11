import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { fakeIdbReads, fakeUseStore, resetFakeIdb } from '../testing/fakeIdbStore'

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
// happy-dom — o no-op é a opção segura para os arquivos seguintes (restaurar o
// idb-keyval REAL derrubaria qualquer arquivo posterior que dependa do mock
// residual). Por isso ESTE arquivo não copia o padrão "capturar real + restaurar"
// do BlocksMode.test.tsx: `await import('idb-keyval')` aqui já poderia devolver o
// mock de OUTRO arquivo (14 arquivos mockam idb-keyval), então não há "real"
// confiável a capturar. A blindagem cross-file vem do beforeEach (ver abaixo).
// ⚠️ Por ISSO o mock precisa exportar a superfície COMPLETA consumida em src/
// (persistence.ts importa getMany/setMany/delMany/keys): como o registry é
// global, o PRIMEIRO arquivo a mockar define o shape p/ a suíte toda — no Linux
// (ordem de arquivos ≠ Windows) um mock estreito quebrava o linker do CI com
// "Export named 'getMany' not found".
//
// ⚠️ FLAKY cross-file (CI do monorepo) — causa RAIZ: a suíte roda num único
// processo e outro arquivo pode disparar `load()` ANTES deste definir o stub de
// `indexedDB` acima. O getStore() do settingsStore.ts latchava `storeInitFailed`
// p/ SEMPRE nesse caso e `readPersisted()` devolvia `{}` sem nunca chamar o get
// — hidratava nos DEFAULTS (modelo padrão, chave '', fonte 13). Passa isolado,
// mas a ordem de travessia do runner (Linux ≠ Windows) decide se há poluidor
// antes. Cura no FONTE: getStore() não latcha mais quando `indexedDB` está
// ausente (volta a tentar quando o stub aparece); latch só p/ createStore que
// lança. Aqui no teste, cinto-e-suspensório contra poluição de mocks: reaplicar
// ESTE mock no beforeEach (idbModuleFactory) re-liga os imports vivos ao `idb`
// daqui caso outro arquivo tenha mockado idb-keyval por cima (registry global).
//
// update() modela a transação atômica do idb-keyval real: read-modify-write
// SERIALIZADO por chave (cada chamada espera a anterior na cauda da promise),
// para o teste de setters concorrentes provar que nenhum patch se perde.
//
// Dois bancos (11/09/2026): `memory` é o banco PRÓPRIO das preferências
// (`sz-studio-settings`), onde elas moram agora; `legacy` é o banco dos projetos do
// namespace padrão (`sistema-zero-studio`), de onde a primeira carga as traz. A leitura
// de lá é uma transação do próprio store (`testing/fakeIdbStore.ts`), que responde pelo
// `get` deste mock com o store no argumento: é pelo `.name` dele que se escolhe o Map.
const memory = new Map<unknown, unknown>()
const legacy = new Map<unknown, unknown>()
const LEGACY_DB = 'sistema-zero-studio'
const mapOf = (store: unknown) =>
  (store as { name?: string } | undefined)?.name === LEGACY_DB ? legacy : memory
let updateChain: Promise<void> = Promise.resolve()
const idb = {
  createStore: mock((dbName: string) => fakeUseStore(dbName)),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (key: unknown, store?: unknown): Promise<unknown> => mapOf(store).get(key)),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async (key: unknown, value: unknown) => {
    memory.set(key, value)
  }),
  setMany: mock(async () => undefined),
  update: mock(
    (key: unknown, updater: (old: unknown) => unknown, store?: unknown): Promise<void> => {
      updateChain = updateChain.then(() => {
        const kv = mapOf(store)
        kv.set(key, updater(kv.get(key)))
      })
      return updateChain
    },
  ),
}

// Fábrica reaplicável: o beforeEach chama de novo p/ re-ligar os imports vivos
// do settingsStore ao `idb` DESTE arquivo, desfazendo poluição de outro arquivo.
const idbModuleFactory = () => ({
  createStore: idb.createStore,
  del: idb.del,
  delMany: idb.delMany,
  get: idb.get,
  getMany: idb.getMany,
  keys: idb.keys,
  set: idb.set,
  setMany: idb.setMany,
  update: idb.update,
})

mock.module('idb-keyval', idbModuleFactory)

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
    // 1º: reancora o mock de idb-keyval NESTE arquivo. Sem isso, um arquivo que
    // rodou antes (e mockou idb-keyval com o `idb` DELE) deixaria os imports
    // vivos do settingsStore lendo pelo mock alheio → load() cai nos defaults e
    // as asserções falham com valores determinísticos (ver comentário do topo).
    mock.module('idb-keyval', idbModuleFactory)
    idb.createStore.mockClear()
    idb.get.mockClear()
    idb.set.mockClear()
    idb.update.mockClear()
    memory.clear()
    legacy.clear()
    resetFakeIdb()
    updateChain = Promise.resolve()
    // Reseta o SINGLETON do settingsStore (loaded:false força o load() a hidratar
    // de novo em vez de sair cedo por causa de estado vazado de outro arquivo).
    useSettingsStore.setState({
      aiApiKey: '',
      aiApiKeyStorage: 'session',
      aiModel: DEFAULT_AI_MODEL,
      theme: 'dark',
      codeFontSize: CODE_FONT_SIZE_DEFAULT,
      loaded: false,
    })
  })

  afterEach(() => {
    // Higiene: não deixa `memory`/histórico vazarem p/ um eventual arquivo que
    // caia neste mock residual antes de aplicar o seu (todos reaplicam, mas o
    // custo é nulo e o estado fica limpo p/ depuração).
    memory.clear()
    legacy.clear()
    updateChain = Promise.resolve()
    idb.get.mockClear()
    idb.set.mockClear()
    idb.update.mockClear()
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
    // tema inválido ('sepia') → cai no default do estúdio (claro/creme).
    expect(state.theme).toBe('light')
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

  it('as preferências moram no banco PRÓPRIO, fora do banco dos projetos', async () => {
    await useSettingsStore.getState().setTheme('light')

    const store = idb.update.mock.calls.at(-1)?.[2] as { name?: string } | undefined
    expect(store?.name).toBe('sz-studio-settings')
    expect(legacy.size).toBe(0)
  })

  it('a primeira carga traz as preferências do lugar antigo, por uma leitura com commit explícito', async () => {
    // O lugar antigo é o banco dos projetos do namespace padrão: toda transação dele fecha
    // com commit (ver `idbTransaction.ts`), inclusive esta.
    legacy.set('sz:settings', {
      aiApiKey: 'sk-or-v1-antiga',
      aiApiKeyStorage: 'persistent',
      theme: 'light',
      codeFontSize: 18,
    })

    await useSettingsStore.getState().load()

    const state = useSettingsStore.getState()
    expect(state.aiApiKey).toBe('sk-or-v1-antiga')
    expect(state.theme).toBe('light')
    expect(state.codeFontSize).toBe(18)
    expect(memory.get('sz:settings')).toEqual({
      aiApiKey: 'sk-or-v1-antiga',
      aiApiKeyStorage: 'persistent',
      theme: 'light',
      codeFontSize: 18,
    })
    const legacyReads = fakeIdbReads().filter((read) => read.db === LEGACY_DB)
    expect(legacyReads.map((read) => read.steps)).toEqual([
      [{ type: 'get', key: 'sz:settings' }, { type: 'commit' }],
    ])
    // O original fica onde estava: um bundle antigo ainda aberto noutra aba lê de lá.
    expect(legacy.has('sz:settings')).toBe(true)
  })

  it('com o banco próprio preenchido, não olha o lugar antigo', async () => {
    memory.set('sz:settings', { theme: 'light', codeFontSize: 20 })
    legacy.set('sz:settings', { theme: 'dark', codeFontSize: 11 })

    await useSettingsStore.getState().load()

    expect(useSettingsStore.getState().codeFontSize).toBe(20)
    expect(fakeIdbReads().filter((read) => read.db === LEGACY_DB)).toHaveLength(0)
  })

  it('um setter que gravou durante a primeira carga vence o que veio de lá, campo a campo', async () => {
    legacy.set('sz:settings', { theme: 'dark', codeFontSize: 18 })
    // A leitura do lugar antigo segura a carga; o setter entra antes de ela terminar.
    const loading = useSettingsStore.getState().load()
    await useSettingsStore.getState().setCodeFontSize(22)
    await loading

    expect(memory.get('sz:settings')).toMatchObject({ theme: 'dark', codeFontSize: 22 })
    // E a memória fica com o que foi gravado, não com o que veio de lá.
    expect(useSettingsStore.getState().codeFontSize).toBe(22)
    expect(useSettingsStore.getState().theme).toBe('dark')
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
