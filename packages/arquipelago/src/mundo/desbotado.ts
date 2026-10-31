import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useMemo, useRef } from 'react'
import type { Material, MeshStandardMaterial } from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import { passoDaCor, QUANTO_DESBOTADO } from '../sistemas/cor-da-sua-ilha'
import { desbotadoDoMaterial } from './cinza-dos-borroes'
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

/**
 * O mesmo, no shader (lacunas, 01/11/2026): para o chão da sua ilha, que tem a cor nos vértices
 * (mudar a cor do material não desbota). `verde` vale para o gramado e `resto` para a areia e as
 * pedras. Os materiais precisam estar ligados por `desbotarPelosBorroes`.
 */
export function useDesbotadoNoShader(
  materiais: readonly Material[],
  verdeApagado: boolean,
  restoApagado = verdeApagado,
) {
  const { loja } = useJogo()
  const aparelho = useReducedMotion()
  const preferencia = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const atual = useRef<{ verde: number; resto: number } | null>(null)
  useFrame((_, dt) => {
    const alvoVerde = verdeApagado ? QUANTO_DESBOTADO : 0
    const alvoResto = restoApagado ? QUANTO_DESBOTADO : 0
    const a = atual.current
    if (a && a.verde === alvoVerde && a.resto === alvoResto) return
    const naHora = !a || aparelho || preferencia
    const verde = naHora ? alvoVerde : passoDaCor(a.verde, alvoVerde, dt, false)
    const resto = naHora ? alvoResto : passoDaCor(a.resto, alvoResto, dt, false)
    atual.current = { verde, resto }
    for (const m of materiais) desbotadoDoMaterial(m).value.set(verde, resto)
  })
}
