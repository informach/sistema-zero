import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { type RefObject, useEffect, useMemo } from 'react'
import type { AnimationAction, AnimationMixer, Group, Mesh, Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import { configurarAcao, copiarArteAnimada, iluminarArte, iniciarClipe } from './arte-animada'

/**
 * Uma cópia animada de um personagem ou bicho do Blender (com esqueleto: `SkeletonUtils.clone`,
 * senão as cópias dividiriam os ossos). Os clipes de `umaVez` tocam uma vez e param no último
 * quadro; com menos movimento pedido no sistema, tudo anda na metade da velocidade.
 */
export function useCopiaAnimada(
  url: string,
  raiz: RefObject<Group | null>,
  umaVez: readonly string[],
  pausado = false,
): {
  cena: Object3D
  actions: Record<string, AnimationAction | null>
  mixer: AnimationMixer
  /** As malhas dos olhos (com os morfos `piscar` e `feliz`); vazia se não houver. */
  olhos: readonly Mesh[]
} {
  const gltf = useGLTF(url, false, false)
  const reduzido = useReducedMotion()
  const { ambiente } = useJogo()
  const copia = useMemo(() => {
    const c = copiarArteAnimada(gltf.scene)
    // Já nasce com o brilho da hora: sem isso, o primeiro quadro mostrava a luz do GLB de dia.
    iluminarArte(c.luzes, ambiente.noite)
    return c
  }, [gltf.scene, ambiente])
  const { cena } = copia
  const olhos = useMemo(() => malhasDosOlhos(cena), [cena])
  useEffect(() => () => copia.soltar(), [copia])
  useFrame(() => iluminarArte(copia.luzes, ambiente.noite))
  const { actions, mixer } = useAnimations(gltf.animations, raiz)
  useEffect(() => {
    for (const acao of Object.values(actions)) if (acao) configurarAcao(acao, umaVez)
  }, [actions, umaVez])
  useEffect(() => {
    mixer.timeScale = pausado ? 0 : reduzido ? 0.5 : 1
  }, [mixer, reduzido, pausado])
  return { cena, actions, mixer, olhos }
}

/** Troca de clipe com uma mistura curta (o de agora some enquanto o novo entra do começo). */
export function trocarClipe(
  actions: Record<string, AnimationAction | null>,
  de: string | null,
  para: string,
  mistura: number,
  id: string,
): void {
  const novo = actions[para]
  const velho = de && de !== para ? actions[de] : null
  if (novo) iniciarClipe(novo, id, mistura)
  velho?.fadeOut(mistura)
}

/** Quanto tempo um clipe leva na velocidade do mixer (0 se não existir). */
export function duracaoDoClipe(
  actions: Record<string, AnimationAction | null>,
  mixer: AnimationMixer,
  nome: string,
): number {
  const a = actions[nome]
  return a ? a.getClip().duration / Math.max(0.01, mixer.timeScale) : 0
}

/**
 * As malhas dos olhos com morfos. O olho do Blender tem dois materiais (o branco e a pupila), e o
 * three divide a malha em uma por material: `capi-olhos_1` e `capi-olhos_2` num grupo `capi-olhos`.
 * Os morfos ficam em cada uma, então piscar mexe em todas.
 */
export function malhasDosOlhos(cena: Object3D): Mesh[] {
  const olhos: Mesh[] = []
  cena.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh && /-olhos(_\d+)?$/.test(o.name) && m.morphTargetDictionary) olhos.push(m)
  })
  return olhos
}

/** Piscar: fecha por um instante a cada tanto, com um pouco de acaso para não ficar mecânico. */
export const PISCAR = { aCada: 3.4, acaso: 2.2, dura: 0.14 } as const

/**
 * Os olhos num instante: piscando de vez em quando, ou fechadinhos de feliz. `proxima` guarda
 * quando começa a próxima piscada (o chamador mantém o valor entre os quadros).
 */
export function olhosNoInstante(
  olhos: readonly Mesh[],
  agora: number,
  proxima: { current: number },
  feliz: boolean,
): void {
  if (olhos.length === 0) return
  if (agora > proxima.current + PISCAR.dura) {
    proxima.current = agora + PISCAR.aCada + Math.random() * PISCAR.acaso
  }
  const piscando = agora >= proxima.current && agora < proxima.current + PISCAR.dura
  for (const olho of olhos) {
    const morfos = olho.morphTargetInfluences
    const dic = olho.morphTargetDictionary
    if (!morfos || !dic) continue
    const iPiscar = dic.piscar
    const iFeliz = dic.feliz
    if (iPiscar !== undefined) morfos[iPiscar] = piscando && !feliz ? 1 : 0
    if (iFeliz !== undefined) morfos[iFeliz] = feliz ? 1 : 0
  }
}
