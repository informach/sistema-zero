import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { createRecordingVimeoService } = await import('../src/server/live-recording-vimeo')
const { MediaNotConfiguredError } = await import('../src/server/r2')
const { RECORDING_LINK_TTL_SECONDS, recordingObjectKey, resolveRecordingBucket } = await import(
  '../src/lib/live-recording-vimeo'
)
const { mapVimeoStatus } = await import('../src/lib/vimeo-helpers')

type Deps = Parameters<typeof createRecordingVimeoService>[0]
const OCCURRENCE = '22222222-2222-4222-8222-222222222222'
const BASE = `/members/admin/live/occurrences/${OCCURRENCE}/recording`

/** Gateway, R2 e Vimeo falsos, com o registro de cada chamada. */
function fakes(overrides: Partial<Deps> & { source?: unknown; putStatus?: number } = {}) {
  const log: string[] = []
  const puts: unknown[] = []
  const pulls: unknown[] = []
  const deps: Deps = {
    gatewayFetch: async (path, opts) => {
      log.push(`${opts?.method ?? 'GET'} ${path}`)
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
    deleteVideo: async (id) => {
      log.push(`VIMEO delete ${id}`)
    },
    buckets: () => ({ privateBucket: 'testes-privado' }),
    ...overrides,
  }
  return { deps, log, puts, pulls }
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
    expect(log).toEqual([`${BASE}/source`])
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

  test('o members não registrou: o vídeo órfão é apagado do Vimeo', async () => {
    const { deps, log } = fakes({ putStatus: 409 })
    const outcome = await createRecordingVimeoService(deps).start(OCCURRENCE)
    expect(outcome).toMatchObject({ kind: 'upstream', response: { status: 409 } })
    expect(log.at(-1)).toBe('VIMEO delete 987654')
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
