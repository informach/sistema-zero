import { expect, test } from 'bun:test'
import {
  alturaDoCampo,
  amostrasDaPeca,
  campoDaBase,
  clonarCampo,
  criarCampoDeAlturas,
  decliveDaAmostra,
  extremosDoCampo,
  pecasDaRegiao,
  regiaoDoRetangulo,
  unirRegioes,
} from '../src/v2/campo-de-alturas'
import {
  abaixarTerreno,
  aplainarTerreno,
  carimbarCratera,
  carimbarMorro,
  elevarTerreno,
  erodirTerreno,
  fazerPlato,
  fazerRampa,
  pesoDoPincel,
  ruidoDeValor,
  ruidoFractal,
  ruidoNoTerreno,
  suavizarTerreno,
} from '../src/v2/pinceis-de-terreno'
import {
  acrescentarCamadaDeChao,
  codificarBuracosDaPeca,
  codificarPecaDePintura,
  colocarBuracosDaPeca,
  colocarPecaDePintura,
  criarBuracos,
  criarPinturaDeChao,
  furarTerreno,
  lerPecaDePintura,
  pintarChao,
  pintarChaoPorRegras,
  pontoNoBuraco,
  retirarCamadaDeChao,
} from '../src/v2/pintura-de-chao'
import {
  codificarPngDeAlturas,
  colocarImagemNoCampo,
  imagemDoCampo,
  lerPngDeAlturas,
} from '../src/v2/png-de-alturas'
import { aplicarReceitaDeTerreno } from '../src/v2/receitas-de-terreno'
import {
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  criarFonteDeAlturas,
  lerPecaDeAlturas,
  TerrenoInvalido,
} from '../src/v2/terreno'

const forma = { origem: { x: -64, z: -32 }, passo: 1, colunas: 128, linhas: 64, min: -50, max: 205 }
const novo = (altura = 0) => criarCampoDeAlturas(forma, altura)
const em = (c: ReturnType<typeof novo>, x: number, z: number) =>
  c.alturas[(z - c.origem.z) * (c.colunas + 1) + (x - c.origem.x)]!
const soma = (c: ReturnType<typeof novo>) => c.alturas.reduce((s, h) => s + h, 0)
const digestDe = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

/** Fecha o ciclo real: campo → peças binárias → base → fonte de alturas. */
function gravar(c: ReturnType<typeof novo>) {
  const recursos = new Map<string, ReturnType<typeof lerPecaDeAlturas>>()
  const pecas: BaseDeTerreno['pecas'] = []
  for (const p of pecasDaRegiao(c, { x0: 0, z0: 0, x1: c.colunas, z1: c.linhas })) {
    const bytes = codificarPecaDeAlturas(amostrasDaPeca(c, p.coluna, p.linha), c.min, c.max)
    const digest = digestDe(bytes)
    recursos.set(digest, lerPecaDeAlturas(bytes))
    pecas.push({ ...p, digest })
  }
  const base: BaseDeTerreno = { tipo: 'terreno', ...forma, fundo: 0, pecas }
  return { base, recursos }
}

test('o campo confere a forma e lê com a mesma interpolação da fonte das peças', () => {
  expect(() => criarCampoDeAlturas({ ...forma, colunas: 100 })).toThrow(TerrenoInvalido)
  expect(() => criarCampoDeAlturas(forma, 999)).toThrow(TerrenoInvalido)
  const c = novo()
  aplicarReceitaDeTerreno(c, { tipo: 'colinas', altura: 40, escala: 30, semente: 5 })
  const { base, recursos } = gravar(c)
  const fonte = criarFonteDeAlturas(base, recursos)
  const reaberto = campoDaBase(base, recursos)
  for (const [x, z] of [
    [-64, -32],
    [0.25, 0.75],
    [-0.5, 12.9],
    [63.999, 31.999],
    [10.5, -20.5],
  ] as const) {
    expect(alturaDoCampo(reaberto, x, z)).toBeCloseTo(fonte(x, z), 4)
    // A quantização em 16 bits desvia no máximo meio degrau (255 m / 65535 / 2).
    expect(Math.abs(alturaDoCampo(c, x, z) - fonte(x, z))).toBeLessThan(0.002)
  }
})

