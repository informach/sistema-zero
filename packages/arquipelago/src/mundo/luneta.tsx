import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import coelhoGlb from '../assets/bichos/coelho.glb'
import ovelhinhaGlb from '../assets/bichos/ovelhinha.glb'
import passaroGlb from '../assets/bichos/passaro-das-nuvens.glb'
import pinguimGlb from '../assets/bichos/pinguim.glb'
import tartaruguinhaGlb from '../assets/bichos/tartaruguinha.glb'
import triceratopsGlb from '../assets/bichos/triceratops-filhote.glb'
import lunetaGlb from '../assets/itens/luneta.glb'
import brigadeiroDeLuzGlb from '../assets/lumis/brigadeiro-de-luz.glb'
import brotinhoDeLuzGlb from '../assets/lumis/brotinho-de-luz.glb'
import cristalDeLuzGlb from '../assets/lumis/cristal-de-luz.glb'
import ipeDeLuzGlb from '../assets/lumis/ipe-de-luz.glb'
import perolaDeLuzGlb from '../assets/lumis/perola-de-luz.glb'
import plumaDeLuzGlb from '../assets/lumis/pluma-de-luz.glb'
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
  type BICHO_DA_LUNETA,
  type BichoDaLuneta,
  bichoDaLuneta,
  deveAcenar,
  ilhaDaLuneta,
  type MoradorDaLuneta,
  moradorDaLuneta,
  PAINEL_DA_LUNETA,
  passoDaPrevia,
  type SEGREDO_DA_LUNETA,
  segredoDaLuneta,
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
const URL_DO_BICHO: Readonly<Record<BichoDaLuneta, string>> = {
  coelho: new URL(coelhoGlb, import.meta.url).href,
  ovelhinha: new URL(ovelhinhaGlb, import.meta.url).href,
  tartaruguinha: new URL(tartaruguinhaGlb, import.meta.url).href,
  pinguim: new URL(pinguimGlb, import.meta.url).href,
  'triceratops-filhote': new URL(triceratopsGlb, import.meta.url).href,
  'passaro-das-nuvens': new URL(passaroGlb, import.meta.url).href,
}
type Segredo = (typeof SEGREDO_DA_LUNETA)[keyof typeof SEGREDO_DA_LUNETA]
const URL_DO_SEGREDO: Readonly<Record<Segredo, string>> = {
  'ipe-de-luz': new URL(ipeDeLuzGlb, import.meta.url).href,
  'brigadeiro-de-luz': new URL(brigadeiroDeLuzGlb, import.meta.url).href,
  'perola-de-luz': new URL(perolaDeLuzGlb, import.meta.url).href,
  'cristal-de-luz': new URL(cristalDeLuzGlb, import.meta.url).href,
  'brotinho-de-luz': new URL(brotinhoDeLuzGlb, import.meta.url).href,
  'pluma-de-luz': new URL(plumaDeLuzGlb, import.meta.url).href,
}
/** O Lumi de luz da luneta, maior que o do jogo (ele é pequeno e fica longe). */
const ESCALA_DO_SEGREDO = 1.5
/** Quanto o caminho do bicho fica à frente do morador (para o lado da luneta). */
const FRENTE_DO_BICHO = 1.6
const NENHUM_CLIPE_UNICO = [] as const

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
        <SinaisNaIlha
          key={ilha.id}
          alvo={alvo}
          morador={moradorDaLuneta(ilha)}
          bicho={bichoDaLuneta(ilha)}
          segredo={segredoDaLuneta(ilha) as Segredo | null}
        />
      )}
    </>
  )
}

/**
 * A prévia da ilha vista: o morador acenando, um bicho da ilha correndo e o segredo brilhando (o
 * Lumi de luz da família, com um halo que pulsa), como a proposta pede. Não usa o carregador de
 * ilhas completas: só os modelos dos três, cada um com a sua reserva.
 */
