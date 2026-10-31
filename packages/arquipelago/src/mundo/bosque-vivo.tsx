import { useFrame } from '@react-three/fiber'
import { useBeforePhysicsStep } from '@react-three/rapier'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import {
  Box3,
  CanvasTexture,
  CatmullRomCurve3,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  TubeGeometry,
  Vector3,
} from 'three'
import {
  type AguaRasa,
  type BordaViva,
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
import { PERCURSO_DAS_COPAS, type PontosDoPercurso } from '../sistemas/percurso'
import { segredoObrigatorio } from '../sistemas/segredos'
import { DURACAO_DO_DIA_MS, PARTE_CLARA } from '../sistemas/tempo-do-dia'
import { forcaPorHora } from '../sistemas/vento'
import { BichosDoBosque } from './bichos-do-bosque'
import { ancorasDosLumis, BorroesDaIlha } from './borroes-da-ilha'
import {
  type AncorasDoPercurso,
  CIPOS_DO_BOSQUE,
  FOGUEIRA_DO_BOSQUE,
  GALHO_SECO_DO_BOSQUE,
  NOMES_DAS_ANCORAS_DO_PERCURSO,
  PECAS_SOLTAS_DO_BOSQUE,
  PLACA_DA_LARGADA,
  paraOMundo,
  percursoNoModelo,
  percursoNoMundo,
  TOPO_DO_BOSQUE,
  TRONCO_DOS_CIPOS,
  troncoDoNo,
  troncoNoMundo,
} from './bosque'
import { CabanaDoBosque } from './cabana-do-bosque'
import { Capi } from './capi'
import {
  type CipoDesenhado,
  desenharCipo,
  desmontarCipoDesenhado,
  prepararCipoDesenhado,
} from './cipo-desenhado'
import type { Copa } from './copas'
import { CORES_DO_VAGALUME, CorridaNaIlha } from './corrida-na-ilha'
import { FogueiraViva } from './fogueira-viva'
import { FolhasAoVento } from './folhas-ao-vento'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { useInterativo } from './interativos'
import { Mecanismos, type PontoDoArranjo } from './mecanismos'
import { giroDaIlha, PASSO_DA_FISICA } from './medidas'
import { ComReserva } from './modelos'
import { ObjetosReativos } from './objetos-reativos'
import { Ondinhas } from './ondinhas'
import { SegredoNoAlto } from './segredos-das-ilhas'
import { TroncoNoLago } from './tronco-no-lago'
import { ventoAgora } from './vegetacao-ao-vento'

/**
 * Os pés a menos disto do tampo, pisando, contam como o chão da ilha (não deque nem ponte): o que
 * o corpo sobe sozinho do chão (pedras, tocas, uns 0,58 m) ainda é chão. Com 0,25 m, cair perto da
 * placa (o terreno ali fica 0,31 m acima do tampo) não voltava ao deque. O fim do escorregador não
 * conta como queda: a chegada vem antes.
 */
const CHAO_DA_ILHA = 0.6

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

/** O segredo desta ilha (N12): o baú no alto do vento. */
const SEGREDO_BOSQUE = segredoObrigatorio('bosque')

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
  const { loja, movimento, rastro } = useJogo()
  const menosMovimento = useReducedMotion()
  const vento = useMemo(() => ({ tempo: 0, hora: 6 }), [])
  const comeco = useMemo(() => Date.parse(loja.getState().salvamento.criadoEm), [loja])
  const giro = giroDaIlha(ilha)
  const meio = useMemo(() => ({ x: centro.x, y: 0, z: centro.z }), [centro.x, centro.z])
  const lugaresDosLumis = useMemo(
    () => ancorasDosLumis(preparada.modelo, meio, giro),
    [preparada, meio, giro],
  )

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

  const fogueira = useMemo(
    () => paraOMundo(FOGUEIRA_DO_BOSQUE, meio, giro, { x: 0, y: 0, z: 0 }),
    [meio, giro],
  )

  const pecasSoltas = useMemo(
    () =>
      PECAS_SOLTAS_DO_BOSQUE.map((p) => ({
        ...paraOMundo(p, meio, giro, { x: 0, y: 0, z: 0 }),
        tipo: p.tipo,
      })),
    [meio, giro],
  )
  const galhoSeco = useMemo(
    () => paraOMundo(GALHO_SECO_DO_BOSQUE, meio, giro, { x: 0, y: 0, z: 0 }),
    [meio, giro],
  )
  const mecanismos = useMemo(() => {
    const no = (nome: string) => preparada.modelo.getObjectByName(`mecanismos-${nome}`)
    const a = no('casa')
    const b = no('rumo')
    if (!a || !b) return null
    const origem = paraOMundo(a.position, meio, giro, { x: 0, y: 0, z: 0 })
    const rumo = paraOMundo(b.position, meio, giro, { x: 0, y: 0, z: 0 })
    const giroDaPorta = Math.atan2(rumo.x - origem.x, rumo.z - origem.z)
    // A placa, o caixote e o alçapão no referencial da porta (sem as âncoras, o arranjo da sala).
    const naPorta = (nome: string): PontoDoArranjo | null => {
      const o = no(nome)
      if (!o) return null
      const p = paraOMundo(o.position, meio, giro, { x: 0, y: 0, z: 0 })
      const dx = p.x - origem.x
      const dz = p.z - origem.z
      const co = Math.cos(giroDaPorta)
      const si = Math.sin(giroDaPorta)
      return { x: dx * co - dz * si, z: dx * si + dz * co }
    }
    const placa = naPorta('placa')
    const caixote = naPorta('caixote')
    const alcapao = naPorta('alcapao')
    const arranjo = placa && caixote && alcapao ? { placa, caixote, alcapao } : undefined
    return { ...origem, giro: giroDaPorta, arranjo }
  }, [preparada, meio, giro])

  const vivos = useMemo(() => cipos.map((c) => c.vivo), [cipos])

  const tronco = useMemo<TroncoVivo>(
    () => ({
      id: `${ilha.id}:tronco-dos-cipos`,
      tronco: troncoNoMundo(troncoDoNo(preparada.modelo) ?? TRONCO_DOS_CIPOS, meio, giro),
    }),
    [preparada, meio, giro, ilha.id],
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

  // As quinas de agarrar (âncoras `borda-N-a`, `-b` e `-fora`).
  const bordas = useMemo<BordaViva[]>(() => {
    const lista: BordaViva[] = []
    const noMundo = (p: { x: number; y: number; z: number }) =>
      paraOMundo(p, meio, giro, { x: 0, y: 0, z: 0 })
    for (let i = 1; ; i++) {
      const a = preparada.modelo.getObjectByName(`borda-${i}-a`)
      const b = preparada.modelo.getObjectByName(`borda-${i}-b`)
      const fora = preparada.modelo.getObjectByName(`borda-${i}-fora`)
      if (!a || !b || !fora) break
      lista.push({
        id: `${ilha.id}:borda-${i}`,
        a: noMundo(a.position),
        b: noMundo(b.position),
        fora: noMundo(fora.position),
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
    movimento.bordas.push(...bordas)
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
      for (const b of bordas) tirar(movimento.bordas, b)
      if (escorregador) tirar(movimento.escorregadores, escorregador)
      for (const c of cipos) {
        if (c.desenho) desmontarCipoDesenhado(c.desenho)
        c.desenho = null
      }
    }
  }, [cipos, tronco, agua, equilibrios, escadas, bordas, escorregador, movimento])

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
  const pecas = useRef<Group>(null)

  useBeforePhysicsStep(() => {
    vento.tempo += PASSO_DA_FISICA
    const fracao = (Math.max(0, Date.now() - comeco) % DURACAO_DO_DIA_MS) / DURACAO_DO_DIA_MS
    vento.hora =
      (fracao < PARTE_CLARA
        ? 6 + (fracao / PARTE_CLARA) * 12
        : 18 + ((fracao - PARTE_CLARA) / (1 - PARTE_CLARA)) * 12) % 24
    passoDasCordas(vivos, movimento.corpoDesenhado, troncos, PASSO_DA_FISICA, vento)
  })
  useFrame((_, dtBruto) => {
    const u = preparada.vegetacao.uniforms
    u.arqTempoVento.value = vento.tempo
    u.arqForcaVento.value = forcaPorHora(vento.hora)
    u.arqMenosMovimento.value = menosMovimento ? 0.2 : 1
    ventoAgora.tempo = vento.tempo
    ventoAgora.forca = u.arqForcaVento.value
    ventoAgora.materiais = preparada.vegetacao.quantidade
    ventoAgora.escalaVisual = u.arqMenosMovimento.value
    u.arqPessoaVento.value.set(rastro.x, rastro.y, rastro.z)

    const _dt = Math.min(dtBruto, 0.1)
    // Placa, trepadeira e vagalumes só com a completa inteira (não pulam na frente da troca).
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
    // Os cipós são cordas de verdade (`sistemas/cordas.ts`): o corpo desenhado, o tronco e os
    // outros cipós empurram; seguro, a corda fica presa nas mãos e o resto cai junto ao corpo.
    for (const c of cipos) if (c.desenho) desenharCipo(c.desenho, c.vivo.pontos)
  })

  return (
    <group ref={pecas} visible={false}>
      <BorroesDaIlha ilha="bosque" ancoras={lugaresDosLumis} meio={meio} />
      <SegredoNoAlto segredo={SEGREDO_BOSQUE} meio={meio} giro={giro} />
      <ComReserva reserva={null}>
        <ObjetosReativos pecas={pecasSoltas} galho={galhoSeco} />
      </ComReserva>
      <FogueiraViva {...fogueira} vento={vento} />
      <ComReserva reserva={null}>
        <CabanaDoBosque modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      <FolhasAoVento vento={vento} x={meio.x + 1} y={4} z={meio.z} />
      {mecanismos && <Mecanismos {...mecanismos} />}
      {cipos.map((c) => (
        <InterativoDoCipo key={c.vivo.id} cipo={c.vivo} noChao={noChao} />
      ))}
      <Placa x={placa.x} y={placa.y} z={placa.z} giro={giro} />
      <ComReserva reserva={null}>
        <Capi modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      {agua ? (
        <ComReserva reserva={null}>
          <TroncoNoLago agua={agua} vento={vento} />
          <Ondinhas agua={agua} />
        </ComReserva>
      ) : null}
      <BichosDoBosque
        modelo={preparada.modelo}
        colisores={preparada.colisores}
        meio={meio}
        giro={giro}
      />
      <Trepadeira tronco={tronco} preparada={preparada} />
      {pontos ? (
        <CorridaNaIlha
          ilhaId={ilha.id}
          config={PERCURSO_DAS_COPAS}
          pontos={pontos}
          largada={placa}
          alturaDoChao={meio.y + TOPO_DO_BOSQUE + CHAO_DA_ILHA}
          cores={CORES_DO_VAGALUME}
        />
      ) : null}
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
 * A trepadeira em espiral no tronco de escalar (lido do nó `escalada-cil-tronco-dos-cipos`): mostra
 * que aquele tronco dá para subir.
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
