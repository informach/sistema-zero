import { expect, test } from 'bun:test'
import {
  cavarRio,
  encherLago,
  nivelDeTransbordo,
  profundidadeDaAgua,
  represar,
  simplificarAnel,
} from '../src/v2/agua-do-terreno'
import {
  alturaDoCampo,
  clonarCampo,
  criarCampoDeAlturas,
  pecasDaRegiao,
} from '../src/v2/campo-de-alturas'
import {
  areaDoPoligono,
  distribuirNaCurva,
  faixaDaCurva,
  giroDaDirecao,
  inserirPontoNaCurva,
  type MalhaNoChao,
  medirCurva,
  modulosNaCurva,
  moldarTerrenoPelaCurva,
  perfilDaPonte,
  pontoNaCurva,
  reamostrarCurva,
  removerPontoDaCurva,
  suavizarCurva,
  trechoMaisProximo,
  triangularPoligono,
} from '../src/v2/curvas'
import {
  carimbarCratera,
  carimbarMorro,
  elevarTerreno,
  fazerRampa,
} from '../src/v2/pinceis-de-terreno'
import { aplicarReceitaDeTerreno } from '../src/v2/receitas-de-terreno'
import { CenarioInvalido } from '../src/validacao'

const forma = {
  origem: { x: -64, z: -64 },
  passo: 1,
  colunas: 128,
  linhas: 128,
  min: -50,
  max: 205,
}
const novo = (altura = 0) => criarCampoDeAlturas(forma, altura)
const em = (c: ReturnType<typeof novo>, x: number, z: number) =>
  c.alturas[(z - c.origem.z) * (c.colunas + 1) + (x - c.origem.x)]!

/** Menor componente vertical das normais: positivo quer dizer todas as faces para cima. */
function menorNormalY(m: MalhaNoChao | { posicoes: number[]; indices: Uint32Array }) {
  let menor = Infinity
  for (let i = 0; i < m.indices.length; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => {
      const v = m.indices[i + k]! * 3
      return [m.posicoes[v]!, m.posicoes[v + 1]!, m.posicoes[v + 2]!] as const
    }) as unknown as [readonly number[], readonly number[], readonly number[]]
    const ux = b[0]! - a[0]!,
      uz = b[2]! - a[2]!,
      vx = c[0]! - a[0]!,
      vz = c[2]! - a[2]!
    menor = Math.min(menor, uz * vx - ux * vz)
  }
  return menor
}

test('medir, percorrer e reamostrar uma linha', () => {
  const c = medirCurva([
    { x: 0, z: 0 },
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 10, z: 5 },
  ])
  expect(c.pontos.length).toBe(3)
  expect(c.comprimento).toBe(15)
  expect(pontoNaCurva(c, 4)).toEqual({ x: 4, z: 0, dx: 1, dz: 0, distancia: 4 })
  expect(pontoNaCurva(c, 12)).toEqual({ x: 10, z: 2, dx: 0, dz: 1, distancia: 12 })
  expect(pontoNaCurva(c, 99).x).toBe(10)
  expect(pontoNaCurva(c, -5).x).toBe(0)
  const estacoes = reamostrarCurva(c, 4)
  expect(estacoes.length).toBe(5)
  expect(estacoes[4]).toMatchObject({ x: 10, z: 5 })
  expect(estacoes[1]!.distancia).toBeCloseTo(3.75, 9)

  const quadrado = medirCurva(
    [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
      { x: 0, z: 0 },
    ],
    true,
  )
  expect(quadrado.pontos.length).toBe(4)
  expect(quadrado.comprimento).toBe(40)
  expect(pontoNaCurva(quadrado, 45)).toMatchObject({ x: 5, z: 0 })
  expect(pontoNaCurva(quadrado, -5)).toMatchObject({ x: 0, z: 5 })
  expect(reamostrarCurva(quadrado, 10).length).toBe(4)
  expect(() => medirCurva([{ x: 0, z: 0 }])).toThrow(CenarioInvalido)
  expect(() =>
    medirCurva([
      { x: 0, z: Number.NaN },
      { x: 1, z: 1 },
    ]),
  ).toThrow(CenarioInvalido)
})

