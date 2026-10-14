import { afterEach, describe, expect, mock, setSystemTime, test } from 'bun:test'

// `server-only` lança fora do React Server: neutralizado para testar o cliente e a rota.
mock.module('server-only', () => ({}))

import { InMemoryRateLimiter } from '@sistemazero/core/security'
import type { ProfileView, SessionUser } from '../src/lib/types'
import {
  audioFormatFromBytes,
  isHallucinatedTranscript,
  SPOKEN_AUDIO_MAX_BYTES,
  SPOKEN_TEXT_MAX_CHARS,
  sanitizeSpokenContext,
  TRANSCRIBE_KEYWORDS,
  tidyTranscript,
  transcribePrompt,
} from '../src/lib/voice/transcription'
import type {
  TranscribeConfig,
  TranscribeDeps,
  TranscribeInput,
} from '../src/server/openrouter-transcribe'

// Depois do mock: import estático sobe antes dele e o `server-only` lançaria.
const { createVoiceRoutes } = await import('../src/routes/voice')
const { EnvSchema } = await import('../src/lib/env')
const { TranscribeError, transcribeSpeech } = await import('../src/server/openrouter-transcribe')
type TranscribeError = InstanceType<typeof TranscribeError>

const WEBM = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])
const MP4 = Uint8Array.from([0, 0, 0, 0x20, ...Buffer.from('ftypM4A '), 0, 0, 0, 0])
const OGG = Uint8Array.from([...Buffer.from('OggS'), 0, 0, 0, 0, 0, 0, 0, 0])
const WAV = Uint8Array.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WAVE')])

/** Uma "gravação" do tamanho pedido, com a assinatura do formato na frente. */
function gravacao(bytes = 4096, cabecalho: Uint8Array = WEBM): Uint8Array {
  const out = new Uint8Array(bytes)
  out.set(cabecalho.subarray(0, Math.min(cabecalho.length, bytes)))
  return out
}

describe('regras puras da fala', () => {
  test('o formato sai dos BYTES, não do MIME do navegador', () => {
    expect(audioFormatFromBytes(WEBM)).toBe('webm')
    expect(audioFormatFromBytes(MP4)).toBe('m4a')
    expect(audioFormatFromBytes(OGG)).toBe('ogg')
    expect(audioFormatFromBytes(WAV)).toBe('wav')
    expect(audioFormatFromBytes(Uint8Array.from(Buffer.from('<html><body>oi</body>')))).toBeNull()
    expect(audioFormatFromBytes(WEBM.subarray(0, 8))).toBeNull()
  })

  test('o contexto da fase perde controle e marcação, e acima de 200 é cortado por caractere', () => {
    expect(sanitizeSpokenContext('Fase 2\n<script> · Parte {1}')).toBe('Fase 2 script · Parte 1')
    const longo = sanitizeSpokenContext('🎮'.repeat(250))
    expect(Array.from(longo)).toHaveLength(200)
    expect(longo.endsWith('🎮')).toBe(true)
    expect(sanitizeSpokenContext(null)).toBe('')
  })

  test('o prompt descreve a situação e só leva o vocabulário quando pedido', () => {
    const principal = transcribePrompt('O Farol · Andar')
    expect(principal).toContain('Ela está em: O Farol · Andar.')
    expect(principal).not.toContain('Zappy')
    const reserva = transcribePrompt('', true)
    expect(reserva).not.toContain('Ela está em')
    for (const palavra of ['Zappy', 'Estúdio', 'Mural dos Criadores'])
      expect(reserva).toContain(palavra)
  })

  test('as palavras-chave cabem no que o provedor aceita (até 5 palavras, sem <, > nem quebra)', () => {
    for (const palavra of TRANSCRIBE_KEYWORDS) {
      expect(palavra.split(' ').length).toBeLessThanOrEqual(5)
      expect(palavra).not.toMatch(/[<>\n]/)
    }
  })

  test('alucinação conhecida conta como vazio, mas a fala que a contém não perde nada', () => {
    for (const lixo of [
      'Legendas pela comunidade Amara.org',
      'Obrigado por assistir!',
      '  inscreva-se no canal ',
      '',
      '...',
    ])
      expect(isHallucinatedTranscript(lixo)).toBe(true)
    expect(isHallucinatedTranscript('meu jogo não pula, obrigado por assistir o vídeo')).toBe(false)
    expect(isHallucinatedTranscript('o Zappy não responde')).toBe(false)
    // A assinatura só conta como PALAVRAS inteiras ("a Samara organizou" é fala de verdade).
    expect(isHallucinatedTranscript('A Samara organizou os blocos e o personagem não pula')).toBe(
      false,
    )
    expect(isHallucinatedTranscript('minha amiga Tamara organizou a fase')).toBe(false)
    expect(isHallucinatedTranscript('a câmara orgânica do jogo')).toBe(false)
  })

  test('o texto final tem espaços simples e é cortado sem partir emoji', () => {
    expect(tidyTranscript('  oi \n\n tudo   bem ')).toBe('oi tudo bem')
    const longo = tidyTranscript('🙂'.repeat(SPOKEN_TEXT_MAX_CHARS + 50))
    expect(Array.from(longo)).toHaveLength(SPOKEN_TEXT_MAX_CHARS)
    expect(longo.endsWith('🙂')).toBe(true)
  })
})

