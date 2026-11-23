import { describe, expect, it, mock } from 'bun:test'

// `server-only` lança fora do React Server: neutraliza para testar a rota.
mock.module('server-only', () => ({}))
const { chaveDaMedida, conferirMedida, createStudioWorldMeasurementRoute } = await import(
  '../src/routes/studio-world-measurement'
)
const { aceiteDaMedida, placaEmulada } = await import('../src/lib/world-measurement')

/**
 * A gravação da medida dos mundos grandes (plano "Mundos de 2 km", lote 8, 23/11/2026): só a
 * equipe grava, a medida é conferida campo a campo, vai ao R2 privado com o commit do deploy e,
 * com o R2 fora, inteira ao log.
 */
const SHA = 'b'.repeat(64)
const MEDIDA = {
  gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 600 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  duracaoMs: 90_000,
  quadros: 2700,
  fpsMediano: 31,
  quadroMs: { p50: 32.1, p95: 41.5, p99: 60, maximo: 140 },
  desenhos: { p50: 70, p95: 80, maximo: 95 },
  triangulos: { p50: 110_000, p95: 126_000, maximo: 150_000 },
  entradas: [{ regiao: 'Vila', quadros: 30, acima100: 1, acima200: 0, piorMs: 120 }],
  regioesVisitadas: ['Vila', 'Floresta'],
  memoria: {
    heapJs: 210_000_000,
    geometrias: 300,
    texturas: 80,
    programas: 12,
    bytesDeTexturas: 3e7,
  },
  rota: { pontos: 17, metros: 6000, voltas: 0.15 },
}
const corpo = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ motor: 'js', arquivo: SHA, medida: MEDIDA, aparelho: 'notebook', ...extra })
const pedido = (texto: string) =>
  new Request('http://app/api/studio/world-measurement', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'Chrome de teste' },
    body: texto,
  })
const equipe = async () => ({ id: 'conta-1', role: 'admin' })

describe('a medida dos mundos grandes', () => {
  it('confere a forma da medida e recusa o que falta ou não é número', () => {
    expect(conferirMedida(MEDIDA)?.fpsMediano).toBe(31)
    expect(conferirMedida({ ...MEDIDA, desenhos: null })?.desenhos).toBeNull()
    expect(
      conferirMedida({ ...MEDIDA, memoria: { ...MEDIDA.memoria, heapJs: null } }),
    ).not.toBeNull()
    for (const ruim of [
      null,
      { ...MEDIDA, gpu: '' },
      { ...MEDIDA, fpsMediano: Number.NaN },
      { ...MEDIDA, fpsMediano: -1 },
      { ...MEDIDA, quadroMs: { p50: 1, p95: 2, p99: 3 } },
      { ...MEDIDA, entradas: [{ regiao: 'x', quadros: 1, acima100: 0, acima200: 0 }] },
      { ...MEDIDA, regioesVisitadas: [3] },
      { ...MEDIDA, memoria: { ...MEDIDA.memoria, heapJs: 'muito' } },
      { ...MEDIDA, rota: { pontos: 1, metros: 2 } },
    ])
      expect(conferirMedida(ruim)).toBeNull()
  })

  it('a chave ordena por dia e hora', () => {
    expect(chaveDaMedida(new Date('2026-11-23T18:04:05.678Z'), 'js', 'abcd1234')).toBe(
      'qa/medidas-mundos/2026-11-23/180405-js-abcd1234.json',
    )
  })

  it('só a equipe grava; sem sessão vale a recusa da sessão', async () => {
    let gravou = false
    const put = async () => {
      gravou = true
    }
    const recusa = new Response('sem sessão', { status: 401 })
    const semSessao = createStudioWorldMeasurementRoute({ requireSession: async () => recusa, put })
    expect((await semSessao.POST(pedido(corpo()))).status).toBe(401)
    const crianca = createStudioWorldMeasurementRoute({
      requireSession: async () => ({ id: 'perfil-1', role: 'customer' }),
      put,
    })
    expect((await crianca.POST(pedido(corpo()))).status).toBe(404)
    expect(gravou).toBe(false)
  })

  it('grava no R2 privado com o commit, o navegador e quem mediu', async () => {
    const gravados: Array<{ key: string; body: Uint8Array; contentType: string }> = []
    const rota = createStudioWorldMeasurementRoute({
      requireSession: equipe,
      put: async (input) => {
        gravados.push(input)
      },
      now: () => new Date('2026-11-23T18:04:05Z'),
      id: () => 'abcd1234',
      env: () => ({ commit: 'f00ba4', ambiente: 'staging' }),
    })
    const resposta = await rota.POST(
      pedido(corpo({ tela: { largura: 1366, altura: 768, dpr: 1 }, tempos: { baixarMs: 4000 } })),
    )
    expect(resposta.status).toBe(201)
    expect(await resposta.json()).toEqual({
      guardado: 'r2',
      chave: 'qa/medidas-mundos/2026-11-23/180405-js-abcd1234.json',
    })
    expect(gravados).toHaveLength(1)
    const registro = JSON.parse(new TextDecoder().decode(gravados[0]?.body))
    expect(registro).toMatchObject({
      formato: 'sz-medida-mundo',
      commit: 'f00ba4',
      ambiente: 'staging',
      conta: 'conta-1',
      motor: 'js',
      arquivo: SHA,
      aparelho: 'notebook',
      navegador: 'Chrome de teste',
      tela: { largura: 1366, altura: 768, dpr: 1 },
      tempos: { baixarMs: 4000, ateResultadoMs: null },
    })
    expect(registro.medida.gpu).toBe(MEDIDA.gpu)
    expect(gravados[0]?.contentType).toBe('application/json')
  })

  it('recusa corpo torto, motor desconhecido, hash fora do formato e corpo grande demais', async () => {
    let gravou = false
    const rota = createStudioWorldMeasurementRoute({
      requireSession: equipe,
      put: async () => {
        gravou = true
      },
    })
    for (const ruim of [
      'não é json',
      corpo({ motor: 'lua' }),
      corpo({ arquivo: 'x' }),
      corpo({ medida: { ...MEDIDA, gpu: 3 } }),
    ])
      expect((await rota.POST(pedido(ruim))).status).toBe(400)
    const grande = corpo({ aparelho: 'x'.repeat(70_000) })
    expect((await rota.POST(pedido(grande))).status).toBe(413)
    expect(gravou).toBe(false)
  })

  it('com o R2 fora, a medida inteira vai ao log e a resposta diz onde ficou', async () => {
    const linhas: string[] = []
    const rota = createStudioWorldMeasurementRoute({
      requireSession: equipe,
      put: async () => {
        throw new Error('R2 fora')
      },
      log: (linha) => linhas.push(linha),
    })
    const resposta = await rota.POST(pedido(corpo()))
    expect(resposta.status).toBe(202)
    expect(await resposta.json()).toEqual({ guardado: 'registro' })
    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.startsWith('[medida-mundos] ')).toBe(true)
    const registro = JSON.parse(linhas[0]?.slice('[medida-mundos] '.length) ?? '')
    expect(registro.medida.fpsMediano).toBe(31)
  })
})

