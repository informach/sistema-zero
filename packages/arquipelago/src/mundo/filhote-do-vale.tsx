import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useMemo, useRef } from 'react'
import type { Group, MeshBasicMaterial } from 'three'
import filhoteGlb from '../assets/bichos/triceratops-filhote.glb'
import propsGlb from '../assets/ilhas/vale-dos-dinos-props.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoFilhote, PAINEL_DO_FILHOTE } from '../estado/filhote'
import {
  aquecerOOvo,
  comecarPasseio,
  FILHOTE_NO_VALE as F,
  nasceu,
  PASSEIO_DO_FILHOTE,
  passoDoPasseio,
  tamanhoDoFilhote,
} from '../sistemas/filhote-do-vale'
import { diaDe } from '../sistemas/moradores'
import { jogoPausado } from '../sistemas/pausa'
import { suavizarAngulo } from '../sistemas/zappy'
import { duracaoDoClipe, olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { paraOMundo } from './bosque'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { useInterativo } from './interativos'
import { ComReserva, copiarNo, useModelo } from './modelos'

type Ponto = { x: number; y: number; z: number }

/**
 * O ovo no chão quente do pé do vulcão e, depois que ele choca, o filhote passeando em volta
 * (fase4-03). Só monta com o `ValeVivo`; nada aqui colide (o ovo fica no chão quente, o filhote é
 * bicho miúdo que anda em volta, como o adotado que passa pela criança).
 */
export function FilhoteDoVale({
  preparada,
  meio,
  giro,
  troca,
}: {
  preparada: IlhaPreparada
  meio: Ponto
  giro: number
  troca: Troca
}) {
  const { loja, movimento } = useJogo()
  const filhote = useEstado((s) => s.salvamento.vale.filhote)
  const lugares = useMemo(() => {
    const pe = preparada.modelo.getObjectByName('pe-do-vulcao')?.position
    if (!pe) return null
    const mundo = (dx: number, dz: number) =>
      paraOMundo({ x: pe.x + dx, y: pe.y, z: pe.z + dz }, meio, giro, { x: 0, y: 0, z: 0 })
    return { chaoQuente: mundo(0, 0), passeio: PASSEIO_DO_FILHOTE.map((p) => mundo(p.x, p.z)) }
  }, [preparada, meio, giro])
  const podeAgir = () => {
    const s = loja.getState()
    return (
      troca.opacidade >= 0.99 &&
      !jogoPausado(s) &&
      !s.acesso.somenteLeitura &&
      !s.visita &&
      movimento.modo === 'chao'
    )
  }
  if (!lugares || !filhote) return null
  return (
    <ComReserva reserva={null}>
      {nasceu(filhote) ? (
        <Filhote passeio={lugares.passeio} podeAgir={podeAgir} />
      ) : (
        <OvoNoChaoQuente lugar={lugares.chaoQuente} giro={giro} podeAgir={podeAgir} />
      )}
    </ComReserva>
  )
}

function OvoNoChaoQuente({
  lugar,
  giro,
  podeAgir,
}: {
  lugar: Ponto
  giro: number
  podeAgir(): boolean
}) {
  const { loja } = useJogo()
  const reduzido = useReducedMotion()
  const raiz = useModelo(new URL(propsGlb, import.meta.url).href)
  const ovo = useMemo(() => copiarNo(raiz, 'ovo-dino'), [raiz])
  const balanco = useRef<Group>(null)
  const brilho = useRef<MeshBasicMaterial>(null)
  const relogio = useRef(0)
  useInterativo('chao-quente-do-vale', {
    ...lugar,
    raio: F.alcance,
    rotulo: () =>
      loja.getState().salvamento.vale.filhote?.aquecidoEm === diaDe(new Date())
        ? 'Ver o ovo'
        : 'Aquecer o ovo',
    agir: () => {
      if (!podeAgir()) return
      const s = loja.getState()
      const r = aquecerOOvo(s.salvamento, diaDe(new Date()))
      if (!r) return
      if (r.salvamento !== s.salvamento) s.mudar(() => r.salvamento)
      s.dizer(r.fala)
    },
  })
  useFrame((_, dt) => {
    if (jogoPausado(loja.getState())) return
    relogio.current += Math.min(dt, 0.1)
    const t = relogio.current
    // O chão quente (amarelo, para não sumir na lava) pulsa devagar; o ovo balança de leve (parado
    // com menos movimento).
    if (brilho.current) brilho.current.opacity = reduzido ? 0.5 : 0.45 + 0.1 * Math.sin(t * 1.6)
    if (balanco.current) balanco.current.rotation.z = reduzido ? 0 : 0.06 * Math.sin(t * 2.3)
  })
  return (
    <group position={[lugar.x, lugar.y, lugar.z]} rotation={[0, giro, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} renderOrder={1}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial
          ref={brilho}
          color="#ffd166"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <group ref={balanco} scale={F.escalaDoOvo}>
        <primitive object={ovo} dispose={null} />
      </group>
    </group>
  )
}

const UMA_VEZ = ['pular'] as const

function Filhote({ passeio, podeAgir }: { passeio: readonly Ponto[]; podeAgir(): boolean }) {
  const { loja, rastro } = useJogo()
  const painel = lojaDoFilhote(loja)
  const raiz = useRef<Group>(null)
  const visual = useRef<Group>(null)
  const { cena, actions, mixer, olhos } = useCopiaAnimada(
    new URL(filhoteGlb, import.meta.url).href,
    raiz,
    UMA_VEZ,
  )
  const p = useRef(comecarPasseio(passeio))
  const olhar = useRef(0)
  const tamanho = useRef<number | null>(null)
  const tocando = useRef<string | null>(null)
  const reacaoVista = useRef(painel.getState().reacao)
  const reacaoAte = useRef(0)
  const piscarEm = useRef<number>(PISCAR.aCada)
  const relogio = useRef(0)
  const y = passeio[0]?.y ?? 0

  useInterativo('filhote-do-vale', {
    get x() {
      return p.current.x
    },
    get z() {
      return p.current.z
    },
    raio: F.alcance,
    rotulo: () => {
      const nome = loja.getState().salvamento.vale.filhote?.nome
      return nome ? `Cuidar de ${nome}` : 'Dar um nome ao filhote'
    },
    agir: () => {
      if (!podeAgir()) return
      painel.getState().abrir()
      loja.getState().abrirPainel(PAINEL_DO_FILHOTE)
    },
  })

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    relogio.current += dt
    const agora = relogio.current
    const s = loja.getState()
    const cuidando = s.painelAberto === PAINEL_DO_FILHOTE
    const andando = !jogoPausado(s) && passoDoPasseio(p.current, passeio, dt, Math.random())
    const alvo = passeio[p.current.alvo]
    const quer =
      andando && alvo
        ? Math.atan2(alvo.x - p.current.x, alvo.z - p.current.z)
        : cuidando
          ? Math.atan2(rastro.x - p.current.x, rastro.z - p.current.z)
          : olhar.current
    olhar.current = suavizarAngulo(olhar.current, quer, 6, dt)
    const f = s.salvamento.vale.filhote
    const t = f ? tamanhoDoFilhote(f) : 1
    tamanho.current =
      tamanho.current === null ? t : tamanho.current + (t - tamanho.current) * Math.min(1, dt * 2)
    if (visual.current) {
      visual.current.position.set(p.current.x, y, p.current.z)
      visual.current.rotation.y = olhar.current
      visual.current.scale.setScalar(tamanho.current)
    }
    // A reação do cuidado (o pulinho) passa na frente do andar.
    const reacao = painel.getState().reacao
    if (reacao !== reacaoVista.current) {
      reacaoVista.current = reacao
      reacaoAte.current = agora + duracaoDoClipe(actions, mixer, 'pular')
      trocarClipe(actions, tocando.current, 'pular', 0.2, 'filhote-do-vale')
      tocando.current = 'pular'
    }
    const clipe = agora < reacaoAte.current ? 'pular' : andando ? 'andar' : 'parado'
    if (clipe !== tocando.current) {
      trocarClipe(actions, tocando.current, clipe, 0.25, 'filhote-do-vale')
      tocando.current = clipe
    }
    olhosNoInstante(olhos, agora, piscarEm, clipe === 'pular')
  })

  return (
    <group ref={visual}>
      <group ref={raiz}>
        <primitive object={cena} />
      </group>
    </group>
  )
}
