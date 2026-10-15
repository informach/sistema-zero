import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { createRecordingVimeoService } = await import('../src/server/live-recording-vimeo')
const { MediaNotConfiguredError } = await import('../src/server/r2')
const { RECORDING_LINK_TTL_SECONDS, recordingObjectKey, resolveRecordingBucket } = await import(
  '../src/lib/live-recording-vimeo'
)
const { mapVimeoStatus } = await import('../src/lib/vimeo-helpers')

type Vimeo = import('@sistemazero/core/live').LiveRecordingVimeo
type Entry = import('../src/server/live-vimeo-journal').VimeoUploadEntry
type Deps = Parameters<typeof createRecordingVimeoService>[0]
const OCCURRENCE = '22222222-2222-4222-8222-222222222222'
const BASE = `/members/admin/live/occurrences/${OCCURRENCE}/recording`

/** Gateway, R2 e Vimeo falsos, com o registro de cada chamada. */
function fakes(
  overrides: Partial<Deps> & { source?: unknown; putStatus?: number; initialVimeo?: Vimeo } = {},
) {
  const log: string[] = []
  const puts: unknown[] = []
  const pulls: unknown[] = []
  let bound = overrides.initialVimeo ?? null
  const receipts = new Map<string, Entry>()
  const deps: Deps = {
    journal: {
      remove: async (_bucket, key) => {
        receipts.delete(key)
      },
      read: async (_bucket, key) => receipts.get(key) ?? null,
      write: async (_bucket, key, entry, createOnly) => {
        if (createOnly && receipts.has(key)) return false
        receipts.set(key, structuredClone(entry))
        return true
      },
    },
    gatewayFetch: async (path, opts) => {
      log.push(`${opts?.method ?? 'GET'} ${path}`)
      if (path.endsWith('/vimeo') && !opts?.method)
        return { status: 200, body: { recording: { vimeo: bound } } }
      if (path.endsWith('/source'))
        return {
          status: 200,
          body: overrides.source ?? {
            storageKey: 'r2priv:live/recordings/o/j/1/replay.mp4',
            bucket: 'testes-privado',
            title: 'Turma de sábado · Encontro 1',
          },
        }
      puts.push(opts?.body)
      if ((overrides.putStatus ?? 200) === 200) bound = opts?.body as Vimeo
      return { status: overrides.putStatus ?? 200, body: {} }
    },
    headObject: async (bucket, key) => {
      log.push(`HEAD ${bucket}/${key}`)
      return { sizeBytes: 123_456 }
    },
    presignGet: async (bucket, key, ttl) => {
      log.push(`SIGN ${bucket}/${key} ${ttl}`)
      return `https://r2.example/${key}?assinado`
    },
    createPullUpload: async (input) => {
      pulls.push(input)
      log.push('VIMEO pull')
      return { vimeoVideoId: '987654', embedUrl: 'https://player.vimeo.com/video/987654?h=abc' }
    },
    finishSetup: async (id) => {
      log.push(`VIMEO setup ${id}`)
    },
    getVideo: async () => ({
      status: 'transcoding',
      embedUrl: 'https://player.vimeo.com/video/987654?h=abc',
    }),
    buckets: () => ({ privateBucket: 'testes-privado' }),
    ...overrides,
  }
  return { deps, log, puts, pulls, receipts }
}

