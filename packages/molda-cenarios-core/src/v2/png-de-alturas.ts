import type { CampoDeAlturas } from './campo-de-alturas'
import { ASSINATURA_PNG, crc32, montarPng, passarPeloFluxo } from './png-comum'
import { TerrenoInvalido } from './terreno'

/**
 * Mapa de alturas em PNG, o formato de troca com Blender, Unity, Godot e geradores de relevo.
 * Exporta sempre em tons de cinza de 16 bits. Importa cinza ou colorido (usa o primeiro canal),
 * de 8 ou 16 bits, sem entrelaçamento.
 *
 * A compactação usa `CompressionStream`, que existe no navegador, no Bun e no Node; por isso as
 * duas funções são assíncronas. Não há leitura de arquivo nem rede aqui.
 */
export interface ImagemDeAlturas {
  largura: number
  altura: number
  /** Um valor por pixel, linha a linha, de 0 (preto) a 1 (branco). */
  valores: Float32Array
}

const LADO_MAXIMO = 4097
const invalidar = (frase: string): never => {
  throw new TerrenoInvalido(frase)
}

const grandeDemais = (): never => invalidar('O mapa de alturas descompactado é grande demais')

/** PNG cinza de 16 bits a partir de valores de 0 a 1. */
export async function codificarPngDeAlturas(
  img: ImagemDeAlturas,
): Promise<Uint8Array<ArrayBuffer>> {
  const { largura, altura, valores } = img
  if (
    !Number.isInteger(largura) ||
    !Number.isInteger(altura) ||
    largura < 1 ||
    altura < 1 ||
    largura > LADO_MAXIMO ||
    altura > LADO_MAXIMO ||
    valores.length !== largura * altura
  )
    invalidar('As dimensões do mapa de alturas são inválidas')
  const fila = 1 + largura * 2,
    cru = new Uint8Array(fila * altura)
  for (let y = 0; y < altura; y++)
    for (let x = 0; x < largura; x++) {
      const v = valores[y * largura + x]!
      if (!(v >= 0 && v <= 1)) invalidar('O mapa de alturas tem valor fora de 0 a 1')
      const q = Math.round(v * 65535),
        i = y * fila + 1 + x * 2
      cru[i] = q >> 8
      cru[i + 1] = q & 255
    }
  const dados = await passarPeloFluxo(
    cru,
    new CompressionStream('deflate'),
    cru.length + 65536,
    grandeDemais,
  )
  // 16 bits por canal; cor 0 = tons de cinza.
  return montarPng(largura, altura, 16, 0, dados)
}

