import { afterEach, describe, expect, it } from 'bun:test'
import { clearImageSampleCache, primeImageSources, sampleImageColorAt } from './imageSampler'
import type { VectorShape } from './model'

type ImageShape = Extract<VectorShape, { type: 'image' }>

const SRC = `data:image/png;base64,${btoa('png-falso')}`

/**
 * A caixa é 100..180 × 50..90 (80 × 40) e a imagem dublada é 8 × 4: as duas
 * RETANGULARES de propósito, senão um eixo trocado passaria despercebido.
 */
function figura(over: Partial<ImageShape> = {}): ImageShape {
  return {
    id: 'f1',
    type: 'image',
    fill: 'none',
    stroke: null,
    opacity: 1,
    rotation: 0,
    x: 100,
    y: 50,
    w: 80,
    h: 40,
    src: SRC,
    pixelated: true,
    ...over,
  }
}

interface Stub {
  /** O pixel que o canvas leu, na coordenada da IMAGEM (o que prova o mapeamento). */
  read: { sx: number; sy: number } | null
  decodes: number
  restore: () => void
}

/**
 * Dubla as DUAS primitivas de navegador (como o `import/decodeImage.test.ts`
 * faz), então o módulo de produção roda inteiro. `pixelAt` decide a cor lida a
 * partir da coordenada pedida — é assim que o mapeamento fica provado.
 */
function installStub(options: {
  size?: { width: number; height: number }
  pixelAt?: (sx: number, sy: number) => [number, number, number, number]
  noCanvas?: boolean
  noBitmap?: boolean
  failDecode?: boolean
  /** Faz `getImageData` lançar, o único jeito de exercitar o catch da leitura. */
  throwOnRead?: boolean
}): Stub {
  const { width = 8, height = 4 } = options.size ?? {}
  const contextDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'getContext',
  )
  const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
  const stub: Stub = {
    read: null,
    decodes: 0,
    restore: () => {
      if (contextDescriptor) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', contextDescriptor)
      } else Reflect.deleteProperty(HTMLCanvasElement.prototype, 'getContext')
      if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor)
      else Reflect.deleteProperty(globalThis, 'createImageBitmap')
    },
  }
  const context = {
    imageSmoothingEnabled: true,
    clearRect: () => {},
    drawImage: (_bitmap: unknown, sx: number, sy: number) => {
      stub.read = { sx, sy }
    },
    getImageData: () => {
      if (options.throwOnRead) throw new Error('canvas manchado')
      const [r, g, b, a] = options.pixelAt?.(stub.read?.sx ?? 0, stub.read?.sy ?? 0) ?? [
        18, 52, 86, 255,
      ]
      return { data: Uint8ClampedArray.from([r, g, b, a]) }
    },
  }
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => (options.noCanvas ? null : context),
  })
  if (options.noBitmap) Reflect.deleteProperty(globalThis, 'createImageBitmap')
  else {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: async () => {
        stub.decodes += 1
        if (options.failDecode) throw new Error('png quebrado')
        return { width, height, close: () => {} } as unknown as ImageBitmap
      },
    })
  }
  return stub
}

let stub: Stub | null = null

afterEach(() => {
  clearImageSampleCache()
  stub?.restore()
  stub = null
})