test('curva suave passa pelos pontos de controle, sem laço nem salto', () => {
  const controle = [
    { x: 0, z: 0 },
    { x: 20, z: 0 },
    { x: 20, z: 20 },
    { x: 60, z: 25 },
  ]
  const c = suavizarCurva(controle, { passo: 0.5 })
  for (const p of controle)
    expect(c.pontos.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1e-9)).toBe(true)
  expect(c.pontos[0]).toEqual(controle[0]!)
  expect(c.pontos[c.pontos.length - 1]).toEqual(controle[3]!)
  expect(c.comprimento).toBeGreaterThan(Math.hypot(60, 25))
  expect(c.comprimento).toBeLessThan(20 + 20 + Math.hypot(40, 5) + 4)
  let maior = 0
  for (let i = 1; i < c.pontos.length; i++)
    maior = Math.max(maior, c.distancias[i]! - c.distancias[i - 1]!)
  expect(maior).toBeLessThan(0.8)
  // Mesma entrada, mesmos números.
  expect(suavizarCurva(controle, { passo: 0.5 }).pontos).toEqual(c.pontos)
  // Dois pontos: a reta.
  expect(suavizarCurva(controle.slice(0, 2)).pontos).toEqual(controle.slice(0, 2))

  const anel = suavizarCurva(
    [
      { x: 10, z: 0 },
      { x: 0, z: 10 },
      { x: -10, z: 0 },
      { x: 0, z: -10 },
    ],
    { fechada: true, passo: 0.25 },
  )
  expect(anel.fechada).toBe(true)
  // Quatro pontos num círculo de raio 10: a curva corta um pouco por dentro no meio de cada
  // arco (8,84 m seria o Catmull-Rom uniforme) e nunca sai para fora.
  for (const p of anel.pontos) {
    expect(Math.hypot(p.x, p.z)).toBeGreaterThan(8.8)
    expect(Math.hypot(p.x, p.z)).toBeLessThan(10.3)
  }
  expect(anel.comprimento).toBeGreaterThan(58)
  expect(anel.comprimento).toBeLessThan(64)
  expect(() => suavizarCurva(controle, { passo: 0 })).toThrow(CenarioInvalido)
})

test('peças soltas e módulos de cerca ao longo da curva', () => {
  const reta = medirCurva([
    { x: 0, z: 0 },
    { x: 10, z: 0 },
  ])
  expect(giroDaDirecao(1, 0)).toBe(0)
  expect(giroDaDirecao(0, -1)).toBeCloseTo(Math.PI / 2, 6)
  expect(giroDaDirecao(0, 1)).toBeCloseTo(-Math.PI / 2, 6)
  const postes = distribuirNaCurva(reta, { espacamento: 3 })
  expect(postes.length).toBe(4)
  postes.forEach((p, i) => {
    expect(p.x).toBeCloseTo((10 * i) / 3, 9)
  })
  expect(distribuirNaCurva(reta, { espacamento: 3, ajustar: false }).map((p) => p.x)).toEqual([
    0, 3, 6, 9,
  ])
  // Avançando para +X, a esquerda é −Z.
  expect(distribuirNaCurva(reta, { espacamento: 5, lateral: 2 }).map((p) => p.z)).toEqual([
    -2, -2, -2,
  ])
  const lances = modulosNaCurva(reta, 3)
  expect(lances.length).toBe(3)
  expect(lances[0]).toMatchObject({ z: 0, giro: 0, de: { x: 0, z: 0 } })
  expect(lances[0]!.x).toBeCloseTo(10 / 6, 9)
  expect(lances[0]!.escala).toBeCloseTo(10 / 9, 9)
  expect(lances[2]!.ate.x).toBe(10)

  // Em volta de um quadrado: fecha exato, sem buraco nem lance repetido.
  const quadrado = medirCurva(
    [
      { x: 0, z: 0 },
      { x: 8, z: 0 },
      { x: 8, z: 8 },
      { x: 0, z: 8 },
    ],
    true,
  )
  const cerca = modulosNaCurva(quadrado, 2)
  expect(cerca.length).toBe(16)
  for (let i = 0; i < cerca.length; i++) {
    const seguinte = cerca[(i + 1) % cerca.length]!
    expect(cerca[i]!.ate.x).toBeCloseTo(seguinte.de.x, 9)
    expect(cerca[i]!.ate.z).toBeCloseTo(seguinte.de.z, 9)
    expect(cerca[i]!.escala).toBeCloseTo(1, 9)
  }
  expect(distribuirNaCurva(quadrado, { espacamento: 2 }).length).toBe(16)
  expect(() => distribuirNaCurva(reta, { espacamento: 0 })).toThrow(CenarioInvalido)
  expect(() => modulosNaCurva(reta, 0.0001)).toThrow(CenarioInvalido)
})

