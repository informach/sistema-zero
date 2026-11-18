import { CenarioInvalido } from '../validacao'
import { alturaDoCampo, type CampoDeAlturas, type RegiaoDoCampo } from './campo-de-alturas'
import {
  faixaDaCurva,
  type MalhaNoChao,
  medirCurva,
  moldarTerrenoPelaCurva,
  type Polilinha,
  type PontoNoChao,
} from './curvas'
import { fazerRampa } from './pinceis-de-terreno'

/**
 * Água sobre o terreno esculpido: encher uma baixada (lago), achar até onde ela enche antes de
 * transbordar, cavar o leito de um rio, levantar a barragem de uma represa e localizar as
 * quedas de uma cachoeira. Só contas sobre o campo de alturas; o material e a malha animada da
 * água ficam no motor.
 */
const invalidar = (frase: string): never => {
  throw new CenarioInvalido([frase])
}

function amostraDaBaixada(campo: CampoDeAlturas, p: PontoNoChao) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) invalidar('O ponto da água é inválido')
  const x = (p.x - campo.origem.x) / campo.passo,
    z = (p.z - campo.origem.z) / campo.passo
  if (x < 0 || z < 0 || x > campo.colunas || z > campo.linhas) return null
  const ix = Math.min(campo.colunas - 1, Math.floor(x)),
    iz = Math.min(campo.linhas - 1, Math.floor(z)),
    largura = campo.colunas + 1,
    a = iz * largura + ix,
    b = a + 1,
    c = a + largura,
    triangulo = x - ix + z - iz <= 1 ? [a, b, c] : [b, c, c + 1]
  // Do ponto ao vértice mais baixo do seu triângulo há uma descida contínua. Arredondar o
  // clique podia escolher um vértice seco ou preencher a bacia de um ponto ainda acima da água.
  return triangulo.reduce((menor, i) => (campo.alturas[i]! < campo.alturas[menor]! ? i : menor))
}

export interface LagoNoTerreno {
  nivel: number
  /** Margem externa, sempre no mesmo sentido de giro, já simplificada. */
  contorno: PontoNoChao[]
  /** Terra cercada de água dentro do lago. */
  ilhas: PontoNoChao[][]
  /** Metros quadrados e metros cúbicos de água. */
  area: number
  volume: number
  /** Maior profundidade, em metros. */
  profundidade: number
  /** Verdadeiro se a água alcança a borda do terreno: ali ela escorreria para fora. */
  vaza: boolean
  regiao: RegiaoDoCampo
}

/**
 * "Encher de água": a partir de um ponto tocado, alaga tudo o que está ligado a ele e abaixo
 * do nível. Devolve nulo quando o chão no ponto já está no nível ou acima dele.
 */
