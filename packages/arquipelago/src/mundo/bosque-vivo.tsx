import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Box3,
  CanvasTexture,
  CatmullRomCurve3,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  type Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from 'three'
import {
  type AguaRasa,
  type CipoVivo,
  type EixoDeEquilibrio,
  type EscadaViva,
  type Escorregador,
  type TroncoVivo,
  useJogo,
} from '../estado/contexto'
import { CIPO, comprimentoDaPegada, criarBalanco } from '../sistemas/cipo'
import { CORDAS, criarPontos, passoDasCordas } from '../sistemas/cordas'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import {
  type Corrida,
  criarCorrida,
  estrelasDaCorrida,
  formatarTempo,
  juntarResultado,
  PERCURSO_DAS_COPAS,
  type PontosDoPercurso,
  passoDaCorrida,
  quantasEstrelas,
  vagalumesPegos,
} from '../sistemas/percurso'
import { BichosDoBosque } from './bichos-do-bosque'
import {
  type AncorasDoPercurso,
  CIPOS_DO_BOSQUE,
  NOMES_DAS_ANCORAS_DO_PERCURSO,
  PLACA_DA_LARGADA,
  paraOMundo,
  percursoNoModelo,
  percursoNoMundo,
  TOPO_DO_BOSQUE,
  TRONCO_DOS_CIPOS,
  troncoNoMundo,
} from './bosque'
import { Capi } from './capi'
import {
  type CipoDesenhado,
  desenharCipo,
  desmontarCipoDesenhado,
  prepararCipoDesenhado,
} from './cipo-desenhado'
import type { Copa } from './copas'
import { giroDaIlha, type IlhaPreparada, type Troca } from './ilha-completa'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'
import { TroncoNoLago } from './tronco-no-lago'

/** Os pés a menos disto do tampo, pisando, contam como o chão da ilha (não deque nem ponte). */
const CHAO_DA_ILHA = 0.25

/** O que muda a cada quadro, sem alocar. */
interface Quadro {
  corpo: {
    x: number
    y: number
    z: number
    pes: number
    noChaoDaIlha: boolean
  }
  corte: { fase: 'nada' | 'saindo' | 'voltando'; ms: number; comecar: boolean }
  destino: { x: number; y: number; z: number }
  olhar: number
}

/**
 * O Bosque vivo enquanto a ilha completa está ativa: os três cipós balançam (o personagem pega e
 * solta, `sistemas/cipo.ts`), o tronco da árvore deles dá para escalar, o lago dá para nadar, e
 * o percurso nas copas tem placa de largada, cronômetro, vagalumes e estrelas
 * (`sistemas/percurso.ts`). Tudo fica em coordenadas do mundo, fora do grupo da ilha.
 */
/** A largura dos degraus da escada reta (`ESCADA_RETA` no `bosque.py`). */
const LARGURA_DA_ESCADA = 0.6
/** A largura da pista do escorregador (a tábua de 1 m entre as laterais, no `bosque.py`). */
const LARGURA_DA_PISTA = 1