test('reabrir e regravar sem esculpir conserva os bytes de todas as peças', () => {
  const c = novo()
  aplicarReceitaDeTerreno(c, { tipo: 'ilha', altura: 60, semente: 11 })
  const { base, recursos } = gravar(c)
  const outra = gravar(campoDaBase(base, recursos))
  expect(outra.base.pecas).toEqual(base.pecas)
})

test('uma pincelada só muda as peças que toca e mantém as bordas coincidentes', () => {
  const c = novo()
  aplicarReceitaDeTerreno(c, { tipo: 'colinas', altura: 20, semente: 2 })
  const antes = gravar(c)
  const reaberto = campoDaBase(antes.base, antes.recursos)
  // Em x = 0 fica a divisa das duas peças: as duas precisam ser regravadas.
  const regiao = elevarTerreno(reaberto, { x: 0, z: 0, raio: 6, forca: 1 }, 5)
  expect(pecasDaRegiao(reaberto, regiao)).toEqual([
    { coluna: 0, linha: 0 },
    { coluna: 1, linha: 0 },
  ])
  const depois = gravar(reaberto)
  expect(depois.base.pecas.map((p) => p.digest)).not.toEqual(antes.base.pecas.map((p) => p.digest))
  // A fonte confere as bordas ao abrir; não lançar é a prova.
  expect(criarFonteDeAlturas(depois.base, depois.recursos)(0, 0)).toBeCloseTo(em(reaberto, 0, 0), 2)
  const longe = elevarTerreno(reaberto, { x: 40, z: 10, raio: 5, forca: 1 }, 1)
  expect(pecasDaRegiao(reaberto, longe)).toEqual([{ coluna: 1, linha: 0 }])
  expect(pecasDaRegiao(reaberto, null)).toEqual([])
})

test('regiões: recorte ao campo, união e pincel fora do terreno', () => {
  const c = novo()
  expect(regiaoDoRetangulo(c, -1000, -1000, -900, -900)).toBeNull()
  expect(regiaoDoRetangulo(c, -1000, -1000, 1000, 1000)).toEqual({ x0: 0, z0: 0, x1: 128, z1: 64 })
  expect(elevarTerreno(c, { x: 500, z: 500, raio: 4, forca: 1 }, 3)).toBeNull()
  expect(elevarTerreno(c, { x: 0, z: 0, raio: 4, forca: 0 }, 3)).toBeNull()
  expect(extremosDoCampo(c)).toEqual({ min: 0, max: 0 })
  const a = { x0: 1, z0: 2, x1: 3, z1: 4 }
  expect(unirRegioes(a, null)).toEqual(a)
  expect(unirRegioes(a, { x0: 0, z0: 3, x1: 9, z1: 3 })).toEqual({ x0: 0, z0: 2, x1: 9, z1: 4 })
})

