import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AvatarRig } from '@sistemazero/avatar-quarto/avatar/avatar-rig'
import { DEFAULT_AVATAR_SLOTS } from '@sistemazero/avatar-quarto/avatar/catalog'
import { type RefObject, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { type AnimationAction, type Group, LoopOnce, LoopRepeat, Vector3 } from 'three'
import locomocaoGlb from '../assets/avatar/locomocao.glb'
import { useEstado } from '../estado/contexto'
import {
  CLIPES,
  type Clipe,
  criarLocomocao,
  type EntradaDaLocomocao,
  passoDaLocomocao,
} from '../sistemas/locomocao'

const LOCOMOCAO_URL = new URL(locomocaoGlb, import.meta.url).href
/** Clipes tocados uma vez só (o tempo é o da regra; não voltam ao começo sozinhos). */
const UMA_VEZ: readonly Clipe[] = ['Pulo', 'Aterrissagem']

/**
 * O avatar da plataforma, o mesmo `AvatarRig` do Meu avatar, com as animações de movimento do
 * jogo. O rig põe os pés no chão medindo o corpo em coordenadas de MUNDO e subtraindo da posição
 * LOCAL (feito para o pódio na origem). Aqui o avatar anda pelo mundo, então refazemos a conta no
 * espaço do pai quando ele fica em pé.
 *
 * As animações: `sistemas/locomocao.ts` decide o peso e o tempo de cada clipe a cada quadro e aqui
 * isso é aplicado às ações do mixer (o tempo de cada ação é posto à mão: o mixer não avança).
 */
export function AvatarDoJogo({ movimento }: { movimento: RefObject<EntradaDaLocomocao> }) {
  const slotsDoJogo = useEstado((s) => s.avatar.slots)
  const slots = useMemo(() => ({ ...DEFAULT_AVATAR_SLOTS, ...slotsDoJogo }), [slotsDoJogo])
  const personagem = useRef<Group>(null)
  const [emPe, setEmPe] = useState(false)
  const acoes = useRef<Partial<Record<Clipe, AnimationAction>>>({})
  const locomocao = useRef(criarLocomocao())

  const aoFicarEmPe = () => {
    const g = personagem.current
    if (g?.parent) {
      // O rig deixou position = -(centro x, pé y, centro z) medidos no MUNDO.
      const noMundo = new Vector3(-g.position.x, -g.position.y, -g.position.z)
      g.parent.updateWorldMatrix(true, false)
      const noPai = g.parent.worldToLocal(noMundo)
      g.position.set(-noPai.x, -noPai.y, -noPai.z)
    }
    setEmPe(true)
  }

  const aoAnimar = useCallback((todas: Record<string, AnimationAction | null>) => {
    const prontas: Partial<Record<Clipe, AnimationAction>> = {}
    for (const nome of CLIPES) {
      const acao = todas[nome]
      if (!acao) continue
      acao.setLoop(UMA_VEZ.includes(nome) ? LoopOnce : LoopRepeat, Infinity)
      acao.clampWhenFinished = true
      acao.setEffectiveTimeScale(0)
      acao.setEffectiveWeight(nome === 'Idle' ? 1 : 0)
      acao.play()
      prontas[nome] = acao
    }
    acoes.current = prontas
  }, [])

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const l = passoDaLocomocao(locomocao.current, movimento.current, dt)
    const idle = acoes.current.Idle
    for (const nome of CLIPES) {
      const acao = acoes.current[nome]
      if (!acao) continue
      acao.setEffectiveWeight(l.pesos[nome])
      // O "Idle" (a pose parada da plataforma) corre no tempo dele; os outros seguem a regra.
      if (acao !== idle) acao.time = l.tempos[nome] * acao.getClip().duration
    }
    if (idle) idle.time = (idle.time + dt) % idle.getClip().duration
  })

  return (
    <group visible={emPe}>
      <Suspense fallback={null}>
        <AvatarComClipes
          slots={slots}
          charRef={personagem}
          onStood={aoFicarEmPe}
          onAnimations={aoAnimar}
        />
      </Suspense>
    </group>
  )
}

/** Lê o arquivo dos clipes dentro do Suspense (o jogo segue enquanto ele chega). */
function AvatarComClipes(props: Omit<Parameters<typeof AvatarRig>[0], 'extraClips'>) {
  const clipes = useGLTF(LOCOMOCAO_URL, false, false).animations
  return <AvatarRig {...props} extraClips={clipes} />
}

useGLTF.preload(LOCOMOCAO_URL, false, false)