export function encherLago(
  campo: CampoDeAlturas,
  ponto: PontoNoChao,
  nivel: number,
  opcoes: { maxPontos?: number } = {},
): LagoNoTerreno | null {
  const maxPontos = opcoes.maxPontos ?? 256
  if (!Number.isFinite(nivel) || !Number.isInteger(maxPontos) || maxPontos < 8 || maxPontos > 4096)
    invalidar('O nível ou o limite de pontos do lago é inválido')
  const semente = amostraDaBaixada(campo, ponto)
  if (semente === null || !(alturaDoCampo(campo, ponto.x, ponto.z) < nivel)) return null
  const largura = campo.colunas + 1,
    h = campo.alturas,
    dentro = new Uint8Array(h.length),
    pilha = [semente]
  dentro[semente] = 1
  let x0 = campo.colunas,
    z0 = campo.linhas,
    x1 = 0,
    z1 = 0,
    amostras = 0,
    volume = 0,
    profundidade = 0,
    vaza = false
  while (pilha.length) {
    const i = pilha.pop()!,
      ix = i % largura,
      iz = (i - ix) / largura,
      fundo = nivel - h[i]!
    amostras++
    volume += fundo
    if (fundo > profundidade) profundidade = fundo
    if (ix < x0) x0 = ix
    if (ix > x1) x1 = ix
    if (iz < z0) z0 = iz
    if (iz > z1) z1 = iz
    if (ix === 0 || iz === 0 || ix === campo.colunas || iz === campo.linhas) vaza = true
    const visitar = (j: number) => {
      if (!dentro[j] && h[j]! < nivel) {
        dentro[j] = 1
        pilha.push(j)
      }
    }
    if (ix > 0) visitar(i - 1)
    if (ix < campo.colunas) visitar(i + 1)
    if (iz > 0) visitar(i - largura)
    if (iz < campo.linhas) visitar(i + largura)
  }

  // Margem por quadrados em marcha. Um anel virtual de amostras secas em volta do terreno
  // garante que toda margem fecha, mesmo quando o lago encosta na borda.
  const L = campo.colunas + 3
  const molhada = (ix: number, iz: number) =>
    ix >= 0 &&
    iz >= 0 &&
    ix <= campo.colunas &&
    iz <= campo.linhas &&
    dentro[iz * largura + ix] === 1
  const pontos = new Map<number, PontoNoChao>(),
    vizinhos = new Map<number, number[]>()
  /** Cruzamento da margem na aresta que sai de (ix, iz) para a direita (0) ou para baixo (1). */
  const cruzar = (ix: number, iz: number, eixo: 0 | 1): number => {
    const chave = ((iz + 1) * L + ix + 1) * 2 + eixo
    if (!pontos.has(chave)) {
      const jx = ix + (eixo === 0 ? 1 : 0),
        jz = iz + (eixo === 1 ? 1 : 0),
        aMolhada = molhada(ix, iz),
        [mx, mz, sx, sz] = aMolhada ? [ix, iz, jx, jz] : [jx, jz, ix, iz],
        hm = h[mz * largura + mx]!,
        fora = sx < 0 || sz < 0 || sx > campo.colunas || sz > campo.linhas,
        t = fora ? 0 : (nivel - hm) / (h[sz * largura + sx]! - hm)
      pontos.set(chave, {
        x: campo.origem.x + (mx + (sx - mx) * t) * campo.passo,
        z: campo.origem.z + (mz + (sz - mz) * t) * campo.passo,
      })
    }
    return chave
  }
  const ligar = (a: number, b: number) => {
    for (const [de, para] of [
      [a, b],
      [b, a],
    ] as const) {
      const lista = vizinhos.get(de)
      if (lista) lista.push(para)
      else vizinhos.set(de, [para])
    }
  }
  for (let iz = z0 - 1; iz <= z1; iz++)
    for (let ix = x0 - 1; ix <= x1; ix++) {
      const a = molhada(ix, iz),
        b = molhada(ix + 1, iz),
        c = molhada(ix, iz + 1),
        d = molhada(ix + 1, iz + 1),
        quantas = Number(a) + Number(b) + Number(c) + Number(d)
      if (quantas === 0 || quantas === 4) continue
      const cima = a !== b ? cruzar(ix, iz, 0) : -1,
        baixo = c !== d ? cruzar(ix, iz + 1, 0) : -1,
        esquerda = a !== c ? cruzar(ix, iz, 1) : -1,
        direita = b !== d ? cruzar(ix + 1, iz, 1) : -1
      if (quantas === 2 && a === d) {
        // Sela: as duas amostras molhadas só se tocam na diagonal e ficam separadas, como na
        // inundação, que anda em quatro direções.
        if (a) {
          ligar(cima, esquerda)
          ligar(baixo, direita)
        } else {
          ligar(cima, direita)
          ligar(baixo, esquerda)
        }
        continue
      }
      const [p, q] = [cima, baixo, esquerda, direita].filter((k) => k >= 0)
      ligar(p!, q!)
    }
  const aneis: PontoNoChao[][] = [],
    usados = new Set<number>()
  for (const inicio of vizinhos.keys()) {
    if (usados.has(inicio)) continue
    const anel: PontoNoChao[] = []
    let anterior = -1,
      atual = inicio
    while (!usados.has(atual)) {
      usados.add(atual)
      const p = pontos.get(atual)!,
        ultimo = anel[anel.length - 1]
      if (!ultimo || Math.abs(ultimo.x - p.x) > 1e-9 || Math.abs(ultimo.z - p.z) > 1e-9)
        anel.push(p)
      const [u, v] = vizinhos.get(atual)!
      const proximo = u === anterior ? v! : u!
      anterior = atual
      atual = proximo
    }
    if (anel.length >= 3) aneis.push(anel)
  }
  const area2 = (p: readonly PontoNoChao[]) => {
    let s = 0
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!,
        b = p[(i + 1) % p.length]!
      s += a.x * b.z - b.x * a.z
    }
    return s
  }
  const prontos = aneis
    .map((anel) => {
      const simples = simplificarAnel(anel, campo.passo / 4, maxPontos)
      return area2(simples) < 0 ? simples.reverse() : simples
    })
    .filter((anel) => anel.length >= 3)
    .sort((a, b) => area2(b) - area2(a) || a[0]!.x - b[0]!.x || a[0]!.z - b[0]!.z)
  if (!prontos.length) return null
  return {
    nivel,
    contorno: prontos[0]!,
    ilhas: prontos.slice(1),
    area: amostras * campo.passo * campo.passo,
    volume: volume * campo.passo * campo.passo,
    profundidade,
    vaza,
    regiao: { x0, z0, x1, z1 },
  }
}

