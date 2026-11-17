import {
  type CampoDeAlturas,
  decliveDaAmostra,
  type RegiaoDoCampo,
  regiaoDoRetangulo,
} from './campo-de-alturas'
import { type PincelDeTerreno, pesoDoPincel, suave } from './pinceis-de-terreno'
import { CELULAS_DA_PECA, LADO_DAS_AMOSTRAS, TerrenoInvalido } from './terreno'

/**
 * Pintura do chão e máscara de buracos, na mesma grade das alturas.
 *
 * Cada amostra guarda um peso de 0 a 255 por camada de chão, e os pesos de uma amostra somam
 * sempre 255. É aritmética inteira: a mesma pincelada dá os mesmos bytes em qualquer máquina.
 */
export const MAX_CAMADAS_DE_CHAO = 8

type Grade = Pick<CampoDeAlturas, 'origem' | 'passo' | 'colunas' | 'linhas'>
export interface PinturaDeChao {
  colunas: number
  linhas: number
  camadas: number
  /** `(colunas + 1) × (linhas + 1) × camadas` bytes, amostra a amostra. */
  pesos: Uint8Array
}

const invalidar = (frase: string): never => {
  throw new TerrenoInvalido(frase)
}
const conferirCamada = (p: PinturaDeChao, camada: number) => {
  if (!Number.isInteger(camada) || camada < 0 || camada >= p.camadas)
    invalidar('A camada de chão não existe')
}
const conferirGrade = (g: Grade, p: { colunas: number; linhas: number }) => {
  if (g.colunas !== p.colunas || g.linhas !== p.linhas)
    invalidar('A pintura não tem o tamanho do terreno')
}

/** Começa com o terreno todo na camada `inicial`. */
export function criarPinturaDeChao(
  grade: Pick<Grade, 'colunas' | 'linhas'>,
  camadas: number,
  inicial = 0,
): PinturaDeChao {
  if (!Number.isInteger(camadas) || camadas < 1 || camadas > MAX_CAMADAS_DE_CHAO)
    invalidar(`O chão aceita de 1 a ${MAX_CAMADAS_DE_CHAO} camadas`)
  const p: PinturaDeChao = {
    colunas: grade.colunas,
    linhas: grade.linhas,
    camadas,
    pesos: new Uint8Array((grade.colunas + 1) * (grade.linhas + 1) * camadas),
  }
  conferirCamada(p, inicial)
  for (let i = inicial; i < p.pesos.length; i += camadas) p.pesos[i] = 255
  return p
}

/** Acrescenta uma camada vazia no fim. As camadas existentes não mudam. */
export function acrescentarCamadaDeChao(p: PinturaDeChao): PinturaDeChao {
  const nova = criarPinturaDeChao(p, p.camadas + 1)
  nova.pesos.fill(0)
  for (let i = 0, n = p.pesos.length / p.camadas; i < n; i++)
    nova.pesos.set(p.pesos.subarray(i * p.camadas, (i + 1) * p.camadas), i * nova.camadas)
  return nova
}

/** Retira uma camada e reparte o peso dela entre as outras; o que sobra vai para a primeira. */
export function retirarCamadaDeChao(p: PinturaDeChao, camada: number): PinturaDeChao {
  conferirCamada(p, camada)
  if (p.camadas === 1) invalidar('O chão precisa de pelo menos uma camada')
  const nova = criarPinturaDeChao(p, p.camadas - 1)
  nova.pesos.fill(0)
  const temp = new Uint8Array(p.camadas)
  for (let i = 0, n = p.pesos.length / p.camadas; i < n; i++) {
    temp.set(p.pesos.subarray(i * p.camadas, (i + 1) * p.camadas))
    // Com as outras zeradas não há proporção a manter; senão, a sobra do arredondamento
    // fica na camada retirada. Nos dois casos esse resto vai para a primeira que sobra.
    if (temp[camada]! < 255) definirPeso(temp, 0, p.camadas, camada, 0)
    const base = i * nova.camadas
    for (let c = 0, d = 0; c < p.camadas; c++) if (c !== camada) nova.pesos[base + d++] = temp[c]!
    nova.pesos[base] = nova.pesos[base]! + temp[camada]!
  }
  return nova
}