export function BosqueVivo({
  ilha,
  centro,
  preparada,
  troca,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  preparada: IlhaPreparada
  /** A troca da leve pela completa: as peças daqui aparecem quando a completa terminou de entrar. */
  troca: Troca
}) {
  const { loja, movimento, pedidos, rastro } = useJogo()
  const menosMovimento = useReducedMotion()
  const giro = giroDaIlha(ilha)
  const meio = useMemo(() => ({ x: centro.x, y: 0, z: centro.z }), [centro.x, centro.z])

  // Os nós dos cipós (o pivô é a posição do nó: ele fica direto na raiz do modelo).
  const cipos = useMemo(() => {
    const lista: { vivo: CipoVivo; no: Object3D; desenho: CipoDesenhado | null }[] = []
    for (const nome of CIPOS_DO_BOSQUE) {
      const no = preparada.modelo.getObjectByName(nome)
      if (!no) continue
      const pivo = paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 })
      // A corda vai do pivô até o ponto mais baixo do nó (a alça no fim).
      let fundo = no.position.y
      no.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        m.geometry.computeBoundingBox()
        const b = m.geometry.boundingBox
        if (b) fundo = Math.min(fundo, no.position.y + b.min.y)
      })
      const corda = no.position.y - fundo
      const chao = meio.y + TOPO_DO_BOSQUE
      const vivo: CipoVivo = {
        id: `${ilha.id}:${nome}`,
        pivo,
        corda,
        pegada: comprimentoDaPegada(pivo.y, chao, corda, CORPO.doCentroAoPe),
        balanco: criarBalanco(),
        seguro: false,
        soltoEm: Number.NEGATIVE_INFINITY,
        ...criarPontos(pivo, corda),
        chao,
        esperandoOCorpoSair: false,
      }
      vivo.balanco.comprimento = vivo.pegada
      lista.push({ vivo, no, desenho: null })
    }
    return lista
  }, [preparada, meio, giro, ilha.id])

  const vivos = useMemo(() => cipos.map((c) => c.vivo), [cipos])

  const tronco = useMemo<TroncoVivo>(
    () => ({
      id: `${ilha.id}:tronco-dos-cipos`,
      tronco: troncoNoMundo(TRONCO_DOS_CIPOS, meio, giro),
    }),
    [meio, giro, ilha.id],
  )
  const troncos = useMemo(() => [tronco.tronco], [tronco])

  // O lago (nó `agua`): a elipse do desenho e a altura da superfície. O fundo está na colisão do
  // chão (a bacia do `bosque.py`); o personagem nada nele e o tronco boia.
  const agua = useMemo<AguaRasa | null>(() => {
    const no = preparada.modelo.getObjectByName('agua') as Mesh | undefined
    if (!no?.isMesh) return null
    no.geometry.computeBoundingBox()
    const b = no.geometry.boundingBox
    if (!b) return null
    const c = paraOMundo(
      {
        x: (b.min.x + b.max.x) / 2 + no.position.x,
        y: 0,
        z: (b.min.z + b.max.z) / 2 + no.position.z,
      },
      meio,
      giro,
      { x: 0, y: 0, z: 0 },
    )
    return {
      id: `${ilha.id}:lago`,
      x: c.x,
      z: c.z,
      raioX: (b.max.x - b.min.x) / 2,
      raioZ: (b.max.z - b.min.z) / 2,
      giro,
      y: meio.y + b.max.y + no.position.y,
    }
  }, [preparada, meio, giro, ilha.id])

  // Os troncos caídos do equilíbrio (âncoras `equilibrio-N-a` e `-b`, no tampo, no meio do tronco).
  const equilibrios = useMemo<EixoDeEquilibrio[]>(() => {
    const lista: EixoDeEquilibrio[] = []
    for (let i = 1; ; i++) {
      const a = preparada.modelo.getObjectByName(`equilibrio-${i}-a`)
      const b = preparada.modelo.getObjectByName(`equilibrio-${i}-b`)
      if (!a || !b) break
      lista.push({
        id: `${ilha.id}:equilibrio-${i}`,
        a: paraOMundo(a.position, meio, giro, { x: 0, y: 0, z: 0 }),
        b: paraOMundo(b.position, meio, giro, { x: 0, y: 0, z: 0 }),
      })
    }
    return lista
  }, [preparada, meio, giro, ilha.id])

  // As escadas retas (âncoras `escada-N-base`, `-topo` e `-saida`).
  const escadas = useMemo<EscadaViva[]>(() => {
    const lista: EscadaViva[] = []
    const noMundo = (p: { x: number; y: number; z: number }) =>
      paraOMundo(p, meio, giro, { x: 0, y: 0, z: 0 })
    for (let i = 1; ; i++) {
      const base = preparada.modelo.getObjectByName(`escada-${i}-base`)
      const topo = preparada.modelo.getObjectByName(`escada-${i}-topo`)
      const saida = preparada.modelo.getObjectByName(`escada-${i}-saida`)
      if (!base || !topo || !saida) break
      lista.push({
        id: `${ilha.id}:escada-${i}`,
        base: noMundo(base.position),
        topo: noMundo(topo.position),
        saida: noMundo(saida.position),
        largura: LARGURA_DA_ESCADA,
      })
    }
    return lista
  }, [preparada, meio, giro, ilha.id])

  // O escorregador (âncoras `escorregador-curva-N`, do alto ao fim, na superfície da pista).
  const escorregador = useMemo<Escorregador | null>(() => {
    const pontosDaPista = []
    for (let i = 1; ; i++) {
      const no = preparada.modelo.getObjectByName(`escorregador-curva-${i}`)
      if (!no) break
      pontosDaPista.push(paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 }))
    }
    if (pontosDaPista.length < 2) return null
    return { id: `${ilha.id}:escorregador`, pontos: pontosDaPista, largura: LARGURA_DA_PISTA }
  }, [preparada, meio, giro, ilha.id])

  const pontos = useMemo<PontosDoPercurso | null>(() => {
    const ancoras: Partial<AncorasDoPercurso> = {}
    for (const nome of NOMES_DAS_ANCORAS_DO_PERCURSO) {
      const no = preparada.modelo.getObjectByName(nome)
      if (!no) return null
      ancoras[nome] = { x: no.position.x, y: no.position.y, z: no.position.z }
    }
    return percursoNoMundo(percursoNoModelo(ancoras as AncorasDoPercurso), meio, giro)
  }, [preparada, meio, giro])

  // Registra cipós, tronco e lago para o personagem; tira tudo quando a ilha deixa de ser ativa.
  useEffect(() => {
    const meus = cipos.map((c) => c.vivo)
    movimento.cipos.push(...meus)
    // A corda que dobra troca a reta do arquivo enquanto a ilha completa está ativa.
    for (const c of cipos) c.desenho = prepararCipoDesenhado(c.no, c.vivo.corda, CORDAS.elos)
    movimento.troncos.push(tronco)
    if (agua) movimento.aguas.push(agua)
    movimento.equilibrios.push(...equilibrios)
    movimento.escadas.push(...escadas)
    if (escorregador) movimento.escorregadores.push(escorregador)
    return () => {
      const tirar = <T,>(lista: T[], item: T) => {
        const i = lista.indexOf(item)
        if (i >= 0) lista.splice(i, 1)
      }
      for (const c of meus) tirar(movimento.cipos, c)
      tirar(movimento.troncos, tronco)
      if (agua) tirar(movimento.aguas, agua)
      for (const e of equilibrios) tirar(movimento.equilibrios, e)
      for (const e of escadas) tirar(movimento.escadas, e)
      if (escorregador) tirar(movimento.escorregadores, escorregador)
      for (const c of cipos) {
        if (c.desenho) desmontarCipoDesenhado(c.desenho)
        c.desenho = null
      }
      // Uma corrida não continua numa ilha que não está mais ali.
      if (movimento.corrida) {
        movimento.corrida = null
        loja.getState().definirCorrida(null)
      }
    }
  }, [cipos, tronco, agua, equilibrios, escadas, escorregador, movimento, loja])

  /** No chão da ilha (não num deque, no cipó nem no tronco). */
  const noChao = () =>
    movimento.modo === 'chao' && rastro.y - CORPO.doCentroAoPe < meio.y + TOPO_DO_BOSQUE + 0.6
  useInterativo(tronco.id, {
    x: tronco.tronco.base.x,
    z: tronco.tronco.base.z,
    raio: tronco.tronco.raioBase + 1.1,
    rotulo: () => (noChao() ? 'Escalar o tronco' : null),
    agir: () => {
      movimento.pedido = { tipo: 'tronco', id: tronco.id }
    },
  })
  const placa = useMemo(
    () =>
      paraOMundo({ x: PLACA_DA_LARGADA.x, y: TOPO_DO_BOSQUE, z: PLACA_DA_LARGADA.z }, meio, giro, {
        x: 0,
        y: 0,
        z: 0,
      }),
    [meio, giro],
  )
  const q = useRef<Quadro>({
    corpo: { x: 0, y: 0, z: 0, pes: 0, noChaoDaIlha: false },
    corte: { fase: 'nada', ms: 0, comecar: false },
    destino: { x: 0, y: 0, z: 0 },
    olhar: 0,
  }).current

  /** Escurece, leva o corpo e clareia (a volta ao deque e o "Correr de novo"). */
  const cortarPara = (
    destino: { x: number; y: number; z: number },
    olhar: number,
    comecar: boolean,
  ) => {
    q.destino.x = destino.x
    q.destino.y = destino.y + CORPO.doCentroAoPe + 0.05
    q.destino.z = destino.z
    q.olhar = olhar
    q.corte.fase = 'saindo'
    q.corte.ms = 0
    q.corte.comecar = comecar
    loja.getState().cortar()
  }
  const comecar = () => {
    if (!pontos) return
    movimento.corrida = criarCorrida(pontos.vagalumes.length)
    const s = loja.getState()
    s.mostrarResultado(null)
    s.definirCorrida({ vagalumes: 0, totalDeVagalumes: pontos.vagalumes.length })
    s.dizer('Valendo. Suba a escada e siga pelas copas até o escorregador.')
  }
  useInterativo(`${ilha.id}:largada`, {
    x: placa.x,
    z: placa.z,
    raio: pontos ? 1.8 : 0,
    rotulo: () =>
      movimento.corrida?.situacao === 'correndo' || movimento.modo !== 'chao'
        ? null
        : 'Começar o percurso nas copas',
    agir: comecar,
  })

  const terminar = (c: Corrida) => {
    const s = loja.getState()
    const antes = s.salvamento.percursos[PERCURSO_DAS_COPAS.id]
    const melhor = juntarResultado(antes, c)
    if (!melhor) return
    s.mudar((sv) => ({ ...sv, percursos: { ...sv.percursos, [PERCURSO_DAS_COPAS.id]: melhor } }))
    const estrelas = estrelasDaCorrida(c)
    const recorde = antes !== undefined && c.tempoMs < antes.melhorTempoMs
    s.definirCorrida(null)
    s.mostrarResultado({
      tempoMs: c.tempoMs,
      estrelas,
      melhor,
      recorde,
      vagalumes: vagalumesPegos(c),
      totalDeVagalumes: c.pegos.length,
    })
    const n = quantasEstrelas(estrelas)
    s.dizer(
      recorde
        ? `Recorde novo no percurso: ${formatarTempo(c.tempoMs)}.`
        : n === 3
          ? 'Três estrelas. Você voou pelas copas.'
          : `Você chegou ao fim do percurso em ${formatarTempo(c.tempoMs)}.`,
    )
  }

  const vagalumes = useRef<(Group | null)[]>([])
  const tempo = useRef(0)
  const pecas = useRef<Group>(null)

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    tempo.current += dt
    // Placa, trepadeira e vagalumes só com a completa inteira (não pulam na frente da troca).
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
    // Os cipós são cordas de verdade (`sistemas/cordas.ts`): o corpo desenhado, o tronco e os
    // outros cipós empurram; seguro, a corda fica presa nas mãos e o resto cai junto ao corpo.
    passoDasCordas(vivos, movimento.corpoDesenhado, troncos, dt)
    for (const c of cipos) if (c.desenho) desenharCipo(c.desenho, c.vivo.pontos)

    // O corte suave: escurece, leva o corpo, clareia.
    const corte = q.corte
    if (corte.fase === 'saindo') {
      corte.ms += dt * 1000
      if (corte.ms >= PERCURSO_DAS_COPAS.corteSaiMs) {
        pedidos.teleporte = { x: q.destino.x, y: q.destino.y, z: q.destino.z }
        pedidos.olharPara = q.olhar
        corte.fase = 'voltando'
        corte.ms = 0
        if (corte.comecar) comecar()
      }
    } else if (corte.fase === 'voltando') {
      corte.ms += dt * 1000
      if (corte.ms >= PERCURSO_DAS_COPAS.corteVoltaMs) corte.fase = 'nada'
    }

    // Pedidos da tela: correr de novo ou parar.
    const pedido = movimento.pedidoDoPercurso
    movimento.pedidoDoPercurso = null
    if (pedido === 'recomecar' && pontos && corte.fase === 'nada') {
      loja.getState().mostrarResultado(null)
      cortarPara(pontos.largada, pontos.rumoDaLargada, true)
    } else if (pedido === 'parar' && movimento.corrida) {
      movimento.corrida = null
      loja.getState().definirCorrida(null)
      loja
        .getState()
        .dizer('O percurso parou. A placa ao pé da escada começa de novo quando você quiser.')
    }

    const c = movimento.corrida
    const mostrar = c?.situacao === 'correndo'
    for (let i = 0; i < vagalumes.current.length; i++) {
      const g = vagalumes.current[i]
      const p = pontos?.vagalumes[i]
      if (!g || !p) continue
      g.visible = mostrar && !c?.pegos[i]
      if (!g.visible) continue
      const sobe = menosMovimento ? 0 : Math.sin(tempo.current * 2.2 + i * 1.7) * 0.12
      g.position.set(p.x, p.y + sobe, p.z)
      const brilho = g.children[1] as Sprite | undefined
      if (brilho)
        brilho.material.opacity = menosMovimento
          ? 0.75
          : 0.6 + Math.sin(tempo.current * 4 + i) * 0.2
    }
    if (c?.situacao !== 'correndo' || !pontos) return
    const s = loja.getState()
    // Menu, tempo pausado ou corte na tela: o cronômetro espera (com uma ferramenta aberta ou a aba
    // escondida a cena nem desenha, então também não soma).
    if (jogoPausado(s) || corte.fase !== 'nada') return
    q.corpo.x = rastro.x
    q.corpo.y = rastro.y
    q.corpo.z = rastro.z
    q.corpo.pes = rastro.y - CORPO.doCentroAoPe
    q.corpo.noChaoDaIlha = movimento.noChao && q.corpo.pes < meio.y + TOPO_DO_BOSQUE + CHAO_DA_ILHA
    const ev = passoDaCorrida(c, q.corpo, pontos, dt * 1000)
    if (!ev) return
    if (ev.tipo === 'vagalume') {
      s.definirCorrida({ vagalumes: vagalumesPegos(c), totalDeVagalumes: c.pegos.length })
    } else if (ev.tipo === 'caiu') {
      const d = pontos.deques[ev.deque]
      if (d) cortarPara(d.volta, d.rumoDaVolta, false)
    } else if (ev.tipo === 'chegou') {
      movimento.corrida = null
      terminar(c)
    } else if (ev.tipo === 'desistiu') {
      movimento.corrida = null
      s.definirCorrida(null)
      s.dizer('O percurso parou. A placa ao pé da escada começa de novo quando você quiser.')
    }
  })

  return (
    <group ref={pecas} visible={false}>
      {cipos.map((c) => (
        <InterativoDoCipo key={c.vivo.id} cipo={c.vivo} noChao={noChao} />
      ))}
      <Placa x={placa.x} y={placa.y} z={placa.z} giro={giro} />
      <ComReserva reserva={null}>
        <Capi modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      {agua ? (
        <ComReserva reserva={null}>
          <TroncoNoLago agua={agua} />
        </ComReserva>
      ) : null}
      <BichosDoBosque
        modelo={preparada.modelo}
        colisores={preparada.colisores}
        meio={meio}
        giro={giro}
      />
      <Trepadeira tronco={tronco} preparada={preparada} />
      {pontos?.vagalumes.map((p, i) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: os vagalumes são fixos e na ordem
          key={i}
          ref={(g) => {
            vagalumes.current[i] = g
          }}
          position={[p.x, p.y, p.z]}
          visible={false}
        >
          <Vagalume />
        </group>
      ))}
    </group>
  )
}

