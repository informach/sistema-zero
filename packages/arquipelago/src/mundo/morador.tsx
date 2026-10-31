import { useFrame } from '@react-three/fiber'
import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useJogo } from '../estado/contexto'
import { lojaDosConvidados, useConvidados } from '../estado/convidados'
import { lojaDaConversa, type QuemConversa } from '../estado/moradores'
import { conversarComAtividade, temAmizadeDoAnel } from '../sistemas/amizade-do-anel'
import { diaDe, olharDoMorador } from '../sistemas/moradores'
import { jogoPausado } from '../sistemas/pausa'
import { suavizarAngulo } from '../sistemas/zappy'
import { duracaoDoClipe, olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { Colisores } from './colisores'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { useInterativo } from './interativos'
import { PlacaDoPedido, placaAoLadoDoMorador } from './placa-do-pedido'

type Clipe = 'parado' | 'falar' | 'acenar' | 'feliz'

/** Os clipes que tocam uma vez e voltam ao parado (ou ao falar). */
const UMA_VEZ: readonly Clipe[] = ['acenar', 'feliz']

/** Quem é o morador no mundo: o modelo, o painel da conversa e as medidas. */
export interface MoradorNoMundo {
  quem: QuemConversa
  url: string
  /** O nome do painel da conversa em `painelAberto`. */
  painel: string
  /** O que aparece perto dele ("Conversar com a Capi"). */
  rotulo: string
  medidas: {
    olharDe: number
    alcance: number
    acenoACada: number
    rapidezDoGiro: number
    raio: number
    altura: number
  }
  /** Da âncora (os pés) até o meio da cabeça, para a câmera da conversa. */
  alturaDaCabeca: number
  /** Abrir a conversa: o salvamento depois dela e as falas. */
  comecar(s: Salvamento, dia: string, perfilId: string): { salvamento: Salvamento; falas: string[] }
}

/**
 * Um morador parado no lugar dele (`lugar`, em coordenadas do mundo, e `descanso`, para onde olha
 * sozinho). Vira para a criança quando ela chega perto, acena, fala enquanto a conversa está
 * aberta e comemora presente e pedido. Perto dele abre a conversa (o painel do morador).
 */
type PropsDoMorador = {
  morador: MoradorNoMundo
  lugar: { x: number; y: number; z: number; descanso: number }
  meio: { x: number; z: number }
  emCasa?: boolean
}
export function MoradorDaIlha(props: PropsDoMorador) {
  const { loja } = useJogo()
  const estaEmCasa = useConvidados(lojaDosConvidados(loja), (s) =>
    s.convidados.some((c) => c.quem === props.morador.quem),
  )
  const quem = props.morador.quem
  // A placa do pedido no Estúdio ao lado do morador do anel (lacunas, 01/11/2026); a do Nico tem
  // lugar próprio na praia.
  const placa =
    !props.emCasa && quem !== 'nico' && quem !== 'iris' ? (
      <PlacaDoPedido quem={quem} lugar={placaAoLadoDoMorador(props.lugar)} />
    ) : null
  return (
    <>
      {estaEmCasa && !props.emCasa ? null : <MoradorPresente {...props} />}
      {placa}
    </>
  )
}

function MoradorPresente({
  morador,
  lugar,
  meio,
  emCasa = false,
}: {
  morador: MoradorNoMundo
  lugar: { x: number; y: number; z: number; descanso: number }
  emCasa?: boolean
  /** O meio da ilha, para a câmera da conversa fugir dele. */
  meio: { x: number; z: number }
}) {
  const { loja, plataforma, rastro, pedidos } = useJogo()
  const conversa = lojaDaConversa(loja, morador.quem)
  const { painel, medidas } = morador
  /** A cabeça dele, para a câmera enquadrar a conversa (e o meio da ilha, para fugir dele). */
  const cabeca = useMemo(
    () => ({
      x: lugar.x,
      y: lugar.y + morador.alturaDaCabeca,
      z: lugar.z,
      miolo: { x: meio.x, z: meio.z },
    }),
    [lugar, meio, morador.alturaDaCabeca],
  )
  const colisor = useMemo<ColisorDaIlha[]>(
    () => [
      {
        forma: 'cilindro',
        nome: `col-morador-${morador.quem}`,
        posicao: [0, medidas.altura / 2, 0],
        rotacao: [0, 0, 0, 1],
        raio: medidas.raio,
        meiaAltura: medidas.altura / 2,
      },
    ],
    [morador.quem, medidas],
  )

  useInterativo(emCasa ? `casa:${morador.quem}` : morador.quem, {
    x: lugar.x,
    z: lugar.z,
    raio: medidas.alcance,
    rotulo: () => morador.rotulo,
    agir: () => {
      const s = loja.getState()
      if (s.acesso.somenteLeitura || s.visita || jogoPausado(s)) return
      const dia = diaDe(new Date())
      const { salvamento, falas } = temAmizadeDoAnel(morador.quem)
        ? conversarComAtividade(
            s.salvamento,
            morador.quem,
            dia,
            plataforma.perfil.id,
            morador.comecar,
          )
        : morador.comecar(s.salvamento, dia, plataforma.perfil.id)
      if (salvamento !== s.salvamento) s.mudar(() => salvamento)
      conversa.getState().abrir(falas)
      pedidos.conversa = cabeca
      s.abrirPainel(painel)
    },
  })

  // A câmera da conversa só vale com a conversa aberta: fechou o painel (Esc, outro painel, o fim
  // do tempo), solta. E se o morador sai de cena (a ilha descarregou), a conversa fecha junto.
  useEffect(() => {
    const soltar = loja.subscribe((s) => {
      if (s.painelAberto !== painel && pedidos.conversa === cabeca) pedidos.conversa = null
    })
    return () => {
      soltar()
      if (pedidos.conversa === cabeca) pedidos.conversa = null
      if (loja.getState().painelAberto === painel) loja.getState().abrirPainel(null)
    }
  }, [loja, pedidos, cabeca, painel])

  const corpo = useRef<Group>(null)
  const olhar = useRef(lugar.descanso)
  useFrame((_, dt) => {
    const g = corpo.current
    if (!g) return
    const conversando = loja.getState().painelAberto === painel
    const alvo = olharDoMorador(lugar, rastro, lugar.descanso, conversando, medidas.olharDe)
    olhar.current = suavizarAngulo(olhar.current, alvo, medidas.rapidezDoGiro, dt)
    g.rotation.y = olhar.current
  })

  return (
    <group position={[lugar.x, lugar.y, lugar.z]}>
      <group ref={corpo} rotation={[0, lugar.descanso, 0]}>
        <ModeloDoMorador morador={morador} lugar={lugar} />
      </group>
      <Colisores lista={colisor} />
    </group>
  )
}

function ModeloDoMorador({
  morador,
  lugar,
}: {
  morador: MoradorNoMundo
  lugar: { x: number; z: number }
}) {
  const { loja, rastro } = useJogo()
  const conversa = lojaDaConversa(loja, morador.quem)
  const raiz = useRef<Group>(null)
  const { cena, actions, mixer, olhos } = useCopiaAnimada(morador.url, raiz, UMA_VEZ)

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
    const conversando = s.painelAberto === morador.painel

    // Acena quando a criança chega perto (não no meio da conversa).
    const perto =
      (rastro.x - lugar.x) ** 2 + (rastro.z - lugar.z) ** 2 < morador.medidas.olharDe ** 2
    let pedido: Clipe | null = null
    if (perto && !estavaPerto.current && !conversando) {
      if (agora - ultimoAceno.current > morador.medidas.acenoACada) {
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
    if (quer !== tocando.current || pedido)
      trocarClipe(actions, tocando.current, quer, 0.25, morador.quem)
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
