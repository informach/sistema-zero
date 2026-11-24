import {
  renderStudioProScene3DModule,
  STUDIO_PRO_SCENE3D_MODULE,
  STUDIO_PRO_SCENE3D_RUNTIME,
  STUDIO_PRO_SCENE3D_TYPES,
  type StudioProScene3DMaterial,
} from '@sistemazero/core/studio/pro-scene3d'
import type { ProAssetManifestEntry } from '../core/proAssets'
import type { ProjectAsset } from '../core/projectAssets'
import { criarTransporteDeCenas3D } from '../core/scene3d/transporte'
import { tiposDeCenas3DPro } from './scene3dProTypes'
import { THREE_VERSION } from './threeRuntimeContract'

const cache = new WeakMap<readonly ProjectAsset[], Promise<ReadonlyMap<string, Uint8Array>>>()

/** Derived files use the material coordinator; no durable source edits or second asset registry. */
export function arquivosDeCenas3DPro(
  assets: readonly ProjectAsset[],
  entries: readonly ProAssetManifestEntry[],
): Promise<ReadonlyMap<string, Uint8Array>> {
  const anterior = cache.get(assets)
  if (anterior) return anterior
  const promise = (async () => {
    const transporte = criarTransporteDeCenas3D(assets)
    if (!transporte) return new Map<string, Uint8Array>()
    const ids = new Set([...transporte.referencias, ...transporte.artefatos].map((r) => r.id)),
      recursos = assets.filter((a) => ids.has(a.id))
    const porId = new Map(entries.map((e) => [e.id, e]))
    const materiais = recursos.map((a): StudioProScene3DMaterial => {
      const e = porId.get(a.id)
      if (!e) throw Error('O cenário tem um material sem projeção no Pro.')
      return {
        id: a.id,
        name: a.name,
        kind: a.kind,
        source: a.source,
        originalFileName: a.originalFileName,
        dado3d: a.dado3d,
        url: e.url,
        mime: e.mime,
        bytes: e.bytes,
        sha256: e.sha256,
      }
    })
    const { SCENE3D_PRO_RUNTIME, SCENE3D_PRO_RUNTIME_META } = await import(
      './scene3dProRuntime.generated'
    )
    if (SCENE3D_PRO_RUNTIME_META.threeVersion !== THREE_VERSION)
      throw Error('O runtime Pro está desatualizado.')
    // O mesmo modelo que o servidor do build usa para escrever o módulo de novo (R3).
    const modulo = renderStudioProScene3DModule(materiais, SCENE3D_PRO_RUNTIME_META.sha256)
    const encoder = new TextEncoder()
    return new Map([
      [STUDIO_PRO_SCENE3D_MODULE, encoder.encode(modulo)],
      [STUDIO_PRO_SCENE3D_RUNTIME, encoder.encode(SCENE3D_PRO_RUNTIME)],
      [STUDIO_PRO_SCENE3D_TYPES, encoder.encode(tiposDeCenas3DPro)],
    ])
  })()
  cache.set(assets, promise)
  void promise.catch(() => cache.delete(assets))
  return promise
}