describe('a cor de um PIXEL da figura (conta-gotas em cima de uma imagem)', () => {
  it('devolve o hex do pixel sob o toque, e o pixel é o certo', async () => {
    stub = installStub({ size: { width: 8, height: 4 }, pixelAt: () => [255, 146, 33, 255] })
    await primeImageSources([SRC])
    // A figura ocupa 100..180 × 50..90; o meio dela é (140, 70) = u,v de 0,5.
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({
      kind: 'color',
      hex: '#ff9221',
    })
    expect(stub.read).toEqual({ sx: 4, sy: 2 })
  })

  it('⭐ os dois EIXOS não se confundem: um toque fora da diagonal', async () => {
    stub = installStub({ size: { width: 8, height: 4 } })
    await primeImageSources([SRC])
    // u = 0,25 (coluna 2 de 8) e v = 0,75 (linha 3 de 4). Com os eixos trocados
    // sairia { sx: 6, sy: 1 } — o anti-vácuo desta feature inteira.
    sampleImageColorAt(figura(), { x: 120, y: 80 })
    expect(stub.read).toEqual({ sx: 2, sy: 3 })
  })

  it('cada canto lê o pixel do canto (u,v de 0 a 1, sem estourar a imagem)', async () => {
    stub = installStub({ size: { width: 8, height: 4 } })
    await primeImageSources([SRC])
    sampleImageColorAt(figura(), { x: 100, y: 50 })
    expect(stub.read).toEqual({ sx: 0, sy: 0 })
    // O canto de baixo à direita cai EXATO em u = v = 1: sem o clamp, pediria o
    // pixel 8 de uma imagem de 8 (fora da imagem).
    sampleImageColorAt(figura(), { x: 180, y: 90 })
    expect(stub.read).toEqual({ sx: 7, sy: 3 })
  })

  it('figura GIRADA: o toque volta ao espaço local antes de virar pixel', async () => {
    stub = installStub({ size: { width: 8, height: 4 } })
    await primeImageSources([SRC])
    // Girada 90° em torno do centro (140, 70), o canto de CIMA à esquerda da
    // imagem vai parar em cima à DIREITA da caixa.
    sampleImageColorAt(figura({ rotation: 90 }), { x: 160, y: 30 })
    expect(stub.read).toEqual({ sx: 0, sy: 0 })
    // Anti-vácuo: sem a rotação esse mesmo toque nem cai na figura.
    stub.read = null
    expect(sampleImageColorAt(figura(), { x: 160, y: 30 })).toEqual({ kind: 'outside' })
    expect(stub.read).toBeNull()
  })

  it('rotação NÃO-reta (30°) também acerta o pixel', async () => {
    stub = installStub({ size: { width: 8, height: 4 } })
    await primeImageSources([SRC])
    // O centro da caixa é ponto fixo do giro: qualquer ângulo lê o meio.
    sampleImageColorAt(figura({ rotation: 30 }), { x: 140, y: 70 })
    expect(stub.read).toEqual({ sx: 4, sy: 2 })
  })

  it('a FOLGA do toque vale aqui também: a beirada pega o pixel da borda', async () => {
    stub = installStub({ size: { width: 8, height: 4 } })
    await primeImageSources([SRC])
    // 4 unidades à esquerda da figura, dentro da folga com que o `hitShapeAt`
    // a escolheu: sem isso a criança levava "estou abrindo" com a figura pronta.
    expect(sampleImageColorAt(figura(), { x: 96, y: 70 }, 10).kind).toBe('color')
    expect(stub.read).toEqual({ sx: 0, sy: 2 })
    // Além da folga continua fora.
    expect(sampleImageColorAt(figura(), { x: 96, y: 70 }, 2)).toEqual({ kind: 'outside' })
  })

  it('pixel transparente é "transparent"; o limiar é o mesmo 128 do export', async () => {
    stub = installStub({ size: { width: 8, height: 4 }, pixelAt: () => [10, 20, 30, 127] })
    await primeImageSources([SRC])
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({ kind: 'transparent' })
    stub.restore()
    stub = installStub({ size: { width: 8, height: 4 }, pixelAt: () => [10, 20, 30, 128] })
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({
      kind: 'color',
      hex: '#0a141e',
    })
  })

  it('toque FORA da figura não lê pixel nenhum', async () => {
    stub = installStub({})
    await primeImageSources([SRC])
    expect(sampleImageColorAt(figura(), { x: 10, y: 10 })).toEqual({ kind: 'outside' })
    expect(stub.read).toBeNull()
  })

  it('⭐ cache frio devolve "loading" E MANDA ABRIR (senão "toque de novo" era mentira)', async () => {
    stub = installStub({})
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({ kind: 'loading' })
    // O toque disparou a decodificação: esperar por ela e tocar de novo funciona.
    await primeImageSources([SRC])
    expect(stub.decodes).toBe(1)
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 }).kind).toBe('color')
  })

  it('figura que não abre é "failed" (e o recado não promete retry)', async () => {
    stub = installStub({ failDecode: true })
    await primeImageSources([SRC])
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({ kind: 'failed' })
    // Lápide: não insiste a cada toque.
    expect(stub.decodes).toBe(1)
    sampleImageColorAt(figura(), { x: 140, y: 70 })
    expect(stub.decodes).toBe(1)
  })

  it('sem canvas 2D devolve "failed" em vez de quebrar', async () => {
    stub = installStub({ noCanvas: true })
    await primeImageSources([SRC])
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({ kind: 'failed' })
  })

  it('leitura que LANÇA (canvas manchado) vira "failed"', async () => {
    stub = installStub({ throwOnRead: true })
    await primeImageSources([SRC])
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({ kind: 'failed' })
  })

  it('sem createImageBitmap não pendura promise nem lê nada', async () => {
    stub = installStub({ noBitmap: true })
    await primeImageSources([SRC])
    expect(sampleImageColorAt(figura(), { x: 140, y: 70 })).toEqual({ kind: 'failed' })
  })

  it('a mesma figura não é decodificada de novo a cada toque', async () => {
    stub = installStub({})
    await primeImageSources([SRC])
    await primeImageSources([SRC, SRC])
    sampleImageColorAt(figura(), { x: 140, y: 70 })
    sampleImageColorAt(figura(), { x: 150, y: 70 })
    expect(stub.decodes).toBe(1)
  })

  it('data URL corrompida não deixa a figura presa em "abrindo" para sempre', async () => {
    stub = installStub({})
    const ruim = 'data:image/png;base64,%%%'
    await primeImageSources([ruim])
    // Vira lápide (não `loading` eterno), e uma segunda rodada não repete a conta.
    expect(sampleImageColorAt(figura({ src: ruim }), { x: 140, y: 70 })).toEqual({ kind: 'failed' })
    await primeImageSources([ruim])
    expect(sampleImageColorAt(figura({ src: ruim }), { x: 140, y: 70 })).toEqual({ kind: 'failed' })
  })
})

