import { useFrame } from '@react-three/fiber'
import { CapsuleCollider } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { useEstado } from '../estado/contexto'
import { alturaDoVoo, capsulaDoPinguim, type Voador } from '../sistemas/ajustes-da-arte'
import { jogoPausado } from '../sistemas/pausa'
import { trocarClipe, useCopiaAnimada } from './animado'
import { animarBocas } from './arte-animada'

const SEM_EXTRAS: readonly string[] = []

/** Peça animada numa âncora. O mixer nunca escreve a posição/giro desse grupo externo. */
export function PecaDaArte({
  id,
  url,
  clipe,
  posicao = [0, 0, 0],
  giro = 0,
  escala = 1,
  fala,
  voo,
  umaVez = SEM_EXTRAS,
}: {
  id: string
  url: string
  clipe: string
  posicao?: [number, number, number]
  giro?: number
  escala?: number
  fala?: { id: string; texto: string }
  voo?: { tipo: Voador; topoDosObstaculos: number }
  umaVez?: readonly string[]
}) {
  const raiz = useRef<Group>(null)
  const pausado = useEstado(jogoPausado)
  const { cena, actions, mixer } = useCopiaAnimada(url, raiz, umaVez, pausado)
  const anterior = useRef<string | null>(null)
  const tempoDaFala = useRef(0)
  const falaEmCurso = useRef<{ id: string; texto: string } | undefined>(undefined)
  const bocas = useMemo(() => {
    const lista: Mesh[] = []
    cena.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh && m.name.startsWith('iris-cabeca') && m.morphTargetDictionary) lista.push(m)
    })
    return lista
  }, [cena])
  useEffect(() => {
    trocarClipe(actions, anterior.current, clipe, 0.2, id)
    anterior.current = clipe
  }, [actions, clipe, id])
  useFrame((_, dt) => {
    if (falaEmCurso.current?.id !== fala?.id || falaEmCurso.current?.texto !== fala?.texto) {
      falaEmCurso.current = fala
      tempoDaFala.current = 0
    }
    if (!pausado) tempoDaFala.current += Math.min(dt, 0.1) * mixer.timeScale
    animarBocas(bocas, fala?.texto ?? '', tempoDaFala.current)
  })
  const y =
    voo && clipe === 'voar' ? alturaDoVoo(voo.tipo, posicao[1], voo.topoDosObstaculos) : posicao[1]
  return (
    <group name={`arte-${id}`} position={[posicao[0], y, posicao[2]]} rotation={[0, giro, 0]}>
      <group ref={raiz} scale={escala} dispose={null}>
        <primitive object={cena} />
      </group>
    </group>
  )
}

/** Dentro do RigidBody do pinguim, em metros e fora da escala do desenho. */
export function CapsulaDoPinguim({
  deslizando,
  filhote = false,
}: {
  deslizando: boolean
  filhote?: boolean
}) {
  const c = capsulaDoPinguim(deslizando, filhote)
  return (
    <CapsuleCollider
      args={[c.meiaAltura, c.raio]}
      position={[0, c.y, c.z]}
      rotation={[c.giroX, 0, 0]}
    />
  )
}