function SinaisNaIlha({
  alvo,
  morador,
  bicho,
  segredo,
}: {
  alvo: { x: number; y: number; z: number }
  morador: MoradorDaLuneta | null
  bicho: (typeof BICHO_DA_LUNETA)[keyof typeof BICHO_DA_LUNETA] | null
  segredo: Segredo | null
}) {
  const { loja } = useJogo()
  const aparelho = useReducedMotion()
  const conforto = lojaDoConforto(loja)
  const preferencia = useConforto(conforto, (s) => s.conforto.menosMovimento)
  const menos = aparelho || preferencia
  const corredor = useRef<Group>(null)
  const brilho = useRef<Group>(null)
  const tempo = useRef(0)
  const passo = useRef({ x: 0, brilho: 1, rumo: 0 })
  const giro = Math.atan2(LUNETA.x - alvo.x, LUNETA.z - alvo.z)
  useFrame((_, dt) => {
    tempo.current += dt
    passoDaPrevia(tempo.current, menos, passo.current)
    if (corredor.current) {
      corredor.current.position.x = passo.current.x
      corredor.current.rotation.y = passo.current.rumo
    }
    brilho.current?.scale.setScalar(passo.current.brilho)
  })
  return (
    <group name="sinais-da-luneta" position={[alvo.x, alvo.y - 2, alvo.z]} rotation={[0, giro, 0]}>
      <group position={[0, 0, 8]}>
        {/* O bicho corre na frente do morador (mais perto da luneta), sem passar por ele. */}
        {bicho && (
          <group position={[0, 0, FRENTE_DO_BICHO]}>
            <group ref={corredor}>
              <ComReserva reserva={null}>
                <BichoCorrendo bicho={bicho} menos={menos} />
              </ComReserva>
            </group>
          </group>
        )}
        {segredo && (
          <group position={[-3.5, 0.6, 0]}>
            <group ref={brilho} position={[0, 0.5, 0]}>
              <mesh>
                <icosahedronGeometry args={[0.75, 2]} />
                <meshBasicMaterial
                  color="#ffe891"
                  transparent
                  opacity={0.28}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
            <ComReserva reserva={null}>
              <SegredoBrilhando segredo={segredo} />
            </ComReserva>
          </group>
        )}
        {morador && (
          <ComReserva reserva={null}>
            <MoradorAcenando morador={morador} menos={menos} />
          </ComReserva>
        )}
      </group>
    </group>
  )
}

/** O bicho da ilha correndo (ou parado, olhando para a luneta, com menos movimento). */
function BichoCorrendo({
  bicho,
  menos,
}: {
  bicho: (typeof BICHO_DA_LUNETA)[keyof typeof BICHO_DA_LUNETA]
  menos: boolean
}) {
  const raiz = useRef<Group>(null)
  const { cena, actions } = useCopiaAnimada(URL_DO_BICHO[bicho.bicho], raiz, NENHUM_CLIPE_UNICO)
  const clipe = menos ? bicho.parado : bicho.correr
  useEffect(() => {
    trocarClipe(actions, null, clipe, 0, `luneta-${bicho.bicho}`)
    return () => {
      actions[clipe]?.stop()
    }
  }, [actions, clipe, bicho.bicho])
  return (
    <group ref={raiz} position={[0, menos ? 0 : bicho.altura, 0]} scale={bicho.escala}>
      <primitive object={cena} />
    </group>
  )
}

/** O Lumi de luz da família da ilha, aceso também de dia, girando a coroa no `parado`. */
function SegredoBrilhando({ segredo }: { segredo: Segredo }) {
  const raiz = useRef<Group>(null)
  const { cena, actions } = useCopiaAnimada(
    URL_DO_SEGREDO[segredo],
    raiz,
    NENHUM_CLIPE_UNICO,
    false,
    false,
    1,
    true,
  )
  useEffect(() => {
    trocarClipe(actions, null, 'parado', 0, `luneta-${segredo}`)
  }, [actions, segredo])
  return (
    <group ref={raiz} scale={ESCALA_DO_SEGREDO}>
      <primitive object={cena} />
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
