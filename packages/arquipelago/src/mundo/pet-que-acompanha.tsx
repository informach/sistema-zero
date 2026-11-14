import { useFrame } from '@react-three/fiber'
import {
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
} from '@react-three/rapier'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { MoradaPetView } from '@sistemazero/avatar-quarto/morada/pet'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { casaMoradaStore } from '../estado/morada'
import { quemAcompanha } from '../sistemas/companhia'
import { CORPO } from '../sistemas/corpo'
import { BICHO_QUE_SEGURA, capsulaDoEspaco, pedidoNoChao } from '../sistemas/espaco-dos-bichos'
import { jogoPausado } from '../sistemas/pausa'
import {
  animacaoDoPetPausada,
  criarPetMorada,
  passoDoPetMorada,
  petDaMorada,
} from '../sistemas/pet-morada'
import { atrasDela } from '../sistemas/seguir'
import { suavizarAngulo } from '../sistemas/zappy'
import { ColisorDoEspaco } from './espaco-dos-bichos'

/** O mesmo pet Morada da plataforma acompanha a criança, sem espécies ou modelos antigos. */
export function PetQueAcompanha() {
  const { loja, plataforma } = useJogo()
  const source = casaMoradaStore(loja, plataforma)
  const pet = useEstado((s) => petDaMorada(s.quarto))
  const save = useEstado((s) => s.salvamento)
  useEffect(() => {
    if (source.getState().status === 'idle') void source.getState().load()
  }, [source])
  if (!pet || MORADA_CATALOG.pieces[pet]?.kind !== 'pet' || quemAcompanha(save, pet) !== 'quarto')
    return null
  return <Pet key={pet} pieceId={pet} />
}
function Pet({ pieceId }: { pieceId: string }) {
  const { loja, rastro, movimento, controle } = useJogo()
  const { world, rapier } = useRapier()
  const deviceReducedMotion = useReducedMotion()
  const reducedMotion = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const piece = MORADA_CATALOG.pieces[pieceId]!
  const space = useMemo(
    () => ({
      raio: Math.max(piece.size[0] / 2, piece.size[2] * 0.3),
      altura: Math.max(piece.size[1], 0.75),
    }),
    [piece],
  )
  const cap = capsulaDoEspaco(space)
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const initial = useMemo(
    () => ({ ...atrasDela(rastro), y: rastro.y - CORPO.doCentroAoPe }),
    [rastro],
  )
  const state = useRef(criarPetMorada(initial))
  const born = useRef(false)
  const requested = useRef({ x: 0, z: 0 })
  const shape = useMemo(
    () => new rapier.Capsule(cap.meiaAltura, cap.raio),
    [rapier, cap.meiaAltura, cap.raio],
  )
  const [animation, setAnimation] = useState<string | undefined>()
  const [paused, setPaused] = useState(() =>
    animacaoDoPetPausada(jogoPausado(loja.getState()), 0, deviceReducedMotion, reducedMotion),
  )
  useBeforePhysicsStep(() => {
    const dt = 1 / 60
    const stopped = jogoPausado(loja.getState())
    if (stopped) return
    const foot = rastro.y - CORPO.doCentroAoPe - CORPO.folga
    if (!born.current) {
      born.current = true
      state.current.position = { ...atrasDela(rastro), y: foot }
    }
    pedidoNoChao(controle.eixoX, controle.eixoZ, rastro.giro, requested.current)
    passoDoPetMorada(state.current, {
      child: { x: rastro.x, z: rastro.z, pe: foot, direcao: rastro.direcao },
      pedido: requested.current,
      radius: cap.raio,
      dt,
      paused: false,
      waiting: movimento.modo !== 'chao' || loja.getState().nadando,
      grounded: movimento.noChao,
      livre: (x, z) =>
        world.intersectionWithShape(
          { x, y: state.current.position.y + cap.y + 0.03, z },
          { x: 0, y: 0, z: 0, w: 1 },
          shape,
          rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        ) === null,
    })
    const position = state.current.position
    body.current?.setNextKinematicTranslation({
      x: position.x,
      y: position.y + cap.y,
      z: position.z,
    })
  })
  useFrame((_, dt) => {
    const stopped = jogoPausado(loja.getState())
    const speed = Math.hypot(state.current.vx, state.current.vz)
    const freeze = animacaoDoPetPausada(stopped, speed, deviceReducedMotion, reducedMotion)
    setPaused((before) => (before === freeze ? before : freeze))
    const match = speed > 2 ? /correr|run/i : speed > 0.15 ? /andar|walk/i : /parado|idle/i
    const next = piece.animations.find((a) => match.test(a.id))?.id
    if (!stopped) setAnimation((before) => (before === next ? before : next))
    if (visual.current && speed > 0.15 && !stopped)
      visual.current.rotation.y = suavizarAngulo(
        visual.current.rotation.y,
        Math.atan2(state.current.vx, state.current.vz),
        10,
        Math.min(dt, 0.1),
      )
  })
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      userData={BICHO_QUE_SEGURA}
      position={[initial.x, initial.y + cap.y, initial.z]}
      enabledRotations={[false, false, false]}
    >
      <ColisorDoEspaco espaco={space} pe={-cap.y} />
      <group ref={visual} position={[0, -cap.y, 0]}>
        <Suspense fallback={null}>
          <MoradaPetView pieceId={pieceId} paused={paused} animation={animation} />
        </Suspense>
      </group>
    </RigidBody>
  )
}
