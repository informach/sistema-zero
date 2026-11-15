import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { AVATAR_CATALOG, drawAvatar } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
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
import { criarRegistro } from '../src/mundo/interativos'
import { OceanoMacro } from '../src/mundo/macro/oceano'
import { PonteMacro } from '../src/mundo/macro/ponte'
import { TerrenosMacro } from '../src/mundo/macro/terrenos'
import { GRAVIDADE, PASSO_DA_FISICA } from '../src/mundo/medidas'
import { Camera } from '../src/personagem/camera'
import { Personagem } from '../src/personagem/personagem'
import { Zappy } from '../src/personagem/zappy'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { CORPO } from '../src/sistemas/corpo'
import {
  ARQUIPELAGO,
  alturaDoArquipelago,
  alturaDoTerritorio,
  conexaoDaIlha,
  DISTRITOS_DA_FAISCA,
  ilhaDoArquipelago,
  type PontoDoTerritorio,
  paraLocal,
  territorioEm,
} from '../src/sistemas/geografia-do-arquipelago'
import { estadoDaPonte, SEGUNDOS_PARA_RECONSTRUIR } from '../src/sistemas/ponte-do-arquipelago'
import { LADO_DO_SETOR } from '../src/sistemas/setores-do-arquipelago'
import { CHAVE_DO_ENSAIO, ensaioInicial, lerEnsaio, partidaDoEnsaio } from './macro-estado'
import { ESTILOS_MACRO, InterfaceMacro, type MedidaMacro } from './macro-interface'

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
  setores: 0,
}

function Marcos() {
  const ilha = ilhaDoArquipelago('sua-ilha')
  return DISTRITOS_DA_FAISCA.map((d) => (
    <group key={d.id} position={[d.x, alturaDoTerritorio(ilha, d.x, d.z), d.z]}>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9, 9.25, 40]} />
        <meshBasicMaterial color={d.cor} />
      </mesh>
      <mesh position={[7, 2, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
        <meshStandardMaterial color={d.cor} />
      </mesh>
      <mesh position={[7, 4.5, 0]}>
        <sphereGeometry args={[0.8, 12, 8]} />
        <meshStandardMaterial color={d.cor} emissive={d.cor} emissiveIntensity={0.2} />
      </mesh>
    </group>
  ))
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
}: {
  partida: PontoDoTerritorio
  instalado: boolean
  construindoDesde: number | null
  foco: PontoDoTerritorio | null
  aoPronto: (x: number, z: number) => void
  aoConcluir: () => void
  aoMedir: (m: MedidaMacro) => void
  noite: boolean
}) {
  const { rastro, loja } = useJogo()
  const gl = useThree((s) => s.gl)
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
      setores: setores.current,
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
        args={[noite ? '#b9cdeb' : '#fff6df', noite ? '#7f91a3' : '#758c71', noite ? 1.2 : 1.5]}
      />
      <directionalLight
        position={[300, 500, -100]}
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
          <TerrenosMacro aoMudar={medirSetores} foco={foco} aoPronto={aoPronto} />
          {CONEXOES.map((c) => (
            <PonteMacro
              key={c.id}
              conexao={c}
              estado={c.id === 'bosque' ? situacao : 'quebrada'}
              progresso={progresso}
            />
          ))}
          <Marcos />
          <Personagem partida={partida} interior={FORA_DE_CASA} />
          <Camera chaoDoCenario={alturaDoArquipelago} baseDoCenario={ALTURA_BASE} />
        </Physics>
        <Zappy />
      </Suspense>
    </>
  )
}

function Blockout() {
  const [inicial] = useState(() => {
    try {
      return { ensaio: lerEnsaio(localStorage.getItem(CHAVE_DO_ENSAIO)), erro: null }
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
        inclinacao: 0.5,
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
    contexto.movimento.rodasDeNado = ARQUIPELAGO.filter(
      (i) => i.id === 'sua-ilha' || (i.id === 'bosque' && instalado),
    ).map((i) => ({ ...i.centro, livre: i.raio + 12 }))
  }, [contexto, instalado])
  const guardar = useCallback(() => {
    if (inicial.erro) return
    try {
      localStorage.setItem(CHAVE_DO_ENSAIO, JSON.stringify(ensaio.current))
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
      const ilha = territorioEm(m.x, m.z)
      if (ilha && (ilha.id !== 'bosque' || ensaio.current.ponteInstalada)) {
        const local = paraLocal(ilha, m)
        const y = alturaDoTerritorio(ilha, local.x, local.z)
        if (y > 0 && m.y - CORPO.doCentroAoPe >= y - 0.5)
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
    if (d) p = { x: d.x, y: alturaDoArquipelago(d.x, d.z), z: d.z }
    else if (id === 'ponte') p = { ...PONTE.origem, z: PONTE.origem.z + 4 }
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
        />
      </Canvas>
      <ControlesDeToque />
      <InterfaceMacro
        medida={medida}
        ponte={instalado ? 'aberta' : construindoDesde !== null ? 'reconstruindo' : 'quebrada'}
        erro={erro}
        pausado={pausado}
        aoPausar={pausar}
        aoReconstruir={() => setConstruindoDesde(0)}
        aoIr={ir}
        aoReiniciar={() => {
          localStorage.removeItem(CHAVE_DO_ENSAIO)
          location.reload()
        }}
        noite={noite}
        aoNoite={() => setNoite(!noite)}
      />
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