test('elevar e abaixar: efeito cheio no miolo, zero na borda, limites respeitados', () => {
  expect(pesoDoPincel(0, 10)).toBe(1)
  expect(pesoDoPincel(5, 10)).toBe(1)
  expect(pesoDoPincel(7.5, 10)).toBe(0.5)
  expect(pesoDoPincel(10, 10)).toBe(0)
  const c = novo()
  elevarTerreno(c, { x: 0, z: 0, raio: 10, forca: 0.5 }, 8)
  expect(em(c, 0, 0)).toBe(4)
  expect(em(c, 5, 0)).toBe(4)
  expect(em(c, 8, 0)).toBeGreaterThan(0)
  expect(em(c, 8, 0)).toBeLessThan(4)
  expect(em(c, 10, 0)).toBe(0)
  expect(em(c, 0, 11)).toBe(0)
  abaixarTerreno(c, { x: 0, z: 0, raio: 10, forca: 0.5 }, 8)
  expect(em(c, 0, 0)).toBe(0)
  expect(em(c, 8, 0)).toBeCloseTo(0, 5)
  elevarTerreno(c, { x: 0, z: 0, raio: 3, forca: 1 }, 5000)
  expect(em(c, 0, 0)).toBe(205)
  abaixarTerreno(c, { x: 0, z: 0, raio: 3, forca: 1 }, 15000)
  expect(em(c, 0, 0)).toBe(-50)
  for (const pincel of [
    { x: 0, z: 0, raio: 0, forca: 1 },
    { x: 0, z: 0, raio: 5, forca: 2 },
    { x: Number.NaN, z: 0, raio: 5, forca: 1 },
    { x: 0, z: 0, raio: 5, forca: 1, dureza: 3 },
  ])
    expect(() => elevarTerreno(c, pincel, 1)).toThrow(TerrenoInvalido)
  expect(() =>
    elevarTerreno(c, { x: 0, z: 0, raio: 5, forca: 1 }, Number.POSITIVE_INFINITY),
  ).toThrow(TerrenoInvalido)
})

test('aplainar, platô e suavizar', () => {
  const c = novo()
  aplicarReceitaDeTerreno(c, { tipo: 'colinas', altura: 30, escala: 12, semente: 9 })
  const antes = clonarCampo(c)
  aplainarTerreno(c, { x: 10, z: 0, raio: 8, forca: 1 }, 12)
  expect(em(c, 10, 0)).toBeCloseTo(12, 5)
  expect(em(c, 13, 2)).toBeCloseTo(12, 5)
  expect(em(c, 20, 0)).toBe(em(antes, 20, 0))
  fazerPlato(c, { x: -30, z: 0, raio: 12 }, 25)
  for (const [x, z] of [
    [-30, 0],
    [-22, 0],
    [-30, 8],
  ] as const)
    expect(em(c, x, z)).toBeCloseTo(25, 5)
  expect(em(c, -30, 12)).toBe(em(antes, -30, 12))

  const d = novo()
  elevarTerreno(d, { x: 0, z: 0, raio: 0.5, forca: 1, dureza: 1 }, 10)
  const pico = em(d, 0, 0),
    volume = soma(d)
  suavizarTerreno(d, { x: 0, z: 0, raio: 20, forca: 1, dureza: 1 })
  expect(em(d, 0, 0)).toBeLessThan(pico)
  expect(em(d, 1, 1)).toBeGreaterThan(0)
  // Longe das bordas do campo e com peso cheio, a média de 3 × 3 conserva o volume.
  expect(soma(d)).toBeCloseTo(volume, 3)
})

test('morro e cratera', () => {
  const c = novo(10)
  carimbarMorro(c, { x: 0, z: 0, raio: 16 }, 9)
  expect(em(c, 0, 0)).toBe(19)
  expect(em(c, 8, 0)).toBeCloseTo(14.5, 5)
  expect(em(c, 16, 0)).toBe(10)
  expect(em(c, 4, 0)).toBeGreaterThan(em(c, 8, 0))

  const d = novo(10)
  carimbarCratera(d, { x: 0, z: 0, raio: 20 }, { profundidade: 6, borda: 2 })
  expect(em(d, 0, 0)).toBe(4)
  expect(em(d, 14, 0)).toBeCloseTo(12, 5)
  expect(em(d, 20, 0)).toBe(10)
  expect(em(d, 7, 0)).toBeLessThan(10)
  expect(em(d, 17, 0)).toBeGreaterThan(10)
  expect(() => carimbarCratera(d, { x: 0, z: 0, raio: 5 }, { profundidade: -1 })).toThrow(
    TerrenoInvalido,
  )
})