test('faixa da trilha: largura, faces para cima e apoio no relevo', () => {
  const campo = novo()
  aplicarReceitaDeTerreno(campo, { tipo: 'colinas', altura: 12, escala: 25, semente: 3 })
  const altura = (x: number, z: number) => alturaDoCampo(campo, x, z)
  const curva = suavizarCurva(
    [
      { x: -40, z: -30 },
      { x: -10, z: 0 },
      { x: 20, z: -10 },
      { x: 40, z: 30 },
    ],
    { passo: 1 },
  )
  const m = faixaDaCurva(curva, { largura: 3, alturaEm: altura, divisoes: 2 })
  expect(m.posicoes.length).toBe(curva.pontos.length * 3 * 3)
  expect(m.indices.length).toBe((curva.pontos.length - 1) * 2 * 6)
  expect(Math.max(...m.indices)).toBe(curva.pontos.length * 3 - 1)
  expect(menorNormalY(m)).toBeGreaterThan(0)
  for (let v = 0; v < m.posicoes.length / 3; v++) {
    const [x, y, z] = [m.posicoes[v * 3]!, m.posicoes[v * 3 + 1]!, m.posicoes[v * 3 + 2]!]
    expect(y).toBeCloseTo(altura(x, z) + 0.03, 4)
  }
  // Na primeira estação (sem esquina), as bordas ficam a meia largura do eixo.
  const borda = Math.hypot(m.posicoes[0]! - curva.pontos[0]!.x, m.posicoes[2]! - curva.pontos[0]!.z)
  expect(borda).toBeCloseTo(1.5, 5)
  expect(m.uvs[0]).toBe(0)
  expect(m.uvs[4]).toBe(1)
  expect(m.uvs[m.uvs.length - 1]).toBeCloseTo(curva.comprimento / 3, 4)

  const anel = medirCurva(
    [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
    ],
    true,
  )
  const pista = faixaDaCurva(anel, { largura: 2, alturaDoPonto: () => 5, elevacao: 0, divisoes: 1 })
  expect(pista.posicoes.length).toBe(5 * 2 * 3)
  expect(menorNormalY(pista)).toBeGreaterThan(0)
  expect(pista.posicoes[1]).toBe(5)
  // Na esquina de 90°, a faixa alarga para os dois trechos manterem 2 m.
  expect(Math.hypot(pista.posicoes[0]! - 0, pista.posicoes[2]! - 0)).toBeCloseTo(Math.SQRT2, 5)
  expect(() => faixaDaCurva(anel, { largura: 2 })).toThrow(CenarioInvalido)
  expect(() => faixaDaCurva(anel, { largura: 0, alturaEm: altura })).toThrow(CenarioInvalido)
})