/** Fixa o peso de uma camada e reescala as outras para a soma continuar 255. */
function definirPeso(pesos: Uint8Array, base: number, n: number, camada: number, valor: number) {
  let outras = 0
  for (let c = 0; c < n; c++) if (c !== camada) outras += pesos[base + c]!
  if (outras === 0) {
    // Não há para onde devolver o peso: a camada fica cheia (ou, se for a única, intacta).
    pesos[base + camada] = 255
    return
  }
  const resto = 255 - valor
  let usado = 0
  for (let c = 0; c < n; c++) {
    if (c === camada) continue
    const v = Math.floor((pesos[base + c]! * resto) / outras)
    pesos[base + c] = v
    usado += v
  }
  pesos[base + camada] = 255 - usado
}

/** Pinta uma camada de chão sob o pincel. */
export function pintarChao(
  grade: Grade,
  pintura: PinturaDeChao,
  p: PincelDeTerreno,
  camada: number,
): RegiaoDoCampo | null {
  conferirGrade(grade, pintura)
  conferirCamada(pintura, camada)
  if (!(p.raio > 0) || p.raio > 4096 || !(p.forca >= 0) || p.forca > 1)
    invalidar('O pincel de chão é inválido')
  const regiao = regiaoDoRetangulo(
    grade as CampoDeAlturas,
    p.x - p.raio,
    p.z - p.raio,
    p.x + p.raio,
    p.z + p.raio,
  )
  if (!regiao || p.forca === 0) return null
  const largura = grade.colunas + 1
  for (let iz = regiao.z0; iz <= regiao.z1; iz++)
    for (let ix = regiao.x0; ix <= regiao.x1; ix++) {
      const dx = grade.origem.x + ix * grade.passo - p.x,
        dz = grade.origem.z + iz * grade.passo - p.z,
        peso = pesoDoPincel(Math.sqrt(dx * dx + dz * dz), p.raio, p.dureza) * p.forca
      if (peso <= 0) continue
      const base = (iz * largura + ix) * pintura.camadas,
        atual = pintura.pesos[base + camada]!
      definirPeso(
        pintura.pesos,
        base,
        pintura.camadas,
        camada,
        Math.round(atual + (255 - atual) * peso),
      )
    }
  return regiao
}

export interface RegraDeChao {
  camada: number
  /** Faixa de alturas, em metros. Sem ela, vale qualquer altura. */
  altura?: { min: number; max: number }
  /** Faixa de declive, em metros de subida por metro (1 = 45°). Sem ela, qualquer declive. */
  declive?: { min: number; max: number }
  /** Largura da passagem suave para fora das faixas: metros na altura, razão no declive. */
  transicao?: { altura?: number; declive?: number }
}

const faixa = (v: number, f: { min: number; max: number } | undefined, t: number) => {
  if (!f) return 1
  if (v >= f.min && v <= f.max) return 1
  const fora = v < f.min ? f.min - v : v - f.max
  return t > 0 ? suave(1 - fora / t) : 0
}

/**
 * Pintura automática por altura e declive. As regras valem em ordem, cada uma por cima das
 * anteriores (areia embaixo, grama no meio, pedra onde é íngreme, neve no alto).
 */
export function pintarChaoPorRegras(
  campo: CampoDeAlturas,
  pintura: PinturaDeChao,
  regras: readonly RegraDeChao[],
  regiao: RegiaoDoCampo = { x0: 0, z0: 0, x1: campo.colunas, z1: campo.linhas },
): RegiaoDoCampo {
  conferirGrade(campo, pintura)
  if (regras.length > 32) invalidar('Regras de chão demais')
  for (const r of regras) {
    conferirCamada(pintura, r.camada)
    for (const f of [r.altura, r.declive])
      if (f && !(Number.isFinite(f.min) && Number.isFinite(f.max) && f.min <= f.max))
        invalidar('A faixa da regra de chão é inválida')
  }
  const largura = campo.colunas + 1
  for (let iz = regiao.z0; iz <= regiao.z1; iz++)
    for (let ix = regiao.x0; ix <= regiao.x1; ix++) {
      const h = campo.alturas[iz * largura + ix]!,
        declive = decliveDaAmostra(campo, ix, iz),
        base = (iz * largura + ix) * pintura.camadas
      for (const r of regras) {
        const peso =
          faixa(h, r.altura, r.transicao?.altura ?? 0) *
          faixa(declive, r.declive, r.transicao?.declive ?? 0)
        if (peso <= 0) continue
        const atual = pintura.pesos[base + r.camada]!
        definirPeso(
          pintura.pesos,
          base,
          pintura.camadas,
          r.camada,
          Math.round(atual + (255 - atual) * peso),
        )
      }
    }
  return regiao
}