describe('o cache não come as figuras do próprio quadro', () => {
  /** Cada `src` distinto decodifica para 2000×2000 = 4 Mpx: 4 já estouram o teto. */
  const muitas = Array.from({ length: 9 }, (_, i) => `data:image/png;base64,${btoa(`f${i}`)}`)

  it('⭐ TODAS as figuras do quadro ficam legíveis, mesmo passando do teto', async () => {
    stub = installStub({ size: { width: 2000, height: 2000 } })
    await primeImageSources(muitas)
    // Antes o teto era por CONTAGEM (8) e a própria pré-carga despejava o que
    // acabara de abrir: a 1ª figura ficava ilegível para sempre.
    const lidas = muitas.map((src) => sampleImageColorAt(figura({ src }), { x: 140, y: 70 }).kind)
    expect(lidas).toEqual(Array.from({ length: 9 }, () => 'color'))
  })

  it('figura de OUTRO quadro é despejada para o quadro de agora caber', async () => {
    stub = installStub({ size: { width: 2000, height: 2000 } })
    const antiga = `data:image/png;base64,${btoa('antiga')}`
    await primeImageSources([antiga])
    expect(sampleImageColorAt(figura({ src: antiga }), { x: 140, y: 70 }).kind).toBe('color')
    // Trocar de quadro: as novas passam a ser as protegidas, e a velha sai.
    await primeImageSources(muitas)
    expect(sampleImageColorAt(figura({ src: antiga }), { x: 140, y: 70 }).kind).toBe('loading')
    expect(sampleImageColorAt(figura({ src: muitas[0] as string }), { x: 140, y: 70 }).kind).toBe(
      'color',
    )
  })
})