test('praça: triângulos de polígono côncavo cobrem a área, voltados para cima', () => {
  // Um "L", nos dois sentidos de giro.
  const L = [
    { x: 0, z: 0 },
    { x: 6, z: 0 },
    { x: 6, z: 2 },
    { x: 2, z: 2 },
    { x: 2, z: 6 },
    { x: 0, z: 6 },
  ]
  expect(areaDoPoligono(L)).toBe(20)
  for (const poligono of [L, [...L].reverse()]) {
    const indices = triangularPoligono(poligono)
    expect(indices.length).toBe((poligono.length - 2) * 3)
    let area = 0
    for (let i = 0; i < indices.length; i += 3)
      area += areaDoPoligono([
        poligono[indices[i]!]!,
        poligono[indices[i + 1]!]!,
        poligono[indices[i + 2]!]!,
      ])
    expect(area).toBeCloseTo(20, 9)
    expect(
      menorNormalY({ posicoes: poligono.flatMap((p) => [p.x, 0, p.z]), indices }),
    ).toBeGreaterThan(0)
  }
  const gravata = [
    { x: 0, z: 0 },
    { x: 4, z: 4 },
    { x: 4, z: 0 },
    { x: 0, z: 4 },
  ]
  expect(() => triangularPoligono(gravata)).toThrow(CenarioInvalido)
  expect(() => triangularPoligono(L.slice(0, 2))).toThrow(CenarioInvalido)
})

test('editar pontos na cena: trecho mais próximo, inserir e remover', () => {
  const pontos = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 10, z: 10 },
  ]
  expect(trechoMaisProximo(pontos, { x: 4, z: 1 })).toEqual({
    indice: 0,
    t: 0.4,
    distancia: 1,
    ponto: { x: 4, z: 0 },
  })
  expect(trechoMaisProximo(pontos, { x: 11, z: 7 }).indice).toBe(1)
  expect(trechoMaisProximo(pontos, { x: 4, z: 5 }, true).indice).toBe(2)
  const inserido = inserirPontoNaCurva(pontos, { x: 11, z: 7 })
  expect(inserido.indice).toBe(2)
  expect(inserido.pontos).toEqual([pontos[0]!, pontos[1]!, { x: 11, z: 7 }, pontos[2]!])
  expect(pontos.length).toBe(3)
  expect(removerPontoDaCurva(inserido.pontos, 2)).toEqual(pontos)
  expect(() => removerPontoDaCurva(pontos.slice(0, 2), 0)).toThrow(CenarioInvalido)
  expect(() => removerPontoDaCurva(pontos, 0, true)).toThrow(CenarioInvalido)
  expect(() => removerPontoDaCurva(pontos, 7)).toThrow(CenarioInvalido)
})