const MAGIC_PINTURA = 0x50485a53 // SZHP, little endian
/** Binário canônico da pintura de uma peça: cabeçalho de 8 bytes + 65 × 65 × camadas pesos. */
export function codificarPecaDePintura(
  p: PinturaDeChao,
  coluna: number,
  linha: number,
): Uint8Array<ArrayBuffer> {
  if (
    !Number.isInteger(coluna) ||
    !Number.isInteger(linha) ||
    coluna < 0 ||
    linha < 0 ||
    coluna >= p.colunas / CELULAS_DA_PECA ||
    linha >= p.linhas / CELULAS_DA_PECA
  )
    invalidar('A peça está fora do terreno')
  const bytes = new Uint8Array(8 + LADO_DAS_AMOSTRAS ** 2 * p.camadas),
    v = new DataView(bytes.buffer),
    largura = p.colunas + 1,
    fila = LADO_DAS_AMOSTRAS * p.camadas
  v.setUint32(0, MAGIC_PINTURA, true)
  v.setUint8(4, 1)
  v.setUint8(5, LADO_DAS_AMOSTRAS)
  v.setUint8(6, p.camadas)
  for (let z = 0; z < LADO_DAS_AMOSTRAS; z++) {
    const de = ((linha * CELULAS_DA_PECA + z) * largura + coluna * CELULAS_DA_PECA) * p.camadas
    bytes.set(p.pesos.subarray(de, de + fila), 8 + z * fila)
  }
  return bytes
}

/** Confere o binário e devolve os pesos da peça, amostra a amostra. */
export function lerPecaDePintura(bytes: Uint8Array): { camadas: number; pesos: Uint8Array } {
  if (bytes.byteLength < 8) invalidar('O tamanho da peça de pintura é inválido')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    camadas = v.getUint8(6)
  if (
    v.getUint32(0, true) !== MAGIC_PINTURA ||
    v.getUint8(4) !== 1 ||
    v.getUint8(5) !== LADO_DAS_AMOSTRAS ||
    v.getUint8(7) !== 0 ||
    camadas < 1 ||
    camadas > MAX_CAMADAS_DE_CHAO ||
    bytes.byteLength !== 8 + LADO_DAS_AMOSTRAS ** 2 * camadas
  )
    invalidar('O formato da peça de pintura é inválido')
  const pesos = bytes.slice(8)
  for (let i = 0; i < pesos.length; i += camadas) {
    let soma = 0
    for (let c = 0; c < camadas; c++) soma += pesos[i + c]!
    if (soma !== 255) invalidar('Os pesos da pintura não somam 255')
  }
  return { camadas, pesos }
}

/** Grava a pintura lida de uma peça de volta na grade de trabalho. */
export function colocarPecaDePintura(
  p: PinturaDeChao,
  coluna: number,
  linha: number,
  peca: { camadas: number; pesos: Uint8Array },
) {
  if (peca.camadas !== p.camadas) invalidar('A peça tem outro número de camadas')
  const largura = p.colunas + 1,
    fila = LADO_DAS_AMOSTRAS * p.camadas
  for (let z = 0; z < LADO_DAS_AMOSTRAS; z++)
    p.pesos.set(
      peca.pesos.subarray(z * fila, (z + 1) * fila),
      ((linha * CELULAS_DA_PECA + z) * largura + coluna * CELULAS_DA_PECA) * p.camadas,
    )
}

/** Máscara de buracos: um byte por célula (não por amostra), 1 onde o chão foi aberto. */
export interface BuracosDoTerreno {
  colunas: number
  linhas: number
  celulas: Uint8Array
}
export const criarBuracos = (g: Pick<Grade, 'colunas' | 'linhas'>): BuracosDoTerreno => ({
  colunas: g.colunas,
  linhas: g.linhas,
  celulas: new Uint8Array(g.colunas * g.linhas),
})

