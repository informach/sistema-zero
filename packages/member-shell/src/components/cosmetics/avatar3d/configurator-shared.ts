import type { AvatarCategory, AvatarSlot } from '../../../lib/avatar3d-catalog'

/** O que as duas peles do configurador (Kids e adulta) dividem: tipos e a lista de poses. */
export type Slots = Record<string, AvatarSlot>
export type Mode = 'customize' | 'photo'
export type LoadState = 'loading' | 'ready' | 'error'

/** Poses do `Poses.glb` (valor = nome da animação; rótulo PT didático). */
export const POSES = [
  { id: 'Idle', label: 'Parado' },
  { id: 'Chill', label: 'Relax' },
  { id: 'Cool', label: 'Estiloso' },
  { id: 'Punch', label: 'Soco' },
  { id: 'Ninja', label: 'Ninja' },
  { id: 'King', label: 'Rei' },
  { id: 'Busy', label: 'Ocupado' },
] as const

/**
 * As 14 categorias do avatar do Kids em três grupos (proposta do Canvas "Kids · avatar e quarto
 * com painel ao lado", 26/10/2026): no painel ao lado do 3D os grupos aparecem todos de uma vez;
 * no celular, os três nomes viram a escolha de cima e só as categorias do grupo aparecem embaixo.
 * ⚠️ Toda categoria de `AVATAR_CATEGORIES` entra em UM grupo (travado por teste): categoria nova
 * sem grupo sumiria da tela do Kids.
 */
export interface KidsAvatarCategoryGroup {
  id: 'rosto' | 'cabeca' | 'roupa'
  label: string
  categories: readonly AvatarCategory[]
}

const ROSTO: KidsAvatarCategoryGroup = {
  id: 'rosto',
  label: 'Rosto',
  categories: ['head', 'eyes', 'eyebrows', 'nose', 'faceDecor', 'facialHair'],
}

export const KIDS_AVATAR_CATEGORY_GROUPS: readonly KidsAvatarCategoryGroup[] = [
  ROSTO,
  { id: 'cabeca', label: 'Cabeça', categories: ['hair', 'hat', 'glasses'] },
  { id: 'roupa', label: 'Roupa', categories: ['top', 'bottom', 'outfit', 'shoes', 'accessory'] },
]

/** O grupo de uma categoria (o primeiro, se ela não estiver em nenhum). */
export function kidsAvatarGroupOf(category: AvatarCategory): KidsAvatarCategoryGroup {
  return KIDS_AVATAR_CATEGORY_GROUPS.find((group) => group.categories.includes(category)) ?? ROSTO
}