test('estrada molda o terreno: leito plano de través, taludes suaves, sem dobrar na emenda', () => {
  const campo = novo()
  aplicarReceitaDeTerreno(campo, { tipo: 'colinas', altura: 16, escala: 18, semente: 12 })
  const antes = clonarCampo(campo)
  const curva = suavizarCurva(
    [
      { x: -45, z: -20 },
      { x: -10, z: 5 },
      { x: 15, z: -5 },
      { x: 45, z: 20 },
    ],
    { passo: 1 },
  )
  const { regiao, estacoes } = moldarTerrenoPelaCurva(campo, curva, { largura: 6, borda: 4 })
  expect(regiao).not.toBeNull()
  expect(pecasDaRegiao(campo, regiao).length).toBeGreaterThan(1)
  // No eixo, o chão fica na altura do perfil.
  for (const e of estacoes.filter((_, i) => i % 9 === 0))
    expect(alturaDoCampo(campo, e.x, e.z)).toBeCloseTo(e.y, 1)
  // De través, dentro do leito, o chão quase não varia; antes variava bastante.
  let desnivel = 0,
    desnivelAntes = 0
  for (const e of estacoes.filter((_, i) => i > 10 && i < estacoes.length - 10 && i % 7 === 0))
    for (const lado of [-2, 2]) {
      const x = e.x + e.dz * lado,
        z = e.z - e.dx * lado
      desnivel = Math.max(desnivel, Math.abs(alturaDoCampo(campo, x, z) - e.y))
      desnivelAntes = Math.max(desnivelAntes, Math.abs(alturaDoCampo(antes, x, z) - e.y))
    }
  expect(desnivel).toBeLessThan(0.25)
  expect(desnivelAntes).toBeGreaterThan(1)
  // O perfil do eixo é mais liso que o relevo original.
  const variacao = (ys: number[]) => ys.slice(1).reduce((s, y, i) => s + Math.abs(y - ys[i]!), 0)
  expect(variacao(estacoes.map((e) => e.y))).toBeLessThan(
    variacao(estacoes.map((e) => alturaDoCampo(antes, e.x, e.z))),
  )
  // Longe da curva nada muda.
  let mudouLonge = 0
  for (let i = 0; i < campo.alturas.length; i++) {
    if (campo.alturas[i] === antes.alturas[i]) continue
    const x = campo.origem.x + (i % 129),
      z = campo.origem.z + Math.floor(i / 129),
      d = trechoMaisProximo(curva.pontos, { x, z }).distancia
    if (d > 7.001) mudouLonge++
  }
  expect(mudouLonge).toBe(0)

  // Em chão plano com aterro de 2 m: o miolo sobe 2 m exatos e o talude nunca passa disso,
  // nem nas emendas dos trechos (onde somar duas vezes daria mais).
  const plano = novo(10)
  moldarTerrenoPelaCurva(plano, curva, { largura: 6, borda: 4, deslocamento: 2 })
  let maximo = 0
  for (const h of plano.alturas) maximo = Math.max(maximo, h)
  expect(maximo).toBeCloseTo(12, 5)
  expect(alturaDoCampo(plano, -10, 5)).toBeCloseTo(12, 5)
  expect(Math.min(...plano.alturas)).toBe(10)
  expect(() => moldarTerrenoPelaCurva(plano, curva, { largura: 0 })).toThrow(CenarioInvalido)
  const fora = medirCurva([
    { x: 900, z: 900 },
    { x: 950, z: 900 },
  ])
  expect(moldarTerrenoPelaCurva(plano, fora, { largura: 4 }).regiao).toBeNull()
})

test('ponte: tabuleiro reto, vãos e aviso quando o morro atravessa', () => {
  const campo = novo(10)
  carimbarCratera(campo, { x: 0, z: 0, raio: 20 }, { profundidade: 8, borda: 0 })
  const altura = (x: number, z: number) => alturaDoCampo(campo, x, z)
  const ponte = perfilDaPonte({ x: -25, z: 0 }, { x: 25, z: 0 }, altura, 5)
  expect(ponte.comprimento).toBe(50)
  expect(ponte.estacoes.length).toBe(11)
  expect(ponte.estacoes.every((e) => e.y === 10)).toBe(true)
  expect(ponte.maiorVao).toBeCloseTo(8, 5)
  expect(ponte.estacoes[5]).toMatchObject({ x: 0, z: 0, chao: 2, distancia: 25 })
  expect(ponte.atravessa).toBe(false)
  const morro = novo(10)
  carimbarMorro(morro, { x: 0, z: 0, raio: 10 }, 6)
  const atravessada = perfilDaPonte(
    { x: -25, z: 0, y: 11 },
    { x: 25, z: 0, y: 13 },
    (x, z) => alturaDoCampo(morro, x, z),
    1,
  )
  expect(atravessada.atravessa).toBe(true)
  expect(atravessada.estacoes[25]!.y).toBe(12)
  expect(atravessada.estacoes[25]!.vao).toBeCloseTo(-4, 5)
  expect(() => perfilDaPonte({ x: 1, z: 1 }, { x: 1, z: 1 }, altura)).toThrow(CenarioInvalido)
})