/** Abre (ou fecha) as células cujo centro está sob o pincel. Devolve a região de amostras. */
export function furarTerreno(
  grade: Grade,
  buracos: BuracosDoTerreno,
  p: Pick<PincelDeTerreno, 'x' | 'z' | 'raio'>,
  abrir = true,
): RegiaoDoCampo | null {
  conferirGrade(grade, buracos)
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !(p.raio > 0) || p.raio > 4096)
    invalidar('O pincel de buraco é inválido')
  const meio = grade.passo / 2,
    x0 = Math.max(0, Math.ceil((p.x - p.raio - grade.origem.x - meio) / grade.passo)),
    z0 = Math.max(0, Math.ceil((p.z - p.raio - grade.origem.z - meio) / grade.passo)),
    x1 = Math.min(
      grade.colunas - 1,
      Math.floor((p.x + p.raio - grade.origem.x - meio) / grade.passo),
    ),
    z1 = Math.min(
      grade.linhas - 1,
      Math.floor((p.z + p.raio - grade.origem.z - meio) / grade.passo),
    )
  let regiao: RegiaoDoCampo | null = null
  for (let iz = z0; iz <= z1; iz++)
    for (let ix = x0; ix <= x1; ix++) {
      const dx = grade.origem.x + ix * grade.passo + meio - p.x,
        dz = grade.origem.z + iz * grade.passo + meio - p.z
      if (dx * dx + dz * dz > p.raio * p.raio) continue
      buracos.celulas[iz * grade.colunas + ix] = abrir ? 1 : 0
      regiao = regiao
        ? {
            x0: Math.min(regiao.x0, ix),
            z0: Math.min(regiao.z0, iz),
            x1: Math.max(regiao.x1, ix + 1),
            z1: Math.max(regiao.z1, iz + 1),
          }
        : { x0: ix, z0: iz, x1: ix + 1, z1: iz + 1 }
    }
  return regiao
}

/** Verdadeiro se o ponto de mundo cai numa célula aberta: ali não há chão para pisar. */
export function pontoNoBuraco(grade: Grade, buracos: BuracosDoTerreno, x: number, z: number) {
  const ix = Math.floor((x - grade.origem.x) / grade.passo),
    iz = Math.floor((z - grade.origem.z) / grade.passo)
  if (ix < 0 || iz < 0 || ix >= grade.colunas || iz >= grade.linhas) return false
  return buracos.celulas[iz * grade.colunas + ix] === 1
}

/** As 64 × 64 células de uma peça num mapa de bits de 512 bytes (bit menos significativo antes). */
export function codificarBuracosDaPeca(b: BuracosDoTerreno, coluna: number, linha: number) {
  if (
    coluna < 0 ||
    linha < 0 ||
    coluna >= b.colunas / CELULAS_DA_PECA ||
    linha >= b.linhas / CELULAS_DA_PECA
  )
    invalidar('A peça está fora do terreno')
  const bits = new Uint8Array(CELULAS_DA_PECA ** 2 / 8)
  for (let z = 0; z < CELULAS_DA_PECA; z++)
    for (let x = 0; x < CELULAS_DA_PECA; x++)
      if (b.celulas[(linha * CELULAS_DA_PECA + z) * b.colunas + coluna * CELULAS_DA_PECA + x]) {
        const n = z * CELULAS_DA_PECA + x
        bits[n >> 3] = bits[n >> 3]! | (1 << (n & 7))
      }
  return bits
}

export function colocarBuracosDaPeca(
  b: BuracosDoTerreno,
  coluna: number,
  linha: number,
  bits: Uint8Array,
) {
  if (bits.byteLength !== CELULAS_DA_PECA ** 2 / 8) invalidar('O mapa de buracos é inválido')
  for (let z = 0; z < CELULAS_DA_PECA; z++)
    for (let x = 0; x < CELULAS_DA_PECA; x++) {
      const n = z * CELULAS_DA_PECA + x
      b.celulas[(linha * CELULAS_DA_PECA + z) * b.colunas + coluna * CELULAS_DA_PECA + x] =
        (bits[n >> 3]! >> (n & 7)) & 1
    }
}
