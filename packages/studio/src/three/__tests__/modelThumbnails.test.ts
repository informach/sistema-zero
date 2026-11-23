import { afterEach, describe, expect, test } from 'bun:test'
import {
  COURSE_MODEL_LIB_PREFIX,
  clearCourseModelCacheForTests,
  courseModelStub,
  knownCourseModels,
} from '../../core/courseModels'
import { criarMiniaturas, type DesenharMiniatura, recorteDoDesenho } from '../modelThumbnails'

/**
 * A memória das miniaturas dos modelos 3D (seletor do bloco e aba "Modelos 3D"). O desenho de
 * verdade (three.js + WebGL) é conferido no navegador; aqui, quem desenha é um registro.
 */
const glb = (texto: string) => `data:model/gltf-binary;base64,${btoa(texto)}`
const modelo = (id: string, texto = id) => ({ id, kind: 'model3d' as const, dataUrl: glb(texto) })

function registro() {
  const pedidos: string[] = []
  const soltar: Array<() => void> = []
  let emVoo = 0
  let maximo = 0
  const desenhar: DesenharMiniatura = (dataUrl) => {
    pedidos.push(dataUrl)
    emVoo++
    maximo = Math.max(maximo, emVoo)
    return new Promise((resolve) => {
      soltar.push(() => {
        emVoo--
        resolve(`data:image/png;base64,${btoa(dataUrl.slice(-8))}`)
      })
    })
  }
  return { desenhar, pedidos, soltar, maximo: () => maximo }
}

const tique = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => clearCourseModelCacheForTests())

test('desenha um modelo por vez, na ordem dos pedidos', async () => {
  const r = registro()
  const m = criarMiniaturas(r.desenhar)
  const a = m.pedir(modelo('a')),
    b = m.pedir(modelo('b'))
  await tique()
  expect(r.pedidos).toHaveLength(1)
  r.soltar.shift()!()
  await a
  await tique()
  expect(r.pedidos).toHaveLength(2)
  r.soltar.shift()!()
  await b
  expect(r.maximo()).toBe(1)
})

test('o mesmo modelo não é desenhado duas vezes, e a resposta fica pronta para a próxima tela', async () => {
  const r = registro()
  const m = criarMiniaturas(r.desenhar)
  const asset = modelo('nave')
  expect(m.pronta(asset)).toBeUndefined()
  const um = m.pedir(asset),
    dois = m.pedir({ ...asset })
  await tique()
  r.soltar.shift()!()
  const [x, y] = await Promise.all([um, dois])
  expect(x).toStartWith('data:image/png;base64,')
  expect(y).toBe(x)
  expect(m.pronta(asset)).toBe(x)
  expect(await m.pedir(asset)).toBe(x)
  expect(r.pedidos).toHaveLength(1)
})

test('trocar o arquivo no mesmo id desenha de novo', async () => {
  const r = registro()
  const m = criarMiniaturas(r.desenhar)
  const p1 = m.pedir(modelo('nave', 'versao-1'))
  await tique()
  r.soltar.shift()!()
  await p1
  const p2 = m.pedir(modelo('nave', 'versao-2-maior'))
  await tique()
  r.soltar.shift()!()
  expect(await p2).not.toBe(await p1)
  expect(r.pedidos).toHaveLength(2)
})

test('céu, som e imagem não pedem desenho; falha vira null guardado (fica o 📦)', async () => {
  let chamadas = 0
  const m = criarMiniaturas(async () => {
    chamadas++
    throw new Error('sem WebGL')
  })
  for (const kind of ['environment3d', 'audio', 'image'] as const) {
    const a = { id: kind, kind, dataUrl: 'data:x;base64,AA==' }
    expect(await m.pedir(a)).toBeNull()
    expect(m.pronta(a)).toBeNull()
  }
  expect(chamadas).toBe(0)
  const quebrado = modelo('quebrado')
  expect(await m.pedir(quebrado)).toBeNull()
  expect(m.pronta(quebrado)).toBeNull()
  expect(await m.pedir(quebrado)).toBeNull()
  expect(chamadas).toBe(1)
})

