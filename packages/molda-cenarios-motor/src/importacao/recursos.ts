import {
  decodeImportDataUri,
  gltfResourcePath,
  type ImportDataUriPolicy,
  inspectImportDataPayload,
  literalResourcePath,
} from '@sistemazero/molda/arquivos'
import { FileLoader, type LoadingManager, Texture } from 'three'
import type { GLTFParser } from 'three/addons/loaders/GLTFLoader.js'

const politica: ImportDataUriPolicy = {
  fileBytes: 64 * 1024 ** 2,
  byteBudget(n) {
    if (n > this.fileBytes) throw Error('O recurso embutido passa de 64 MB')
  },
  error: (_motivo, caminho, mensagem) => Error(`${caminho}: ${mensagem}`),
}

/** Recursos locais são lidos dos Blobs escolhidos, nunca por fetch(blob:/data:).
 * Assim o worker obedece à CSP dos apps sem abrir acesso a URLs externas. */
export class RecursosDoConjunto {
  private embutidos = new Map<string, Blob>()
  private sequencia = 0
  constructor(
    private arquivos: ReadonlyMap<string, Blob>,
    private entrada: string,
  ) {}

  embutir = (blob: Blob): string => {
    const chave = `blob:cenario-local-${++this.sequencia}`
    this.embutidos.set(chave, blob)
    return chave
  }

  ler(uri: string, formato: 'literal' | 'gltf' = 'literal'): Blob {
    const embutido = this.embutidos.get(uri)
    if (embutido) return embutido
    if (/^data:/i.test(uri)) {
      if (uri.length > politica.fileBytes * 2) throw Error('O recurso embutido é grande demais')
      const partes = /^data:([^;,]*)(;base64)?,(.*)$/is.exec(uri)
      if (!partes) throw Error('O recurso embutido tem formato inválido')
      const dados = inspectImportDataPayload(
        partes[3]!,
        partes[2] ? 'base64' : 'percent',
        'recurso',
        politica,
      )
      const bytes = decodeImportDataUri(dados, 'recurso', politica)
      return new Blob([new Uint8Array(bytes).buffer], { type: partes[1] })
    }
    const caminho = uri.startsWith('__pacote__/')
      ? literalResourcePath(uri.slice('__pacote__/'.length), 'raiz', 'recurso')
      : formato === 'gltf'
        ? gltfResourcePath(uri, this.entrada, 'recurso')
        : literalResourcePath(uri, this.entrada, 'recurso')
    const arquivo = this.arquivos.get(caminho)
    if (!arquivo) throw Error(`Falta o recurso ${caminho}. Traga a pasta ou o ZIP completo`)
    return arquivo
  }

  limpar() {
    this.embutidos.clear()
  }
}

class ArquivoDoConjunto extends FileLoader {
  constructor(
    manager: LoadingManager,
    private recursos: RecursosDoConjunto,
  ) {
    super(manager)
  }
  override load(
    url: string,
    pronto?: (b: string | ArrayBuffer) => void,
    _progresso?: (e: ProgressEvent) => void,
    erro?: (e: unknown) => void,
  ): void {
    void Promise.resolve()
      .then(() => this.recursos.ler(url, 'gltf').arrayBuffer())
      .then(pronto, erro)
  }
}

/** Pontos de extensão públicos do parser: mantém samplers, UVs e materiais do GLTFLoader. */
export function recursosDoGltf(
  parser: GLTFParser,
  recursos: RecursosDoConjunto,
  erros: unknown[],
): void {
  parser.fileLoader = new ArquivoDoConjunto(parser.options.manager, recursos)
  parser.loadImageSource = async (indice: number): Promise<Texture> => {
    try {
      const imagem: { uri?: string; bufferView?: number; mimeType?: string } =
        parser.json.images[indice]
      const blob =
        imagem.bufferView === undefined
          ? recursos.ler(imagem.uri!, 'gltf')
          : new Blob([await parser.getDependency('bufferView', imagem.bufferView)], {
              type: imagem.mimeType,
            })
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'none',
        premultiplyAlpha: 'none',
      })
      const textura = new Texture(bitmap)
      textura.flipY = false
      textura.needsUpdate = true
      if (imagem.mimeType) textura.userData.mimeType = imagem.mimeType
      return textura
    } catch (e) {
      // GLTFLoader troca imagens inválidas por null; a importação não pode perder a arte em silêncio.
      erros.push(e)
      throw e
    }
  }
}
