import 'server-only'
import { createHash } from 'node:crypto'
import {
  conferirBlocoBinarioGlb,
  conferirInicioGlb,
  GLB_MAX_BYTES,
  tamanhoDoInicioGlb,
} from '@sistemazero/molda-cenarios-core/v2'

export type TipoDeArquivoDeCenario = 'modelo' | 'miniatura' | 'capa'
export type MimeDeCenario = 'model/gltf-binary' | 'image/webp' | 'image/png'
export interface ConteudoDoCenario {
  body: ReadableStream<Uint8Array>
  contentType: string | null
  contentLength: number | null
}
export interface ConferenciaDeUpload {
  digest: string
  bytes: number
  tipoDoConteudo: MimeDeCenario
}
export class ConteudoDeCenarioInvalido extends Error {}
function invalidar(mensagem: string): never {
  throw new ConteudoDeCenarioInvalido(mensagem)
}

/** Limita a área que o navegador precisará decodificar, sem decodificar pixels no servidor. */
export function conferirImagemDeCenario(bytes: Uint8Array, mime: 'image/png' | 'image/webp'): void {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const texto = (i: number, n: number) => new TextDecoder().decode(bytes.subarray(i, i + n))
  const dimensoes = (largura: number, altura: number) => {
    if (
      largura < 1 ||
      altura < 1 ||
      largura > 4096 ||
      altura > 4096 ||
      largura * altura > 8_388_608
    )
      invalidar('O retrato tem dimensões grandes demais')
  }
  if (mime === 'image/png') {
    if (
      bytes.length < 33 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b) ||
      v.getUint32(8) !== 13 ||
      texto(12, 4) !== 'IHDR'
    )
      invalidar('O retrato não é um PNG válido')
    dimensoes(v.getUint32(16), v.getUint32(20))
    let dados = false,
      fim = false
    for (let p = 8; p < bytes.length; ) {
      if (p + 12 > bytes.length) invalidar('O PNG está incompleto')
      const n = v.getUint32(p),
        tipo = texto(p + 4, 4),
        proximo = p + n + 12
      if (proximo > bytes.length || (tipo === 'IHDR' && p !== 8)) invalidar('O PNG está incompleto')
      if (['acTL', 'fcTL', 'fdAT'].includes(tipo)) invalidar('Use um retrato sem animação')
      if (tipo === 'IDAT') dados = true
      if (tipo === 'IEND') {
        if (n || proximo !== bytes.length) invalidar('O fim do PNG está incorreto')
        fim = true
      }
      p = proximo
    }
    if (!dados || !fim) invalidar('O PNG está incompleto')
    return
  }
  // Google WebP Container Specification: RIFF, VP8/VP8L/VP8X e dimensões do quadro.
  if (
    bytes.length < 20 ||
    texto(0, 4) !== 'RIFF' ||
    texto(8, 4) !== 'WEBP' ||
    v.getUint32(4, true) + 8 !== bytes.length
  )
    invalidar('O retrato não é um WebP válido')
  let quadros = 0
  for (let p = 12; p < bytes.length; ) {
    if (p + 8 > bytes.length) invalidar('O WebP está incompleto')
    const tipo = texto(p, 4),
      n = v.getUint32(p + 4, true),
      inicio = p + 8
    const proximo = inicio + n + (n % 2)
    if (proximo > bytes.length) invalidar('O WebP está incompleto')
    if (tipo === 'ANIM' || tipo === 'ANMF') invalidar('Use um retrato sem animação')
    if (tipo === 'VP8X') {
      if (n !== 10 || bytes[inicio]! & 2) invalidar('Use um retrato WebP sem animação')
      const u24 = (i: number) => bytes[i]! | (bytes[i + 1]! << 8) | (bytes[i + 2]! << 16)
      dimensoes(1 + u24(inicio + 4), 1 + u24(inicio + 7))
    } else if (tipo === 'VP8L') {
      if (n < 5 || bytes[inicio] !== 0x2f || bytes[inicio + 4]! >> 5)
        invalidar('O quadro WebP é inválido')
      dimensoes(
        1 + (bytes[inicio + 1]! | ((bytes[inicio + 2]! & 0x3f) << 8)),
        1 +
          ((bytes[inicio + 2]! >> 6) |
            (bytes[inicio + 3]! << 2) |
            ((bytes[inicio + 4]! & 15) << 10)),
      )
      quadros++
    } else if (tipo === 'VP8 ') {
      if (
        n < 10 ||
        bytes[inicio + 3] !== 0x9d ||
        bytes[inicio + 4] !== 1 ||
        bytes[inicio + 5] !== 0x2a ||
        bytes[inicio]! & 1
      )
        invalidar('O quadro WebP é inválido')
      dimensoes(v.getUint16(inicio + 6, true) & 0x3fff, v.getUint16(inicio + 8, true) & 0x3fff)
      quadros++
    }
    p = proximo
  }
  if (quadros !== 1) invalidar('O retrato precisa ter um único quadro WebP')
}

