/**
 * "Baixar tudo": um ZIP com um arquivo PRONTO por criação, separado por tipo,
 * mais o backup completo re-importável e um LEIA-ME em português:
 *   modelos/<nome>.glb · texturas/<nome>.png · ceus/<nome>.hdr
 *   galeria.molda.json · LEIA-ME.txt
 * fflate carregado SOB DEMANDA (padrão do Pinta e do studio). O céu custa
 * ~0,5 s cada (render 1024×512 na CPU): quem chama mostra o "Preparando..." e
 * a montagem cede a thread entre uma criação e outra.
 *
 * Uma criação que o Estúdio não aceitaria (modelo sem peça, atlas cheio, acima
 * do teto) fica FORA dos arquivos prontos, mas DENTRO do backup: o "Trazer de
 * volta" devolve tudo.
 */
import { COPY } from '../core/copy'
import type { MoldaAsset, MoldaAssetKind } from '../core/model'
import { MOLDA_GALLERY_ZIP_ENTRY } from './backupFormat'
import { exportModelGlb } from './modelGlb'
import { galleryToJsonText } from './projectJson'
import { exportSkyHdr } from './skyHdr'
import { exportTexturePng } from './texturePng'

export const GALLERY_ZIP_FILE_NAME = 'minhas-criacoes-3d-molda.zip'
export const README_ENTRY = 'LEIA-ME.txt'

export type FileMap = Record<string, Uint8Array | string>

export interface SkippedEntry {
  name: string
  kind: MoldaAssetKind
  reason: 'empty' | 'atlas-full' | 'too-big'
}

export interface GalleryFileMapResult {
  files: FileMap
  readme: string[]
  skipped: SkippedEntry[]
}

export interface ZipGalleryOptions {
  /** Só para os testes: o céu num tamanho menor que o export real. */
  skySize?: { width: number; height: number }
  /** Cede a thread entre criações (default `setTimeout(0)`); `null` = não cede. */
  yieldBetween?: (() => Promise<void>) | null
}

function defaultYield(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Nome de ARQUIVO dentro do ZIP. Os nomes já saem da galeria em kebab-case e
 * únicos; a régua só protege um registro fora do padrão de virar caminho.
 */
function safeEntryName(name: string, taken: Set<string>): string {
  const cleaned = name.replace(/[^a-z0-9-]/gi, '-').replace(/^-+|-+$/g, '') || 'criacao'
  let candidate = cleaned
  let n = 2
  while (taken.has(candidate)) {
    candidate = `${cleaned}-${n}`
    n += 1
  }
  taken.add(candidate)
  return candidate
}

export async function buildGalleryFileMap(
  assets: readonly MoldaAsset[],
  options: ZipGalleryOptions = {},
): Promise<GalleryFileMapResult> {
  const yieldBetween = options.yieldBetween === undefined ? defaultYield : options.yieldBetween
  const files: FileMap = {}
  const readme: string[] = [...COPY.gallery.readme.intro, '']
  const skipped: SkippedEntry[] = []
  const taken = new Set<string>()

  for (const [index, asset] of assets.entries()) {
    if (index > 0 && yieldBetween) await yieldBetween()
    const entryName = safeEntryName(asset.name, taken)
    switch (asset.kind) {
      case 'model': {
        const result = exportModelGlb(asset)
        if (!result.ok) {
          skipped.push({ name: asset.name, kind: asset.kind, reason: result.reason })
          readme.push(COPY.gallery.readme.skipped(COPY.kinds.model.title, asset.name))
          break
        }
        files[`modelos/${entryName}.glb`] = result.bytes
        readme.push(
          COPY.gallery.readme.model(asset.name, entryName, asset.parts.length, result.triangles),
        )
        break
      }
      case 'texture': {
        const result = exportTexturePng(asset)
        if (!result.ok) {
          skipped.push({ name: asset.name, kind: asset.kind, reason: result.reason })
          readme.push(COPY.gallery.readme.skipped(COPY.kinds.texture.title, asset.name))
          break
        }
        files[`texturas/${entryName}.png`] = result.bytes
        readme.push(COPY.gallery.readme.texture(asset.name, entryName, asset.size))
        break
      }
      case 'sky': {
        const result = options.skySize ? exportSkyHdr(asset, options.skySize) : exportSkyHdr(asset)
        if (!result.ok) {
          skipped.push({ name: asset.name, kind: asset.kind, reason: result.reason })
          readme.push(COPY.gallery.readme.skipped(COPY.kinds.sky.title, asset.name))
          break
        }
        files[`ceus/${entryName}.hdr`] = result.bytes
        readme.push(COPY.gallery.readme.sky(asset.name, entryName, result.width, result.height))
        break
      }
    }
  }

  files[MOLDA_GALLERY_ZIP_ENTRY] = galleryToJsonText(assets)
  return { files, readme, skipped }
}

/** Zipa o mapa (fflate sob demanda; chaves com `/` viram pastas). */
export async function zipGallery(
  assets: readonly MoldaAsset[],
  options: ZipGalleryOptions = {},
): Promise<Uint8Array> {
  const { files, readme } = await buildGalleryFileMap(assets, options)
  files[README_ENTRY] = readme.join('\n')
  const { strToU8, zipSync } = await import('fflate')
  const flat: Record<string, Uint8Array> = {}
  for (const [path, content] of Object.entries(files)) {
    flat[path] = typeof content === 'string' ? strToU8(content) : content
  }
  return zipSync(flat, { level: 6 })
}