describe('o aceite do plano (notebook simples, JS)', () => {
  const situacao = (m: typeof MEDIDA) =>
    Object.fromEntries(aceiteDaMedida(m).map((i) => [i.nome, i.ok]))

  it('a medida de exemplo passa em tudo', () => {
    expect(Object.values(situacao(MEDIDA)).every((ok) => ok === true)).toBe(true)
  })

  it('cada régua reprova no limite de fora e aprova no de dentro', () => {
    expect(situacao({ ...MEDIDA, fpsMediano: 29.9 })['Quadros por segundo (mediana)']).toBe(false)
    expect(situacao({ ...MEDIDA, fpsMediano: 30 })['Quadros por segundo (mediana)']).toBe(true)
    const q = { ...MEDIDA.quadroMs, p95: 45.1 }
    expect(situacao({ ...MEDIDA, quadroMs: q })['Quadro mais lento em 95% do tempo']).toBe(false)
    const entrada = MEDIDA.entradas[0] as (typeof MEDIDA.entradas)[number]
    const travadas = (e: Partial<typeof entrada>) =>
      situacao({ ...MEDIDA, entradas: [{ ...entrada, ...e }] })['Travadas ao entrar numa região']
    expect(travadas({ acima100: 3 })).toBe(true)
    expect(travadas({ acima100: 4 })).toBe(false)
    expect(travadas({ acima200: 1 })).toBe(false)
    const d = { ...MEDIDA.desenhos, p95: 101 }
    expect(situacao({ ...MEDIDA, desenhos: d })['Desenhos por quadro']).toBe(false)
    const t = { ...MEDIDA.triangulos, p95: 400_001 }
    expect(situacao({ ...MEDIDA, triangulos: t })['Triângulos na tela']).toBe(false)
    const mem = (x: Partial<typeof MEDIDA.memoria>) => ({
      ...MEDIDA,
      memoria: { ...MEDIDA.memoria, ...x },
    })
    expect(situacao(mem({ bytesDeTexturas: 97 * 1024 * 1024 }))['Texturas na placa de vídeo']).toBe(
      false,
    )
    expect(situacao(mem({ heapJs: 351e6 }))['Memória do JavaScript']).toBe(false)
    expect(situacao(mem({ heapJs: null as unknown as number }))['Memória do JavaScript']).toBeNull()
  })

  it('reconhece a placa emulada', () => {
    expect(placaEmulada('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))')).toBe(true)
    expect(placaEmulada(MEDIDA.gpu)).toBe(false)
  })
})
