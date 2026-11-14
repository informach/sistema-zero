import { useFrame } from '@react-three/fiber'
import type { Fantasma } from '@sistemazero/arquipelago-contracts'
import { avatarDoPack } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { PackAvatarRig, PackRigBoundary } from '@sistemazero/avatar-quarto/avatar/pack-rig'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { type AnimationAction, type Group, MeshBasicMaterial, Vector3 } from 'three'
import { useStore } from 'zustand'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosFantasmas } from '../estado/fantasmas'
import { nomeNoJogo, useClipesDoJogo } from '../personagem/avatar-do-jogo'
import { CORPO } from '../sistemas/corpo'
import { amostrarFantasma } from '../sistemas/fantasma'
import { ciclosPorSegundo } from '../sistemas/locomocao'

/** O fantasma é o boneco de partida do pack (o avatar de quem correu fica para o salvamento). */
const SLOTS_DO_FANTASMA = avatarDoPack(null)
const CORRER = nomeNoJogo('correr_frente')
/** As pernas do fantasma giram no ritmo de quem corre no mundo (ciclos por segundo). */
const RITMO_DO_FANTASMA = ciclosPorSegundo(CORPO.correr)

/** Referência visual sem corpo do Rapier, colisão, luz, sombra ou item de outro perfil. */
export function FantasmaFamiliar() {
  const { loja, plataforma, fila } = useJogo()
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  const ref = useStore(fantasmas.estado, (s) => s.referencia)
  const percurso = useEstado((s) => s.corrida?.percurso ?? null)
  return ref && percurso === ref.fantasma.percurso ? (
    <PackRigBoundary>
      <Suspense fallback={null}>
        <Silhueta key={ref.perfilId + ref.fantasma.percurso} referencia={ref} />
      </Suspense>
    </PackRigBoundary>
  ) : null
}

function Silhueta({ referencia }: { referencia: { fantasma: Fantasma } }) {
  const { loja, movimento } = useJogo()
  const grupo = useRef<Group>(null),
    rig = useRef<Group>(null)
  const correr = useRef<AnimationAction | null>(null)
  const pose = useRef({ x: 0, y: 0, z: 0, giro: 0 }).current
  const clipes = useClipesDoJogo()
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
    for (const [nome, acao] of Object.entries(todas)) {
      if (!acao) continue
      acao.setEffectiveWeight(nome === CORRER ? 1 : 0)
      acao.setEffectiveTimeScale(0)
      acao.play()
    }
    correr.current = todas[CORRER] ?? null
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
    // O pé no chão como o do personagem: o controlador deixa a folga embaixo da cápsula.
    g.position.set(pose.x, pose.y - CORPO.doCentroAoPe - CORPO.folga, pose.z)
    g.rotation.y = pose.giro
    // O relógio da corrida move as pernas: a pausa (que para a corrida) congela o fantasma.
    const acao = correr.current
    if (acao) {
      const d = acao.getClip().duration
      acao.time = (((c.tempoMs / 1000) * RITMO_DO_FANTASMA) % 1) * d
    }
  })
  return (
    <group ref={grupo} name="fantasma-familiar" visible={false}>
      <group scale={CORPO.medidas.scale}>
        <PackAvatarRig
          slots={SLOTS_DO_FANTASMA}
          charRef={rig}
          onStood={preparar}
          extraClips={clipes}
          onAnimations={animar}
          materialOverride={material}
        />
      </group>
    </group>
  )
}
