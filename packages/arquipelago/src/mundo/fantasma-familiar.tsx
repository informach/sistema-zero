import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Fantasma } from '@sistemazero/arquipelago-contracts'
import { AvatarRig } from '@sistemazero/avatar-quarto/avatar/avatar-rig'
import { DEFAULT_AVATAR_SLOTS } from '@sistemazero/avatar-quarto/avatar/catalog'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { type AnimationAction, type Group, MeshBasicMaterial, Vector3 } from 'three'
import { useStore } from 'zustand'
import locomocao from '../assets/avatar/locomocao.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosFantasmas } from '../estado/fantasmas'
import { CORPO } from '../sistemas/corpo'
import { amostrarFantasma } from '../sistemas/fantasma'

/** Referência visual sem corpo do Rapier, colisão, luz, sombra ou item de outro perfil. */
export function FantasmaFamiliar() {
  const { loja, plataforma, fila } = useJogo()
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  const ref = useStore(fantasmas.estado, (s) => s.referencia)
  const percurso = useEstado((s) => s.corrida?.percurso ?? null)
  return ref && percurso === ref.fantasma.percurso ? (
    <Suspense fallback={null}>
      <Silhueta key={ref.perfilId + ref.fantasma.percurso} referencia={ref} />
    </Suspense>
  ) : null
}

function Silhueta({ referencia }: { referencia: { fantasma: Fantasma } }) {
  const { loja, movimento } = useJogo()
  const grupo = useRef<Group>(null),
    rig = useRef<Group>(null)
  const acoes = useRef<Record<string, AnimationAction | null>>({})
  const pose = useRef({ x: 0, y: 0, z: 0, giro: 0 }).current
  const clipes = useGLTF(new URL(locomocao, import.meta.url).href, false, false)
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#a8e8ee',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  const animar = useCallback((todas: Record<string, AnimationAction | null>) => {
    acoes.current = todas
    for (const [nome, acao] of Object.entries(todas)) {
      if (!acao) continue
      acao.setEffectiveWeight(nome === 'Correr' ? 1 : 0)
      acao.setEffectiveTimeScale(0)
      acao.play()
    }
  }, [])
  const preparar = () => {
    const g = rig.current
    if (!g?.parent) return
    const noPai = new Vector3(-g.position.x, -g.position.y, -g.position.z)
    g.parent.updateWorldMatrix(true, false)
    g.parent.worldToLocal(noPai)
    g.position.set(-noPai.x, -noPai.y, -noPai.z)
  }
  useFrame(() => {
    const g = grupo.current
    if (!g) return
    const c = movimento.corrida
    g.visible = Boolean(
      c?.situacao === 'correndo' &&
        loja.getState().corrida?.percurso === referencia.fantasma.percurso &&
        c.tempoMs <= referencia.fantasma.tempoMs,
    )
    if (!g.visible || !c) return
    amostrarFantasma(referencia.fantasma, c.tempoMs, pose)
    g.position.set(pose.x, pose.y - CORPO.doCentroAoPe, pose.z)
    g.rotation.y = pose.giro
    const correr = acoes.current.Correr
    if (correr) correr.time = (c.tempoMs / 1000) % correr.getClip().duration
  })
  return (
    <group ref={grupo} name="fantasma-familiar" visible={false}>
      <AvatarRig
        slots={DEFAULT_AVATAR_SLOTS}
        charRef={rig}
        onStood={preparar}
        extraClips={clipes.animations}
        onAnimations={animar}
        materialOverride={material}
      />
    </group>
  )
}
