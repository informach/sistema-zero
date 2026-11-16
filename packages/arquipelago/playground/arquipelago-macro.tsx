import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { AVATAR_CATALOG, drawAvatar } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Object3D, PCFShadowMap } from 'three'
import { criarControle, ligarTeclado } from '../src/controles/controle'
import { ligarGamepad } from '../src/controles/gamepad'
import {
  Contexto,
  type ContextoDoJogo,
  criarMovimento,
  useEstado,
  useJogo,
} from '../src/estado/contexto'
import { criarLoja } from '../src/estado/loja'
import { ESTILOS } from '../src/interface/estilos'
import { ControlesDeToque } from '../src/interface/toque'
import { CaminhosDaFaisca, ROTAS_COMPLETAS_DA_FAISCA } from '../src/mundo/faisca/caminhos'
import { MedirPercurso, type PedidoDeMedicao } from '../src/mundo/faisca/medir-percurso'
import { PilotoDaFaisca, type SituacaoDoPiloto } from '../src/mundo/faisca/piloto'
import { PinturaDoSolo } from '../src/mundo/faisca/pintura-do-solo'
import { criarRegistro } from '../src/mundo/interativos'
import { OceanoMacro } from '../src/mundo/macro/oceano'
import { PonteMacro } from '../src/mundo/macro/ponte'
import { TerrenosMacro } from '../src/mundo/macro/terrenos'
import { GRAVIDADE, PASSO_DA_FISICA } from '../src/mundo/medidas'
import { Camera } from '../src/personagem/camera'
import { Personagem } from '../src/personagem/personagem'
import { Zappy } from '../src/personagem/zappy'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { pontoLivreParaRetomar } from '../src/sistemas/composicao-faisca'
import { CORPO } from '../src/sistemas/corpo'
import { LUGAR_DA_FAISCA, type LugarDaFaiscaId, ROTAS_DA_FAISCA } from '../src/sistemas/faisca'
import {
  ARQUIPELAGO,
  alturaDoArquipelago,
  alturaDoTerritorio,
  conexaoDaIlha,
  DISTRITOS_DA_FAISCA,
  type PontoDoTerritorio,
  paraLocal,
  territorioEm,
} from '../src/sistemas/geografia-do-arquipelago'
import { LAGO_DA_FAISCA } from '../src/sistemas/lago-da-faisca'
import type { MedicaoDePercurso } from '../src/sistemas/medicao-de-percurso'
import { estadoDaPonte, SEGUNDOS_PARA_RECONSTRUIR } from '../src/sistemas/ponte-do-arquipelago'
import {
  INICIO_DA_PROVA,
  ROTA_DA_PROVA,
  tipoDaCuradoria,
} from '../src/sistemas/prova-curadoria-faisca'
import { LAGO_DE_CATALOGO, pisoDoRefino } from '../src/sistemas/refino-da-faisca'
import { LADO_DO_SETOR } from '../src/sistemas/setores-do-arquipelago'
import { ConversaDaIrisDeEstudo } from './faisca-interface'
import { CameraDaCaptura, vistaDaFaisca } from './faisca-vistas'
import { CHAVE_DO_ENSAIO, ensaioInicial, lerEnsaio, partidaDoEnsaio } from './macro-estado'
import { ESTILOS_MACRO, InterfaceMacro, type MedidaMacro } from './macro-interface'

const VISTA = vistaDaFaisca(new URLSearchParams(location.search).get('vista'))
const CURADORIA = tipoDaCuradoria(new URLSearchParams(location.search).get('curadoria'))
const PISO = pisoDoRefino(
  new URLSearchParams(location.search).get('refino') ?? (CURADORIA ? null : 'templo'),
)
const AGUA_AVENTURA = new URLSearchParams(location.search).get('agua') === 'aventura'
const ROTAS_SEM_PILOTO = PISO
  ? ROTAS_COMPLETAS_DA_FAISCA.filter(
      (r) =>
        ![
          'casa-praca',
          'praca-horta',
          'praca-patio',
          'praca-costa',
          'praca-farol',
          'patio-oficina',
          'lago-horta',
        ].includes(r.id),
    ).map((r) => (r.id === 'costa-pier' ? { ...r, pontos: r.pontos.slice(1) } : r))
  : ROTAS_COMPLETAS_DA_FAISCA
