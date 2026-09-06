import type { ProjectAsset } from '#core'
import type { PersonalAsset } from '../../asset-library/personal'
import { personalIdOf } from '../../asset-library/personalSync'

export type CreationOrigin = 'pinta' | 'molda'

/** O que o "✏️ Editar" de um asset abre: o id da criação no app de origem e o callback do host. */
export interface EditTarget {
  id: string
  origin: CreationOrigin
  open: (creationId: string) => void
}

/**
 * Qual app edita este asset: o Pinta (desenho) ou o Molda (modelo, céu ou TEXTURA).
 * `libOrigin` é a fonte da verdade; sem ele (asset gravado antes do campo existir),
 * valem o registro local e a identificação feita nos catálogos. Uma imagem sem
 * evidência fica ambígua: nunca presumimos Pinta, pois pode ser textura do Molda.
 */
export function creationOriginOf(
  asset: Pick<ProjectAsset, 'kind' | 'libId' | 'libOrigin'>,
  personal: Pick<PersonalAsset, 'origin'> | undefined,
  catalogOrigin?: CreationOrigin | null,
): CreationOrigin | null {
  if (!personalIdOf(asset)) return null
  if (asset.libOrigin === 'pinta' || asset.libOrigin === 'molda') return asset.libOrigin
  if (personal?.origin === 'pinta' || personal?.origin === 'molda') return personal.origin
  // Registros pessoais antigos do Pinta não gravavam `origin`; a existência local
  // ainda é evidência suficiente. Texturas do Molda modernas trazem `origin: molda`.
  if (personal && asset.kind === 'image') return 'pinta'
  if (catalogOrigin === 'pinta' || catalogOrigin === 'molda') return catalogOrigin
  if (asset.kind === 'model3d' || asset.kind === 'environment3d') return 'molda'
  return null
}
