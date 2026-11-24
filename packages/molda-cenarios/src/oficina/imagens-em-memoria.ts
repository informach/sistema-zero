import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import type { Espaco } from './portas'

export interface ImagemPreparada {
  imagem: Blob
  digest: string
  bytes: number
}
export function criarImagensEmMemoria(espaco: (id: string) => Espaco) {
  const fotos = new Map<
      string,
      { url: string; bytes: number; espacoId: string; donos: Set<string> }
    >(),
    porDono = new Map<string, string>()
  const soltar = (dono: string) => {
    const chave = porDono.get(dono),
      foto = chave && fotos.get(chave)
    porDono.delete(dono)
    if (!foto) return
    foto.donos.delete(dono)
    if (!foto.donos.size) {
      URL.revokeObjectURL(foto.url)
      espaco(foto.espacoId).usadoBytes -= foto.bytes
      fotos.delete(chave!)
    }
  }
  return {
    async preparar(imagem: Blob, limite: number, sinal?: AbortSignal): Promise<ImagemPreparada> {
      sinal?.throwIfAborted()
      if (
        !['image/png', 'image/webp'].includes(imagem.type) ||
        imagem.size < 1 ||
        imagem.size > limite
      )
        throw new Error(`Envie uma imagem PNG ou WebP de até ${Math.floor(limite / 1024)} KB`)
      const bytes = new Uint8Array(await imagem.arrayBuffer()),
        digest = await digestDosBytes(bytes)
      sinal?.throwIfAborted()
      return { imagem, digest, bytes: bytes.length }
    },
    fixar(dono: string, espacoId: string, imagem: ImagemPreparada): string {
      const chave = `${espacoId}:${imagem.digest}`
      if (porDono.get(dono) === chave) return fotos.get(chave)!.url
      let foto = fotos.get(chave)
      if (!foto) {
        const e = espaco(espacoId)
        if (e.usadoBytes + imagem.bytes > e.limiteBytes) throw new Error('O espaço está cheio')
        foto = {
          url: URL.createObjectURL(imagem.imagem),
          bytes: imagem.bytes,
          espacoId,
          donos: new Set(),
        }
        fotos.set(chave, foto)
        e.usadoBytes += imagem.bytes
      }
      soltar(dono)
      foto.donos.add(dono)
      porDono.set(dono, chave)
      return foto.url
    },
    soltar,
  }
}
export type ImagensEmMemoria = ReturnType<typeof criarImagensEmMemoria>
