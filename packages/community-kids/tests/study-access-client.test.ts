import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  CONNECTION_MESSAGE,
  StudyRequestError,
  studyErrorMessage,
  studyRequest,
} from '../src/lib/study-access-client'

const originalFetch = globalThis.fetch
function install(handler: () => Response | Promise<Response>) {
  globalThis.fetch = Object.assign(
    mock(async () => handler()),
    { preconnect: originalFetch.preconnect },
  )
}
afterEach(() => {
  globalThis.fetch = originalFetch
})

async function failure(promise: Promise<unknown>): Promise<StudyRequestError> {
  const error = await promise.then(
    () => null,
    (cause: unknown) => cause,
  )
  expect(error).toBeInstanceOf(StudyRequestError)
  return error as StudyRequestError
}

describe('as falhas de transporte nunca chegam cruas à tela', () => {
  test('fetch que rejeita (rede fora, tempo esgotado) vira a frase de conexão', async () => {
    install(() => Promise.reject(new TypeError('Failed to fetch')))
    const error = await failure(studyRequest('/api/study/redeem', { code: 'X' }))
    expect(error.message).toBe(CONNECTION_MESSAGE)
    expect(error.message).not.toContain('fetch')
  })

  test('página de erro em HTML (proxy, gateway) não vira "JSON Parse error"', async () => {
    install(
      () =>
        new Response('<html><body>Bad gateway</body></html>', {
          status: 502,
          headers: { 'content-type': 'text/html' },
        }),
    )
    const error = await failure(studyRequest('/api/study/enter', { profileId: 'p' }))
    expect(error.message).toBe(CONNECTION_MESSAGE)
    expect(error.message).not.toMatch(/JSON|Parse|Unexpected/)
  })

  test('um 200 ilegível é inconclusivo: não vira sucesso', async () => {
    install(() => new Response('<html>ok</html>', { status: 200 }))
    const error = await failure(studyRequest('/api/study/prepare', {}))
    expect(error.message).toBe(CONNECTION_MESSAGE)
  })

  test('serviço indisponível do servidor também é conexão', async () => {
    install(() => Response.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 }))
    expect((await failure(studyRequest('/api/study/enter', {}))).message).toBe(CONNECTION_MESSAGE)
    install(() => Response.json({ error: { code: 'SESSION_REVOKE_FAILED' } }, { status: 503 }))
    expect((await failure(studyRequest('/api/study/enter', {}))).message).toBe(CONNECTION_MESSAGE)
  })

  test('navegador de outra família ganha a frase própria', async () => {
    install(() => Response.json({ error: { code: 'DEVICE_OTHER_FAMILY' } }, { status: 409 }))
    const error = await failure(studyRequest('/api/study/redeem', {}))
    expect(error.code).toBe('DEVICE_OTHER_FAMILY')
    expect(error.message).toBe(
      'Este navegador já está sendo usado por outra família. Use outro navegador.',
    )
  })

  test('só a frase de um erro nosso aparece; qualquer outro erro vira a de conexão', () => {
    expect(studyErrorMessage(new StudyRequestError('X', 'Frase nossa.'))).toBe('Frase nossa.')
    expect(studyErrorMessage(new TypeError('Failed to fetch'))).toBe(CONNECTION_MESSAGE)
    expect(studyErrorMessage(new SyntaxError('JSON Parse error: Unexpected <'))).toBe(
      CONNECTION_MESSAGE,
    )
  })

  test.each([
    'VALIDATION_ERROR',
    'INVALID_INPUT',
    'PROFILE_CREATION_CONFLICT',
  ])('falha de cadastro %s orienta sem exibir mensagem crua do servidor', async (code) => {
    install(() =>
      Response.json({ error: { code, message: 'PRIVATE_INPUT_MARKER' } }, { status: 400 }),
    )
    const error = await failure(studyRequest('/api/profiles', {}))
    expect(error.code).toBe(code)
    expect(error.message).not.toContain('PRIVATE_INPUT_MARKER')
    expect(error.message).not.toBe('Não foi possível continuar agora. Tente novamente.')
  })

  test('a resposta válida continua passando', async () => {
    install(() => Response.json({ ok: true }))
    expect(await studyRequest<{ ok: boolean }>('/api/study/prepare', {})).toEqual({ ok: true })
  })
})
