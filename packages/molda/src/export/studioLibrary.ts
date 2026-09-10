/**
 * A face de DADOS que o Estúdio consome (subpath `@sistemazero/molda/studio-library`).
 * Zero React: o host kids importa este módulo dinamicamente, nunca a raiz.
 *
 * - `listGalleryForStudio()`: resumos + miniatura.
 * - `exportAssetForStudio(id)` / `exportLoadedAssetForStudio(asset)`: o payload da
 *   ponte "Trazer do Molda" (e da volta dela, ao salvar no editor) já
 *   validado pelos tetos do Estúdio (`isValidAssetDataUrl` de lá: MIME, extensão
 *   e assinatura): modelo (`.glb`, `model3d`), céu (`.hdr`, `environment3d`)
 *   e textura (`.png`, `image`).
 */

import { type MoldaAssetSummary, summarizeAsset } from '../core/assetSummary'
import { ByteLru } from '../core/byteLru'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaAsset } from '../core/model'
import { bytesToBase64 } from '../core/skinCodec'
import { readSceneDocument } from '../scene/readDocument'
import {
  getDefaultMoldaPersistence,
  getMoldaGenerationStore,
  getMoldaStorageNamespace,
  type MoldaPersistence,
} from '../state/persistence'
import { createMoldaSceneCloudSource } from '../state/sceneCloudSource'
import { prepareSceneGlbInWorker } from '../workers/sceneGlb'
import { exportSkyHdrInWorker } from '../workers/skyExport'
import { exportModelGlb } from './modelGlb'
import { inspectSceneStudioCompatibility } from './sceneStudioCompatibility'
import { exportTexturePng } from './texturePng'

export { getMoldaStorageNamespace, setMoldaStorageNamespace } from '../state/persistence'

export type MoldaLibraryItem = Omit<MoldaAssetSummary, 'createdAt'>

/** O `ProjectAsset.kind` do Estúdio que cada criação vira. */
export type StudioAssetKind = 'model3d' | 'image' | 'environment3d'

export interface MoldaExportedAsset {
  id: string
  name: string
  kind: StudioAssetKind
  dataUrl: string
  originalFileName: string
  bytes: number
  thumbDataUrl: string | null
  /** Só a imagem (textura): o Estúdio guarda o tamanho. */
  width?: number
  height?: number
}

/** Resultado da volta automática ao Estúdio depois de salvar no Molda. */
export type MoldaStudioResyncResult =
  | { updated: true }
  | { updated: false; reason: 'not-linked' | 'failed'; error?: string }

export type ExportForStudioResult =
  | { ok: true; asset: MoldaExportedAsset }
  | { ok: false; reason: 'not-found' | 'encode-failed' | 'asset-too-big' }

const MAX_EXPORT_CACHE_ENTRIES = 16
type CachedExport =
  | { ok: false; reason: 'encode-failed' | 'asset-too-big' }
  | {
      ok: true
      encoded: Pick<MoldaExportedAsset, 'kind' | 'dataUrl' | 'bytes' | 'width' | 'height'>
    }
const exportCaches = new WeakMap<MoldaPersistence, ByteLru<string, CachedExport>>()

function cacheFor(persistence: MoldaPersistence): ByteLru<string, CachedExport> {
  let cache = exportCaches.get(persistence)
  if (!cache) {
    cache = new ByteLru({
      maxBytes: MOLDA_LIMITS.exportCacheBytes,
      maxEntries: MAX_EXPORT_CACHE_ENTRIES,
      sizeOf: (key, value) =>
        128 + 2 * (key.length + (value.ok ? value.encoded.dataUrl.length : 0)),
    })
    exportCaches.set(persistence, cache)
  }
  return cache
}

function materializeExport(
  asset: Pick<MoldaAsset, 'id' | 'name' | 'thumb'>,
  cached: CachedExport,
): ExportForStudioResult {
  if (!cached.ok) return cached
  const extension =
    cached.encoded.kind === 'model3d'
      ? 'glb'
      : cached.encoded.kind === 'environment3d'
        ? 'hdr'
        : 'png'
  return {
    ok: true,
    asset: {
      id: asset.id,
      name: asset.name,
      ...cached.encoded,
      originalFileName: `${asset.name}.${extension}`,
      thumbDataUrl: asset.thumb ?? null,
    },
  }
}