test('rampa: piso reto entre as pontas, taludes suaves e pontas no chão existente', () => {
  const c = novo()
  const altura = (x: number, z: number) => alturaDoCampo(c, x, z)
  fazerRampa(c, { de: { x: -20, z: 0, y: 0 }, ate: { x: 20, z: 0, y: 10 }, largura: 6 }, altura)
  expect(em(c, -20, 0)).toBe(0)
  expect(em(c, 0, 0)).toBeCloseTo(5, 5)
  expect(em(c, 0, 3)).toBeCloseTo(5, 5)
  expect(em(c, 20, -2)).toBeCloseTo(10, 5)
  expect(em(c, 0, 4)).toBeGreaterThan(0)
  expect(em(c, 0, 4)).toBeLessThan(5)
  expect(em(c, 0, 5)).toBe(0)
  // Diagonal, com as alturas lidas do próprio chão.
  const d = novo()
  fazerPlato(d, { x: 30, z: 20, raio: 10 }, 16)
  const alturaD = (x: number, z: number) => alturaDoCampo(d, x, z)
  fazerRampa(d, { de: { x: 0, z: 0 }, ate: { x: 30, z: 20 }, largura: 4, borda: 0 }, alturaD)
  expect(em(d, 0, 0)).toBe(0)
  expect(em(d, 15, 10)).toBeCloseTo(8, 5)
  expect(em(d, 30, 20)).toBeCloseTo(16, 5)
  expect(() =>
    fazerRampa(d, { de: { x: 1, z: 1 }, ate: { x: 1, z: 1 }, largura: 4 }, alturaD),
  ).toThrow(TerrenoInvalido)
  expect(
    fazerRampa(d, { de: { x: 900, z: 900 }, ate: { x: 950, z: 900 }, largura: 4 }, alturaD),
  ).toBeNull()
})

test('ruído: repetível pela semente, contínuo e dentro da amplitude', () => {
  for (let i = 0; i < 200; i++) {
    const x = i * 0.37 - 30,
      z = i * 0.91 + 4,
      r = ruidoFractal(x, z, { escala: 9, semente: 3 })
    expect(r).toBeGreaterThanOrEqual(-1)
    expect(r).toBeLessThanOrEqual(1)
    expect(ruidoFractal(x, z, { escala: 9, semente: 3 })).toBe(r)
    expect(Math.abs(ruidoDeValor(x, z, 1) - ruidoDeValor(x + 0.001, z, 1))).toBeLessThan(0.01)
  }
  expect(ruidoDeValor(1.5, 2.5, 1)).not.toBe(ruidoDeValor(1.5, 2.5, 2))
  // Valores fixos: qualquer mudança no ruído muda relevos já gerados por receita.
  expect(ruidoDeValor(1.5, 2.5, 1)).toBe(RUIDO_FIXO[0]!)
  expect(ruidoFractal(12.25, -7.5, { escala: 9, oitavas: 5, semente: 42 })).toBe(RUIDO_FIXO[1]!)
  expect(() => ruidoFractal(0, 0, { escala: 0, semente: 1 })).toThrow(TerrenoInvalido)
  expect(() => ruidoFractal(0, 0, { escala: 5, semente: 1.5 })).toThrow(TerrenoInvalido)

  const a = novo(50),
    b = novo(50)
  const opcoes = { amplitude: 4, escala: 10, semente: 8 }
  ruidoNoTerreno(a, { x: 0, z: 0, raio: 20, forca: 1 }, opcoes)
  ruidoNoTerreno(b, { x: 0, z: 0, raio: 20, forca: 1 }, opcoes)
  expect(a.alturas).toEqual(b.alturas)
  const { min, max } = extremosDoCampo(a)
  expect(min).toBeGreaterThanOrEqual(46)
  expect(max).toBeLessThanOrEqual(54)
  expect(max - min).toBeGreaterThan(1)
})
const RUIDO_FIXO = [-0.3528624806785956, -0.1962468526503079]