/** Lê um PNG como mapa de alturas. Recusa paleta, entrelaçamento e imagens acima de 4097 px. */
export async function lerPngDeAlturas(bytes: Uint8Array): Promise<ImagemDeAlturas> {
  if (bytes.length < 57 || !ASSINATURA_PNG.every((b, i) => bytes[i] === b))
    invalidar('O mapa de alturas não é um PNG')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cabecalho: { largura: number; altura: number; bits: number; canais: number } | null = null
  const partes: Uint8Array[] = []
  let compactado = 0,
    fim = false
  for (let p = 8; p < bytes.length && !fim; ) {
    if (p + 12 > bytes.length) invalidar('O PNG está truncado')
    const tamanho = v.getUint32(p),
      tipo = String.fromCharCode(bytes[p + 4]!, bytes[p + 5]!, bytes[p + 6]!, bytes[p + 7]!)
    if (p + 12 + tamanho > bytes.length) invalidar('O PNG está truncado')
    if (crc32(bytes, p + 4, p + 8 + tamanho) !== v.getUint32(p + 8 + tamanho))
      invalidar('O PNG está corrompido')
    if (tipo === 'IHDR') {
      if (cabecalho || tamanho !== 13 || p !== 8) invalidar('O cabeçalho do PNG é inválido')
      const largura = v.getUint32(p + 8),
        altura = v.getUint32(p + 12),
        bits = bytes[p + 16]!,
        cor = bytes[p + 17]!,
        canais = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[cor]
      if (largura < 2 || altura < 2 || largura > LADO_MAXIMO || altura > LADO_MAXIMO)
        invalidar('O mapa de alturas precisa ter de 2 a 4097 pixels de lado')
      if (!canais || (bits !== 8 && bits !== 16))
        invalidar('Use um PNG em tons de cinza ou colorido, de 8 ou 16 bits, sem paleta')
      if (bytes[p + 18] !== 0 || bytes[p + 19] !== 0 || bytes[p + 20] !== 0)
        invalidar('Use um PNG sem entrelaçamento')
      cabecalho = { largura, altura, bits, canais: canais! }
    } else if (!cabecalho) invalidar('O cabeçalho do PNG é inválido')
    else if (tipo === 'IDAT') {
      partes.push(bytes.subarray(p + 8, p + 8 + tamanho))
      compactado += tamanho
    } else if (tipo === 'IEND') fim = true
    p += 12 + tamanho
  }
  if (!cabecalho || !fim || !partes.length) return invalidar('O PNG está incompleto')
  const { largura, altura, bits, canais } = cabecalho,
    bpp = (bits / 8) * canais,
    fila = 1 + largura * bpp
  const junto = new Uint8Array(compactado)
  let q = 0
  for (const parte of partes) {
    junto.set(parte, q)
    q += parte.length
  }
  let cru: Uint8Array
  try {
    cru = await passarPeloFluxo(
      junto,
      new DecompressionStream('deflate'),
      fila * altura,
      grandeDemais,
    )
  } catch (e) {
    if (e instanceof TerrenoInvalido) throw e
    return invalidar('Os dados do PNG estão corrompidos')
  }
  if (cru.length !== fila * altura) invalidar('O PNG não tem o tamanho declarado')
  const valores = new Float32Array(largura * altura),
    divisor = bits === 16 ? 65535 : 255
  for (let y = 0; y < altura; y++) {
    const de = y * fila + 1,
      filtro = cru[de - 1]!
    if (filtro > 4) invalidar('O PNG usa um filtro desconhecido')
    for (let i = 0; i < fila - 1; i++) {
      const a = i >= bpp ? cru[de + i - bpp]! : 0,
        b = y > 0 ? cru[de + i - fila]! : 0,
        c = y > 0 && i >= bpp ? cru[de + i - fila - bpp]! : 0
      let soma = 0
      if (filtro === 1) soma = a
      else if (filtro === 2) soma = b
      else if (filtro === 3) soma = (a + b) >> 1
      else if (filtro === 4) {
        const pa = Math.abs(b - c),
          pb = Math.abs(a - c),
          pc = Math.abs(a + b - 2 * c)
        soma = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cru[de + i] = (cru[de + i]! + soma) & 255
    }
    for (let x = 0; x < largura; x++) {
      const i = de + x * bpp
      valores[y * largura + x] = (bits === 16 ? (cru[i]! << 8) | cru[i + 1]! : cru[i]!) / divisor
    }
  }
  return { largura, altura, valores }
}

/** O campo como imagem: uma amostra por pixel, preto em `min` e branco em `max`. */
export function imagemDoCampo(campo: CampoDeAlturas): ImagemDeAlturas {
  const valores = new Float32Array(campo.alturas.length),
    faixa = campo.max - campo.min
  for (let i = 0; i < valores.length; i++)
    valores[i] = Math.min(1, Math.max(0, (campo.alturas[i]! - campo.min) / faixa))
  return { largura: campo.colunas + 1, altura: campo.linhas + 1, valores }
}

/**
 * Estica a imagem sobre o campo inteiro (interpolação bilinear) e grava as alturas entre
 * `base` (preto) e `topo` (branco). A imagem pode ter qualquer tamanho e proporção.
 */
export function colocarImagemNoCampo(
  campo: CampoDeAlturas,
  img: ImagemDeAlturas,
  alturas: { base: number; topo: number },
) {
  if (img.valores.length !== img.largura * img.altura || img.largura < 2 || img.altura < 2)
    invalidar('As dimensões do mapa de alturas são inválidas')
  if (
    !Number.isFinite(alturas.base) ||
    !Number.isFinite(alturas.topo) ||
    Math.min(alturas.base, alturas.topo) < campo.min ||
    Math.max(alturas.base, alturas.topo) > campo.max
  )
    invalidar('As alturas do mapa passam dos limites do terreno')
  const largura = campo.colunas + 1
  for (let iz = 0; iz <= campo.linhas; iz++) {
    const fy = (iz / campo.linhas) * (img.altura - 1),
      y0 = Math.min(img.altura - 2, Math.floor(fy)),
      v = fy - y0
    for (let ix = 0; ix <= campo.colunas; ix++) {
      const fx = (ix / campo.colunas) * (img.largura - 1),
        x0 = Math.min(img.largura - 2, Math.floor(fx)),
        u = fx - x0,
        i = y0 * img.largura + x0,
        a = img.valores[i]!,
        b = img.valores[i + 1]!,
        c = img.valores[i + img.largura]!,
        d = img.valores[i + img.largura + 1]!,
        t = a + (b - a) * u + (c + (d - c) * u - (a + (b - a) * u)) * v
      campo.alturas[iz * largura + ix] = alturas.base + (alturas.topo - alturas.base) * t
    }
  }
  return { x0: 0, z0: 0, x1: campo.colunas, z1: campo.linhas }
}
