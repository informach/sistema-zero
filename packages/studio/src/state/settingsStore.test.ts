import { beforeEach, describe, expect, it, mock } from 'bun:test'

// bun:test não hoista mocks (sem vi.hoisted): declara o objeto antes do
// mock.module e importa o módulo sob teste DEPOIS, dinamicamente.
// O mock de idb-keyval NÃO é restaurado no afterAll de propósito: o registry
// de módulos é compartilhado pela suíte toda e o IndexedDB real não existe no
// happy-dom — o no-op é a opção segura para os arquivos seguintes.
const idb = {
  createStore: mock(() => ({ name: 'test-store' })),
  get: mock(async (): Promise<unknown> => undefined),
  set: mock(async () => undefined),
}

mock.module('idb-keyval', () => ({
  createStore: idb.createStore,
  get: idb.get,
  set: idb.set,
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
    useSettingsStore.setState({
      aiApiKey: '',
      aiApiKeyStorage: 'session',
      aiModel: DEFAULT_AI_MODEL,
      theme: 'dark',
      fontSize: 16,
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
      fontSize: 999,
      codeFontSize: -10,
    })

    await useSettingsStore.getState().load()

    const state = useSettingsStore.getState()
    expect(state.aiApiKey).toBe('')
    expect(state.aiApiKeyStorage).toBe('session')
    expect(state.aiModel).toBe(DEFAULT_AI_MODEL)
    expect(state.theme).toBe('dark')
    expect(state.fontSize).toBe(22)
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
    expect(idb.set).toHaveBeenCalledWith(
      'sz:settings',
      { aiApiKeyStorage: 'session' },
      expect.anything(),
    )
  })

  it('remove a chave persistida quando o usuário limpa a configuração', async () => {
    idb.get.mockResolvedValueOnce({
      aiApiKey: 'sk-or-v1-old',
      aiApiKeyStorage: 'persistent',
    })

    await useSettingsStore.getState().clearAIApiKey()

    expect(useSettingsStore.getState().aiApiKey).toBe('')
    expect(idb.set).toHaveBeenCalledWith(
      'sz:settings',
      { aiApiKeyStorage: 'persistent' },
      expect.anything(),
    )
  })
})