test('uma falha não trava a fila: o modelo seguinte é desenhado', async () => {
  let n = 0
  const m = criarMiniaturas(async (dataUrl) => {
    n++
    if (n === 1) throw new Error('arquivo ruim')
    return `data:image/png;base64,${btoa(dataUrl.slice(-4))}`
  })
  const ruim = m.pedir(modelo('ruim')),
    bom = m.pedir(modelo('bom'))
  expect(await ruim).toBeNull()
  expect(await bom).toStartWith('data:image/png;base64,')
})

test('guarda as últimas 64 e esquece as mais antigas', async () => {
  const m = criarMiniaturas(async (dataUrl) => `data:image/png;base64,${btoa(dataUrl.slice(-6))}`)
  for (let i = 0; i < 65; i++) await m.pedir(modelo(`m${i}`))
  expect(m.pronta(modelo('m0'))).toBeUndefined()
  expect(m.pronta(modelo('m1'))).toBeDefined()
  expect(m.pronta(modelo('m64'))).toBeDefined()
})

test('esquecer descarta também o desenho que estava em voo', async () => {
  const r = registro()
  const m = criarMiniaturas(r.desenhar)
  const asset = modelo('voo')
  const p = m.pedir(asset)
  await tique()
  m.esquecer()
  r.soltar.shift()!()
  await p
  expect(m.pronta(asset)).toBeUndefined()
})

test('o modelo dos cursos (referência compacta) é desenhado com o arquivo completo', async () => {
  const sha = knownCourseModels()[0]!
  const stub = {
    id: 'curso',
    kind: 'model3d' as const,
    source: 'library' as const,
    dataUrl: courseModelStub(sha, []),
    libId: `${COURSE_MODEL_LIB_PREFIX}${sha}`,
  }
  const recebidos: string[] = []
  const m = criarMiniaturas(async (dataUrl) => {
    recebidos.push(dataUrl)
    return 'data:image/png;base64,AA=='
  })
  expect(await m.pedir(stub)).toBe('data:image/png;base64,AA==')
  expect(recebidos).toHaveLength(1)
  expect(recebidos[0]).toStartWith('data:model/gltf-binary;base64,')
  expect(recebidos[0]).not.toBe(stub.dataUrl)
  expect(recebidos[0]!.length).toBeGreaterThan(stub.dataUrl.length * 10)
})

describe('o recorte sai dos pixels do primeiro desenho', () => {
  // RGBA como o WebGL devolve: a linha de BAIXO primeiro.
  function quadro(lado: number, pintados: Array<[number, number]>) {
    const px = new Uint8Array(lado * lado * 4)
    for (const [x, yDeCima] of pintados) px[((lado - 1 - yDeCima) * lado + x) * 4 + 3] = 255
    return px
  }

  test('nada desenhado é vazio; encostado na beirada pede para afastar', () => {
    expect(recorteDoDesenho(quadro(32, []), 32)).toBe('vazio')
    expect(recorteDoDesenho(quadro(32, [[0, 10]]), 32)).toBe('borda')
    expect(recorteDoDesenho(quadro(32, [[10, 31]]), 32)).toBe('borda')
    // Alfa quase zero (a borda suavizada do fundo) não conta.
    const fraco = quadro(32, [])
    fraco[(5 * 32 + 5) * 4 + 3] = 6
    expect(recorteDoDesenho(fraco, 32)).toBe('vazio')
  })

  test('o recorte é um quadrado centrado no modelo, de cima para baixo, com margem', () => {
    // Um modelo pequeno no canto de CIMA à esquerda: x de 4 a 7, y (de cima) de 2 a 9.
    const pintados: Array<[number, number]> = []
    for (let x = 4; x <= 7; x++) for (let y = 2; y <= 9; y++) pintados.push([x, y])
    const r = recorteDoDesenho(quadro(64, pintados), 64)
    if (typeof r === 'string') throw new Error(r)
    expect(r.lado).toBeCloseTo(8 / 0.84, 5)
    expect(r.x + r.lado / 2).toBeCloseTo(6, 5)
    expect(r.y + r.lado / 2).toBeCloseTo(6, 5)
  })
})