/** Reduz os pontos de um anel fechado, dobrando a tolerância até caber no limite. */
export function simplificarAnel(
  anel: readonly PontoNoChao[],
  tolerancia: number,
  maxPontos: number,
): PontoNoChao[] {
  if (anel.length <= 3) return [...anel]
  // Parte o anel em duas linhas pelos dois pontos mais distantes num eixo, e simplifica cada uma.
  let a = 0,
    b = 0
  for (let i = 1; i < anel.length; i++) {
    const p = anel[i]!
    if (p.x < anel[a]!.x || (p.x === anel[a]!.x && p.z < anel[a]!.z)) a = i
    if (p.x > anel[b]!.x || (p.x === anel[b]!.x && p.z > anel[b]!.z)) b = i
  }
  if (a === b) return [...anel]
  const girado = [...anel.slice(a), ...anel.slice(0, a)],
    meio = (b - a + anel.length) % anel.length,
    ida = girado.slice(0, meio + 1),
    volta = [...girado.slice(meio), girado[0]!]
  for (let t = Math.max(tolerancia, 1e-6), n = 0; n < 40; t *= 2, n++) {
    const r = [...reduzir(ida, t).slice(0, -1), ...reduzir(volta, t).slice(0, -1)]
    if (r.length <= maxPontos)
      return r.length >= 3 ? r : [girado[0]!, girado[meio >> 1]!, girado[meio]!]
  }
  return [girado[0]!, girado[meio >> 1]!, girado[meio]!]
}

/** Douglas-Peucker sem recursão, para linhas longas. */
function reduzir(linha: readonly PontoNoChao[], tolerancia: number): PontoNoChao[] {
  const manter = new Uint8Array(linha.length),
    pilha: [number, number][] = [[0, linha.length - 1]]
  manter[0] = manter[linha.length - 1] = 1
  while (pilha.length) {
    const [de, ate] = pilha.pop()!,
      p = linha[de]!,
      q = linha[ate]!,
      ex = q.x - p.x,
      ez = q.z - p.z,
      c2 = ex * ex + ez * ez
    let pior = -1,
      maior = tolerancia * tolerancia
    for (let i = de + 1; i < ate; i++) {
      const r = linha[i]!,
        t = c2 > 0 ? Math.min(1, Math.max(0, ((r.x - p.x) * ex + (r.z - p.z) * ez) / c2)) : 0,
        dx = r.x - (p.x + ex * t),
        dz = r.z - (p.z + ez * t),
        d2 = dx * dx + dz * dz
      if (d2 > maior) {
        maior = d2
        pior = i
      }
    }
    if (pior < 0) continue
    manter[pior] = 1
    pilha.push([de, pior], [pior, ate])
  }
  return linha.filter((_, i) => manter[i])
}

/**
 * Até que altura uma baixada enche antes de transbordar, e por onde a água sai. É o teto do
 * controle de nível do lago. `naBorda` diz que a saída é a própria borda do terreno. Nulo se o ponto está fora do terreno ou a busca passa do limite.
 */
