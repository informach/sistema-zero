import {
  type CenaParaStudio,
  lerCenaParaStudio,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import { decodeProjectAsset } from '../assetBinary'
import type { ProjectAsset } from '../projectAssets'
import { assertScene3DDataBytes, isValidScene3DDataUrl, readScene3DDataMetadata } from './assets'

export function lerAssetDeCena3D(asset: ProjectAsset): CenaParaStudio {
  if (
    asset.kind !== 'scene3d' ||
    !isValidScene3DDataUrl(asset.dataUrl, asset.kind, asset.originalFileName)
  )
    throw Error(`O cenário “${asset.name}” é inválido.`)
  return lerCenaParaStudio(
    new TextDecoder('utf-8', { fatal: true }).decode(decodeProjectAsset(asset.dataUrl).bytes),
  )
}

/** Synchronous graph/type guard for all readers, including legacy synchronous readers. */
export function assertScene3DReferences(assets: readonly ProjectAsset[]): void {
  if (!assets.some((a) => a.kind === 'scene3d' || a.kind === 'scene3d-data')) return
  const porId = new Map<string, ProjectAsset>()
  for (const a of assets) {
    if (porId.has(a.id)) throw Error('Dois materiais usam o mesmo identificador no cenário.')
    porId.set(a.id, a)
    if (a.kind === 'scene3d-data') {
      const meta = readScene3DDataMetadata(a.dado3d)
      if (!meta || !isValidScene3DDataUrl(a.dataUrl, a.kind, a.originalFileName))
        throw Error(`O campo de dados “${a.name}” é inválido.`)
      assertScene3DDataBytes(decodeProjectAsset(a.dataUrl).bytes, meta.papel)
    }
  }
  for (const a of assets) {
    if (a.kind !== 'scene3d') continue
    conferirRecursos(lerAssetDeCena3D(a), porId, a.name)
  }
}

function conferirRecursos(
  d: CenaParaStudio,
  porId: ReadonlyMap<string, ProjectAsset>,
  nome: string,
): void {
  const arquivos = new Map(d.cena.arquivos.map((f) => [f.caminho, f]))
  for (const r of d.recursos) {
    const recurso = porId.get(r.asset),
      arquivo = arquivos.get(r.caminho)!
    if (!recurso) throw Error(`O cenário “${nome}” precisa do material “${r.asset}”.`)
    const kind =
      arquivo.mime === 'model/gltf-binary'
        ? 'model3d'
        : arquivo.mime === 'application/octet-stream'
          ? 'scene3d-data'
          : 'image'
    if (
      recurso.kind !== kind ||
      /^data:([^;,]+)/i.exec(recurso.dataUrl)?.[1]?.toLowerCase() !== arquivo.mime ||
      (kind === 'scene3d-data' && recurso.dado3d?.papel !== arquivo.papel)
    )
      throw Error(`O recurso “${r.caminho}” do cenário “${nome}” tem tipo incompatível.`)
  }
}

/** Resolve by stable ID; friendly names and storage paths never affect the scene graph. */
export function pacoteDeCena3D(
  asset: ProjectAsset,
  assets: readonly ProjectAsset[],
): PacoteCompilado {
  const envelope = lerAssetDeCena3D(asset),
    porId = new Map(assets.map((a) => [a.id, a])),
    bytesPorAsset = new Map<string, Uint8Array>()
  if (porId.size !== assets.length)
    throw Error('Dois materiais usam o mesmo identificador no cenário.')
  conferirRecursos(envelope, porId, asset.name)
  return {
    cena: envelope.cena,
    arquivos: new Map(
      envelope.recursos.map((r) => {
        const recurso = porId.get(r.asset)
        if (!recurso) throw Error(`O cenário precisa do material “${r.asset}”.`)
        let bytes = bytesPorAsset.get(r.asset)
        if (!bytes) {
          bytes = decodeProjectAsset(recurso.dataUrl).bytes
          bytesPorAsset.set(r.asset, bytes)
        }
        return [r.caminho, bytes]
      }),
    ),
  }
}

export function cenasQueUsamAsset(assets: readonly ProjectAsset[], id: string): string[] {
  return assets
    .filter(
      (a) =>
        a.kind === 'scene3d' &&
        a.id !== id &&
        lerAssetDeCena3D(a).recursos.some((r) => r.asset === id),
    )
    .map((a) => a.name)
}

/** Dependencies are pinned to a compiled revision, even if also present in a personal library. */
export function idsDosRecursosDeCena3D(assets: readonly ProjectAsset[]): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const asset of assets) {
    if (asset.kind !== 'scene3d') continue
    for (const r of lerAssetDeCena3D(asset).recursos) ids.add(r.asset)
  }
  return ids
}

/** Covers bulk editor/synchronization actions as well as individual image updates. */
export function scene3DResourceChangeIssue(
  before: readonly ProjectAsset[],
  after: readonly ProjectAsset[],
): string | null {
  const anteriores = idsDosRecursosDeCena3D(before),
    atuais = idsDosRecursosDeCena3D(after),
    porId = new Map(after.map((a) => [a.id, a]))
  for (const asset of before) {
    if (!anteriores.has(asset.id) || !atuais.has(asset.id)) continue
    const novo = porId.get(asset.id)
    if (!novo || novo.kind !== asset.kind || novo.dataUrl !== asset.dataUrl)
      return `O material “${asset.name}” é usado pelos cenários: ${cenasQueUsamAsset(after, asset.id).join(', ')}. Traga uma nova revisão do cenário para preservar os recursos existentes.`
  }
  return null
}
