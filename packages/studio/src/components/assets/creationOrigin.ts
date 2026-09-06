import type { ProjectAsset } from '#core'
import type { PersonalAsset, PersonalAssetKind } from '../../asset-library/personal'
import { personalIdOf } from '../../asset-library/personalSync'

export type CreationOrigin = 'pinta' | 'molda'

/** O que o "✏️ Editar" de um asset abre: o id da criação no app de origem e o callback do host. */
export interface EditTarget {
  id: string
  origin: CreationOrigin
  open: (creationId: string) => void
}

/**
 * A origem PROVADA por evidência, na ordem: o `origin` do registro pessoal, a
 * identificação nos catálogos (`pintaLibrary.list()` / `moldaLibrary.list()`) e, por
 * último, um registro pessoal de IMAGEM sem `origin` (o Pinta antigo não gravava o
 * campo; as texturas do Molda sempre trazem `origin: 'molda'`). É o que o painel
 * PERSISTE em `libOrigin`: o palpite pelo `kind` (ver `creationOriginOf`) serve ao
 * botão, mas nunca chega ao projeto.
 */
export function evidencedOriginOf(
  asset: Pick<ProjectAsset, 'kind'>,
  personal: Pick<PersonalAsset, 'origin'> | undefined,
  catalogOrigin?: CreationOrigin | null,
): CreationOrigin | null {
  if (personal?.origin === 'pinta' || personal?.origin === 'molda') return personal.origin
  if (catalogOrigin === 'pinta' || catalogOrigin === 'molda') return catalogOrigin
  if (personal && asset.kind === 'image') return 'pinta'
  return null
}

/**
 * Qual app edita este asset: o Pinta (desenho) ou o Molda (modelo, céu ou TEXTURA).
 * Ordem: `libOrigin` (a fonte da verdade) → `origin` do registro pessoal → catálogos →
 * registro pessoal de imagem sem `origin` → só o `kind` 3D cai em Molda. Uma imagem sem
 * evidência fica ambígua (`null`): nunca presumimos Pinta, pois pode ser textura do Molda.
 */
export function creationOriginOf(
  asset: Pick<ProjectAsset, 'kind' | 'libId' | 'libOrigin'>,
  personal: Pick<PersonalAsset, 'origin'> | undefined,
  catalogOrigin?: CreationOrigin | null,
): CreationOrigin | null {
  if (!personalIdOf(asset)) return null
  if (asset.libOrigin === 'pinta' || asset.libOrigin === 'molda') return asset.libOrigin
  const evidenced = evidencedOriginOf(asset, personal, catalogOrigin)
  if (evidenced) return evidenced
  if (asset.kind === 'model3d' || asset.kind === 'environment3d') return 'molda'
  return null
}

/**
 * O `kind` do registro pessoal que espelha um asset editável. Só imagem e os dois
 * binários 3D chegam ao "✏️ Editar" (o som não vem do Pinta nem do Molda); o mapeamento
 * é total para o reparo da biblioteca não precisar de um ramo morto para o áudio.
 */
export function personalKindOf(asset: Pick<ProjectAsset, 'kind'>): PersonalAssetKind {
  return asset.kind === 'model3d' || asset.kind === 'environment3d' ? asset.kind : 'image'
}
