import type { AvatarSlot } from '../../../lib/avatar3d-catalog'

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