const CONFIG: TranscribeConfig = {
  apiKey: 'chave-de-teste',
  model: 'openai/gpt-transcribe',
  fallbackModel: 'openai/gpt-4o-mini-transcribe',
  referer: 'https://kids.test',
}

type Chamada = {
  url: string
  headers: Record<string, string>
  body: any
}

/** Um OpenRouter de mentira: cada resposta da lista atende uma chamada, na ordem. */
function provedor(respostas: Array<Response | Error>) {
  const chamadas: Chamada[] = []
  const fetchFalso = (async (url: string | URL | Request, init?: RequestInit) => {
    chamadas.push({
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    })
    const proxima = respostas.shift()
    if (!proxima) throw new Error('chamada a mais')
    if (proxima instanceof Error) throw proxima
    return proxima
  }) as unknown as typeof fetch
  return { chamadas, fetchFalso }
}

const ok = (text: unknown) => Response.json({ text })
const status = (code: number, corpo = 'texto da criança: meu nome é Ana') =>
  new Response(corpo, { status: code })

function deps(fetchFalso: typeof fetch, extra: TranscribeDeps = {}): TranscribeDeps {
  return { fetch: fetchFalso, sleep: async () => {}, config: CONFIG, ...extra }
}

async function falha(input: TranscribeInput, d: TranscribeDeps): Promise<TranscribeError> {
  const erro = await transcribeSpeech(input, d).then(
    () => null,
    (e: unknown) => e,
  )
  expect(erro).toBeInstanceOf(TranscribeError)
  return erro as TranscribeError
}

describe('o interruptor VOICE_INPUT_ENABLED', () => {
  const base = { ...process.env }
  const ler = (valor: string | undefined) => {
    const parsed = EnvSchema.safeParse({ ...base, VOICE_INPUT_ENABLED: valor })
    expect(parsed.success).toBe(true)
    return parsed.success ? parsed.data.VOICE_INPUT_ENABLED : null
  }
  test('um valor digitado errado nunca derruba o app: só "true" liga', () => {
    for (const ligado of ['true', 'TRUE', ' True ']) expect(ler(ligado)).toBe(true)
    for (const desligado of [undefined, '', 'false', '1', 'sim', 'yes'])
      expect(ler(desligado)).toBe(false)
  })
})