test('encher de água: lago numa cratera, com margem, área, volume e ilha', () => {
  const campo = novo(10)
  carimbarCratera(campo, { x: 0, z: 0, raio: 30 }, { profundidade: 8, borda: 0 })
  expect(encherLago(campo, { x: 50, z: 50 }, 6)).toBeNull()
  expect(encherLago(campo, { x: 0, z: 0 }, 1)).toBeNull()
  expect(encherLago(campo, { x: 999, z: 0 }, 6)).toBeNull()
  const lago = encherLago(campo, { x: 3, z: -2 }, 6)!
  expect(lago.vaza).toBe(false)
  expect(lago.profundidade).toBe(4)
  expect(lago.ilhas).toEqual([])
  // A bacia é 10 − 8·(1 − (r/21)²): a água a 6 m alcança r = 21/√2 ≈ 14,85 m.
  const raio = 21 / Math.SQRT2
  for (const p of lago.contorno) expect(Math.hypot(p.x, p.z)).toBeCloseTo(raio, 0)
  expect(lago.contorno.length).toBeGreaterThanOrEqual(12)
  expect(lago.contorno.length).toBeLessThanOrEqual(256)
  expect(areaDoPoligono(lago.contorno)).toBeGreaterThan(Math.PI * raio * raio * 0.97)
  expect(areaDoPoligono(lago.contorno)).toBeLessThan(Math.PI * raio * raio * 1.01)
  expect(lago.area).toBeGreaterThan(Math.PI * raio * raio * 0.95)
  expect(lago.area).toBeLessThan(Math.PI * raio * raio * 1.05)
  // Paraboloide: volume = metade de área × profundidade.
  expect(lago.volume).toBeCloseTo((Math.PI * raio * raio * 4) / 2, -2)
  expect(lago.regiao).toEqual({ x0: 50, z0: 50, x1: 78, z1: 78 })
  expect(profundidadeDaAgua(campo, 6, 0, 0)).toBe(4)
  expect(profundidadeDaAgua(campo, 6, 40, 0)).toBe(0)
  // O mesmo toque dá o mesmo lago; outro ponto da mesma baixada também.
  expect(encherLago(campo, { x: 3, z: -2 }, 6)).toEqual(lago)
  expect(encherLago(campo, { x: -9, z: 6 }, 6)!.contorno).toEqual(lago.contorno)
  // O contorno serve direto para a malha da lâmina.
  expect(triangularPoligono(lago.contorno).length).toBe((lago.contorno.length - 2) * 3)
  // Menos pontos quando o documento pede.
  const enxuto = encherLago(campo, { x: 0, z: 0 }, 6, { maxPontos: 12 })!
  expect(enxuto.contorno.length).toBeLessThanOrEqual(12)
  expect(areaDoPoligono(enxuto.contorno)).toBeGreaterThan(Math.PI * raio * raio * 0.85)

  carimbarMorro(campo, { x: 0, z: 0, raio: 6 }, 7)
  const comIlha = encherLago(campo, { x: 10, z: 0 }, 6)!
  expect(comIlha.ilhas.length).toBe(1)
  for (const p of comIlha.ilhas[0]!) expect(Math.hypot(p.x, p.z)).toBeLessThan(6)
  expect(areaDoPoligono(comIlha.ilhas[0]!)).toBeGreaterThan(20)
  expect(comIlha.area).toBeLessThan(lago.area)
  // O topo da ilha está seco: tocar nele não enche nada.
  expect(encherLago(campo, { x: 0, z: 0 }, 6)).toBeNull()
})

test('lago que encosta na borda do terreno fecha a margem e avisa que vaza', () => {
  const campo = novo(10)
  fazerRampa(
    campo,
    { de: { x: 30, z: 0, y: 10 }, ate: { x: 64, z: 0, y: 0 }, largura: 40, borda: 0 },
    () => 0,
  )
  const lago = encherLago(campo, { x: 60, z: 0 }, 5)!
  expect(lago.vaza).toBe(true)
  expect(lago.contorno.length).toBeGreaterThanOrEqual(4)
  expect(Math.max(...lago.contorno.map((p) => p.x))).toBe(64)
  // A margem cruza onde a rampa passa de 5 m: x = 47.
  expect(Math.min(...lago.contorno.map((p) => p.x))).toBeCloseTo(47, 1)
  expect(areaDoPoligono(lago.contorno)).toBeCloseTo(17 * 40, -2)
})

