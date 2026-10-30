import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Object3D } from 'three'
import { lojaDoConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import type { Ponto } from '../sistemas/cipo'
import { jogoPausado } from '../sistemas/pausa'
import { CORRENTE_DO_PICO, type CorrenteDeAr } from '../sistemas/planador'
import { paraOMundo } from './bosque'

/** Os flocos que mostram o vento subindo: quantos e quanto tempo cada um leva da base ao topo. */
const FLOCOS = 18
const SUBIDA_DO_FLOCO = 2.6

/** A corrente do Pico a partir da âncora `corrente-de-ar` (no chão), no mundo; nula sem ela. */
export function correnteDoPico(modelo: Object3D, meio: Ponto, giro: number): CorrenteDeAr | null {
  const no = modelo.getObjectByName('corrente-de-ar')
  if (!no) return null
  const p = paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 })
  return {
    id: 'pico:corrente',
    x: p.x,
    z: p.z,
    raio: CORRENTE_DO_PICO.raio,
    base: p.y,
    topo: p.y + CORRENTE_DO_PICO.altura,
  }
}

/**
 * O vento que sobe na frente da parede de gelo do Pico (fase3-09): registra a corrente em
 * `movimento.correntes` enquanto a ilha está ativa (o planador sobe nela) e desenha flocos de neve
 * subindo em espiral, para a criança ver onde ele está. Os flocos param com o jogo pausado; com
 * menos movimento, ficam parados no ar.
 */
export function CorrenteDoPico({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const corrente = useMemo(() => correnteDoPico(modelo, meio, giro), [modelo, meio, giro])
  return <VentoQueSobe corrente={corrente} cor="#eef8ff" />
}

/**
 * Qualquer vento que sobe (o do Pico e os dos segredos, N12): registra a corrente enquanto está
 * montado e desenha os flocos na cor dada.
 */
export function VentoQueSobe({ corrente, cor }: { corrente: CorrenteDeAr | null; cor: string }) {
  const { movimento, loja } = useJogo()
  useEffect(() => {
    if (!corrente) return
    movimento.correntes.push(corrente)
    return () => {
      const i = movimento.correntes.indexOf(corrente)
      if (i >= 0) movimento.correntes.splice(i, 1)
    }
  }, [movimento, corrente])

  const aparelhoPedeMenos = useReducedMotion()
  const flocos = useRef<(Group | null)[]>([])
  const tempo = useRef(0)
  useFrame((_, dt) => {
    if (!corrente) return
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!jogoPausado(s) && !menos) tempo.current += Math.min(dt, 0.1)
    const altura = corrente.topo - corrente.base
    for (let k = 0; k < FLOCOS; k++) {
      const f = flocos.current[k]
      if (!f) continue
      const t = (tempo.current / SUBIDA_DO_FLOCO + k / FLOCOS) % 1
      const a = (k / FLOCOS) * Math.PI * 6 + t * Math.PI * 2
      const r = corrente.raio * (0.35 + (0.5 * ((k * 7) % FLOCOS)) / FLOCOS)
      f.position.set(Math.cos(a) * r, 0.2 + t * altura, Math.sin(a) * r)
      f.scale.setScalar(Math.sin(Math.PI * t) * 0.8 + 0.2)
    }
  })
  if (!corrente) return null
  return (
    <group position={[corrente.x, corrente.base, corrente.z]} name={corrente.id}>
      {Array.from({ length: FLOCOS }, (_, k) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: os flocos são fixos, um por lugar na espiral
          key={k}
          ref={(g) => {
            flocos.current[k] = g
          }}
        >
          <mesh>
            <octahedronGeometry args={[0.07, 0]} />
            <meshBasicMaterial color={cor} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