describe('transcribeSpeech (OpenRouter)', () => {
  test('manda o áudio em base64 com idioma, temperatura, deny e o vocabulário da plataforma', async () => {
    const { chamadas, fetchFalso } = provedor([ok('  meu personagem   não pula ')])
    const audio = gravacao(64)
    const result = await transcribeSpeech(
      { audio, format: 'webm', context: 'O Farol · Andar' },
      deps(fetchFalso),
    )
    expect(result).toEqual({ text: 'meu personagem não pula', model: CONFIG.model })
    expect(chamadas).toHaveLength(1)
    const chamada = chamadas[0] as Chamada
    expect(chamada.url).toBe('https://openrouter.ai/api/v1/audio/transcriptions')
    expect(chamada.headers.Authorization).toBe('Bearer chave-de-teste')
    expect(chamada.headers['HTTP-Referer']).toBe('https://kids.test')
    expect(chamada.body.model).toBe(CONFIG.model)
    expect(chamada.body.input_audio).toEqual({
      data: Buffer.from(audio).toString('base64'),
      format: 'webm',
    })
    expect(chamada.body.language).toBe('pt')
    expect(chamada.body.temperature).toBe(0)
    expect(chamada.body.provider.data_collection).toBe('deny')
    // Com `zdr` o OpenRouter não acha rota para os modelos da OpenAI (sondagem de 14/10/2026).
    expect(chamada.body.provider.zdr).toBeUndefined()
    expect(chamada.body.provider.options.openai.prompt).toContain('O Farol · Andar')
    expect(chamada.body.provider.options.openai.keywords).toEqual([...TRANSCRIBE_KEYWORDS])
  })

  test('429 ou rede: uma nova tentativa no MESMO modelo', async () => {
    for (const primeira of [status(429), new TypeError('fetch failed')]) {
      const { chamadas, fetchFalso } = provedor([primeira, ok('oi')])
      const result = await transcribeSpeech(
        { audio: gravacao(64), format: 'm4a' },
        deps(fetchFalso),
      )
      expect(result.model).toBe(CONFIG.model)
      expect(chamadas.map((c) => c.body.model)).toEqual([CONFIG.model, CONFIG.model])
    }
  })

  test('5xx duas vezes: a reserva, com o vocabulário no texto do prompt e sem keywords', async () => {
    const { chamadas, fetchFalso } = provedor([status(502), status(503), ok('agora foi')])
    const result = await transcribeSpeech(
      { audio: gravacao(64), format: 'webm', context: 'Fase 1' },
      deps(fetchFalso),
    )
    expect(result).toEqual({ text: 'agora foi', model: CONFIG.fallbackModel })
    expect(chamadas.map((c) => c.body.model)).toEqual([
      CONFIG.model,
      CONFIG.model,
      CONFIG.fallbackModel,
    ])
    const reserva = (chamadas[2] as Chamada).body.provider.options.openai
    expect(reserva.keywords).toBeUndefined()
    expect(reserva.prompt).toContain('Zappy')
    expect(reserva.prompt).toContain('Fase 1')
  })

  test('o modelo recusou o pedido (400): vai direto à reserva, sem repetir', async () => {
    const { chamadas, fetchFalso } = provedor([status(400), ok('foi na reserva')])
    const result = await transcribeSpeech({ audio: gravacao(64), format: 'ogg' }, deps(fetchFalso))
    expect(result.model).toBe(CONFIG.fallbackModel)
    expect(chamadas).toHaveLength(2)
  })

  test('chave, crédito ou permissão (401/402/403): para na hora, sem reserva', async () => {
    for (const code of [401, 402, 403]) {
      const { chamadas, fetchFalso } = provedor([status(code)])
      const erro = await falha({ audio: gravacao(64), format: 'webm' }, deps(fetchFalso))
      expect(erro.reason).toBe('unavailable')
      expect(chamadas).toHaveLength(1)
    }
  })

  test('silêncio que virou "Obrigado por assistir" conta como vazio', async () => {
    const { fetchFalso } = provedor([ok('Obrigado por assistir!')])
    const erro = await falha({ audio: gravacao(64), format: 'webm' }, deps(fetchFalso))
    expect(erro.reason).toBe('empty')
  })

  test('nenhum erro nem log leva o corpo do provedor ou o texto da fala', async () => {
    const avisos: unknown[] = []
    const original = console.warn
    console.warn = (...args: unknown[]) => {
      avisos.push(args)
    }
    try {
      // Bytes reconhecíveis: nenhum pedaço do áudio em base64 pode aparecer no registro.
      const audio = Uint8Array.from({ length: 96 }, (_, i) => (i * 37 + 11) & 255)
      audio.set(WEBM.subarray(0, 4))
      const trecho = Buffer.from(audio).toString('base64').slice(8, 40)
      const { fetchFalso } = provedor([status(500), status(500), status(500)])
      const erro = await falha({ audio, format: 'webm' }, deps(fetchFalso))
      expect(erro.reason).toBe('unavailable')
      const tudo = JSON.stringify([String(erro), erro.message, avisos])
      expect(tudo).not.toContain('Ana')
      expect(tudo).not.toContain('texto da criança')
      expect(tudo).not.toContain(trecho)
      expect(avisos).toHaveLength(1)

      // O caminho do vazio (alucinação descartada) não registra NADA.
      avisos.length = 0
      const vazio = await falha(
        { audio, format: 'webm' },
        deps(provedor([ok('Obrigado por assistir!')]).fetchFalso),
      )
      expect(vazio.reason).toBe('empty')
      expect(avisos).toHaveLength(0)
    } finally {
      console.warn = original
    }
  })

  test('o navegador foi embora: nada é chamado e o motivo é "aborted"', async () => {
    const { chamadas, fetchFalso } = provedor([ok('nunca')])
    const controle = new AbortController()
    controle.abort()
    const erro = await falha(
      { audio: gravacao(64), format: 'webm', signal: controle.signal },
      deps(fetchFalso),
    )
    expect(erro.reason).toBe('aborted')
    expect(chamadas).toHaveLength(0)
  })

  test('o navegador vai embora NO MEIO da chamada: o pedido ao provedor é abortado', async () => {
    const controle = new AbortController()
    let chamadas = 0
    let abortouNoProvedor = false
    const fetchPendurado = ((_url: string | URL | Request, init?: RequestInit) => {
      chamadas++
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          abortouNoProvedor = true
          reject(new DOMException('abortado', 'AbortError'))
        })
        queueMicrotask(() => controle.abort())
      })
    }) as unknown as typeof fetch
    const erro = await falha(
      { audio: gravacao(64), format: 'webm', signal: controle.signal },
      deps(fetchPendurado),
    )
    expect(erro.reason).toBe('aborted')
    expect(abortouNoProvedor).toBe(true)
    expect(chamadas).toBe(1)
  })

  test('o prazo único acabou: não começa outra chamada e o motivo é "timeout"', async () => {
    let agora = 0
    const { chamadas, fetchFalso } = provedor([status(503), ok('tarde demais')])
    const erro = await falha(
      { audio: gravacao(64), format: 'webm' },
      deps(fetchFalso, {
        now: () => agora,
        sleep: async () => {
          agora += 29_000
        },
      }),
    )
    expect(erro.reason).toBe('timeout')
    expect(chamadas).toHaveLength(1)
  })

  test('sem chave do OpenRouter: indisponível, sem chamar ninguém', async () => {
    const { chamadas, fetchFalso } = provedor([ok('nunca')])
    const erro = await falha(
      { audio: gravacao(64), format: 'webm' },
      deps(fetchFalso, { config: { ...CONFIG, apiKey: '' } }),
    )
    expect(erro.reason).toBe('unavailable')
    expect(chamadas).toHaveLength(0)
  })
})