const CHAVE_ATIVA =
  PISO || new URLSearchParams(location.search).has('lago')
    ? `${CHAVE_DO_ENSAIO}:concepts:${PISO ?? 'base'}:${LAGO_DE_CATALOGO ? 'l2' : 'l1'}`
    : CHAVE_DO_ENSAIO
const ROTAS_DO_SOLO =
  CURADORIA === 'a'
    ? [
        ...ROTAS_SEM_PILOTO,
        {
          id: 'prova-curadoria',
          nome: 'Ensaio de caminhos',
          tipo: 'cotidiano' as const,
          pontos: ROTA_DA_PROVA,
        },
      ]
    : ROTAS_SEM_PILOTO

const CONEXOES = ARQUIPELAGO.slice(1).map((i) => conexaoDaIlha(i.id))
const PONTE = conexaoDaIlha('bosque')
const FORA_DE_CASA = () => false
const ALTURA_BASE = (x: number, z: number) => alturaDoArquipelago(x, z)
const VAZIA: MedidaMacro = {
  x: 0,
  y: 0,
  z: 0,
  ilha: 'sua-ilha',
  fps: 0,
  chamadas: 0,
  triangulos: 0,
  geometrias: 0,
  texturas: 0,
  setores: 0,
  distanciaCamera: 0,
  giroCamera: 0,
  nadando: false,
}