test('simplificar anel respeita o limite e mantém a forma', () => {
  const circulo = Array.from({ length: 720 }, (_, i) => ({
    x: Math.cos((i * Math.PI) / 360) * 50,
    z: Math.sin((i * Math.PI) / 360) * 50,
  }))
  const r = simplificarAnel(circulo, 0.01, 40)
  expect(r.length).toBeLessThanOrEqual(40)
  expect(r.length).toBeGreaterThanOrEqual(16)
  expect(areaDoPoligono(r)).toBeGreaterThan(Math.PI * 2500 * 0.97)
  expect(simplificarAnel(circulo.slice(0, 3), 1, 8).length).toBe(3)
})

test('nível de transbordo: a passagem mais baixa da borda da bacia', () => {
  const campo = novo(10)
  carimbarCratera(campo, { x: 0, z: 0, raio: 30 }, { profundidade: 8, borda: 4 })
  // A borda da cratera sobe até 14 m; uma vala de 3 m de fundo abre uma passagem a 11 m.
  const semVala = nivelDeTransbordo(campo, { x: 5, z: 5 })!
  expect(semVala.nivel).toBeCloseTo(14, 0)
  expect(semVala.naBorda).toBe(false)
  fazerRampa(
    campo,
    { de: { x: 15, z: 0, y: 11 }, ate: { x: 40, z: 0, y: 11 }, largura: 3, borda: 0 },
    () => 0,
  )
  const comVala = nivelDeTransbordo(campo, { x: 5, z: 5 })!
  expect(comVala.nivel).toBeCloseTo(11, 4)
  expect(Math.abs(comVala.saida.z)).toBeLessThanOrEqual(2)
  expect(comVala.saida.x).toBeGreaterThan(14)
  // Encher logo abaixo do transbordo fica contido; logo acima, escapa pela vala até a borda.
  expect(encherLago(campo, { x: 5, z: 5 }, comVala.nivel - 0.05)!.vaza).toBe(false)
  expect(encherLago(campo, { x: 5, z: 5 }, comVala.nivel + 0.05)!.vaza).toBe(true)
  // Na encosta de fora, a água escorre: o transbordo é a própria altura do chão.
  const plano = novo(3)
  expect(nivelDeTransbordo(plano, { x: 0, z: 0 })).toMatchObject({ nivel: 3, naBorda: true })
  expect(nivelDeTransbordo(plano, { x: 999, z: 0 })).toBeNull()
  expect(nivelDeTransbordo(campo, { x: 5, z: 5 }, { maxAmostras: 10 })).toBeNull()
})

