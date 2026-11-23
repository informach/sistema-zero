import { afterEach, describe, expect, test } from 'bun:test'
import {
  codigoDaMedida,
  gpuEmulada,
  type MedidaDoMundo,
  metrosDaRota,
  pontoNaRota,
  quantil,
  rotaPelasRegioes,
  rotaPeloTerreno,
} from './mundoGrande'

describe('a rota da medida', () => {
  test('passa pelo centro de cada região, sempre o mais perto, e volta ao início', () => {
    const caixa = (x: number, z: number) => ({ x0: x - 64, x1: x + 64, z0: z - 64, z1: z + 64 })
    const rota = rotaPelasRegioes([caixa(256, 0), caixa(0, 0), caixa(128, 0)], { x: -10, z: 0 })
    expect(rota).toEqual([
      { x: -10, z: 0 },
      { x: 0, z: 0 },
      { x: 128, z: 0 },
      { x: 256, z: 0 },
      { x: -10, z: 0 },
    ])
  })

  test('sem regiões, um retângulo fechado no meio do terreno', () => {
    const rota = rotaPeloTerreno({
      origem: { x: -100, z: -50 },
      passo: 2,
      colunas: 100,
      linhas: 50,
    })
    expect(rota?.[0]).toEqual({ x: -50, z: -25 })
    expect(rota?.[2]).toEqual({ x: 50, z: 25 })
    expect(rota?.at(-1)).toEqual(rota?.[0])
    expect(rotaPeloTerreno(null)).toBeNull()
  })

  test('o ponto a s metros anda pelos trechos e dá a volta', () => {
    const rota = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
    ]
    expect(metrosDaRota(rota)).toBe(20)
    expect(pontoNaRota(rota, 5)).toEqual({ x: 5, z: 0 })
    expect(pontoNaRota(rota, 15)).toEqual({ x: 10, z: 5 })
    expect(pontoNaRota(rota, 25)).toEqual({ x: 5, z: 0 })
    expect(pontoNaRota([{ x: 3, z: 4 }], 99)).toEqual({ x: 3, z: 4 })
  })

  test('quantil pelo posto mais próximo', () => {
    expect(quantil([5, 1, 3, 2, 4], 0.5)).toBe(3)
    expect(quantil([1, 2, 3, 4, 100], 0.95)).toBe(100)
    expect(Number.isNaN(quantil([], 0.5))).toBe(true)
  })

  test('reconhece a placa de vídeo emulada', () => {
    expect(
      gpuEmulada('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)'),
    ).toBe(true)
    expect(gpuEmulada('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true)
    expect(gpuEmulada('ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11)')).toBe(true)
    expect(
      gpuEmulada(
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002507) Direct3D11 vs_5_0 ps_5_0, D3D11)',
      ),
    ).toBe(false)
    expect(gpuEmulada('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)')).toBe(false)
  })
})

/** Uma página falsa do jogo E: duas regiões em fila, um relógio de quadros de 20 ms. */
function paginaFalsa(opcoes: { lento?: (quadro: number) => number } = {}) {
  const global = globalThis as unknown as Record<string, unknown>
  const antes = {
    window: global.window,
    requestAnimationFrame: global.requestAnimationFrame,
    performance: global.performance,
  }
  let agora = 0,
    quadro = 0
  const posicoes: Array<{ x: number; y: number; z: number }> = []
  const heroi = { position: { x: -64, y: 0, z: 0 } }
  const regioes = [
    { id: 'r1', nome: 'Vila', caixa: { x0: -128, x1: 0, z0: -64, z1: 64 } },
    { id: 'r2', nome: 'Floresta', caixa: { x0: 0, x1: 128, z0: -64, z1: 64 } },
  ]
  const mapa = { isTexture: true, image: { width: 64, height: 32 }, generateMipmaps: true }
  const janela = {
    SZGame3D: {
      setPosition(o: typeof heroi, x: number, y: number, z: number) {
        o.position = { x, y, z }
        posicoes.push({ x, y, z })
      },
    },
    __qaJogoE: {
      heroi,
      cena: {
        scene: {
          traverse(f: (o: unknown) => void) {
            f({ material: { map: mapa, cor: 1 } })
            f({ material: [{ map: mapa }] })
          },
        },
        renderer: {
          getContext: () => ({
            getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 1 }),
            getParameter: () => 'Placa de Teste',
          }),
          info: {
            render: { calls: 7, triangles: 1000 },
            memory: { geometries: 3, textures: 2 },
            programs: [1, 2],
          },
        },
        _sceneHandle: {
          alturas: () => 2,
          dados: { regioes },
          estadoDasRegioes: () => ({
            atual:
              regioes.find((r) => heroi.position.x >= r.caixa.x0 && heroi.position.x < r.caixa.x1)
                ?.id ?? null,
          }),
        },
      },
    },
  }
  global.window = janela
  global.performance = { now: () => agora } as never
  global.requestAnimationFrame = ((f: (t: number) => void) => {
    queueMicrotask(() => {
      quadro++
      agora += opcoes.lento?.(quadro) ?? 20
      f(agora)
    })
    return quadro
  }) as never
  return {
    posicoes,
    restaurar() {
      global.window = antes.window
      global.requestAnimationFrame = antes.requestAnimationFrame
      global.performance = antes.performance
    },
  }
}

