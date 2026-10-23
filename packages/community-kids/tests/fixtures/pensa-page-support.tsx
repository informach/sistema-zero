import { beforeEach, describe, expect, mock, test } from 'bun:test'

/**
 * O `/pensa` passa ao Pensa a sessão de suporte só leitura que ele já conhece (a mesma régua que
 * desliga a fala), para a faixa de leitura aparecer desde o primeiro quadro, sem esperar a
 * primeira recusa do BFF. Só os adaptadores de sessão, do Members e do shell são falsos. Roda em processo próprio
 * (`tests/pensa-page-support.test.ts`): o `mock.module` do bun vale para todos os arquivos.
 */
const getSession = mock()
const checkPensaAccessReadonly = mock()
const getGamificationReadonly = mock()
// A página lê a env (a chave da narração); um segredo de desenvolvimento basta para o parse.
process.env.JWT_HS256_SECRET ??= 'pensa-page-support-test-secret-0123456789'

mock.module('server-only', () => ({}))
mock.module('@/server/session', () => ({ getSession }))
mock.module('../../src/server/session', () => ({ getSession }))
const membersMock = { checkPensaAccessReadonly, getGamificationReadonly }
mock.module('@/server/members', () => membersMock)
mock.module('../../src/server/members', () => membersMock)
const shellMock = { shell: { auth: { getMyProfileReadonly: async () => null } } }
mock.module('@/server/shell', () => shellMock)
mock.module('../../src/server/shell', () => shellMock)

const { kidsView } = await import('../kids-journey-fixtures')
const { default: PensaPage } = await import('../../src/app/(app)/pensa/page')
const { PensaClient } = await import('../../src/components/kids/pensa-client')

async function clientProps() {
  const element = (await PensaPage({ searchParams: Promise.resolve({}) })) as {
    type: unknown
    props: { supportReadOnly?: boolean; voiceEnabled?: boolean }
  }
  expect(element.type).toBe(PensaClient)
  return element.props
}

beforeEach(() => {
  getSession.mockReset()
  checkPensaAccessReadonly.mockReset()
  getGamificationReadonly.mockReset()
  checkPensaAccessReadonly.mockResolvedValue({ status: 200, body: { access: { pensa: true } } })
  getGamificationReadonly.mockResolvedValue({
    status: 200,
    body: { kidsJourney: kidsView(['pensa', 'ai'], 'hacker') },
  })
})

describe('o /pensa e a sessão de suporte', () => {
  test('suporte só leitura começa em leitura e sem a fala', async () => {
    getSession.mockResolvedValue({
      id: 'perfil-1',
      kids: { kind: 'student' },
      act: { sub: 'equipe-1', mode: 'readonly' },
    })
    const props = await clientProps()
    expect(props.supportReadOnly).toBe(true)
    expect(props.voiceEnabled).toBe(false)
  })
  test('suporte com escrita liberada e a criança sozinha não ligam a leitura', async () => {
    getSession.mockResolvedValue({
      id: 'perfil-1',
      kids: { kind: 'student' },
      act: { sub: 'equipe-1', mode: 'write' },
    })
    expect((await clientProps()).supportReadOnly).toBe(false)
    getSession.mockResolvedValue({ id: 'perfil-1', kids: { kind: 'parent' } })
    expect((await clientProps()).supportReadOnly).toBe(false)
  })
})
