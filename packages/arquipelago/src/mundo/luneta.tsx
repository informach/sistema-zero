import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import lunetaGlb from '../assets/itens/luneta.glb'
import bentoGlb from '../assets/personagens/bento.glb'
import capiGlb from '../assets/personagens/capi.glb'
import flocoGlb from '../assets/personagens/floco.glb'
import irieGlb from '../assets/personagens/irie.glb'
import jadeGlb from '../assets/personagens/jade.glb'
import mareGlb from '../assets/personagens/mare.glb'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { useVoz } from '../interface/voz'
import {
  deveAcenar,
  ilhaDaLuneta,
  type MoradorDaLuneta,
  moradorDaLuneta,
  PAINEL_DA_LUNETA,
  passoDaPrevia,
} from '../sistemas/luneta'
import { duracaoDoClipe, trocarClipe, useCopiaAnimada } from './animado'
import { Colisores } from './colisores'
import { useInterativo } from './interativos'
import { alvoDaLuneta, COLISOR_DA_LUNETA, LUNETA } from './luneta-medidas'
import { ComReserva, useModelo } from './modelos'

const URL_DA_LUNETA = new URL(lunetaGlb, import.meta.url).href
const URL_DO_MORADOR: Readonly<Record<MoradorDaLuneta, string>> = {
  capi: new URL(capiGlb, import.meta.url).href,
  bento: new URL(bentoGlb, import.meta.url).href,
  mare: new URL(mareGlb, import.meta.url).href,
  floco: new URL(flocoGlb, import.meta.url).href,
  jade: new URL(jadeGlb, import.meta.url).href,
  irie: new URL(irieGlb, import.meta.url).href,
}
const ACENA_UMA_VEZ = ['acenar'] as const

export function LunetaDoPier() {
  return (
    <ComReserva reserva={null}>
      <LunetaCarregada />
    </ComReserva>
  )
}

function LunetaCarregada() {
  const { loja, rastro } = useJogo()
  const voz = useVoz()
  const jornada = useEstado((s) => s.jornada)
  const aberta = useEstado((s) => s.painelAberto === PAINEL_DA_LUNETA)
  const ilha = ilhaDaLuneta(jornada)
  const raiz = useModelo(URL_DA_LUNETA)
  const modelo = useMemo(() => raiz.clone(true), [raiz])
  const alvo = useMemo(() => alvoDaLuneta(ilha), [ilha])
  useEffect(() => {
    const tubo = modelo.getObjectByName('tubo')
    if (tubo) {
      const dx = alvo.x - LUNETA.x
      const dz = alvo.z - LUNETA.z
      const inclinacao = Math.atan2(alvo.y - LUNETA.y - tubo.position.y, Math.hypot(dx, dz))
      // A geometria do tubo já sai do Blender inclinada 18 graus para cima.
      tubo.rotation.set(Math.PI / 10 - inclinacao, Math.atan2(dx, dz), 0, 'YXZ')
    }
  }, [modelo, alvo])
  useInterativo('luneta', {
    x: LUNETA.x,
    z: LUNETA.z,
    raio: LUNETA.alcance,
    rotulo: () =>
      !loja.getState().nadando && Math.abs(rastro.y - LUNETA.y - 0.9) < 1.3
        ? 'Olhar pela luneta'
        : null,
    agir: () => {
      loja.getState().dizer(voz.falaDaLuneta(ilha))
      loja.getState().abrirPainel(PAINEL_DA_LUNETA)
    },
  })
  useEffect(
    () => () => {
      if (loja.getState().painelAberto === PAINEL_DA_LUNETA) loja.getState().abrirPainel(null)
    },
    [loja],
  )
  return (
    <>
      <group name="luneta-do-pier" position={[LUNETA.x, LUNETA.y, LUNETA.z]}>
        <primitive object={modelo} />
        <Colisores lista={COLISOR_DA_LUNETA} />
      </group>
      {aberta && ilha.id !== 'farol' && (
        <SinaisNaIlha key={ilha.id} alvo={alvo} morador={moradorDaLuneta(ilha)} />
      )}
    </>
  )
}