test('erosão: reduz o declive máximo e conserva o volume', () => {
  const c = novo()
  elevarTerreno(c, { x: 0, z: 0, raio: 6, forca: 1, dureza: 1 }, 20)
  const maior = () => {
    let m = 0
    for (let z = 1; z < c.linhas; z++)
      for (let x = 1; x < c.colunas; x++) m = Math.max(m, decliveDaAmostra(c, x, z))
    return m
  }
  const antes = maior(),
    volume = soma(c)
  const regiao = erodirTerreno(c, { x: 0, z: 0, raio: 25, forca: 1, dureza: 1 }, { passadas: 40 })
  expect(regiao).not.toBeNull()
  expect(maior()).toBeLessThan(antes * 0.6)
  expect(soma(c)).toBeCloseTo(volume, 2)
  expect(extremosDoCampo(c).min).toBeGreaterThanOrEqual(0)
  expect(em(c, 0, 0)).toBeLessThan(20)
  // Abaixo do talude não há o que escorrer.
  const d = novo()
  fazerRampa(
    d,
    { de: { x: -20, z: 0, y: 0 }, ate: { x: 20, z: 0, y: 8 }, largura: 30, borda: 0 },
    () => 0,
  )
  const igual = clonarCampo(d)
  erodirTerreno(d, { x: 0, z: 0, raio: 8, forca: 1 }, { talude: 0.6 })
  expect(d.alturas).toEqual(igual.alturas)
  expect(() => erodirTerreno(d, { x: 0, z: 0, raio: 8, forca: 1 }, { passadas: 0 })).toThrow(
    TerrenoInvalido,
  )
})

test('receitas: plano, ilha, colinas e vale saem iguais para a mesma semente', () => {
  const c = novo()
  aplicarReceitaDeTerreno(c, { tipo: 'plano', altura: 7 })
  expect(extremosDoCampo(c)).toEqual({ min: 7, max: 7 })

  const ilha = novo(),
    ilha2 = novo(),
    outra = novo()
  aplicarReceitaDeTerreno(ilha, { tipo: 'ilha', altura: 40, fundo: 10, semente: 1 })
  aplicarReceitaDeTerreno(ilha2, { tipo: 'ilha', altura: 40, fundo: 10, semente: 1 })
  aplicarReceitaDeTerreno(outra, { tipo: 'ilha', altura: 40, fundo: 10, semente: 2 })
  expect(ilha.alturas).toEqual(ilha2.alturas)
  expect(ilha.alturas).not.toEqual(outra.alturas)
  expect(em(ilha, 0, 0)).toBeCloseTo(40, 4)
  // A borda inteira do terreno fica no fundo do mar.
  for (let x = -64; x <= 64; x++) {
    expect(em(ilha, x, -32)).toBe(-10)
    expect(em(ilha, x, 32)).toBe(-10)
  }
  for (let z = -32; z <= 32; z++) {
    expect(em(ilha, -64, z)).toBe(-10)
    expect(em(ilha, 64, z)).toBe(-10)
  }

  const colinas = novo()
  aplicarReceitaDeTerreno(colinas, { tipo: 'colinas', altura: 30, semente: 4 })
  const e = extremosDoCampo(colinas)
  expect(e.min).toBeGreaterThanOrEqual(0)
  expect(e.max).toBeLessThanOrEqual(30)
  expect(e.max - e.min).toBeGreaterThan(8)

  const vale = novo()
  aplicarReceitaDeTerreno(vale, { tipo: 'vale', altura: 30, largura: 12, eixo: 'z', semente: 6 })
  for (let z = -32; z <= 32; z += 8) {
    let fundo = Infinity
    for (let x = -30; x <= 30; x++) fundo = Math.min(fundo, em(vale, x, z))
    expect(fundo).toBe(0)
    expect(em(vale, -64, z)).toBeGreaterThan(15)
    expect(em(vale, 64, z)).toBeGreaterThan(15)
  }
  expect(() => aplicarReceitaDeTerreno(c, { tipo: 'ilha', altura: -1, semente: 1 })).toThrow()
  expect(() => aplicarReceitaDeTerreno(c, { tipo: 'vulcao', altura: 1, semente: 1 })).toThrow()
  // Receita mais alta que o intervalo das peças é contida, nunca grava altura inválida.
  aplicarReceitaDeTerreno(c, { tipo: 'colinas', altura: 2000, semente: 1 })
  expect(extremosDoCampo(c).max).toBeLessThanOrEqual(205)
})

