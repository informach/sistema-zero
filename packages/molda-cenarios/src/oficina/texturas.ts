import { inspectReferenceRaster } from '@sistemazero/molda/arquivos'
import {
  conferirImagemDeCenario,
  digestDosBytes,
  MAX_BYTES_DE_TEXTURA_CENARIO,
} from '@sistemazero/molda-cenarios-core/v2'
import type { TexturaParaImportar } from './portas'

/** Preflight antes do decoder nativo, limite de pixels e conferência das dimensões decodificadas. */
export async function prepararChao(
  arquivo: File,
  sinal?: AbortSignal,
): Promise<TexturaParaImportar> {
  sinal?.throwIfAborted()
  if (!arquivo.size || arquivo.size > 16 * 1024 * 1024)
    throw Error('Escolha uma imagem de até 16 MB')
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  sinal?.throwIfAborted()
  let largura: number, altura: number, mime: 'image/png' | 'image/jpeg' | 'image/webp'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const cabecalho = inspectReferenceRaster(bytes)
    largura = cabecalho.width
    altura = cabecalho.height
    mime = cabecalho.mime
  } else {
    mime = bytes[0] === 137 ? 'image/png' : 'image/webp'
    ;({ largura, altura } = conferirImagemDeCenario(bytes, mime))
  }
  if (largura > 4096 || altura > 4096 || largura * altura > 8388608)
    throw Error('A imagem precisa ter até 4096 pixels por lado e 8 milhões de pixels')
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const imagem = new Image()
  const cancelar = () => imagem.removeAttribute('src')
  sinal?.addEventListener('abort', cancelar, { once: true })
  try {
    imagem.src = url
    await imagem.decode()
    sinal?.throwIfAborted()
    if (imagem.naturalWidth * imagem.naturalHeight !== largura * altura)
      throw Error('A imagem não corresponde às dimensões declaradas')
    const mesmaOrientacao = imagem.naturalWidth === largura && imagem.naturalHeight === altura
    largura = imagem.naturalWidth
    altura = imagem.naturalHeight
    let conteudo: Blob
    if (mime !== 'image/jpeg' && mesmaOrientacao) conteudo = new Blob([bytes], { type: mime })
    else {
      const tela = document.createElement('canvas')
      tela.width = largura
      tela.height = altura
      try {
        const contexto = tela.getContext('2d')
        if (!contexto) throw Error('Não consegui preparar a imagem')
        contexto.drawImage(imagem, 0, 0)
        const png = await new Promise<Blob | null>((r) => tela.toBlob(r, 'image/png'))
        if (!png) throw Error('Não consegui converter a imagem')
        conteudo = png
      } finally {
        tela.width = tela.height = 0
      }
    }
    sinal?.throwIfAborted()
    if (conteudo.size > MAX_BYTES_DE_TEXTURA_CENARIO)
      throw Error('A imagem de chão pronta passa de 4 MB; escolha uma imagem menor')
    const digest = await digestDosBytes(new Uint8Array(await conteudo.arrayBuffer()))
    sinal?.throwIfAborted()
    return {
      nome: arquivo.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Chão',
      pasta: '',
      etiquetas: [],
      digest,
      largura,
      altura,
      repeticaoMetros: 2,
      conteudo,
    }
  } catch (e) {
    sinal?.throwIfAborted()
    if (e instanceof DOMException)
      throw Error('Não consegui abrir esta imagem. Use PNG, JPG ou WebP sem animação')
    throw e
  } finally {
    sinal?.removeEventListener('abort', cancelar)
    cancelar()
    URL.revokeObjectURL(url)
  }
}
