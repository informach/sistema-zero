import 'server-only'
import { createHash } from 'node:crypto'
import {
  conferirBlocoBinarioGlb,
  conferirImagemDeCenario as conferirImagemDoNucleo,
  conferirInicioGlb,
  GLB_MAX_BYTES,
  lerRecursoDeTerreno,
  MAX_BYTES_RECURSO_TERRENO,
  type MetadadosDeTerreno,
  tamanhoDoInicioGlb,
} from '@sistemazero/molda-cenarios-core/v2'

export type TipoDeArquivoDeCenario = 'modelo' | 'miniatura' | 'capa' | 'textura' | 'terreno'
export type MimeDeCenario =
  | 'model/gltf-binary'
  | 'image/webp'
  | 'image/png'
  | 'application/octet-stream'
export interface ConteudoDoCenario {
  body: ReadableStream<Uint8Array>
  contentType: string | null
  contentLength: number | null
}
export interface ConferenciaDeUpload {
  digest: string
  bytes: number
  tipoDoConteudo: MimeDeCenario
  largura?: number
  altura?: number
  terreno?: MetadadosDeTerreno
}
export class ConteudoDeCenarioInvalido extends Error {}
function invalidar(mensagem: string): never {
  throw new ConteudoDeCenarioInvalido(mensagem)
}

export function conferirImagemDeCenario(bytes: Uint8Array, mime: 'image/png' | 'image/webp') {
  try {
    return conferirImagemDoNucleo(bytes, mime)
  } catch (e) {
    return invalidar(e instanceof Error ? e.message : 'A imagem é inválida')
  }
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
    const limite =
      tipo === 'terreno'
        ? MAX_BYTES_RECURSO_TERRENO
        : tipo === 'modelo'
          ? GLB_MAX_BYTES
          : (tipo === 'textura' ? 4096 : tipo === 'miniatura' ? 256 : 512) * 1024
    if (!tamanho || !Number.isSafeInteger(tamanho) || tamanho < 1 || tamanho > limite)
      invalidar('O tamanho recebido está fora do limite do arquivo')
    if (
      tipo === 'terreno'
        ? mime !== 'application/octet-stream'
        : tipo === 'modelo'
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
    let imagem: { largura: number; altura: number } | null = null
    let terreno: MetadadosDeTerreno | undefined
    if (tipo === 'terreno') {
      try {
        terreno = lerRecursoDeTerreno(memoria).metadados
      } catch (e) {
        invalidar(e instanceof Error ? e.message : 'A peça de terreno é inválida')
      }
    }
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
    } else if (mime === 'image/png' || mime === 'image/webp')
      imagem = conferirImagemDeCenario(memoria, mime)
    if (
      mime !== 'model/gltf-binary' &&
      mime !== 'image/png' &&
      mime !== 'image/webp' &&
      mime !== 'application/octet-stream'
    )
      return invalidar('Tipo de arquivo inválido')
    completo = true
    return {
      digest,
      bytes: lidos,
      tipoDoConteudo: mime,
      ...(tipo === 'textura' && imagem ? imagem : {}),
      ...(terreno ? { terreno } : {}),
    }
  } finally {
    if (!completo) await leitor.cancel().catch(() => undefined)
    leitor.releaseLock()
  }
}