const KIDS_ID = '11111111-1111-4111-8111-111111111111'
const SESSION = '22222222-2222-4222-8222-222222222222'
const DEVICE = '33333333-3333-4333-8333-333333333333'
const GRANT = '44444444-4444-4444-8444-444444444444'

const crianca: SessionUser = {
  id: KIDS_ID,
  email: '',
  firstName: 'Ana',
  lastName: '',
  role: 'customer',
  status: 'active',
  kids: { kind: 'student', sessionId: SESSION, deviceId: DEVICE, grantId: GRANT },
}

function perfil(extra: Partial<ProfileView> = {}): ProfileView {
  return {
    id: KIDS_ID,
    name: 'Ana',
    avatarUrl: null,
    whatsapp: null,
    birthDate: null,
    publicProfileEnabled: false,
    voiceInputEnabled: true,
    sortOrder: 0,
    ...extra,
  }
}

function limitesNovos() {
  const box = {
    minute: new InMemoryRateLimiter(6, 60_000),
    hour: new InMemoryRateLimiter(40, 3_600_000),
    global: new InMemoryRateLimiter(600, 3_600_000),
    inflight: new Set<string>(),
  }
  return () => box
}

type PerfilResposta = { status: number; body: { profile: ProfileView | null } | null }

function montar(
  opts: {
    sessao?: SessionUser | null
    perfil?: PerfilResposta
    configurada?: boolean
    transcrever?: (input: TranscribeInput) => Promise<{ text: string; model: string }>
    limites?: ReturnType<typeof limitesNovos>
  } = {},
) {
  const recebidos: TranscribeInput[] = []
  const leiturasDoPerfil: number[] = []
  const routes = createVoiceRoutes({
    session: { getSession: async () => (opts.sessao === undefined ? crianca : opts.sessao) },
    auth: {
      getMyProfile: async () => {
        leiturasDoPerfil.push(1)
        return (opts.perfil ?? { status: 200, body: { profile: perfil() } }) as never
      },
    },
    configured: () => opts.configurada ?? true,
    limits: opts.limites ?? limitesNovos(),
    transcribe:
      opts.transcrever ??
      (async (input) => {
        recebidos.push(input)
        return { text: 'meu personagem não pula', model: 'openai/gpt-transcribe' }
      }),
  })
  return { routes, recebidos, leiturasDoPerfil }
}

