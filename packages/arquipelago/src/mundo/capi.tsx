import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, Object3D } from 'three'
import capiGlb from '../assets/personagens/capi.glb'
import { useJogo } from '../estado/contexto'
import { lojaDaConversa, PAINEL_DA_CAPI } from '../estado/moradores'
import { comecarConversa } from '../sistemas/conversa-da-capi'
import { CAPI_NO_BOSQUE, diaDe, olharDaCapi } from '../sistemas/moradores'
import { suavizarAngulo } from '../sistemas/zappy'
import { duracaoDoClipe, olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { paraOMundo } from './bosque'
import { Colisores } from './colisores'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { useInterativo } from './interativos'

const URL_DA_CAPI = new URL(capiGlb, import.meta.url).href

type Clipe = 'parado' | 'falar' | 'acenar' | 'feliz'

/** Os clipes que tocam uma vez e voltam ao parado (ou ao falar). */
const UMA_VEZ: readonly Clipe[] = ['acenar', 'feliz']

/** Da âncora (os pés) até o meio da cabeça. */
const ALTURA_DA_CABECA = 1.25

const COLISOR_DA_CAPI: ColisorDaIlha[] = [
  {
    forma: 'cilindro',
    nome: 'col-morador-capi',
    posicao: [0, CAPI_NO_BOSQUE.altura / 2, 0],
    rotacao: [0, 0, 0, 1],
    raio: CAPI_NO_BOSQUE.raio,
    meiaAltura: CAPI_NO_BOSQUE.altura / 2,
  },
]

/**
 * A Capi na frente da cabana (a âncora `morador` do `bosque.glb`), de costas para a porta. Vira
 * para a criança quando ela chega perto, acena, fala enquanto a conversa está aberta e comemora
 * presente e pedido. E perto dela abre a conversa (o painel em `interface/capi.tsx`).
 */
export function Capi({
  modelo,
  meio,
  giro,
}: {
  /** O modelo da ilha completa (as âncoras). */
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const { loja, plataforma, rastro, pedidos } = useJogo()
  const conversa = lojaDaConversa(loja)
  const lugar = useMemo(() => {
    const morador = modelo.getObjectByName('morador')?.position ?? { x: 4.4, y: 1, z: -3.81 }
    const porta = modelo.getObjectByName('cabana')?.position ?? { x: 5.11, y: 1, z: -4.65 }
    const p = paraOMundo(morador, meio, giro, { x: 0, y: 0, z: 0 })
    // De costas para a porta: olha para onde a porta não está.
    const descanso = Math.atan2(morador.x - porta.x, morador.z - porta.z) + giro
    return { ...p, descanso }
  }, [modelo, meio, giro])
  /** A cabeça dela, para a câmera enquadrar a conversa (e o meio da ilha, para fugir dele). */
  const cabeca = useMemo(
    () => ({
      x: lugar.x,
      y: lugar.y + ALTURA_DA_CABECA,
      z: lugar.z,
      miolo: { x: meio.x, z: meio.z },
    }),
    [lugar, meio],
  )

  useInterativo('capi', {
    x: lugar.x,
    z: lugar.z,
    raio: CAPI_NO_BOSQUE.alcance,
    rotulo: () => 'Conversar com a Capi',
    agir: () => {
      const s = loja.getState()
      const { salvamento, falas } = comecarConversa(
        s.salvamento,
        diaDe(new Date()),
        plataforma.perfil.id,
      )
      s.mudar(() => salvamento)
      conversa.getState().abrir(falas)
      pedidos.conversa = cabeca
      s.abrirPainel(PAINEL_DA_CAPI)
    },
  })

  const corpo = useRef<Group>(null)
  const olhar = useRef(lugar.descanso)
  useFrame((_, dt) => {
    const g = corpo.current
    if (!g) return
    const conversando = loja.getState().painelAberto === PAINEL_DA_CAPI
    if (!conversando && pedidos.conversa === cabeca) pedidos.conversa = null
    const alvo = olharDaCapi(lugar, rastro, lugar.descanso, conversando)
    olhar.current = suavizarAngulo(olhar.current, alvo, CAPI_NO_BOSQUE.rapidezDoGiro, dt)
    g.rotation.y = olhar.current
  })

  return (
    <group position={[lugar.x, lugar.y, lugar.z]}>
      <group ref={corpo} rotation={[0, lugar.descanso, 0]}>
        <ModeloDaCapi lugar={lugar} />
      </group>
      <Colisores lista={COLISOR_DA_CAPI} />
    </group>
  )
}

function ModeloDaCapi({ lugar }: { lugar: { x: number; z: number } }) {
  const { loja, rastro } = useJogo()
  const conversa = lojaDaConversa(loja)
  const raiz = useRef<Group>(null)
  const { cena, actions, mixer, olhos } = useCopiaAnimada(URL_DA_CAPI, raiz, UMA_VEZ)

  const tocando = useRef<Clipe | null>(null)
  const umaVezAte = useRef(0)
  const ultimoAceno = useRef(Number.NEGATIVE_INFINITY)
  const estavaPerto = useRef(false)
  const alegria = useRef(conversa.getState().alegria)
  const piscarEm = useRef<number>(PISCAR.aCada)
  const relogio = useRef(0)

  useFrame((_, dt) => {
    relogio.current += dt
    const agora = relogio.current
    const s = loja.getState()
    const c = conversa.getState()
    const conversando = s.painelAberto === PAINEL_DA_CAPI

    // Acena quando a criança chega perto (não no meio da conversa).
    const perto =
      (rastro.x - lugar.x) ** 2 + (rastro.z - lugar.z) ** 2 < CAPI_NO_BOSQUE.olharDe ** 2
    let pedido: Clipe | null = null
    if (perto && !estavaPerto.current && !conversando) {
      if (agora - ultimoAceno.current > CAPI_NO_BOSQUE.acenoACada) {
        pedido = 'acenar'
        ultimoAceno.current = agora
      }
    }
    estavaPerto.current = perto
    if (c.alegria !== alegria.current) {
      alegria.current = c.alegria
      pedido = 'feliz'
    }

    let quer: Clipe
    if (pedido) {
      quer = pedido
      umaVezAte.current = agora + duracaoDoClipe(actions, mixer, pedido)
    } else if (tocando.current && UMA_VEZ.includes(tocando.current) && agora < umaVezAte.current) {
      quer = tocando.current
    } else {
      quer = conversando && c.tela === 'falas' ? 'falar' : 'parado'
    }
    if (quer !== tocando.current || pedido) trocarClipe(actions, tocando.current, quer)
    tocando.current = quer

    // Os olhos: piscar de vez em quando; feliz (fechadinhos) enquanto comemora.
    olhosNoInstante(olhos, agora, piscarEm, quer === 'feliz')
  })

  return (
    <group ref={raiz}>
      <primitive object={cena} />
    </group>
  )
}