test('rio: cava o leito, a água nunca sobe e as quedas aparecem', () => {
  const campo = novo(0)
  // Encosta em degrau: 30 m no alto, queda brusca perto de x = 0, 5 m embaixo, com lombadas.
  fazerRampa(
    campo,
    { de: { x: -64, z: 0, y: 30 }, ate: { x: -4, z: 0, y: 26 }, largura: 300, borda: 0 },
    () => 0,
  )
  fazerRampa(
    campo,
    { de: { x: 4, z: 0, y: 8 }, ate: { x: 64, z: 0, y: 5 }, largura: 300, borda: 0 },
    () => 0,
  )
  fazerRampa(
    campo,
    { de: { x: -4, z: 0, y: 26 }, ate: { x: 4, z: 0, y: 8 }, largura: 300, borda: 0 },
    () => 0,
  )
  elevarTerreno(campo, { x: 30, z: 4, raio: 6, forca: 1 }, 3)
  const antes = clonarCampo(campo)
  const curva = suavizarCurva(
    [
      { x: -55, z: -10 },
      { x: -25, z: 6 },
      { x: 0, z: 0 },
      { x: 30, z: 4 },
      { x: 58, z: -6 },
    ],
    { passo: 1 },
  )
  const rio = cavarRio(campo, curva, { largura: 4, profundidade: 2, suavizacao: 4 })
  expect(rio.regiao).not.toBeNull()
  for (let i = 1; i < rio.eixo.length; i++)
    expect(rio.eixo[i]!.y).toBeLessThanOrEqual(rio.eixo[i - 1]!.y)
  // O leito ficou abaixo do chão antigo, e a água abaixo das margens antigas.
  for (const e of rio.eixo.filter((_, i) => i % 11 === 0)) {
    expect(alturaDoCampo(campo, e.x, e.z)).toBeLessThan(alturaDoCampo(antes, e.x, e.z) - 1)
    expect(e.y).toBeGreaterThan(alturaDoCampo(campo, e.x, e.z))
    expect(e.y).toBeLessThan(alturaDoCampo(antes, e.x, e.z) + 0.01)
  }
  // A lombada no caminho foi cortada: a água passa por baixo do topo antigo.
  const naLombada = rio.eixo.reduce((a, b) =>
    Math.hypot(b.x - 30, b.z - 4) < Math.hypot(a.x - 30, a.z - 4) ? b : a,
  )
  expect(naLombada.y).toBeLessThan(alturaDoCampo(antes, 30, 4) - 2)
  expect(rio.quedas.length).toBe(1)
  expect(rio.quedas[0]!.altura).toBeGreaterThan(10)
  expect(Math.abs(rio.quedas[0]!.topo.x)).toBeLessThan(8)
  expect(rio.quedas[0]!.base.x).toBeGreaterThan(rio.quedas[0]!.topo.x)
  expect(rio.superficie.posicoes.length).toBe(rio.eixo.length * 2 * 3)
  expect(menorNormalY(rio.superficie)).toBeGreaterThan(0)
  expect(rio.superficie.posicoes[1]).toBe(Math.fround(rio.eixo[0]!.y))
  expect(() =>
    cavarRio(campo, medirCurva(curva.pontos.slice(0, 5), true), { largura: 4, profundidade: 2 }),
  ).toThrow(CenarioInvalido)
  expect(() => cavarRio(campo, curva, { largura: 4, profundidade: 0 })).toThrow(CenarioInvalido)
})

test('represa: a barragem fecha o vale e o lago para nela', () => {
  const campo = novo()
  aplicarReceitaDeTerreno(campo, { tipo: 'vale', altura: 40, largura: 10, eixo: 'z', semente: 1 })
  // Sem barragem, a água a 12 m corre pelo vale até as duas bordas.
  const solto = encherLago(campo, { x: 0, z: 0 }, 12)!
  expect(solto.vaza).toBe(true)
  // O fundo do vale serpenteia: acha onde ele está em cada linha da barragem.
  const fundoEm = (z: number) => {
    let melhor = 0
    for (let x = -60; x <= 60; x++) if (em(campo, x, z) < em(campo, melhor, z)) melhor = x
    return melhor
  }
  const sul = represar(campo, {
    de: { x: fundoEm(40) - 45, z: 40 },
    ate: { x: fundoEm(40) + 45, z: 40 },
    nivel: 12,
    montante: { x: fundoEm(0), z: 0 },
  })
  expect(sul.crista).toBe(13)
  expect(sul.lago!.vaza).toBe(true)
  expect(em(campo, fundoEm(0), 40)).toBeGreaterThanOrEqual(12.9)
  const norte = represar(campo, {
    de: { x: fundoEm(-40) - 45, z: -40 },
    ate: { x: fundoEm(-40) + 45, z: -40 },
    nivel: 12,
    montante: { x: fundoEm(0), z: 0 },
  })
  expect(norte.lago!.vaza).toBe(false)
  expect(norte.lago!.profundidade).toBeCloseTo(12, 4)
  for (const p of norte.lago!.contorno) expect(Math.abs(p.z)).toBeLessThan(40)
  expect(norte.lago!.area).toBeLessThan(solto.area)
  // A barragem só levanta: as encostas acima da crista ficam como estavam.
  expect(Math.min(...campo.alturas)).toBe(0)
  expect(() =>
    represar(campo, {
      de: { x: -10, z: 0 },
      ate: { x: 10, z: 0 },
      nivel: 500,
      montante: { x: 0, z: -5 },
    }),
  ).toThrow(CenarioInvalido)
})
