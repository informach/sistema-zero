import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AvatarRig } from '@sistemazero/avatar-quarto/avatar/avatar-rig'
import { DEFAULT_AVATAR_SLOTS } from '@sistemazero/avatar-quarto/avatar/catalog'
import { type RefObject, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { type AnimationAction, type Group, LoopOnce, LoopRepeat, Vector3 } from 'three'
import locomocaoGlb from '../assets/avatar/locomocao.glb'
import { useEstado } from '../estado/contexto'
import { ELEVACAO_DOS_PATINS } from '../sistemas/ajustes-da-arte'
import {
  CLIPES,
  type Clipe,
  criarLocomocao,
  type EntradaDaLocomocao,
  passoDaLocomocao,
} from '../sistemas/locomocao'
import { jogoPausado } from '../sistemas/pausa'
import { LanternaNaMao } from './lanterna-na-mao'
import { PatinsNosPes } from './patins-nos-pes'

const LOCOMOCAO_URL = new URL(locomocaoGlb, import.meta.url).href
/** Clipes tocados uma vez só (o tempo é o da regra; não voltam ao começo sozinhos). */
const UMA_VEZ: readonly Clipe[] = ['Pulo', 'Aterrissagem', 'SubirBorda']

/**
 * O avatar da plataforma, o mesmo `AvatarRig` do Meu avatar, com as animações de movimento do
 * jogo. O rig põe os pés no chão medindo o corpo em coordenadas de MUNDO e subtraindo da posição
 * LOCAL (feito para o pódio na origem). Aqui o avatar anda pelo mundo, então refazemos a conta no
 * espaço do pai quando ele fica em pé.
 *
 * As animações: `sistemas/locomocao.ts` decide o peso e o tempo de cada clipe a cada quadro e aqui
 * isso é aplicado às ações do mixer (o tempo de cada ação é posto à mão: o mixer não avança).
 */
export function AvatarDoJogo({
  movimento,
  depoisDaPose,
  comPatins = false,
  comLanterna = false,
}: {
  movimento: RefObject<EntradaDaLocomocao>
  /** Mexe nos ossos depois da pose de cada quadro (os braços para cima no cipó e no tronco). */
  depoisDaPose?: () => void
  /** Só o desenho sobe. Equipar patins não altera o corpo do Rapier do personagem. */
  comPatins?: boolean
  /** A lanterna acesa na mão direita (fase2-06). */
  comLanterna?: boolean
}) {
  const slotsDoJogo = useEstado((s) => s.avatar.slots)
  const pausado = useEstado(jogoPausado)
  const slots = useMemo(() => ({ ...DEFAULT_AVATAR_SLOTS, ...slotsDoJogo }), [slotsDoJogo])
  const personagem = useRef<Group>(null)
  const [emPe, setEmPe] = useState(false)
  const acoes = useRef<Partial<Record<Clipe, AnimationAction>>>({})
  const locomocao = useRef(criarLocomocao())
  const visualRef = useRef<Group>(null)

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
      acao.setEffectiveWeight(nome === 'Parado' ? 1 : 0)
      acao.play()
      prontas[nome] = acao
    }
    acoes.current = prontas
  }, [])

  useFrame((_, dtBruto) => {
    if (pausado) return
    const dt = Math.min(dtBruto, 0.1)
    const l = passoDaLocomocao(locomocao.current, movimento.current, dt)
    for (const nome of CLIPES) {
      const acao = acoes.current[nome]
      if (!acao) continue
      acao.setEffectiveWeight(l.pesos[nome])
      acao.time = l.tempos[nome] * acao.getClip().duration
    }
  })

  return (
    <group
      ref={visualRef}
      name="avatar-visual"
      visible={emPe}
      position={[0, comPatins ? ELEVACAO_DOS_PATINS : 0, 0]}
    >
      <Suspense fallback={null}>
        <AvatarComClipes
          slots={slots}
          charRef={personagem}
          onStood={aoFicarEmPe}
          onAnimations={aoAnimar}
        />
        {depoisDaPose ? <DepoisDaPose fazer={depoisDaPose} /> : null}
      </Suspense>
      {comPatins && emPe ? (
        <Suspense fallback={null}>
          <PatinsNosPes
            avatar={visualRef}
            personagem={personagem}
            calcado={slots.shoes?.asset ?? DEFAULT_AVATAR_SLOTS.shoes.asset}
          />
        </Suspense>
      ) : null}
      {comLanterna && emPe ? (
        <Suspense fallback={null}>
          <LanternaNaMao avatar={visualRef} personagem={personagem} />
        </Suspense>
      ) : null}
    </group>
  )
}

/**
 * Roda a cada quadro DEPOIS da pose: monta logo depois do avatar, dentro do mesmo `Suspense`, então
 * o `useFrame` dele entra depois do mixer (os braços no cipó mexem por cima das animações).
 */
function DepoisDaPose({ fazer }: { fazer: () => void }) {
  useFrame(fazer)
  return null
}

/** Lê o arquivo dos clipes dentro do Suspense (o jogo segue enquanto ele chega). */
function AvatarComClipes(props: Omit<Parameters<typeof AvatarRig>[0], 'extraClips'>) {
  const clipes = useGLTF(LOCOMOCAO_URL, false, false).animations
  return <AvatarRig {...props} extraClips={clipes} />
}

useGLTF.preload(LOCOMOCAO_URL, false, false)