describe('gravação do encontro → Vimeo', () => {
  test('o Vimeo baixa o MP4 por uma URL temporária e o members guarda o vídeo processando', async () => {
    const { deps, log, puts, pulls } = fakes()
    const outcome = await createRecordingVimeoService(deps).start(OCCURRENCE)
    expect(outcome).toEqual({
      kind: 'ok',
      vimeo: {
        videoId: '987654',
        embedUrl: 'https://player.vimeo.com/video/987654?h=abc',
        status: 'processing',
      },
    })
    expect(log).toEqual([
      `GET ${BASE}/vimeo`,
      `GET ${BASE}/source`,
      'HEAD testes-privado/live/recordings/o/j/1/replay.mp4',
      `SIGN testes-privado/live/recordings/o/j/1/replay.mp4 ${RECORDING_LINK_TTL_SECONDS}`,
      'VIMEO pull',
      'VIMEO setup 987654',
      `PUT ${BASE}/vimeo`,
    ])
    // O pull leva o tamanho (obrigatório na API) e um nome que dá para achar na pasta.
    expect(pulls).toEqual([
      {
        link: 'https://r2.example/live/recordings/o/j/1/replay.mp4?assinado',
        sizeBytes: 123_456,
        name: 'Oficina ao vivo · Turma de sábado · Encontro 1',
      },
    ])
    expect(puts).toEqual([
      {
        videoId: '987654',
        embedUrl: 'https://player.vimeo.com/video/987654?h=abc',
        status: 'processing',
      },
    ])
  })

  test('a recusa do members volta inteira e nada vai ao Vimeo', async () => {
    const { deps, log } = fakes({
      gatewayFetch: async (path) => {
        log.push(path)
        return {
          status: 409,
          body: { error: { code: 'RECORDING_NOT_REVIEWED', message: 'Revise antes.' } },
        }
      },
    })
    const outcome = await createRecordingVimeoService(deps).start(OCCURRENCE)
    expect(outcome).toMatchObject({ kind: 'upstream', response: { status: 409 } })
    expect(log).toEqual([`${BASE}/vimeo`])
  })

  test('bucket que o Admin não conhece é erro de configuração, nunca assinatura às cegas', async () => {
    const { deps, log } = fakes({
      source: { storageKey: 'live/recordings/x.mp4', bucket: 'gravacoes-secretas' },
    })
    const start = createRecordingVimeoService(deps).start(OCCURRENCE)
    await expect(start).rejects.toBeInstanceOf(MediaNotConfiguredError)
    await expect(start).rejects.toThrow('LIVE_RECORDING_BUCKET=gravacoes-secretas')
    expect(log.some((line) => line.startsWith('SIGN'))).toBe(false)
  })

  test('chave torta e arquivo vazio param antes do Vimeo', async () => {
    const torta = fakes({ source: { storageKey: '../../etc/passwd', bucket: 'testes-privado' } })
    expect(await createRecordingVimeoService(torta.deps).start(OCCURRENCE)).toMatchObject({
      kind: 'invalid',
      code: 'RECORDING_NOT_READY',
    })
    const vazio = fakes({ headObject: async () => ({ sizeBytes: 0 }) })
    expect(await createRecordingVimeoService(vazio.deps).start(OCCURRENCE)).toMatchObject({
      kind: 'invalid',
      code: 'RECORDING_EMPTY',
    })
    expect([...torta.log, ...vazio.log].includes('VIMEO pull')).toBe(false)
  })

  test('uma recusa preserva o recibo recuperável e não apaga um possível vínculo', async () => {
    const { deps, receipts } = fakes({ putStatus: 409 })
    const outcome = await createRecordingVimeoService(deps).start(OCCURRENCE)
    expect(outcome).toMatchObject({ kind: 'upstream', response: { status: 409 } })
    expect([...receipts.values()][0]?.vimeo?.videoId).toBe('987654')
  })

  test('dois cliques no mesmo encontro fazem UM vídeo', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { deps, pulls } = fakes()
    const slow: Deps = {
      ...deps,
      createPullUpload: async (input) => {
        await gate
        return deps.createPullUpload(input)
      },
    }
    const service = createRecordingVimeoService(slow)
    const first = service.start(OCCURRENCE)
    const second = service.start(OCCURRENCE)
    release()
    expect(await first).toEqual(await second)
    expect(pulls).toHaveLength(1)
  })

  test('acompanhar: processando não grava; pronto e falha vão ao members', async () => {
    const run = async (status: string) => {
      const { deps, puts } = fakes({
        initialVimeo: {
          videoId: '987654',
          embedUrl: 'https://player.vimeo.com/video/987654',
          status: 'processing',
        },
        getVideo: async () => ({ status, embedUrl: 'https://player.vimeo.com/video/987654' }),
      })
      return {
        outcome: await createRecordingVimeoService(deps).refresh(OCCURRENCE, '987654'),
        puts,
      }
    }
    const processing = await run('transcoding')
    expect(processing.outcome).toMatchObject({ kind: 'ok', vimeo: { status: 'processing' } })
    expect(processing.puts).toEqual([])
    const ready = await run('available')
    expect(ready.puts).toEqual([
      { videoId: '987654', embedUrl: 'https://player.vimeo.com/video/987654', status: 'ready' },
    ])
    const failed = await run('uploading_error')
    expect(failed.outcome).toMatchObject({ kind: 'ok', vimeo: { status: 'failed' } })
  })
})

describe('regras puras da gravação no Vimeo', () => {
  test('o bucket: o do gravador (env) ou o privado; sem pedido, o configurado', () => {
    expect(
      resolveRecordingBucket({ requested: 'gravacoes', recordingBucket: 'gravacoes' }),
    ).toEqual({ ok: true, bucket: 'gravacoes' })
    expect(
      resolveRecordingBucket({ requested: 'testes-privado', privateBucket: 'testes-privado' }),
    ).toEqual({ ok: true, bucket: 'testes-privado' })
    expect(
      resolveRecordingBucket({ requested: null, privateBucket: 'p', recordingBucket: 'g' }),
    ).toEqual({ ok: true, bucket: 'g' })
    expect(resolveRecordingBucket({ requested: undefined })).toMatchObject({ ok: false })
    expect(resolveRecordingBucket({ requested: 'outro', privateBucket: 'p' })).toMatchObject({
      ok: false,
    })
  })

  test('a chave sai sem o prefixo e sem caminho torto', () => {
    expect(recordingObjectKey('r2priv:live/recordings/a/b/1/replay.mp4')).toBe(
      'live/recordings/a/b/1/replay.mp4',
    )
    expect(recordingObjectKey('/live/x.mp4')).toBe('live/x.mp4')
    expect(recordingObjectKey('live/../x.mp4')).toBeNull()
    expect(recordingObjectKey('live/x y.mp4')).toBeNull()
    expect(recordingObjectKey(42)).toBeNull()
    expect(recordingObjectKey('')).toBeNull()
  })

  test('o status do Vimeo, inclusive a falha ao BAIXAR do pull', () => {
    expect(mapVimeoStatus('available')).toBe('ready')
    expect(mapVimeoStatus('uploading_error')).toBe('failed')
    expect(mapVimeoStatus('transcoding_error')).toBe('failed')
    expect(mapVimeoStatus('uploading')).toBe('processing')
    expect(mapVimeoStatus('transcoding')).toBe('processing')
  })
})