export function nivelDeTransbordo(
  campo: CampoDeAlturas,
  ponto: PontoNoChao,
  opcoes: { maxAmostras?: number } = {},
): { nivel: number; saida: PontoNoChao; naBorda: boolean } | null {
  const maxAmostras = opcoes.maxAmostras ?? 2_000_000
  if (!Number.isSafeInteger(maxAmostras) || maxAmostras < 1 || maxAmostras > 4097 ** 2)
    invalidar('O limite da busca de transbordo precisa estar entre 1 e 16.785.409 amostras')
  const semente = amostraDaBaixada(campo, ponto)
  if (semente === null) return null
  const largura = campo.colunas + 1,
    h = campo.alturas,
    visto = new Uint8Array(h.length),
    // Ponto mais alto do melhor caminho da semente até cada amostra.
    custo = new Float64Array(h.length)
  // Fila de prioridade (menor custo primeiro; empate pelo índice, para a ordem ser única).
  let fila = new Int32Array(1024),
    passagens = new Int32Array(1024),
    tamanho = 0
  const antes = (a: number, b: number) => custo[a]! < custo[b]! || (custo[a] === custo[b] && a < b)
  const entrar = (i: number, teto: number, anterior: number) => {
    if (visto[i]) return
    visto[i] = 1
    custo[i] = Math.max(h[i]!, teto)
    const passagem = h[i]! >= teto ? i : anterior
    if (tamanho === fila.length) {
      const maior = new Int32Array(fila.length * 2)
      maior.set(fila)
      fila = maior
      const novasPassagens = new Int32Array(passagens.length * 2)
      novasPassagens.set(passagens)
      passagens = novasPassagens
    }
    let k = tamanho++
    while (k > 0) {
      const pai = (k - 1) >> 1
      if (!antes(i, fila[pai]!)) break
      fila[k] = fila[pai]!
      passagens[k] = passagens[pai]!
      k = pai
    }
    fila[k] = i
    passagens[k] = passagem
  }
  const sair = () => {
    const topo = fila[0]!,
      passagem = passagens[0]!,
      ultimo = fila[--tamanho]!,
      ultimaPassagem = passagens[tamanho]!
    let k = 0
    for (;;) {
      let filho = k * 2 + 1
      if (filho >= tamanho) break
      if (filho + 1 < tamanho && antes(fila[filho + 1]!, fila[filho]!)) filho++
      if (!antes(fila[filho]!, ultimo)) break
      fila[k] = fila[filho]!
      passagens[k] = passagens[filho]!
      k = filho
    }
    fila[k] = ultimo
    passagens[k] = ultimaPassagem
    return { indice: topo, passagem }
  }
  // -1 conserva o próprio clique quando sua altura, entre vértices, é o limite inicial.
  entrar(semente, alturaDoCampo(campo, ponto.x, ponto.z), -1)
  let visitadas = 0
  while (tamanho) {
    const { indice: i, passagem } = sair(),
      ix = i % largura,
      iz = (i - ix) / largura
    if (++visitadas > maxAmostras) return null
    if (ix === 0 || iz === 0 || ix === campo.colunas || iz === campo.linhas)
      return {
        nivel: custo[i]!,
        saida:
          passagem < 0
            ? { ...ponto }
            : {
                x: campo.origem.x + (passagem % largura) * campo.passo,
                z: campo.origem.z + Math.floor(passagem / largura) * campo.passo,
              },
        naBorda:
          passagem === i ||
          (passagem < 0 &&
            (ponto.x === campo.origem.x ||
              ponto.z === campo.origem.z ||
              ponto.x === campo.origem.x + campo.colunas * campo.passo ||
              ponto.z === campo.origem.z + campo.linhas * campo.passo)),
      }
    entrar(i - 1, custo[i]!, passagem)
    entrar(i + 1, custo[i]!, passagem)
    entrar(i - largura, custo[i]!, passagem)
    entrar(i + largura, custo[i]!, passagem)
  }
  return null
}

/** Profundidade da água num ponto, em metros; zero onde o chão está acima do nível. */
export const profundidadeDaAgua = (campo: CampoDeAlturas, nivel: number, x: number, z: number) =>
  Math.max(0, nivel - alturaDoCampo(campo, x, z))

export interface QuedaDoRio {
  topo: PontoNoChao & { y: number }
  base: PontoNoChao & { y: number }
  altura: number
  /** Distância do começo do rio até o topo da queda. */
  distancia: number
}

export interface RioNoTerreno {
  regiao: RegiaoDoCampo | null
  /** Eixo do rio com a altura da água em cada estação; nunca sobe rio abaixo. */
  eixo: (PontoNoChao & { y: number; distancia: number })[]
  /** Lâmina de água; `v` da textura cresce no sentido da correnteza. */
  superficie: MalhaNoChao
  /** Trechos íngremes do leito, onde cabe uma cachoeira. */
  quedas: QuedaDoRio[]
}

/**
 * Rio: cava o leito ao longo da curva, sempre descendo do primeiro ao último ponto, e devolve
 * a lâmina de água e as quedas. A curva vai da nascente para a foz.
 */
