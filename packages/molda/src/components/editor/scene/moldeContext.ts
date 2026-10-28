import { createContext, useContext } from 'react'
import type { Vec3 } from '../../../core/model'

/**
 * O molde da criação aberta na oficina (28/10/2026, o Arquipélago): a caixa na grade, o nome do
 * objeto e o teto de triângulos. Só existe quando a criação foi aberta pelo molde do host; fora
 * disso é `null` e a oficina é a de sempre.
 */
export interface MoldeDaOficina {
  name: string
  min: Vec3
  max: Vec3
  maxTriangles: number
}

export const MoldeDaOficinaContext = createContext<MoldeDaOficina | null>(null)

export function useMoldeDaOficina(): MoldeDaOficina | null {
  return useContext(MoldeDaOficinaContext)
}