describe('autorização e recuperação do envio', () => {
  test('cada solicitante é autorizado antes de compartilhar o envio', async () => {
    let release!: () => void
    let entered!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const entering = new Promise<void>((resolve) => {
      entered = resolve
    })
    const allowed = fakes({
      finishSetup: async () => {
        entered()
        await gate
      },
    })
    const denied = fakes({ gatewayFetch: async () => ({ status: 404, body: {} }) })
    const first = createRecordingVimeoService(allowed.deps).start(OCCURRENCE)
    await entering
    try {
      expect(await createRecordingVimeoService(denied.deps).start(OCCURRENCE)).toMatchObject({
        kind: 'upstream',
        response: { status: 404 },
      })
      expect(denied.pulls).toHaveLength(0)
    } finally {
      release()
      await first
    }
  })
  test('consultar vídeo exige atribuição e vínculo exato, mesmo durante processamento', async () => {
    let videos = 0
    const denied = fakes({
      gatewayFetch: async () => ({ status: 404, body: {} }),
      getVideo: async () => {
        videos++
        throw new Error('não deveria consultar')
      },
    })
    expect(await createRecordingVimeoService(denied.deps).refresh(OCCURRENCE, '123')).toMatchObject(
      { kind: 'upstream', response: { status: 404 } },
    )
    const unrelated = fakes({
      initialVimeo: {
        videoId: '987654',
        embedUrl: 'https://player.vimeo.com/video/987654',
        status: 'processing',
      },
      getVideo: denied.deps.getVideo,
    })
    expect(
      await createRecordingVimeoService(unrelated.deps).refresh(OCCURRENCE, '123'),
    ).toMatchObject({ kind: 'invalid', status: 404 })
    expect(videos).toBe(0)
  })
  test.each([
    false,
    true,
  ])('PUT com resposta perdida (commit=%s) recupera o mesmo vídeo', async (committed) => {
    const fake = fakes()
    let first = true
    const gateway = fake.deps.gatewayFetch
    fake.deps.gatewayFetch = async (path, opts) => {
      if (opts?.method === 'PUT' && first) {
        first = false
        if (committed) await gateway(path, opts)
        throw new Error('conexão perdida')
      }
      return gateway(path, opts)
    }
    expect(await createRecordingVimeoService(fake.deps).start(OCCURRENCE)).toMatchObject({
      kind: 'ok',
    })
    expect(await createRecordingVimeoService(fake.deps).start(OCCURRENCE)).toMatchObject({
      kind: 'ok',
    })
    expect(fake.pulls).toHaveLength(1)
  })
  test('queda persistente sobrevive a uma nova instância sem criar outro vídeo', async () => {
    const fake = fakes()
    const gateway = fake.deps.gatewayFetch
    fake.deps.gatewayFetch = async (path, opts) => {
      if (opts?.method === 'PUT') throw new Error('offline')
      return gateway(path, opts)
    }
    await expect(createRecordingVimeoService(fake.deps).start(OCCURRENCE)).rejects.toThrow(
      'offline',
    )
    fake.deps.gatewayFetch = gateway
    expect(await createRecordingVimeoService(fake.deps).start(OCCURRENCE)).toMatchObject({
      kind: 'ok',
    })
    expect(fake.pulls).toHaveLength(1)
  })
})

test('recusa explícita do Vimeo libera nova tentativa; timeout não cria outro vídeo', async () => {
  const { VimeoApiError } = await import('../src/server/vimeo')
  for (const error of [new VimeoApiError('cota excedida', 403), new Error('timeout')]) {
    const fake = fakes({
      createPullUpload: async () => {
        throw error
      },
    })
    await expect(createRecordingVimeoService(fake.deps).start(OCCURRENCE)).rejects.toThrow(
      error.message,
    )
    expect(fake.receipts.size).toBe(error instanceof VimeoApiError ? 0 : 1)
    if (!(error instanceof VimeoApiError))
      expect(await createRecordingVimeoService(fake.deps).start(OCCURRENCE)).toMatchObject({
        kind: 'invalid',
        code: 'RECORDING_UPLOAD_PENDING',
      })
  }
})