test('pintura de chão: os pesos somam sempre 255 e a pincelada é exata', () => {
  const c = novo()
  let p = criarPinturaDeChao(c, 3)
  const pesos = (x: number, z: number) => {
    const i = ((z - c.origem.z) * (c.colunas + 1) + (x - c.origem.x)) * p.camadas
    return [...p.pesos.subarray(i, i + p.camadas)]
  }
  const conferir = () => {
    for (let i = 0; i < p.pesos.length; i += p.camadas) {
      let s = 0
      for (let k = 0; k < p.camadas; k++) s += p.pesos[i + k]!
      if (s !== 255) throw new Error(`soma ${s} em ${i}`)
    }
  }
  expect(pesos(0, 0)).toEqual([255, 0, 0])
  const regiao = pintarChao(c, p, { x: 0, z: 0, raio: 10, forca: 1 }, 1)
  expect(regiao).toEqual({ x0: 54, z0: 22, x1: 74, z1: 42 })
  expect(pesos(0, 0)).toEqual([0, 255, 0])
  expect(pesos(10, 0)).toEqual([255, 0, 0])
  const borda = pesos(8, 0)
  expect(borda[0]! > 0 && borda[1]! > 0 && borda[2] === 0).toBe(true)
  pintarChao(c, p, { x: 6, z: 0, raio: 6, forca: 0.4 }, 2)
  pintarChao(c, p, { x: 3, z: 2, raio: 9, forca: 0.7, dureza: 0.1 }, 0)
  conferir()
  expect(pesos(6, 0).every((v) => v > 0)).toBe(true)
  expect(pintarChao(c, p, { x: 900, z: 0, raio: 6, forca: 1 }, 2)).toBeNull()
  expect(() => pintarChao(c, p, { x: 0, z: 0, raio: 6, forca: 1 }, 3)).toThrow(TerrenoInvalido)
  expect(() => criarPinturaDeChao(c, 9)).toThrow(TerrenoInvalido)

  // Ida e volta do binário por peça.
  const bytes = codificarPecaDePintura(p, 1, 0)
  expect(bytes.byteLength).toBe(8 + 65 * 65 * 3)
  const copia = criarPinturaDeChao(c, 3, 2)
  colocarPecaDePintura(copia, 1, 0, lerPecaDePintura(bytes))
  expect(codificarPecaDePintura(copia, 1, 0)).toEqual(bytes)
  const torto = bytes.slice()
  torto[8] = torto[8]! ^ 1
  expect(() => lerPecaDePintura(torto)).toThrow(TerrenoInvalido)
  expect(() => lerPecaDePintura(bytes.subarray(0, 100))).toThrow(TerrenoInvalido)

  // Camadas entram e saem sem quebrar a soma.
  const antes = pesos(6, 0)
  p = acrescentarCamadaDeChao(p)
  expect(pesos(6, 0)).toEqual([...antes, 0])
  conferir()
  p = retirarCamadaDeChao(p, 1)
  expect(p.camadas).toBe(3)
  conferir()
  expect(pesos(0, -20)).toEqual([255, 0, 0])
  // Onde só existia a camada retirada, o chão volta para a primeira.
  const so = criarPinturaDeChao(c, 2, 1)
  expect([...retirarCamadaDeChao(so, 1).pesos.subarray(0, 3)]).toEqual([255, 255, 255])
  expect(() => retirarCamadaDeChao(retirarCamadaDeChao(so, 0), 0)).toThrow(TerrenoInvalido)
})