export function cavarRio(
  campo: CampoDeAlturas,
  curva: Polilinha,
  opcoes: {
    largura: number
    profundidade: number
    /** Faixa de barranco de cada lado. Padrão: a largura do rio. */
    margem?: number
    /** Fração da profundidade ocupada pela água. Padrão 0,7. */
    cheia?: number
    /** Declive mínimo (subida por metro) para um trecho contar como queda. Padrão 1. */
    decliveDaQueda?: number
    suavizacao?: number
  },
): RioNoTerreno {
  const cheia = opcoes.cheia ?? 0.7,
    limiar = opcoes.decliveDaQueda ?? 1
  if (curva.fechada) invalidar('O rio precisa de nascente e foz: a curva não pode ser fechada')
  if (
    !(opcoes.profundidade > 0) ||
    opcoes.profundidade > 200 ||
    !(cheia > 0 && cheia <= 1) ||
    !(limiar > 0)
  )
    invalidar('As medidas do rio são inválidas')
  const { regiao, estacoes } = moldarTerrenoPelaCurva(campo, curva, {
    largura: opcoes.largura,
    borda: opcoes.margem ?? opcoes.largura,
    deslocamento: -opcoes.profundidade,
    suavizacao: opcoes.suavizacao ?? opcoes.largura * 2,
    descer: true,
    somenteAbaixar: true,
  })
  const eixo = estacoes.map((e) => ({
    x: e.x,
    z: e.z,
    y: e.y + opcoes.profundidade * cheia,
    distancia: e.distancia,
  }))
  const quedas: QuedaDoRio[] = []
  for (let i = 1; i < eixo.length; i++) {
    const a = eixo[i - 1]!,
      b = eixo[i]!
    if ((a.y - b.y) / (b.distancia - a.distancia) < limiar) continue
    const ultima = quedas[quedas.length - 1]
    if (ultima && ultima.base.x === a.x && ultima.base.z === a.z) {
      ultima.base = { x: b.x, z: b.z, y: b.y }
      ultima.altura = ultima.topo.y - b.y
    } else
      quedas.push({
        topo: { x: a.x, z: a.z, y: a.y },
        base: { x: b.x, z: b.z, y: b.y },
        altura: a.y - b.y,
        distancia: a.distancia,
      })
  }
  const linha = medirCurva(eixo)
  if (linha.pontos.length !== eixo.length) invalidar('O rio tem trechos de comprimento nulo')
  return {
    regiao,
    eixo,
    superficie: faixaDaCurva(linha, {
      largura: opcoes.largura,
      alturaDoPonto: (i) => eixo[i]!.y,
      elevacao: 0,
      divisoes: 2,
    }),
    quedas,
  }
}

/**
 * Represa: levanta a barragem entre dois pontos até a crista e enche a baixada atrás dela.
 * A crista fica `folga` metros acima do nível da água. `montante` é um ponto do lado que alaga.
 */
export function represar(
  campo: CampoDeAlturas,
  opcoes: {
    de: PontoNoChao
    ate: PontoNoChao
    nivel: number
    montante: PontoNoChao
    /** Largura do topo da barragem. Padrão 4 m. */
    largura?: number
    folga?: number
  },
): { regiao: RegiaoDoCampo | null; crista: number; lago: LagoNoTerreno | null } {
  const folga = opcoes.folga ?? 1,
    largura = opcoes.largura ?? 4
  if (!Number.isFinite(opcoes.nivel) || !(folga >= 0) || folga > 100)
    invalidar('As medidas da represa são inválidas')
  const crista = opcoes.nivel + folga
  if (crista > campo.max) invalidar('A crista da barragem passa do limite de altura do terreno')
  // A barragem só sobe o chão: onde o terreno já passa da crista, ele fica como está.
  const antes = campo.alturas.slice()
  const regiao = fazerRampa(
    campo,
    {
      de: { ...opcoes.de, y: crista },
      ate: { ...opcoes.ate, y: crista },
      largura,
      borda: largura * 1.5,
    },
    () => crista,
  )
  if (regiao) {
    const l = campo.colunas + 1
    for (let iz = regiao.z0; iz <= regiao.z1; iz++)
      for (let ix = regiao.x0; ix <= regiao.x1; ix++) {
        const i = iz * l + ix
        if (campo.alturas[i]! < antes[i]!) campo.alturas[i] = antes[i]!
      }
  }
  const lago = encherLago(campo, opcoes.montante, opcoes.nivel)
  return { regiao, crista, lago }
}