let restaurar: (() => void) | null = null
afterEach(() => {
  restaurar?.()
  restaurar = null
})

describe('a medida na página', () => {
  test('o código enviado à página é JavaScript válido', () => {
    expect(
      () =>
        new Function(`return ${codigoDaMedida({ velocidade: 8, aquecimentoMs: 0, duracaoMs: 1 })}`),
    ).not.toThrow()
  })

  test('anda pela rota das regiões, conta as entradas e soma as texturas uma vez', async () => {
    const pagina = paginaFalsa()
    restaurar = pagina.restaurar
    const medida = (await new Function(
      `return ${codigoDaMedida({ velocidade: 100, aquecimentoMs: 100, duracaoMs: 1900 })}`,
    )()) as MedidaDoMundo
    expect(medida.gpu).toBe('Placa de Teste')
    // Rota: início (-64) → Vila (-64) → Floresta (64) → início: 256 m.
    expect(medida.rota).toEqual({ pontos: 4, metros: 256, voltas: 0.74 })
    expect(Math.max(...pagina.posicoes.map((p) => p.x))).toBeGreaterThan(60)
    // O herói nunca fica abaixo do chão (2 m).
    expect(Math.min(...pagina.posicoes.map((p) => p.y))).toBeGreaterThanOrEqual(2.05)
    expect(medida.regioesVisitadas).toEqual(['Vila', 'Floresta'])
    expect(medida.entradas.map((e) => e.regiao)).toEqual(['Floresta'])
    expect(medida.quadroMs.p50).toBe(20)
    expect(medida.fpsMediano).toBe(50)
    expect(medida.desenhos).toEqual({ p50: 7, p95: 7, maximo: 7 })
    expect(medida.memoria).toEqual({
      heapJs: null,
      geometrias: 3,
      texturas: 2,
      programas: 2,
      bytesDeTexturas: Math.round(64 * 32 * 4 * (4 / 3)),
    })
  })

  test('os quadros lentos depois de entrar numa região aparecem na entrada', async () => {
    // O herói entra na Floresta no 25º quadro; o 27º leva 250 ms e o 28º, 150 ms.
    const pagina = paginaFalsa({ lento: (q) => (q === 27 ? 250 : q === 28 ? 150 : 20) })
    restaurar = pagina.restaurar
    const medida = (await new Function(
      `return ${codigoDaMedida({
        rota: [
          { x: -64, z: 0 },
          { x: 64, z: 0 },
        ],
        velocidade: 128,
        aquecimentoMs: 0,
        duracaoMs: 1500,
      })}`,
    )()) as MedidaDoMundo
    const floresta = medida.entradas.find((e) => e.regiao === 'Floresta')
    expect(floresta?.acima100).toBe(2)
    expect(floresta?.acima200).toBe(1)
    expect(floresta?.piorMs).toBe(250)
    expect(medida.quadroMs.maximo).toBe(250)
  })
})