test('pintura automática por altura e declive', () => {
  const c = novo()
  fazerRampa(
    c,
    { de: { x: -40, z: 0, y: 0 }, ate: { x: 40, z: 0, y: 40 }, largura: 200, borda: 0 },
    () => 0,
  )
  // Uma parede no meio do campo, bem mais íngreme que a rampa.
  elevarTerreno(c, { x: 0, z: 20, raio: 3, forca: 1, dureza: 1 }, 30)
  const p = criarPinturaDeChao(c, 4)
  pintarChaoPorRegras(c, p, [
    { camada: 0 }, // areia em tudo
    { camada: 1, altura: { min: 5, max: 1000 }, transicao: { altura: 2 } }, // grama
    { camada: 3, altura: { min: 30, max: 1000 } }, // neve
    { camada: 2, declive: { min: 2, max: 1000 }, transicao: { declive: 0.5 } }, // pedra
  ])
  const dominante = (x: number, z: number) => {
    const i = ((z - c.origem.z) * (c.colunas + 1) + (x - c.origem.x)) * 4
    const w = [...p.pesos.subarray(i, i + 4)]
    expect(w.reduce((s, v) => s + v, 0)).toBe(255)
    return w.indexOf(Math.max(...w))
  }
  expect(dominante(-38, 0)).toBe(0)
  expect(dominante(0, 0)).toBe(1)
  expect(dominante(30, 0)).toBe(3)
  expect(dominante(3, 20)).toBe(2)
  // Na transição da areia para a grama as duas aparecem.
  const i = ((0 - c.origem.z) * (c.colunas + 1) + (-31 - c.origem.x)) * 4
  expect(p.pesos[i]! > 0 && p.pesos[i + 1]! > 0).toBe(true)
  expect(() => pintarChaoPorRegras(c, p, [{ camada: 7 }])).toThrow(TerrenoInvalido)
  expect(() => pintarChaoPorRegras(c, p, [{ camada: 0, altura: { min: 5, max: 1 } }])).toThrow(
    TerrenoInvalido,
  )
})

test('buracos: células abertas pelo pincel, consulta e mapa de bits por peça', () => {
  const c = novo(),
    b = criarBuracos(c)
  expect(pontoNoBuraco(c, b, 0.5, 0.5)).toBe(false)
  const regiao = furarTerreno(c, b, { x: 0, z: 0, raio: 3 })
  expect(regiao).toEqual({ x0: 61, z0: 29, x1: 67, z1: 35 })
  expect(pontoNoBuraco(c, b, 0.5, 0.5)).toBe(true)
  expect(pontoNoBuraco(c, b, -1.5, 1.2)).toBe(true)
  expect(pontoNoBuraco(c, b, 3.5, 0.5)).toBe(false)
  expect(pontoNoBuraco(c, b, 9999, 0)).toBe(false)
  const abertas = b.celulas.reduce((s, v) => s + v, 0)
  expect(abertas).toBeGreaterThan(20)
  // O furo cruza a divisa das peças em x = 0.
  const esquerda = codificarBuracosDaPeca(b, 0, 0),
    direita = codificarBuracosDaPeca(b, 1, 0)
  expect(esquerda.byteLength).toBe(512)
  expect(esquerda.some((v) => v) && direita.some((v) => v)).toBe(true)
  const copia = criarBuracos(c)
  colocarBuracosDaPeca(copia, 0, 0, esquerda)
  colocarBuracosDaPeca(copia, 1, 0, direita)
  expect(copia.celulas).toEqual(b.celulas)
  furarTerreno(c, b, { x: 0, z: 0, raio: 3 }, false)
  expect(b.celulas.some((v) => v)).toBe(false)
  expect(furarTerreno(c, b, { x: 900, z: 0, raio: 3 })).toBeNull()
  expect(() => colocarBuracosDaPeca(copia, 0, 0, new Uint8Array(10))).toThrow(TerrenoInvalido)
})