function MundoMacro({
  partida,
  instalado,
  construindoDesde,
  foco,
  aoPronto,
  aoConcluir,
  aoMedir,
  noite,
  aoArte,
  tentativaArte,
  pedidoMedicao,
  aoMedicao,
}: {
  partida: PontoDoTerritorio
  instalado: boolean
  construindoDesde: number | null
  foco: PontoDoTerritorio | null
  aoPronto: (x: number, z: number) => void
  aoConcluir: () => void
  aoMedir: (m: MedidaMacro) => void
  noite: boolean
  aoArte: (s: SituacaoDoPiloto) => void
  tentativaArte: number
  pedidoMedicao: PedidoDeMedicao | null
  aoMedicao: (m: MedicaoDePercurso | null) => void
}) {
  const { rastro, loja } = useJogo()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const sol = useMemo(() => {
    const alvo = new Object3D()
    alvo.position.set(0, 4, 140)
    return alvo
  }, [])
  const pausado = useEstado((s) => s.menuAberto)
  const [tempo, setTempo] = useState(0)
  const tempoAtual = useRef(0)
  const setores = useRef(0)
  const amostra = useRef({ tempo: 0, quadros: 0 })
  const medirSetores = useCallback((n: number) => {
    setores.current = n
  }, [])
  useFrame((_, dt) => {
    if (!loja.getState().menuAberto) tempoAtual.current += Math.min(dt, 0.1)
    const a = amostra.current
    a.tempo += dt
    a.quadros++
    if (construindoDesde !== null) {
      setTempo(tempoAtual.current)
      if (tempoAtual.current - construindoDesde >= SEGUNDOS_PARA_RECONSTRUIR) aoConcluir()
    }
    if (a.tempo < 0.5) return
    const ilha = territorioEm(rastro.x, rastro.z)
    aoMedir({
      x: rastro.x,
      y: rastro.y,
      z: rastro.z,
      ilha: ilha?.id ?? '',
      fps: Math.round(a.quadros / a.tempo),
      chamadas: gl.info.render.calls,
      triangulos: gl.info.render.triangles,
      geometrias: gl.info.memory.geometries,
      texturas: gl.info.memory.textures,
      setores: setores.current,
      distanciaCamera: Math.hypot(
        camera.position.x - rastro.x,
        camera.position.y - rastro.y - CORPO.doCentro.olhos,
        camera.position.z - rastro.z,
      ),
      giroCamera: rastro.giro,
      nadando: loja.getState().nadando,
    })
    a.tempo = 0
    a.quadros = 0
  })
  // A reconstrução usa o mesmo relógio ativo que a animação; o início é entregue pelo comando.
  useEffect(() => {
    if (construindoDesde !== null) tempoAtual.current = construindoDesde
  }, [construindoDesde])
  const situacao = estadoDaPonte(instalado || construindoDesde !== null, construindoDesde, tempo)
  const progresso =
    construindoDesde === null
      ? 0
      : Math.min(1, (tempo - construindoDesde) / SEGUNDOS_PARA_RECONSTRUIR)
  return (
    <>
      <color attach="background" args={[noite ? '#233349' : '#c6dce0']} />
      <fog attach="fog" args={[noite ? '#233349' : '#c6dce0', 1600, 3100]} />
      <hemisphereLight
        args={[noite ? '#b9cdeb' : '#fff1d3', noite ? '#7f91a3' : '#65755a', noite ? 1.2 : 1.15]}
      />
      <primitive object={sol} />
      <directionalLight
        target={sol}
        position={[70, 120, 180]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-normalBias={0.04}
        intensity={noite ? 0.8 : 2}
        color={noite ? '#a9bddf' : '#fff0d0'}
      />
      <Suspense fallback={null}>
        <Physics
          paused={pausado}
          gravity={[0, -GRAVIDADE, 0]}
          timeStep={PASSO_DA_FISICA}
          interpolate
          updatePriority={-1}
        >
          <OceanoMacro />
          <PinturaDoSolo rotas={ROTAS_DO_SOLO}>
            <TerrenosMacro aoMudar={medirSetores} foco={foco} aoPronto={aoPronto} />
          </PinturaDoSolo>
          {CONEXOES.map((c) => (
            <PonteMacro
              key={c.id}
              conexao={c}
              estado={c.id === 'bosque' ? situacao : 'quebrada'}
              progresso={progresso}
            />
          ))}
          <CaminhosDaFaisca
            marcos={!VISTA && new URLSearchParams(location.search).get('debug') === 'lugares'}
          />
          <MedirPercurso pedido={pedidoMedicao} aoMudar={aoMedicao} />
          <PilotoDaFaisca
            key={tentativaArte}
            aoMudar={aoArte}
            curadoria={CURADORIA}
            piso={PISO}
            aguaAventura={AGUA_AVENTURA}
            noite={noite}
          />
          <Personagem partida={partida} interior={FORA_DE_CASA} />
          {VISTA ? (
            <CameraDaCaptura vista={VISTA} />
          ) : (
            <Camera chaoDoCenario={alturaDoArquipelago} baseDoCenario={ALTURA_BASE} />
          )}
        </Physics>
        <Zappy />
      </Suspense>
    </>
  )
}

function Blockout() {
  const [inicial] = useState(() => {
    if (VISTA || CURADORIA) {
      const ensaio = ensaioInicial()
      const [x, z] = VISTA?.avatar ?? [INICIO_DA_PROVA.x, INICIO_DA_PROVA.z]
      ensaio.posicao.local = { x, z, y: alturaDoArquipelago(x, z) }
      return { ensaio, erro: null }
    }
    try {
      return { ensaio: lerEnsaio(localStorage.getItem(CHAVE_ATIVA)), erro: null }
    } catch (e) {
      return {
        ensaio: ensaioInicial(),
        erro: e instanceof Error ? e.message : 'Não foi possível ler o ensaio.',
      }
    }
  })
  const ensaio = useRef(inicial.ensaio)
  const [erro, setErro] = useState<string | null>(inicial.erro)
  const [medida, setMedida] = useState(VAZIA)
  const [instalado, setInstalado] = useState(inicial.ensaio.ponteInstalada)
  const [construindoDesde, setConstruindoDesde] = useState<number | null>(null)
  const [foco, setFoco] = useState<PontoDoTerritorio | null>(null)
  const [noite, setNoite] = useState(new URLSearchParams(location.search).get('noite') === '1')
  const [arte, setArte] = useState<SituacaoDoPiloto>({ estado: 'carregando', modelos: 0 })
  const [tentativaArte, setTentativaArte] = useState(0)
  const [pedidoMedicao, setPedidoMedicao] = useState<PedidoDeMedicao | null>(null)
  const [medicao, setMedicao] = useState<MedicaoDePercurso | null>(null)
  const [visitados, setVisitados] = useState<string[]>(inicial.ensaio.visitados)
  const contexto = useMemo<ContextoDoJogo>(() => {
    const partida = partidaDoEnsaio(inicial.ensaio, CORPO.doCentroAoPe)
    const loja = criarLoja({
      salvamento: { ...criarSalvamentoInicial(new Date()), posicao: partida },
      jornada: 1,
      quarto: { theme: 'padrao', placedItems: [], pet: null },
      avatar: { slots: drawAvatar(AVATAR_CATALOG, 'plataforma-falsa') },
      acesso: { liberado: true, motivo: null, limiteDiarioMinutos: null, usadoHojeSegundos: 0 },
      aoMudar: () => {},
    })
    loja.setState({ dentroDeCasa: false })
    return {
      loja,
      gerenteTempo: null,
      plataforma: criarPlataformaFalsa({ persistir: false }),
      controle: criarControle(),
      interativos: criarRegistro(),
      rastro: {
        ...partida,
        giro: 0,
        inclinacao: 0.3,
        direcao: Math.PI,
        velocidade: 0,
        zappy: { x: 0, y: 0, z: 0 },
      },
      ambiente: { luz: 1, noite: false },
      pedidos: { teleporte: null, chaoChegando: new Set(), olharPara: null, conversa: null },
      movimento: criarMovimento(),
    }
  }, [inicial])
  const partida = useMemo(() => partidaDoEnsaio(inicial.ensaio, CORPO.doCentroAoPe), [inicial])
  const [pausado, setPausado] = useState(false)
  const pausar = useCallback(
    () => contexto.loja.getState().abrirMenu(!contexto.loja.getState().menuAberto),
    [contexto],
  )
  useEffect(() => contexto.loja.subscribe((s) => setPausado(s.menuAberto)), [contexto])
  useEffect(() => ligarTeclado(contexto.controle), [contexto])
  useEffect(() => ligarGamepad(contexto.controle, pausar), [contexto, pausar])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.code === 'Escape') pausar()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [pausar])
  useEffect(() => {
    contexto.movimento.aguas = [
      LAGO_DE_CATALOGO
        ? LAGO_DA_FAISCA.agua
        : {
            id: 'lago-dos-campos',
            x: LAGO_DA_FAISCA.x,
            z: LAGO_DA_FAISCA.z,
            raioX: 8,
            raioZ: 4,
            giro: 0,
            y: 3.65,
          },
    ]
    contexto.ambiente.noite = noite
  }, [contexto, noite])
  useEffect(() => {
    contexto.movimento.rodasDeNado = ARQUIPELAGO.filter(
      (i) => i.id === 'sua-ilha' || (i.id === 'bosque' && instalado),
    ).map((i) => ({ ...i.centro, livre: i.raio + 12 }))
  }, [contexto, instalado])
  const guardar = useCallback(() => {
    if (inicial.erro || VISTA || CURADORIA) return
    try {
      localStorage.setItem(CHAVE_ATIVA, JSON.stringify(ensaio.current))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível guardar este ensaio.')
    }
  }, [inicial])
  useEffect(() => {
    const t = setInterval(guardar, 5000)
    const esconder = () => {
      if (document.visibilityState === 'hidden') guardar()
    }
    document.addEventListener('visibilitychange', esconder)
    window.addEventListener('pagehide', guardar)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', esconder)
      window.removeEventListener('pagehide', guardar)
      guardar()
    }
  }, [guardar])
  const medir = useCallback(
    (m: MedidaMacro) => {
      setMedida(m)
      const novos = Object.entries(LUGAR_DA_FAISCA)
        .filter(
          ([id, p]) =>
            !ensaio.current.visitados.includes(id) && Math.hypot(p.x - m.x, p.z - m.z) < 6,
        )
        .map(([id]) => id)
      if (novos.length) {
        ensaio.current.visitados.push(...novos)
        setVisitados([...ensaio.current.visitados])
      }
      const ilha = territorioEm(m.x, m.z)
      if (ilha && (ilha.id !== 'bosque' || ensaio.current.ponteInstalada)) {
        const local = paraLocal(ilha, m)
        const y = alturaDoTerritorio(ilha, local.x, local.z)
        if (
          y > 0 &&
          m.y - CORPO.doCentroAoPe >= y - 0.5 &&
          (ilha.id !== 'sua-ilha' || pontoLivreParaRetomar(m, CORPO.raio))
        )
          ensaio.current.posicao = { ilha: ilha.id, local: { x: local.x, y, z: local.z } }
      }
      if (foco && Math.hypot(m.x - foco.x, m.z - foco.z) < 3) setFoco(null)
    },
    [foco],
  )
  const pronto = useCallback(
    (x: number, z: number) => {
      if (
        !foco ||
        Math.floor(foco.x / LADO_DO_SETOR) !== x ||
        Math.floor(foco.z / LADO_DO_SETOR) !== z
      )
        return
      contexto.pedidos.teleporte = foco
      contexto.pedidos.olharPara = Math.PI
      contexto.pedidos.chaoChegando.delete('macro')
    },
    [foco, contexto],
  )
  const ir = (id: string) => {
    const d = DISTRITOS_DA_FAISCA.find((d) => d.id === id)
    let p: PontoDoTerritorio
    if (id.startsWith('lugar:') && Object.hasOwn(LUGAR_DA_FAISCA, id.slice(6))) {
      const lugar = LUGAR_DA_FAISCA[id.slice(6) as LugarDaFaiscaId]
      p = { ...lugar, y: alturaDoArquipelago(lugar.x, lugar.z) }
    } else if (d) {
      const marco = LUGAR_DA_FAISCA[d.marco]
      p = { ...marco, y: alturaDoArquipelago(marco.x, marco.z) }
    } else if (id === 'ponte') p = { ...PONTE.origem, z: PONTE.origem.z + 4 }
    else if (id === 'bosque-chegada' && instalado) p = { ...PONTE.destino, z: PONTE.destino.z - 4 }
    else return
    contexto.movimento.ida = null
    contexto.pedidos.chaoChegando.add('macro')
    setFoco({ ...p, y: p.y + CORPO.doCentroAoPe + 0.25 })
  }
  const concluir = useCallback(() => {
    ensaio.current.ponteInstalada = true
    setInstalado(true)
    setConstruindoDesde(null)
    guardar()
  }, [guardar])
  return (
    <Contexto.Provider value={contexto}>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        className="arq-canvas"
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        camera={{ fov: 55, near: 0.15, far: 3600 }}
      >
        <MundoMacro
          partida={partida}
          instalado={instalado}
          construindoDesde={construindoDesde}
          foco={foco}
          aoPronto={pronto}
          aoConcluir={concluir}
          aoMedir={medir}
          noite={noite}
          aoArte={setArte}
          tentativaArte={tentativaArte}
          pedidoMedicao={pedidoMedicao}
          aoMedicao={setMedicao}
        />
      </Canvas>
      <div style={{ visibility: VISTA ? 'hidden' : undefined }}>
        <ControlesDeToque />
        <ConversaDaIrisDeEstudo />
        <InterfaceMacro
          medida={medida}
          ponte={instalado ? 'aberta' : construindoDesde !== null ? 'reconstruindo' : 'quebrada'}
          erro={erro}
          pausado={pausado}
          aoPausar={pausar}
          aoReconstruir={() => setConstruindoDesde(0)}
          aoIr={ir}
          aoReiniciar={() => {
            localStorage.removeItem(CHAVE_ATIVA)
            location.reload()
          }}
          noite={noite}
          aoNoite={() => setNoite(!noite)}
          arte={arte}
          aoTentarArte={() => setTentativaArte((n) => n + 1)}
          visitados={visitados}
          aoVoltar={(id) => {
            if (visitados.includes(id)) ir(`lugar:${id}`)
          }}
          medicao={medicao}
          aoMedirRota={(id) => {
            const r = ROTAS_DA_FAISCA.find((r) => r.id === id)
            if (!r) return
            const p = r.pontos[0]!
            contexto.movimento.ida = null
            contexto.pedidos.chaoChegando.add('macro')
            setFoco({ ...p, y: alturaDoArquipelago(p.x, p.z) + CORPO.doCentroAoPe + 0.25 })
            setPedidoMedicao({ rota: id, numero: Date.now() })
          }}
        />
      </div>
    </Contexto.Provider>
  )
}

const elemento = document.getElementById('jogo')
if (elemento) {
  const estilo = document.createElement('style')
  estilo.textContent = ESTILOS + ESTILOS_MACRO
  const raiz = document.createElement('div')
  raiz.className = 'arq-raiz'
  elemento.append(estilo, raiz)
  createRoot(raiz).render(<Blockout />)
}
