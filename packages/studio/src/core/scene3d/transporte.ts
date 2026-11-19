import {
  type Asset3DManifestEntry,
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  projectAssetBudgetChars,
} from '../projectAssets'
import { assertScene3DReferences, idsDosRecursosDeCena3D } from './referencias'

type Referencia = Pick<ProjectAsset, 'id' | 'name' | 'source' | 'originalFileName'> & {
  kind: 'image' | 'model3d'
}

/** A transient view of the existing assets. Image/model bytes stay in their current channels. */
export interface TransporteDeCenas3D {
  artefatos: ProjectAsset[]
  referencias: Referencia[]
}

function conferirOrcamento(assets: readonly ProjectAsset[]) {
  if (
    assets.length > PROJECT_ASSET_LIMITS.maxAssetsCount ||
    assets.reduce((n, a) => n + projectAssetBudgetChars(a), 0) >
      PROJECT_ASSET_LIMITS.maxAssetsTotalChars
  )
    throw Error('Os recursos do cenário excedem o orçamento do projeto.')
}

export function criarTransporteDeCenas3D(
  assets: readonly ProjectAsset[] | null | undefined,
): TransporteDeCenas3D | undefined {
  if (!assets?.some((a) => a.kind === 'scene3d')) return undefined
  conferirOrcamento(assets)
  assertScene3DReferences(assets)
  const ids = idsDosRecursosDeCena3D(assets),
    artefatos: ProjectAsset[] = [],
    referencias: Referencia[] = []
  for (const a of assets) {
    if (a.kind !== 'scene3d' && !ids.has(a.id)) continue
    const meta = {
      id: a.id,
      name: a.name,
      source: a.source,
      ...(a.originalFileName ? { originalFileName: a.originalFileName } : {}),
    }
    if (a.kind === 'scene3d' || a.kind === 'scene3d-data')
      artefatos.push({
        ...meta,
        kind: a.kind,
        dataUrl: a.dataUrl,
        ...(a.dado3d ? { dado3d: { ...a.dado3d } } : {}),
      })
    else if (a.kind === 'model3d' || a.kind === 'image') referencias.push({ ...meta, kind: a.kind })
    else throw Error('Um recurso do cenário tem tipo incompatível.')
  }
  return { artefatos, referencias }
}

/** Resolve IDs through the same seeded image/model channels; never guesses by basename. */
export function resolverAssetsDoTransporte3D(
  transporte: TransporteDeCenas3D,
  imagens: Readonly<Record<string, string>>,
  modelos: Readonly<Record<string, Asset3DManifestEntry>>,
): ProjectAsset[] {
  if (
    !Array.isArray(transporte.artefatos) ||
    !Array.isArray(transporte.referencias) ||
    transporte.artefatos.length + transporte.referencias.length >
      PROJECT_ASSET_LIMITS.maxAssetsCount
  )
    throw Error('O transporte do cenário excede o limite de arquivos.')
  if (transporte.artefatos.some((a) => a.kind !== 'scene3d' && a.kind !== 'scene3d-data'))
    throw Error('O transporte do cenário contém um recurso fora de seu canal.')
  const assets: ProjectAsset[] = [...transporte.artefatos]
  for (const ref of transporte.referencias) {
    let dataUrl: string
    if (
      ref.kind === 'image' &&
      Object.hasOwn(imagens, ref.name) &&
      typeof imagens[ref.name] === 'string'
    )
      dataUrl = imagens[ref.name]!
    else if (
      ref.kind === 'model3d' &&
      Object.hasOwn(modelos, ref.name) &&
      modelos[ref.name]?.kind === 'model3d' &&
      modelos[ref.name]?.fileName === ref.originalFileName
    )
      dataUrl = modelos[ref.name]!.dataUrl
    else throw Error(`O recurso “${ref.name}” do cenário não está disponível no projeto.`)
    assets.push({ ...ref, dataUrl })
  }
  conferirOrcamento(assets)
  assertScene3DReferences(assets)
  return assets
}
