import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import {
  PRIVATE_VOICE_GENTLE,
  PRIVATE_VOICE_TAP_AGAIN,
  PrivateVoiceRequestError,
  privateVoiceErrorText,
  readPrivateVoiceUrl,
} from '../src/lib/private-voice'

const restorers: Array<() => void> = []
afterEach(() => {
  for (const restore of restorers.splice(0)) restore()
})

/** O que o botão "Ouvir" mostra quando a fala não sai (L2, full review de 14/10/2026). */
async function shown(response: Response | Error): Promise<string> {
  try {
    if (response instanceof Error) throw response
    await readPrivateVoiceUrl(response)
    return 'ok'
  } catch (cause) {
    return privateVoiceErrorText(cause)
  }
}

describe('a voz privada nunca mostra erro técnico à criança', () => {
  test('queda de rede ("Failed to fetch") vira a frase gentil, e o nome vai ao console', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    restorers.push(() => warn.mockRestore())
    expect(await shown(new TypeError('Failed to fetch'))).toBe(PRIVATE_VOICE_GENTLE)
    expect(JSON.stringify(warn.mock.calls)).toContain('TypeError')
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Failed to fetch')
  })

  test('a página HTML de um 502 da borda não vira o erro do parser', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    restorers.push(() => warn.mockRestore())
    const text = await shown(new Response('<html><h1>502 Bad Gateway</h1></html>', { status: 502 }))
    expect(text).toBe(PRIVATE_VOICE_GENTLE)
    expect(text).not.toContain('JSON')
  })

  test('a frase que a NOSSA rota escreveu para a criança chega a ela', async () => {
    const text = await shown(
      Response.json(
        {
          error: {
            code: 'VOICE_UNAVAILABLE',
            message: 'A voz descansou por hoje. O texto continua disponível.',
          },
        },
        { status: 429 },
      ),
    )
    expect(text).toBe('A voz descansou por hoje. O texto continua disponível.')
  })

  test('mensagem de outro serviço (sem o nosso código) não passa', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    restorers.push(() => warn.mockRestore())
    expect(
      await shown(
        Response.json(
          { error: { code: 'INTERNAL', message: 'ECONNRESET at gateway' } },
          { status: 500 },
        ),
      ),
    ).toBe(PRIVATE_VOICE_GENTLE)
  })

  test('o Safari pedindo outro toque tem a frase dele; a URL boa passa', async () => {
    const blocked = Object.assign(new Error('play() failed'), { name: 'NotAllowedError' })
    expect(privateVoiceErrorText(blocked)).toBe(PRIVATE_VOICE_TAP_AGAIN)
    expect(await readPrivateVoiceUrl(Response.json({ url: 'https://r2/fala.mp3' }))).toBe(
      'https://r2/fala.mp3',
    )
    expect(new PrivateVoiceRequestError('x').name).toBe('PrivateVoiceRequestError')
  })
})

test('o botão usa a régua, e não mostra mais `cause.message`', async () => {
  const source = await Bun.file(
    new URL('../src/components/private-zappy-voice.tsx', import.meta.url),
  ).text()
  expect(source).toContain('privateVoiceErrorText(cause)')
  expect(source).toContain('readPrivateVoiceUrl(response)')
  expect(source).not.toContain('cause.message')
})
