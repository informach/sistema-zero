'use client'

import { UNIT_BOX, UNIT_CONE, UNIT_CYLINDER, UNIT_SPHERE } from './geometry'
import { MAT, type MatKey } from './materials'

/**
 * Primitivas low-poly compartilhadas (caixa/cilindro/cone/esfera) — cada uma reusa uma
 * geometria UNITÁRIA + um material da paleta, escalando/posicionando por instância. Usadas
 * pelos móveis e pets. Só carregadas pela árvore client-only do `<Canvas>`.
 */
export type V3 = [number, number, number]
export interface Prim {
  s: V3
  p: V3
  m: MatKey
  r?: V3
}

export const Box = ({ s, p, m, r }: Prim) => (
  <mesh geometry={UNIT_BOX} material={MAT[m]} scale={s} position={p} rotation={r} />
)
export const Cyl = ({ s, p, m, r }: Prim) => (
  <mesh geometry={UNIT_CYLINDER} material={MAT[m]} scale={s} position={p} rotation={r} />
)
export const Cone = ({ s, p, m, r }: Prim) => (
  <mesh geometry={UNIT_CONE} material={MAT[m]} scale={s} position={p} rotation={r} />
)
export const Ball = ({ s, p, m }: Prim) => (
  <mesh geometry={UNIT_SPHERE} material={MAT[m]} scale={s} position={p} />
)
