import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useMemo, useRef } from 'react'
import type { MeshStandardMaterial } from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import { passoDaCor, QUANTO_DESBOTADO } from '../sistemas/cor-da-sua-ilha'
import { desbotar } from './modelos'

/**
 * Desbota estes materiais enquanto `apagado` e devolve a cor escorrendo quando deixa de estar
 * (§6.28, A17). Os materiais precisam ser cópias (`copiarNo(..., true)`): mexer num material
 * dividido desbotaria outra peça junto.
 */
export function useDesbotado(materiais: readonly MeshStandardMaterial[], apagado: boolean) {
  const { loja } = useJogo()
  const aparelho = useReducedMotion()
  const preferencia = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const cores = useMemo(
    () => materiais.map((material) => ({ material, cor: material.color.clone(), brilho: 0 })),
    [materiais],
  )
  const atual = useRef<number | null>(null)
  useFrame((_, dt) => {
    const alvo = apagado ? QUANTO_DESBOTADO : 0
    if (atual.current === alvo) return
    atual.current =
      atual.current === null ? alvo : passoDaCor(atual.current, alvo, dt, aparelho || preferencia)
    desbotar(cores, atual.current)
  })
}