function pedido(
  corpo: Uint8Array | null = gravacao(),
  headers: Record<string, string> = {},
): Request {
  return new Request('https://kids.test/api/voice/transcribe', {
    method: 'POST',
    headers: { 'content-type': 'audio/webm;codecs=opus', 'x-sz-viewer': KIDS_ID, ...headers },
    body: corpo as BodyInit | null,
  })
}

async function codigo(res: Response): Promise<string> {
  return ((await res.json()) as { error: { code: string } }).error.code
}

describe('POST /api/voice/transcribe', () => {
  test('a criança com a fala ligada recebe só o texto, com o contexto da fase decodificado', async () => {
    const { routes, recebidos } = montar()
    const res = await routes.voiceTranscribe.POST(
      pedido(gravacao(), { 'x-sz-voice-context': encodeURIComponent('O Farol 🌊 · Andar') }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(await res.json()).toEqual({ text: 'meu personagem não pula' })
    expect(recebidos).toHaveLength(1)
    const recebido = recebidos[0] as TranscribeInput
    expect(recebido.format).toBe('webm')
    expect(recebido.context).toBe('O Farol 🌊 · Andar')
    expect(recebido.audio.byteLength).toBe(4096)
  })

  test('o MIME do Safari (audio/mp4) passa, e o formato vem dos bytes', async () => {
    const { routes, recebidos } = montar()
    const res = await routes.voiceTranscribe.POST(
      pedido(gravacao(4096, MP4), { 'content-type': 'audio/mp4' }),
    )
    expect(res.status).toBe(200)
    expect(recebidos[0]?.format).toBe('m4a')
  })

  test('contexto com percent-encoding quebrado é ignorado, sem derrubar o pedido', async () => {
    const { routes, recebidos } = montar()
    const res = await routes.voiceTranscribe.POST(
      pedido(gravacao(), { 'x-sz-voice-context': '%E0%A4%A' }),
    )
    expect(res.status).toBe(200)
    expect(recebidos[0]?.context).toBe('')
  })

  test('cada recusa antes da transcrição, sem chamar o provedor', async () => {
    const pais: SessionUser = {
      ...crianca,
      kids: { kind: 'parent', sessionId: SESSION, authenticatedAt: 1_700_000_000 },
    }
    const suporte = { ...crianca, act: { sub: 'admin', mode: 'write' } } as unknown as SessionUser
    const { kids: _kids, ...semKids } = crianca
    const suporteReal = {
      ...semKids,
      act: { sub: 'admin', mode: 'write' },
    } as unknown as SessionUser
    const desligada = { status: 200, body: { profile: perfil({ voiceInputEnabled: false }) } }
    const semCampo = { status: 200, body: { profile: perfil({ voiceInputEnabled: undefined }) } }
    const outraCrianca = { status: 200, body: { profile: perfil({ id: 'outra' }) } }
    const casos: Array<[string, ReturnType<typeof montar>, Request, number, string]> = [
      ['sem sessão', montar({ sessao: null }), pedido(), 401, 'UNAUTHORIZED'],
      ['sessão dos pais', montar({ sessao: pais }), pedido(), 403, 'STUDENT_SESSION_REQUIRED'],
      // A sessão de suporte REAL não tem `kids` (o `claimsToUser` recusa os dois juntos).
      [
        'suporte em modo de escrita',
        montar({ sessao: suporteReal }),
        pedido(),
        403,
        'STUDENT_SESSION_REQUIRED',
      ],
      // Defesa extra: mesmo que uma sessão de criança chegasse com `act`, a fala recusa.
      ['criança com act', montar({ sessao: suporte }), pedido(), 403, 'SUPPORT_SESSION'],
      [
        'conta inativa',
        montar({ sessao: { ...crianca, status: 'blocked' } }),
        pedido(),
        403,
        'FORBIDDEN',
      ],
      [
        'outro perfil na aba',
        montar(),
        pedido(gravacao(), { 'x-sz-viewer': 'outro' }),
        409,
        'VIEWER_CHANGED',
      ],
      ['interruptor desligado', montar({ configurada: false }), pedido(), 503, 'VOICE_UNAVAILABLE'],
      [
        'não é áudio',
        montar(),
        pedido(gravacao(), { 'content-type': 'text/plain' }),
        415,
        'VOICE_FORMAT',
      ],
      ['os pais desligaram', montar({ perfil: desligada }), pedido(), 403, 'VOICE_INPUT_DISABLED'],
      [
        'auth antigo, sem o campo',
        montar({ perfil: semCampo }),
        pedido(),
        403,
        'VOICE_INPUT_DISABLED',
      ],
      [
        'perfil de outra criança',
        montar({ perfil: outraCrianca }),
        pedido(),
        403,
        'VOICE_INPUT_DISABLED',
      ],
      [
        'auth fora do ar',
        montar({ perfil: { status: 503, body: null } }),
        pedido(),
        503,
        'VOICE_UNAVAILABLE',
      ],
      ['gravação vazia', montar(), pedido(new Uint8Array(0)), 422, 'VOICE_EMPTY'],
      ['menos de 1 KB', montar(), pedido(gravacao(512)), 422, 'VOICE_EMPTY'],
      [
        'bytes que não são áudio',
        montar(),
        pedido(Uint8Array.from(Buffer.from('<html>'.repeat(400)))),
        415,
        'VOICE_FORMAT',
      ],
      [
        'Content-Length acima de 2 MB',
        montar(),
        pedido(gravacao(), { 'content-length': String(SPOKEN_AUDIO_MAX_BYTES + 1) }),
        413,
        'PAYLOAD_TOO_LARGE',
      ],
      [
        'corpo acima de 2 MB sem declarar',
        montar(),
        pedido(gravacao(SPOKEN_AUDIO_MAX_BYTES + 1)),
        413,
        'PAYLOAD_TOO_LARGE',
      ],
    ]
    for (const [nome, { routes, recebidos }, req, esperado, code] of casos) {
      const res = await routes.voiceTranscribe.POST(req)
      expect({ nome, status: res.status, code: await codigo(res) }).toEqual({
        nome,
        status: esperado,
        code,
      })
      expect({ nome, chamadas: recebidos.length }).toEqual({ nome, chamadas: 0 })
    }
  })

  test('a escolha dos pais é relida a cada pedido (desligar vale na hora)', async () => {
    const { routes, leiturasDoPerfil } = montar()
    await routes.voiceTranscribe.POST(pedido())
    await routes.voiceTranscribe.POST(pedido())
    expect(leiturasDoPerfil).toHaveLength(2)
  })

  test('seis gravações por minuto; a sétima espera, com Retry-After', async () => {
    const { routes, recebidos } = montar()
    for (let i = 0; i < 6; i++)
      expect((await routes.voiceTranscribe.POST(pedido())).status).toBe(200)
    const setima = await routes.voiceTranscribe.POST(pedido())
    expect(setima.status).toBe(429)
    expect(await codigo(setima)).toBe('VOICE_RATE_LIMITED')
    expect(Number(setima.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(recebidos).toHaveLength(6)
  })

  test('pedido recusado antes do limite não gasta a cota da criança', async () => {
    const { routes } = montar()
    for (let i = 0; i < 10; i++)
      await routes.voiceTranscribe.POST(pedido(gravacao(), { 'content-type': 'text/plain' }))
    for (let i = 0; i < 6; i++)
      expect((await routes.voiceTranscribe.POST(pedido())).status).toBe(200)
  })

  test('o sinal do navegador chega à transcrição (ir embora aborta o provedor)', async () => {
    const { routes, recebidos } = montar()
    const controle = new AbortController()
    const req = new Request('https://kids.test/api/voice/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'audio/webm', 'x-sz-viewer': KIDS_ID },
      body: gravacao() as BodyInit,
      signal: controle.signal,
    })
    expect((await routes.voiceTranscribe.POST(req)).status).toBe(200)
    controle.abort()
    expect(recebidos[0]?.signal?.aborted).toBe(true)
  })

  test('uma transcrição por vez por criança', async () => {
    const pendentes: Array<() => void> = []
    let chamadas = 0
    const { routes } = montar({
      transcrever: () => {
        chamadas++
        return new Promise((resolve) => {
          pendentes.push(() => resolve({ text: 'oi', model: 'm' }))
        })
      },
    })
    const ate = async (n: number) => {
      for (let i = 0; i < 50 && chamadas < n; i++)
        await new Promise((resolve) => setTimeout(resolve, 0))
      expect(chamadas).toBe(n)
    }
    const primeira = routes.voiceTranscribe.POST(pedido())
    await ate(1)
    // Sem a trava, a segunda ficaria esperando o provedor: a corrida reprova em vez de pendurar.
    const segunda = await Promise.race([
      routes.voiceTranscribe.POST(pedido()),
      new Promise<'pendurou'>((resolve) => setTimeout(() => resolve('pendurou'), 300)),
    ])
    for (const soltar of pendentes.splice(1)) soltar()
    expect(segunda === 'pendurou' ? 'pendurou' : segunda.status).toBe(429)
    pendentes.shift()?.()
    expect((await primeira).status).toBe(200)
    // Terminou: a próxima passa.
    const terceira = routes.voiceTranscribe.POST(pedido())
    await ate(2)
    pendentes.shift()?.()
    expect((await terceira).status).toBe(200)
  })

  describe('limites com o relógio', () => {
    afterEach(() => setSystemTime())

    test('insistir depois do limite do minuto não gasta a hora nem a fala das outras crianças', async () => {
      setSystemTime(new Date('2026-10-14T12:00:00Z'))
      const limites = limitesNovos()
      const ana = montar({ limites })
      for (let i = 0; i < 40; i++) await ana.routes.voiceTranscribe.POST(pedido())
      expect(ana.recebidos).toHaveLength(6)

      // Outra criança, no mesmo minuto: a cota global não foi gasta pelas recusas da Ana.
      const outro = '99999999-9999-4999-8999-999999999999'
      const bia = montar({
        limites,
        sessao: { ...crianca, id: outro },
        perfil: { status: 200, body: { profile: perfil({ id: outro }) } },
      })
      expect(
        (await bia.routes.voiceTranscribe.POST(pedido(gravacao(), { 'x-sz-viewer': outro })))
          .status,
      ).toBe(200)

      // Um minuto depois a Ana volta a falar: as recusas não gastaram a hora dela.
      setSystemTime(new Date('2026-10-14T12:01:01Z'))
      expect((await ana.routes.voiceTranscribe.POST(pedido())).status).toBe(200)
      expect(ana.recebidos).toHaveLength(7)
    })
  })

  test('erro inesperado deixa rastro só com o NOME, nunca a mensagem', async () => {
    const avisos: unknown[] = []
    const original = console.warn
    console.warn = (...args: unknown[]) => {
      avisos.push(args)
    }
    try {
      const { routes } = montar({
        transcrever: async () => {
          throw new TypeError('meu nome é Ana e moro na rua tal')
        },
      })
      expect((await routes.voiceTranscribe.POST(pedido())).status).toBe(503)
      expect(avisos).toHaveLength(1)
      expect(JSON.stringify(avisos)).toContain('TypeError')
      expect(JSON.stringify(avisos)).not.toContain('Ana')
    } finally {
      console.warn = original
    }
  })

  test('as falhas da transcrição viram códigos de criança, sem o texto', async () => {
    const casos: Array<[Error, number, string]> = [
      [new TranscribeError('empty'), 422, 'VOICE_EMPTY'],
      [new TranscribeError('timeout'), 504, 'VOICE_TIMEOUT'],
      [new TranscribeError('unavailable'), 503, 'VOICE_UNAVAILABLE'],
      [new Error('qualquer coisa inesperada'), 503, 'VOICE_UNAVAILABLE'],
    ]
    for (const [erro, esperado, code] of casos) {
      const { routes } = montar({
        transcrever: async () => {
          throw erro
        },
      })
      const res = await routes.voiceTranscribe.POST(pedido())
      expect(res.status).toBe(esperado)
      expect(await codigo(res)).toBe(code)
    }
  })
})