test('PNG de alturas: ida e volta em 16 bits e recusas', async () => {
  const c = novo()
  aplicarReceitaDeTerreno(c, { tipo: 'ilha', altura: 80, fundo: 20, semente: 3 })
  const png = await codificarPngDeAlturas(imagemDoCampo(c))
  const lido = await lerPngDeAlturas(png)
  expect([lido.largura, lido.altura]).toEqual([129, 65])
  const d = novo()
  colocarImagemNoCampo(d, lido, { base: d.min, topo: d.max })
  let desvio = 0
  for (let i = 0; i < c.alturas.length; i++)
    desvio = Math.max(desvio, Math.abs(c.alturas[i]! - d.alturas[i]!))
  expect(desvio).toBeLessThan(0.003)

  // Imagem menor e de outra proporção estica sobre o campo todo.
  const pequena = { largura: 2, altura: 2, valores: Float32Array.from([0, 1, 0, 1]) }
  colocarImagemNoCampo(d, await lerPngDeAlturas(await codificarPngDeAlturas(pequena)), {
    base: 0,
    topo: 64,
  })
  expect(em(d, -64, 0)).toBe(0)
  expect(em(d, 0, 10)).toBe(32)
  expect(em(d, 64, -32)).toBe(64)
  expect(() => colocarImagemNoCampo(d, pequena, { base: 0, topo: 9999 })).toThrow(TerrenoInvalido)

  await expect(lerPngDeAlturas(new Uint8Array(80))).rejects.toThrow(TerrenoInvalido)
  const crc = png.slice()
  crc[40] = crc[40]! ^ 255
  await expect(lerPngDeAlturas(crc)).rejects.toThrow('corrompido')
  await expect(lerPngDeAlturas(png.subarray(0, png.length - 12))).rejects.toThrow(TerrenoInvalido)
  await expect(
    codificarPngDeAlturas({ largura: 2, altura: 2, valores: Float32Array.from([0, 2, 0, 0]) }),
  ).rejects.toThrow(TerrenoInvalido)
})

test('PNG de alturas: lê 8 bits colorido com filtros de linha', async () => {
  // 3 × 2, RGB de 8 bits; linha 0 com filtro Sub, linha 1 com filtro Up.
  const cru = Uint8Array.from([1, 10, 0, 0, 10, 0, 0, 10, 0, 0, 2, 5, 0, 0, 5, 0, 0, 5, 0, 0])
  const fluxo = new CompressionStream('deflate')
  const w = fluxo.writable.getWriter()
  w.write(cru)
  w.close()
  const dados = new Uint8Array(await new Response(fluxo.readable).arrayBuffer())
  const tabela = Array.from({ length: 256 }, (_, n) => {
    let v = n
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1
    return v >>> 0
  })
  const pedaco = (tipo: string, corpo: Uint8Array) => {
    const r = new Uint8Array(12 + corpo.length),
      v = new DataView(r.buffer)
    v.setUint32(0, corpo.length)
    r.set(new TextEncoder().encode(tipo), 4)
    r.set(corpo, 8)
    let c = 0xffffffff
    for (let i = 4; i < 8 + corpo.length; i++) c = tabela[(c ^ r[i]!) & 255]! ^ (c >>> 8)
    v.setUint32(8 + corpo.length, (c ^ 0xffffffff) >>> 0)
    return r
  }
  const ihdr = new Uint8Array(13)
  new DataView(ihdr.buffer).setUint32(0, 3)
  new DataView(ihdr.buffer).setUint32(4, 2)
  ihdr.set([8, 2, 0, 0, 0], 8)
  const montar = (cabecalho: Uint8Array) =>
    Uint8Array.from([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10,
      ...pedaco('IHDR', cabecalho),
      ...pedaco('IDAT', dados),
      ...pedaco('IEND', new Uint8Array(0)),
    ])
  const lido = await lerPngDeAlturas(montar(ihdr))
  expect([...lido.valores].map((v) => Math.round(v * 255))).toEqual([10, 20, 30, 15, 25, 35])
  const entrelacado = ihdr.slice()
  entrelacado[12] = 1
  await expect(lerPngDeAlturas(montar(entrelacado))).rejects.toThrow('entrelaçamento')
  const paleta = ihdr.slice()
  paleta[9] = 3
  await expect(lerPngDeAlturas(montar(paleta))).rejects.toThrow('paleta')
})