/** SHA em stream; mantém apenas JSON + cabeçalho BIN, ou a imagem pequena, em memória. */
export async function conferirUploadDeCenario(
  objeto: ConteudoDoCenario,
  digest: string,
  tipo: TipoDeArquivoDeCenario,
  sinal?: AbortSignal,
): Promise<ConferenciaDeUpload> {
  const leitor = objeto.body.getReader()
  let completo = false
  try {
    const tamanho = objeto.contentLength,
      mime = objeto.contentType
    const limite = tipo === 'modelo' ? GLB_MAX_BYTES : (tipo === 'miniatura' ? 256 : 512) * 1024
    if (!tamanho || !Number.isSafeInteger(tamanho) || tamanho < 1 || tamanho > limite)
      invalidar('O tamanho recebido está fora do limite do arquivo')
    if (
      tipo === 'modelo'
        ? mime !== 'model/gltf-binary'
        : mime !== 'image/png' && mime !== 'image/webp'
    )
      invalidar('O tipo recebido não corresponde ao arquivo esperado')
    let memoria = new Uint8Array(tipo === 'modelo' ? 20 : tamanho),
      guardado = 0,
      inicioGlb: number | null = null,
      lidos = 0
    const hash = createHash('sha256')
    const cancelar = () => {
      void leitor.cancel(sinal?.reason).catch(() => undefined)
    }
    sinal?.addEventListener('abort', cancelar, { once: true })
    try {
      while (true) {
        sinal?.throwIfAborted()
        const parte = await leitor.read()
        sinal?.throwIfAborted()
        if (parte.done) break
        lidos += parte.value.byteLength
        if (lidos > tamanho) invalidar('O arquivo recebido ultrapassa o tamanho informado')
        hash.update(parte.value)
        let p = 0
        while (p < parte.value.length && guardado < memoria.length) {
          const n = Math.min(parte.value.length - p, memoria.length - guardado)
          memoria.set(parte.value.subarray(p, p + n), guardado)
          p += n
          guardado += n
          if (tipo === 'modelo' && guardado === 20 && inicioGlb === null) {
            try {
              inicioGlb = tamanhoDoInicioGlb(memoria)
            } catch (e) {
              invalidar(e instanceof Error ? e.message : 'O GLB recebido é inválido')
            }
            if (inicioGlb > tamanho || (inicioGlb < tamanho && inicioGlb + 8 > tamanho))
              invalidar('O GLB recebido está incompleto')
            const maior = new Uint8Array(inicioGlb + (inicioGlb < tamanho ? 8 : 0))
            maior.set(memoria)
            memoria = maior
          }
        }
      }
    } finally {
      sinal?.removeEventListener('abort', cancelar)
    }
    if (lidos !== tamanho || hash.digest('hex') !== digest)
      invalidar('O conteúdo recebido não corresponde ao arquivo enviado')
    if (tipo === 'modelo') {
      if (inicioGlb === null || guardado !== memoria.length)
        invalidar('O GLB recebido está incompleto')
      try {
        conferirInicioGlb(memoria.subarray(0, inicioGlb), lidos)
        if (inicioGlb < lidos)
          conferirBlocoBinarioGlb(memoria.subarray(inicioGlb), lidos - inicioGlb)
      } catch (e) {
        invalidar(e instanceof Error ? e.message : 'O GLB recebido é inválido')
      }
    } else if (mime === 'image/png' || mime === 'image/webp') conferirImagemDeCenario(memoria, mime)
    if (mime !== 'model/gltf-binary' && mime !== 'image/png' && mime !== 'image/webp')
      return invalidar('Tipo de arquivo inválido')
    completo = true
    return { digest, bytes: lidos, tipoDoConteudo: mime }
  } finally {
    if (!completo) await leitor.cancel().catch(() => undefined)
    leitor.releaseLock()
  }
}