/** "Pegar o cipó" no chão, perto da corda. */
function InterativoDoCipo({ cipo, noChao }: { cipo: CipoVivo; noChao: () => boolean }) {
  const { movimento } = useJogo()
  useInterativo(cipo.id, {
    x: cipo.pivo.x,
    z: cipo.pivo.z,
    raio: CIPO.raioDaDica,
    rotulo: () => (noChao() && !cipo.seguro ? 'Pegar o cipó' : null),
    agir: () => {
      movimento.pedido = { tipo: 'cipo', id: cipo.id }
    },
  })
  return null
}

// ------------------------------------------------------------------ peças desenhadas no código

const NUCLEO = new SphereGeometry(0.09, 12, 8)
const COR_DO_NUCLEO = new MeshBasicMaterial({ color: '#fff7a8', toneMapped: false })
let brilhoDoVagalume: CanvasTexture | null = null

/** A textura do brilho: um círculo que some para as bordas (feita uma vez). */
function texturaDoBrilho(): CanvasTexture | null {
  if (brilhoDoVagalume) return brilhoDoVagalume
  if (typeof document === 'undefined') return null
  const tela = document.createElement('canvas')
  tela.width = 64
  tela.height = 64
  const ctx = tela.getContext('2d')
  if (!ctx) return null
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,248,170,1)')
  grad.addColorStop(0.35, 'rgba(214,255,120,0.55)')
  grad.addColorStop(1, 'rgba(160,255,120,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  brilhoDoVagalume = new CanvasTexture(tela)
  return brilhoDoVagalume
}

