import { useFrame } from '@react-three/fiber'
import {
  CapsuleCollider,
  type RapierCollider,
  type RapierRigidBody,
  RigidBody,
  useRapier,
} from '@react-three/rapier'
import type { BichoAdotado as Adotado, BichoDoBosque } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import cachorroGlb from '../assets/bichos/cachorro.glb'
import coelhoGlb from '../assets/bichos/coelho.glb'
import gatoGlb from '../assets/bichos/gato.glb'
import porquinhoGlb from '../assets/bichos/porquinho.glb'
import { lojaDoBicho, PAINEL_DO_BICHO } from '../estado/bicho'
import { useEstado, useJogo } from '../estado/contexto'
import { jogoPausado } from '../sistemas/pausa'
import { atrasDela, criarSeguir, passoDoSeguir } from '../sistemas/seguir'
import { suavizarAngulo } from '../sistemas/zappy'
import { duracaoDoClipe, olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { ESCALA_DOS_BICHOS, URL_DO_FILHOTE } from './bichos-do-bosque'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'

const URL_DO_ADULTO: Readonly<Record<BichoDoBosque, string>> = {
  cachorro: new URL(cachorroGlb, import.meta.url).href,
  gato: new URL(gatoGlb, import.meta.url).href,
  coelho: new URL(coelhoGlb, import.meta.url).href,
  porquinho: new URL(porquinhoGlb, import.meta.url).href,
}

/** O corpo do bicho para o controlador: uma cápsula baixa, do tamanho de um filhote no jogo. */
const CORPO = { raio: 0.25, meiaAltura: 0.15 } as const
const DO_CENTRO_AO_PE = CORPO.raio + CORPO.meiaAltura
/** A folga do controlador do Rapier (a mesma ideia da do personagem). */
const FOLGA = 0.02
const GRAVIDADE = 24
/** De que distância aparece "Cuidar de...". */
const ALCANCE_DE_CUIDAR = 1.9
const UMA_VEZ: readonly string[] = ['feliz', 'truque']

/**
 * O bicho adotado: segue a criança pela ilha central e pelo Bosque (`sistemas/seguir.ts`), com um
 * controlador de personagem do Rapier próprio (sobe degrau baixo, desce rampa, para na parede). Não
 * segue no cipó, no tronco nem na água: espera e alcança depois. Perto dele, "Cuidar de" abre o
 * painel (`interface/bicho.tsx`). Troca de modelo quando cresce.
 */
export function BichoAdotado() {
  const adotado = useEstado((s) => s.salvamento.bichos.adotado)
  if (!adotado) return null
  return (
    <ComReserva reserva={null}>
      <CorpoDoBicho key={`${adotado.id}-${adotado.fase}`} adotado={adotado} />
    </ComReserva>
  )
}

function CorpoDoBicho({ adotado }: { adotado: Adotado }) {
  const { loja, rastro, movimento } = useJogo()
  const { world, rapier } = useRapier()
  const corpo = useRef<RapierRigidBody>(null)
  const colisor = useRef<RapierCollider>(null)
  const visual = useRef<Group>(null)
  const raiz = useRef<Group>(null)
  const url = adotado.fase === 'adulto' ? URL_DO_ADULTO[adotado.id] : URL_DO_FILHOTE[adotado.id]
  const { cena, actions, mixer, olhos } = useCopiaAnimada(url, raiz, UMA_VEZ)
  const bicho = lojaDoBicho(loja)
  const nome = adotado.nome

  // Onde ele nasce: dois passos atrás da criança (depois disso quem anda é a física).
  const [inicial] = useState(() => {
    const p = atrasDela(rastro)
    return { x: p.x, y: rastro.y, z: p.z }
  })
  const pos = useRef({ ...inicial })
  const seguir = useRef(criarSeguir())
  const velY = useRef(0)
  const olhar = useRef(rastro.direcao)
  const desloc = useRef({ x: 0, y: 0, z: 0 })
  const tocando = useRef<string | null>(null)
  const reacaoAte = useRef(0)
  const reacaoVista = useRef(bicho.getState().reacao.n)
  const piscarEm = useRef<number>(PISCAR.aCada)
  const relogio = useRef(0)

  const kcc = useMemo(() => {
    const c = world.createCharacterController(FOLGA)
    c.enableAutostep(0.3, 0.2, true)
    c.enableSnapToGround(0.3)
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180)
    c.setApplyImpulsesToDynamicBodies(false)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(kcc), [world, kcc])

  useInterativo('bicho-adotado', {
    get x() {
      return pos.current.x
    },
    get z() {
      return pos.current.z
    },
    raio: ALCANCE_DE_CUIDAR,
    rotulo: () => `Cuidar de ${nome}`,
    agir: () => {
      bicho.getState().abrir()
      loja.getState().abrirPainel(PAINEL_DO_BICHO)
    },
  })

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    relogio.current += dt
    const agora = relogio.current
    const b = corpo.current
    const col = colisor.current
    const s = loja.getState()
    if (!b || !col) return
    const cuidando = s.painelAberto === PAINEL_DO_BICHO

    // Para onde ir: atrás da criança; parado se o jogo está parado (menu, painel, ferramenta).
    const espera = movimento.modo !== 'chao' || s.nadando || jogoPausado(s)
    const passo = passoDoSeguir(seguir.current, pos.current, rastro, espera || cuidando, dt)
    if (passo.reaparecer) {
      const p = atrasDela(rastro)
      pos.current = { x: p.x, y: rastro.y, z: p.z }
      velY.current = 0
      b.setTranslation(pos.current, true)
    } else if (!jogoPausado(s)) {
      velY.current = Math.max(-20, velY.current - GRAVIDADE * dt)
      desloc.current.x = seguir.current.vx * dt
      desloc.current.y = velY.current * dt
      desloc.current.z = seguir.current.vz * dt
      kcc.computeColliderMovement(
        col,
        desloc.current,
        rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      )
      const mov = kcc.computedMovement()
      if (kcc.computedGrounded()) velY.current = 0
      const p = b.translation()
      pos.current.x = p.x + mov.x
      pos.current.y = p.y + mov.y
      pos.current.z = p.z + mov.z
      b.setNextKinematicTranslation(pos.current)
    }

    // Para onde olhar: para onde anda; parado, para a criança (cuidando, sempre para ela).
    const andando = Math.hypot(seguir.current.vx, seguir.current.vz) > 0.15
    const alvo =
      andando && !cuidando
        ? Math.atan2(seguir.current.vx, seguir.current.vz)
        : Math.atan2(rastro.x - pos.current.x, rastro.z - pos.current.z)
    olhar.current = suavizarAngulo(olhar.current, alvo, 8, dt)
    if (visual.current) visual.current.rotation.y = olhar.current

    // O clipe: a reação do cuidado (feliz, truque) passa na frente do andar.
    const r = bicho.getState().reacao
    let quer: string = passo.clipe
    if (r.n !== reacaoVista.current) {
      reacaoVista.current = r.n
      reacaoAte.current = agora + duracaoDoClipe(actions, mixer, r.tipo)
      trocarClipe(actions, tocando.current, r.tipo)
      tocando.current = r.tipo
    }
    if (agora < reacaoAte.current && tocando.current) quer = tocando.current
    else if (cuidando && quer === 'sentar') quer = 'parado'
    if (quer !== tocando.current) {
      trocarClipe(actions, tocando.current, quer)
      tocando.current = quer
    }
    olhosNoInstante(olhos, agora, piscarEm, quer === 'feliz')
  })

  return (
    <RigidBody
      ref={corpo}
      type="kinematicPosition"
      colliders={false}
      position={[inicial.x, inicial.y, inicial.z]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider ref={colisor} args={[CORPO.meiaAltura, CORPO.raio]} />
      <group ref={visual} position={[0, -DO_CENTRO_AO_PE - FOLGA, 0]}>
        <group ref={raiz} scale={ESCALA_DOS_BICHOS}>
          <primitive object={cena} />
        </group>
      </group>
    </RigidBody>
  )
}
