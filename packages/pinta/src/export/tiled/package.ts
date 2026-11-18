import { COPY } from '../../core/copy'
import { TiledImportError } from './errors'

/** Tetos do que a criança traz: cada arquivo escolhido e a soma do que sai de um ZIP. */
export const TILED_PACKAGE_LIMITS = {
  fileBytes: 32 * 1024 * 1024,
  unpackedBytes: 128 * 1024 * 1024,
} as const

const MESSAGES = {
  localImagesOnly: COPY.scene.localImagesOnly,
  pathOutsideMap: COPY.scene.pathOutsideMap,
  fileTooLarge: COPY.scene.umArquivoPassouDe32MiB,
  unpackedTooLarge: COPY.scene.unpackedTooLarge,
  badZip: COPY.scene.naoConseguiAbrirOZip,
  noMap: COPY.scene.naoEncontreiUmMapaTiledNoPacote,
}

/**
 * O caminho de um arquivo DENTRO do pacote, sem `.` nem `..`. Endereço de internet, caminho
 * absoluto (`/`, `\`, `C:`) e `..` que sai da pasta são recusados: o mapa só enxerga o pacote.
 */
export function tiledPackagePath(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:|^[/\\]/i.test(path)) throw new TiledImportError(MESSAGES.localImagesOnly)
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (part === '..') {
      if (!parts.length) throw new TiledImportError(MESSAGES.pathOutsideMap)
      parts.pop()
    } else if (part && part !== '.') parts.push(part)
  }
  return parts.join('/')
}

export interface TiledPackageFile {
  name: string
  size: number
  webkitRelativePath?: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

/** Lê os arquivos escolhidos (soltos ou ZIP) e diz quais são mapas do Tiled. */
export async function readTiledPackage(
  selected: Iterable<TiledPackageFile>,
  limits: { fileBytes: number; unpackedBytes: number } = TILED_PACKAGE_LIMITS,
): Promise<{ entries: Map<string, Uint8Array>; maps: string[] }> {
  const entries = new Map<string, Uint8Array>()
  let total = 0
  for (const file of selected) {
    if (file.size > limits.fileBytes) throw new TiledImportError(MESSAGES.fileTooLarge)
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (/\.zip$/i.test(file.name)) {
      const { unzipSync } = await import('fflate')
      let unpacked: Record<string, Uint8Array>
      try {
        unpacked = unzipSync(bytes, {
          filter: (e) => {
            // O caminho é conferido ANTES de descompactar qualquer byte da entrada.
            tiledPackagePath(e.name)
            total += e.originalSize
            if (total > limits.unpackedBytes) throw new TiledImportError(MESSAGES.unpackedTooLarge)
            return !e.name.endsWith('/')
          },
        })
      } catch (e) {
        if (e instanceof TiledImportError) throw e
        throw new TiledImportError(MESSAGES.badZip)
      }
      let real = 0
      for (const [name, content] of Object.entries(unpacked)) {
        // O tamanho declarado no ZIP pode mentir: vale o que saiu de verdade.
        real += content.length
        if (real > limits.unpackedBytes) throw new TiledImportError(MESSAGES.unpackedTooLarge)
        entries.set(tiledPackagePath(name), content)
      }
    } else entries.set(tiledPackagePath(file.webkitRelativePath || file.name), bytes)
  }
  const decoder = new TextDecoder()
  const maps = [...entries.keys()]
    .filter(
      (p) =>
        /\.(tmx|tmj|json)$/i.test(p) &&
        !p.endsWith('.pinta.json') &&
        !/(^|\/)(maps|start)\.json$/.test(p),
    )
    .filter((p) => {
      if (/\.tmx$/i.test(p)) return true
      try {
        return JSON.parse(decoder.decode(entries.get(p)))?.orientation !== undefined
      } catch {
        return false
      }
    })
  if (!maps.length) throw new TiledImportError(MESSAGES.noMap)
  return { entries, maps }
}

/** Abre o mapa escolhido do pacote: texto das folhas e imagens saem só de dentro dele. */
export function tiledPackageSource(
  entries: ReadonlyMap<string, Uint8Array>,
  chosen: string,
): {
  map: () => unknown
  name: string
  resolver: { text: (path: string) => Promise<string>; image: (path: string) => Promise<string> }
} {
  const decoder = new TextDecoder(),
    base = chosen.includes('/') ? chosen.slice(0, chosen.lastIndexOf('/') + 1) : ''
  const get = (path: string): Uint8Array => {
    const entry = entries.get(tiledPackagePath(base + path)) ?? entries.get(tiledPackagePath(path))
    if (!entry) throw new TiledImportError(COPY.scene.dynamicFaltaOArquivoIncluaAsImagens(path))
    return entry
  }
  return {
    name:
      chosen
        .split('/')
        .at(-1)
        ?.replace(/\.[^.]+$/, '') ?? 'mapa',
    map: () => {
      const source = decoder.decode(entries.get(chosen))
      if (/\.tmx$/i.test(chosen)) return source
      try {
        return JSON.parse(source)
      } catch {
        throw new TiledImportError(COPY.scene.oMapaNaoEUmJsonValido)
      }
    },
    resolver: {
      text: async (path) => decoder.decode(get(path)),
      image: async (path) => {
        const data = get(path),
          type = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png'
        let binary = ''
        for (let i = 0; i < data.length; i += 0x8000)
          binary += String.fromCharCode(...data.subarray(i, i + 0x8000))
        return `data:${type};base64,${btoa(binary)}`
      },
    },
  }
}
