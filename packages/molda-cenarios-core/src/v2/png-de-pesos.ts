import { ASSINATURA_PNG, crc32, montarPng, passarPeloFluxo } from './png-comum'
import { TerrenoInvalido } from './terreno'

/**
 * Os pesos das camadas do chão num PNG RGBA de 8 bits (plano "Mundos de 2 km", lote 1,
 * 23/11/2026): um pixel por vértice da grade, um canal por camada (`pesos-a` com as camadas 1 a 4,
 * `pesos-b` com as 5 a 8). O desenho do relevo mistura as texturas das camadas por esses pesos.
 *
 * ⚠️ Nunca pelo canvas: ele multiplica a cor pelo alfa e perde o peso de quem tem alfa 0 (a 4ª
 * camada valendo 0 apagaria as outras três). O codificador é este, com o filtro 0 em toda linha, e
 * o leitor só aceita o filtro 0: o Python lê o mesmo arquivo com `zlib`, sem decodificar filtros.
 */
export interface ImagemDePesos {
  largura: number
  altura: number
  /** `largura × altura × 4` bytes, linha a linha. */
  rgba: Uint8Array
}

const LADO_MAXIMO = 4097
const invalidar = (frase: string): never => {
  throw new TerrenoInvalido(frase)
}
const grandeDemais = (): never => invalidar('Os pesos do chão descompactados são grandes demais')

export async function codificarPngDePesos(img: ImagemDePesos): Promise<Uint8Array<ArrayBuffer>> {
  const { largura, altura, rgba } = img
  if (
    !Number.isInteger(largura) ||
    !Number.isInteger(altura) ||
    largura < 1 ||
    altura < 1 ||
    largura > LADO_MAXIMO ||
    altura > LADO_MAXIMO ||
    rgba.length !== largura * altura * 4
  )
    invalidar('As dimensões dos pesos do chão são inválidas')
  const fila = 1 + largura * 4,
    cru = new Uint8Array(fila * altura)
  for (let y = 0; y < altura; y++)
    cru.set(rgba.subarray(y * largura * 4, (y + 1) * largura * 4), y * fila + 1)
  const dados = await passarPeloFluxo(
    cru,
    new CompressionStream('deflate'),
    cru.length + 65536,
    grandeDemais,
  )
  // 8 bits por canal; cor 6 = RGBA.
  return montarPng(largura, altura, 8, 6, dados)
}

/** Lê os pesos que `codificarPngDePesos` gravou: RGBA de 8 bits, sem entrelaçamento, filtro 0. */
export async function lerPngDePesos(bytes: Uint8Array): Promise<ImagemDePesos> {
  if (bytes.length < 57 || !ASSINATURA_PNG.every((b, i) => bytes[i] === b))
    invalidar('Os pesos do chão não são um PNG')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cabecalho: { largura: number; altura: number } | null = null
  const partes: Uint8Array[] = []
  let compactado = 0,
    fim = false
  for (let p = 8; p < bytes.length && !fim; ) {
    if (p + 12 > bytes.length) invalidar('O PNG dos pesos está truncado')
    const tamanho = v.getUint32(p),
      tipo = String.fromCharCode(bytes[p + 4]!, bytes[p + 5]!, bytes[p + 6]!, bytes[p + 7]!)
    if (p + 12 + tamanho > bytes.length) invalidar('O PNG dos pesos está truncado')
    if (crc32(bytes, p + 4, p + 8 + tamanho) !== v.getUint32(p + 8 + tamanho))
      invalidar('O PNG dos pesos está corrompido')
    if (tipo === 'IHDR') {
      if (cabecalho || tamanho !== 13 || p !== 8)
        invalidar('O cabeçalho do PNG dos pesos é inválido')
      const largura = v.getUint32(p + 8),
        altura = v.getUint32(p + 12)
      if (largura < 1 || altura < 1 || largura > LADO_MAXIMO || altura > LADO_MAXIMO)
        invalidar('As dimensões dos pesos do chão são inválidas')
      if (bytes[p + 16] !== 8 || bytes[p + 17] !== 6)
        invalidar('Os pesos do chão precisam ser um PNG RGBA de 8 bits')
      if (bytes[p + 18] !== 0 || bytes[p + 19] !== 0 || bytes[p + 20] !== 0)
        invalidar('Os pesos do chão não podem ser entrelaçados')
      cabecalho = { largura, altura }
    } else if (!cabecalho) invalidar('O cabeçalho do PNG dos pesos é inválido')
    else if (tipo === 'IDAT') {
      partes.push(bytes.subarray(p + 8, p + 8 + tamanho))
      compactado += tamanho
    } else if (tipo === 'IEND') fim = true
    p += 12 + tamanho
  }
  if (!cabecalho || !fim || !partes.length) return invalidar('O PNG dos pesos está incompleto')
  const { largura, altura } = cabecalho,
    fila = 1 + largura * 4
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
    return invalidar('Os dados do PNG dos pesos estão corrompidos')
  }
  if (cru.length !== fila * altura) invalidar('O PNG dos pesos não tem o tamanho declarado')
  const rgba = new Uint8Array(largura * altura * 4)
  for (let y = 0; y < altura; y++) {
    if (cru[y * fila] !== 0) invalidar('Os pesos do chão só aceitam o filtro 0')
    rgba.set(cru.subarray(y * fila + 1, (y + 1) * fila), y * largura * 4)
  }
  return { largura, altura, rgba }
}