/**
 * A prévia da ilha vista: o morador acenando, um bicho correndo e um segredo brilhando (a
 * proposta). Não usa o carregador de ilhas completas: só o modelo do morador e duas formas leves.
 */
function SinaisNaIlha({
  alvo,
  morador,
}: {
  alvo: { x: number; y: number; z: number }
  morador: MoradorDaLuneta | null
}) {
  const { loja } = useJogo()
  const aparelho = useReducedMotion()
  const conforto = lojaDoConforto(loja)
  const preferencia = useConforto(conforto, (s) => s.conforto.menosMovimento)
  const menos = aparelho || preferencia
  const vulto = useRef<Group>(null)
  const brilho = useRef<Mesh>(null)
  const tempo = useRef(0)
  const passo = useRef({ x: 0, brilho: 1 })
  const giro = Math.atan2(LUNETA.x - alvo.x, LUNETA.z - alvo.z)
  useFrame((_, dt) => {
    tempo.current += dt
    passoDaPrevia(tempo.current, menos, passo.current)
    if (vulto.current) vulto.current.position.x = passo.current.x
    brilho.current?.scale.setScalar(passo.current.brilho)
  })
  return (
    <group name="sinais-da-luneta" position={[alvo.x, alvo.y - 2, alvo.z]} rotation={[0, giro, 0]}>
      <group position={[0, 0, 8]}>
        <group ref={vulto}>
          <mesh position={[0, 0.55, 0]} scale={[1, 0.65, 0.55]}>
            <icosahedronGeometry args={[0.65, 1]} />
            <meshStandardMaterial color="#66677a" />
          </mesh>
          <mesh position={[0.5, 0.85, 0]}>
            <icosahedronGeometry args={[0.35, 1]} />
            <meshStandardMaterial color="#77788a" />
          </mesh>
          <mesh position={[0.48, 1.15, 0]}>
            <coneGeometry args={[0.15, 0.4, 5]} />
            <meshStandardMaterial color="#66677a" />
          </mesh>
        </group>
        <mesh ref={brilho} position={[-3.5, 1.1, 0]}>
          <octahedronGeometry args={[0.4]} />
          <meshBasicMaterial color="#ffe891" toneMapped={false} />
        </mesh>
        {morador && (
          <ComReserva reserva={null}>
            <MoradorAcenando morador={morador} menos={menos} />
          </ComReserva>
        )}
      </group>
    </group>
  )
}

/** O morador da ilha, de frente para a luneta, acenando de tempos em tempos. */
function MoradorAcenando({ morador, menos }: { morador: MoradorDaLuneta; menos: boolean }) {
  const raiz = useRef<Group>(null)
  const { cena, actions, mixer } = useCopiaAnimada(URL_DO_MORADOR[morador], raiz, ACENA_UMA_VEZ)
  const tempo = useRef(0)
  const ultimo = useRef(-Infinity)
  const acenando = useRef(false)
  useEffect(() => {
    trocarClipe(actions, null, 'parado', 0, `luneta-${morador}`)
  }, [actions, morador])
  useFrame((_, dt) => {
    tempo.current += dt
    const duracao = duracaoDoClipe(actions, mixer, 'acenar')
    if (acenando.current && tempo.current - ultimo.current >= duracao) {
      acenando.current = false
      trocarClipe(actions, 'acenar', 'parado', 0.25, `luneta-${morador}`)
    } else if (!acenando.current && deveAcenar(tempo.current, ultimo.current, duracao, menos)) {
      ultimo.current = tempo.current
      acenando.current = true
      trocarClipe(actions, 'parado', 'acenar', 0.2, `luneta-${morador}`)
    }
  })
  return (
    <group ref={raiz} position={[2.4, 0, 0]}>
      <primitive object={cena} />
    </group>
  )
}