/** Um vagalume: o pontinho aceso e o brilho em volta (sempre virado para a câmera). */
function Vagalume() {
  const material = useMemo(
    () =>
      new SpriteMaterial({
        map: texturaDoBrilho(),
        color: '#f4ff9a',
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.7,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  return (
    <>
      <mesh geometry={NUCLEO} material={COR_DO_NUCLEO} />
      <sprite material={material} scale={[0.95, 0.95, 0.95]} />
    </>
  )
}

/** A placa da largada: poste, tábua com o nome e a marca acesa no chão. */
function Placa({ x, y, z, giro }: { x: number; y: number; z: number; giro: number }) {
  const textura = useMemo(() => {
    if (typeof document === 'undefined') return null
    const tela = document.createElement('canvas')
    tela.width = 256
    tela.height = 128
    const ctx = tela.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#b5824f'
    ctx.fillRect(0, 0, 256, 128)
    ctx.fillStyle = '#8a5a30'
    for (let k = 1; k < 4; k++) ctx.fillRect(0, k * 32 - 2, 256, 3)
    ctx.fillStyle = '#fff6df'
    ctx.font = 'bold 34px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Percurso', 128, 52)
    ctx.fillText('nas copas', 128, 94)
    ctx.fillStyle = '#ffd34d'
    ctx.font = '26px sans-serif'
    ctx.fillText('★ ★ ★', 128, 122)
    return new CanvasTexture(tela)
  }, [])
  useEffect(() => () => textura?.dispose(), [textura])
  // A tábua olha para a trilha que chega da ponte (o +x do modelo, girado como a ilha).
  return (
    <group position={[x, y, z]} rotation={[0, giro + Math.PI / 2, 0]}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 1.4, 8]} />
        <meshStandardMaterial color="#7a5230" />
      </mesh>
      <mesh position={[0, 1.35, 0.05]}>
        <boxGeometry args={[1.1, 0.55, 0.06]} />
        <meshStandardMaterial color="#b5824f" />
      </mesh>
      {textura ? (
        <mesh position={[0, 1.35, 0.085]}>
          <planeGeometry args={[1.04, 0.5]} />
          <meshStandardMaterial map={textura} />
        </mesh>
      ) : null}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.75, 32]} />
        <meshBasicMaterial color="#ffd34d" transparent opacity={0.75} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * A trepadeira em espiral no tronco de escalar: mostra que aquele tronco dá para subir (a marca
 * fica no código até o Blender ganhar o nó `escalada-*`).
 */