/** Do namespace corrente, ordenada da mais recente para a mais antiga, nas DUAS gerações. */
export async function listGalleryForStudio(): Promise<MoldaLibraryItem[]> {
  const persistence = getDefaultMoldaPersistence()
  const v1 = persistence.listSummaries
    ? await persistence.listSummaries()
    : (await persistence.loadAll()).map(summarizeAsset)
  // A criação promovida continua sendo a mesma criação para o Estúdio: some daqui e o
  // "Trazer do Molda" deixaria de enxergar o que a criança acabou de modelar.
  const scene = await createMoldaSceneCloudSource().listSummaries()
  return [...v1, ...scene].sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * A geração seguinte vai pelo `encodeSceneGlb`, com a pintura animada: a hierarquia, os
 * clipes e a folha inteira que o runtime avançado sabe tocar. Nunca pelo escritor v1, que
 * funde tudo numa malha só.
 *
 * ⚠️ Perdas NÃO seguem o contrato do v1, e isto é uma diferença de comportamento conhecida:
 * o v1 é tudo-ou-recusa e leva as peças escondidas; aqui o worker grava com `allowLosses`,
 * então peça escondida, face descartada e geometria solta SOMEM da cópia sem aviso. O
 * "Exportar GLB" da própria oficina exige aceite explícito para essas mesmas perdas; esta
 * ponte não tem canal para pedir aceite (é um PULL do Estúdio). Registrado no plano como
 * decisão de produto em aberto — não confundir com o portão de tetos abaixo, que recusa.
 */
async function exportSceneForStudio(id: string, namespace: string): Promise<ExportForStudioResult> {
  // O banco do PERFIL que pediu, não o corrente: entre enfileirar e enviar, o host pode ter
  // trocado de criança no mesmo tablet, e a cópia sairia da galeria da outra.
  const found = await createMoldaSceneCloudSource(getMoldaGenerationStore(namespace)).read(id)
  if (!found) return { ok: false, reason: 'not-found' }
  const read = readSceneDocument(JSON.parse(found.json))
  if (read.status !== 'valid') return { ok: false, reason: 'encode-failed' }
  const summary = { id, name: found.summary.name, thumb: found.summary.thumbDataUrl ?? undefined }
  try {
    const result = await prepareSceneGlbInWorker({
      document: read.document,
      documentId: id,
      revision: 0,
      animatedPaint: true,
    })
    // Os MESMOS tetos que o painel da oficina mostra item a item. Conferir só os bytes
    // deixava passar uma cópia leve e pesada de desenhar (60 malhas num teto de 48), e
    // deixava passar a criação VAZIA, que o caminho v1 recusa com `empty`.
    const report = inspectSceneStudioCompatibility({
      stats: result.stats,
      byteLength: result.bytes.length,
    })
    if (!report.fitsSingleCopy)
      return materializeExport(summary, {
        ok: false,
        reason: report.empty ? 'encode-failed' : 'asset-too-big',
      })
    const dataUrl = `data:model/gltf-binary;base64,${bytesToBase64(result.bytes)}`
    return materializeExport(summary, {
      ok: true,
      encoded: { kind: 'model3d', dataUrl, bytes: result.bytes.length },
    })
  } catch {
    return materializeExport(summary, { ok: false, reason: 'encode-failed' })
  }
}

/** Separador das chaves do cache: `namespace` (o viewerId do host, um UUID), `id` e `updatedAt` nunca o contêm. */
const CACHE_KEY_SEPARATOR = String.fromCharCode(0)

/**
 * A exportação a partir de uma criação JÁ carregada: o editor, ao salvar, reenvia ao
 * Estúdio sem reler o armazenamento (`useStudioResync`). Cache por id + `updatedAt`
 * compartilhado com `exportAssetForStudio` (a mesma persistência é a dona do cache).
 */
export async function exportLoadedAssetForStudio(
  asset: MoldaAsset,
  options: { persistence?: MoldaPersistence; namespace?: string } = {},
): Promise<ExportForStudioResult> {
  const namespace = options.namespace ?? getMoldaStorageNamespace()
  const persistence = options.persistence ?? getDefaultMoldaPersistence()
  const cache = cacheFor(persistence)
  const cacheKey = [namespace, asset.id, String(asset.updatedAt)].join(CACHE_KEY_SEPARATOR)
  const cached = cache.get(cacheKey)
  if (cached) return materializeExport(asset, cached)
  const finish = (result: CachedExport): ExportForStudioResult => {
    cache.set(cacheKey, result)
    return materializeExport(asset, result)
  }
  if (asset.kind === 'model') {
    const result = exportModelGlb(asset)
    if (!result.ok) {
      return finish({
        ok: false,
        reason: result.reason === 'too-big' ? 'asset-too-big' : 'encode-failed',
      })
    }
    return finish({
      ok: true,
      encoded: { kind: 'model3d', dataUrl: result.dataUrl, bytes: result.bytes.length },
    })
  }
  if (asset.kind === 'sky') {
    const result = await exportSkyHdrInWorker(asset)
    if (!result.ok) return finish({ ok: false, reason: 'asset-too-big' })
    return finish({
      ok: true,
      encoded: { kind: 'environment3d', dataUrl: result.dataUrl, bytes: result.bytes.length },
    })
  }
  const result = exportTexturePng(asset)
  if (!result.ok) return finish({ ok: false, reason: 'asset-too-big' })
  return finish({
    ok: true,
    encoded: {
      kind: 'image',
      dataUrl: result.dataUrl,
      bytes: result.bytes.length,
      width: result.width,
      height: result.height,
    },
  })
}

export async function exportAssetForStudio(
  id: string,
  /**
   * O perfil ao qual esta exportação pertence. `useStudioResync` prende a conta ANTES de
   * entrar na fila justamente porque uma troca de criança no meio da espera faria a cópia
   * sair do banco da outra; reler o namespace aqui, depois dos awaits, desfazia isso.
   */
  context?: { persistence?: MoldaPersistence; namespace?: string },
): Promise<ExportForStudioResult> {
  const namespace = context?.namespace ?? getMoldaStorageNamespace()
  const persistence = context?.persistence ?? getDefaultMoldaPersistence()
  // Falhar ao ler o inventário v1 não pode impedir a geração seguinte de responder:
  // uma criação promovida não está mais lá, e é justamente ela que precisa sair daqui.
  const asset = await persistence.load(id).catch(() => null)
  if (!asset) return exportSceneForStudio(id, namespace)
  return exportLoadedAssetForStudio(asset, { persistence, namespace })
}