function Trepadeira({ tronco, preparada }: { tronco: TroncoVivo; preparada: IlhaPreparada }) {
  const geometria = useMemo(() => {
    const t = tronco.tronco
    const pontos: Vector3[] = []
    const voltas = 3.2
    const n = 64
    const de = t.base.y + 0.15
    const ate = t.topo.y - 1.3
    for (let k = 0; k <= n; k++) {
      const f = k / n
      const y = de + (ate - de) * f
      const h = (y - t.base.y) / (t.topo.y - t.base.y)
      const r = t.raioBase + (t.raioTopo - t.raioBase) * h + 0.03
      const a = f * voltas * Math.PI * 2
      pontos.push(
        new Vector3(
          t.base.x + (t.topo.x - t.base.x) * h + Math.sin(a) * r,
          y,
          t.base.z + (t.topo.z - t.base.z) * h + Math.cos(a) * r,
        ),
      )
    }
    return new TubeGeometry(new CatmullRomCurve3(pontos), 160, 0.05, 6, false)
  }, [tronco])
  const material = useMemo(() => new MeshStandardMaterial({ color: '#4f8a3a', roughness: 0.8 }), [])
  useEffect(
    () => () => {
      geometria.dispose()
      material.dispose()
    },
    [geometria, material],
  )
  // O tronco da árvore (nó `tronco-*`) esmaece quando tapa a câmera: a trepadeira vai junto.
  const doTronco = useRef<Copa | null | undefined>(undefined)
  useFrame(() => {
    if (doTronco.current === undefined) {
      const t = tronco.tronco
      const meio = new Vector3(t.base.x, (t.base.y + t.topo.y) / 2, t.base.z)
      doTronco.current =
        preparada.copas.find(
          (c) =>
            c.no.name.startsWith('tronco-') && new Box3().setFromObject(c.no).containsPoint(meio),
        ) ?? null
    }
    const visivel = doTronco.current?.visivel ?? 1
    if (material.opacity === visivel) return
    const transparente = visivel < 1
    if (material.transparent !== transparente) {
      material.transparent = transparente
      material.depthWrite = !transparente
      material.needsUpdate = true
    }
    material.opacity = visivel
  })
  return <mesh geometry={geometria} material={material} />
}
