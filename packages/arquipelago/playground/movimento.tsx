import { Html } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace } from 'three'
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
import { FogueiraViva } from '../src/mundo/fogueira-viva'
import { criarRegistro } from '../src/mundo/interativos'
import { Mecanismos } from '../src/mundo/mecanismos'
import { GRAVIDADE, LONGE_DA_CAMERA, PASSO_DA_FISICA, PERTO_DA_CAMERA } from '../src/mundo/medidas'
import { Medidor } from '../src/mundo/medidor'
import { ComReserva } from '../src/mundo/modelos'
import { ObjetosReativos, type PecaSolta } from '../src/mundo/objetos-reativos'
import { Camera } from '../src/personagem/camera'
import { Personagem } from '../src/personagem/personagem'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { alturaDoPulo, CORPO } from '../src/sistemas/corpo'
import { beiradaMaximaAgarrando } from '../src/sistemas/modos/borda'
import {
  BLOCOS,
  type Bloco,
  BORDAS_DAS_BEIRADAS,
  EIXO_DO_TRONCO_CAIDO,
  ESCADA_DA_TORRE,
  ESTACOES,
  LAGUINHO,
  naSala,
  PISTA_DA_TORRE,
  ROTULOS,
} from './sala-de-movimento'

/**
 * A sala de testes do movimento (`/movimento` no playground; controlador universal, parte 4): o
 * personagem e a câmera do jogo de verdade num chão plano com um obstáculo de cada tipo
 * (`sala-de-movimento.ts`) e as medidas na tela. Os cinco testes do levantamento: andar e correr
 * com transição (pista), degraus e rampas, pular entre plataformas e aterrissar, entrar e sair da
 * água (laguinho) e câmera estável (parede, árvore e corredor).
 *
 * `?estacao=Laguinho` começa numa estação. Com `localStorage['arquipelago:medir'] = '1'`, o
 * `__arquipelagoDesenho` e o `__arquipelagoLevar` do jogo valem aqui também; `__salaDeMovimento`
 * guarda as medidas da tela e `__peNaSala`, o pé a cada quadro (no mundo, com `noChao`).
 */
const q = new URLSearchParams(location.search)

function texturaQuadriculada(w: number, d: number): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = '#e6ecdb'
    g.fillRect(0, 0, 64, 64)
    g.fillStyle = '#d3dcc4'
    g.fillRect(0, 0, 32, 32)
    g.fillRect(32, 32, 32, 32)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.magFilter = NearestFilter
  t.colorSpace = SRGBColorSpace
  // Cada repetição tem 2 m (quatro quadrados de 1 m).
  t.repeat.set(w / 2, d / 2)
  return t
}

function PecaDaSala({ bloco }: { bloco: Bloco }) {
  const centro = naSala(...bloco.centro)
  const posicao: [number, number, number] = [centro.x, centro.y, centro.z]
  const tamanho: [number, number, number] = [
    bloco.meio[0] * 2,
    bloco.meio[1] * 2,
    bloco.meio[2] * 2,
  ]
  const giro = bloco.giro ? ([...bloco.giro] as [number, number, number]) : undefined
  const textura = useMemo(
    () => (bloco.quadriculado ? texturaQuadriculada(tamanho[0], tamanho[2]) : null),
    [bloco.quadriculado, tamanho[0], tamanho[2]],
  )
  return (
    <>
      <mesh position={posicao} rotation={giro}>
        <boxGeometry args={tamanho} />
        <meshStandardMaterial color={textura ? '#ffffff' : bloco.cor} map={textura} />
      </mesh>
      {bloco.semColisao ? null : (
        <CuboidCollider args={[...bloco.meio]} position={posicao} rotation={giro} />
      )}
    </>
  )
}

function Rotulo({ x, y, z, children }: { x: number; y: number; z: number; children: string }) {
  const p = naSala(x, y, z)
  return (
    <Html position={[p.x, p.y, p.z]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
      <span className="sala-rotulo">{children}</span>
    </Html>
  )
}

/** A velocidade mostrada é a média deste tanto de segundos. */
const JANELA_DA_VELOCIDADE = 0.5
/** Subiu mais que isto no ar: foi um pulo (o resto é queda). */
const SUBIU = 0.05
const NOME_DO_MODO: Record<string, string> = {
  chao: 'chão',
  nado: 'nado',
  cipo: 'cipó',
  escalada: 'escalada',
  equilibrio: 'equilíbrio',
  escada: 'escada',
  escorregar: 'escorregando',
  borda: 'na borda',
}
/** No celular o painel começa fechado (cobriria metade da tela). */
const ABRE_O_PAINEL = typeof window !== 'undefined' && window.innerWidth > 600
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function Sala() {
  const { movimento } = useJogo()
  // O laguinho é água rasa como o lago do Bosque: a elipse cobre o buraco inteiro (no chão seco
  // em volta a água fica abaixo da cintura, então ali não se nada).
  useEffect(() => {
    const meio = naSala(
      (LAGUINHO.x0 + LAGUINHO.x1) / 2,
      LAGUINHO.agua,
      (LAGUINHO.z0 + LAGUINHO.z1) / 2,
    )
    const agua = {
      id: 'laguinho',
      x: meio.x,
      z: meio.z,
      raioX: ((LAGUINHO.x1 - LAGUINHO.x0) / 2) * Math.SQRT2,
      raioZ: ((LAGUINHO.z1 - LAGUINHO.z0) / 2) * Math.SQRT2,
      giro: 0,
      y: meio.y,
    }
    movimento.aguas.push(agua)
    // O tronco caído, no mundo (o eixo no meio do tampo).
    const e = EIXO_DO_TRONCO_CAIDO
    const eixo = { id: e.id, a: naSala(e.a.x, e.a.y, e.a.z), b: naSala(e.b.x, e.b.y, e.b.z) }
    movimento.equilibrios.push(eixo)
    const t = ESCADA_DA_TORRE
    const escada = {
      id: t.id,
      base: naSala(t.base.x, t.base.y, t.base.z),
      topo: naSala(t.topo.x, t.topo.y, t.topo.z),
      saida: naSala(t.saida.x, t.saida.y, t.saida.z),
      largura: t.largura,
    }
    movimento.escadas.push(escada)
    const pista = {
      id: PISTA_DA_TORRE.id,
      largura: PISTA_DA_TORRE.largura,
      pontos: PISTA_DA_TORRE.pontos.map((p) => naSala(p.x, p.y, p.z)),
    }
    movimento.escorregadores.push(pista)
    const bordas = BORDAS_DAS_BEIRADAS.map((b) => ({
      id: b.id,
      a: naSala(b.a.x, b.a.y, b.a.z),
      b: naSala(b.b.x, b.b.y, b.b.z),
      fora: naSala(b.fora.x, b.fora.y, b.fora.z),
    }))
    movimento.bordas.push(...bordas)
    return () => {
      for (const b of bordas) movimento.bordas.splice(movimento.bordas.indexOf(b), 1)
      movimento.escorregadores.splice(movimento.escorregadores.indexOf(pista), 1)
      movimento.escadas.splice(movimento.escadas.indexOf(escada), 1)
      movimento.aguas.splice(movimento.aguas.indexOf(agua), 1)
      movimento.equilibrios.splice(movimento.equilibrios.indexOf(eixo), 1)
    }
  }, [movimento])
  const agua = naSala(
    (LAGUINHO.x0 + LAGUINHO.x1) / 2,
    LAGUINHO.agua,
    (LAGUINHO.z0 + LAGUINHO.z1) / 2,
  )
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {BLOCOS.map((b, i) => (
          // A sala é fixa: a ordem dos blocos não muda.
          // biome-ignore lint/suspicious/noArrayIndexKey: lista constante
          <PecaDaSala key={i} bloco={b} />
        ))}
      </RigidBody>
      <mesh position={[agua.x, agua.y, agua.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[LAGUINHO.x1 - LAGUINHO.x0, LAGUINHO.z1 - LAGUINHO.z0]} />
        <meshStandardMaterial color="#3aa6c4" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      {ROTULOS.map((r) => (
        <Rotulo key={r.texto + r.x} x={r.x} y={r.y} z={r.z}>
          {r.texto}
        </Rotulo>
      ))}
    </>
  )
}

export interface MedidasDaSala {
  velocidade: number
  maiorVelocidade: number
  modo: string
  noChao: boolean
  nadando: boolean
  /** Do pé no chão ao pé no alto, no último pulo ou queda. */
  alturaDoPulo: number | null
  /** No plano, da saída do chão à volta a ele. */
  distanciaDoPulo: number | null
  /** O tranco da câmera de um quadro para o outro, em relação ao personagem (cm). */
  tremorDaCamera: number
  quadrosPorSegundo: number
}

/** Mede a cada quadro e mostra cinco vezes por segundo. */
function Medidas({ aoMedir }: { aoMedir: (m: MedidasDaSala) => void }) {
  const { rastro, movimento, loja } = useJogo()
  const camera = useThree((s) => s.camera)
  const m = useRef({
    relogio: 0,
    /** O pé nos últimos instantes (para a velocidade numa janela, sem o ruído de cada quadro). */
    amostras: [] as { t: number; x: number; z: number }[],
    /** A câmera em relação ao pé nos dois quadros anteriores. */
    deslocamentos: [] as { x: number; y: number; z: number }[],
    vel: 0,
    maior: 0,
    noAr: null as { x: number; z: number; y: number; alto: number } | null,
    altura: null as number | null,
    distancia: null as number | null,
    tremor: 0,
    tempo: 0,
    quadros: 0,
  }).current
  useFrame((_, dtBruto) => {
    const dt = Math.max(dtBruto, 1e-4)
    const pe = { x: rastro.x, y: rastro.y - CORPO.doCentroAoPe, z: rastro.z }
    // O pé a cada quadro, para os scripts de conferência (o medidor do jogo só escreve de tempo em tempo).
    ;(globalThis as { __peNaSala?: unknown }).__peNaSala = { ...pe, noChao: movimento.noChao }
    m.relogio += dt
    const ultima = m.amostras[m.amostras.length - 1]
    // Teleporte zera a janela.
    if (ultima && Math.hypot(pe.x - ultima.x, pe.z - ultima.z) > 3) m.amostras.length = 0
    m.amostras.push({ t: m.relogio, x: pe.x, z: pe.z })
    while (m.amostras.length > 2 && m.relogio - (m.amostras[1]?.t ?? 0) > JANELA_DA_VELOCIDADE) {
      m.amostras.shift()
    }
    const primeira = m.amostras[0]
    if (primeira && m.relogio > primeira.t) {
      m.vel = Math.hypot(pe.x - primeira.x, pe.z - primeira.z) / (m.relogio - primeira.t)
      m.maior = Math.max(m.maior * (1 - dt * 0.2), m.vel)
    }
    // A câmera segue o corpo com atraso suave; tremor é o atraso mudar aos trancos de um quadro para
    // o outro (a segunda diferença do lugar da câmera em relação ao pé).
    const cam = camera.position
    const d = { x: cam.x - pe.x, y: cam.y - pe.y, z: cam.z - pe.z }
    const [d1, d2] = m.deslocamentos
    if (d1 && d2 && m.amostras.length > 2) {
      const t =
        Math.hypot(d.x - 2 * d1.x + d2.x, d.y - 2 * d1.y + d2.y, d.z - 2 * d1.z + d2.z) * 100
      m.tremor += (t - m.tremor) * Math.min(1, dt * 4)
    }
    m.deslocamentos = [d, d1 ?? d]

    const nadando = loja.getState().nadando
    const noChao = movimento.noChao || nadando
    if (!noChao && movimento.modo === 'chao') {
      if (!m.noAr) m.noAr = { x: pe.x, z: pe.z, y: pe.y, alto: pe.y }
      m.noAr.alto = Math.max(m.noAr.alto, pe.y)
    } else if (m.noAr) {
      // Só conta o que subiu (pulo); cair de uma beirada não muda a medida.
      if (m.noAr.alto - m.noAr.y > SUBIU) {
        m.altura = m.noAr.alto - m.noAr.y
        m.distancia = Math.hypot(pe.x - m.noAr.x, pe.z - m.noAr.z)
      }
      m.noAr = null
    }

    m.tempo += dtBruto
    m.quadros++
    if (m.tempo < 0.2) return
    const medidas: MedidasDaSala = {
      velocidade: m.vel,
      maiorVelocidade: m.maior,
      modo: nadando ? 'nado' : movimento.modo,
      noChao: movimento.noChao,
      nadando,
      alturaDoPulo: m.altura,
      distanciaDoPulo: m.distancia,
      tremorDaCamera: m.tremor,
      quadrosPorSegundo: Math.round(m.quadros / m.tempo),
    }
    m.tempo = 0
    m.quadros = 0
    ;(globalThis as { __salaDeMovimento?: MedidasDaSala }).__salaDeMovimento = medidas
    aoMedir(medidas)
  })
  return null
}

function Painel({
  medidas,
  contexto,
}: {
  medidas: MedidasDaSala | null
  contexto: ContextoDoJogo
}) {
  const alvo = useEstado((s) => s.alvo)
  const levar = (nome: string) => {
    const e = ESTACOES.find((s) => s.nome === nome)
    if (!e) return
    const p = naSala(e.x, e.y + CORPO.doCentroAoPe + 0.2, e.z)
    contexto.pedidos.teleporte = p
    contexto.pedidos.olharPara = e.giro - Math.PI
    contexto.rastro.giro = e.giro
  }
  return (
    <details className="sala-painel" open={ABRE_O_PAINEL}>
      <summary>Sala de testes do movimento</summary>
      <dl>
        <dt>Velocidade</dt>
        <dd>
          {medidas ? `${fmt(medidas.velocidade)} m/s (pico ${fmt(medidas.maiorVelocidade)})` : '…'}
        </dd>
        <dt>Modo</dt>
        <dd>
          {medidas
            ? `${NOME_DO_MODO[medidas.modo] ?? medidas.modo}${medidas.noChao ? ', pisando' : ''}`
            : '…'}
        </dd>
        <dt>Último pulo</dt>
        <dd>
          {medidas?.alturaDoPulo != null && medidas.distanciaDoPulo != null
            ? `${fmt(medidas.alturaDoPulo)} m de altura, ${fmt(medidas.distanciaDoPulo)} m de distância`
            : '…'}
        </dd>
        <dt>Tremor da câmera</dt>
        <dd>{medidas ? `${fmt(medidas.tremorDaCamera)} cm por quadro` : '…'}</dd>
        <dt>Quadros</dt>
        <dd>{medidas ? `${medidas.quadrosPorSegundo} por segundo` : '…'}</dd>
      </dl>
      {alvo && <p>E: {alvo.rotulo}</p>}
      <div className="sala-estacoes">
        {ESTACOES.map((e) => (
          <button
            key={e.nome}
            type="button"
            onClick={(ev) => {
              levar(e.nome)
              ev.currentTarget.blur()
            }}
          >
            {e.nome}
          </button>
        ))}
      </div>
      <small>
        {`Andar ${fmt(CORPO.andar)} · correr ${fmt(CORPO.correr)} m/s · pulo ${fmt(alturaDoPulo(GRAVIDADE))} m (beirada até ${fmt(beiradaMaximaAgarrando(GRAVIDADE))} m agarrando a quina) · degrau ${fmt(CORPO.degrau)} m · rampa até ${CORPO.sobeAte}°`}
      </small>
    </details>
  )
}

const PECAS_SOLTAS_DA_SALA: readonly PecaSolta[] = [
  { tipo: 'pedra', x: 74, y: 2, z: 18 },
  { tipo: 'pedra', x: 76, y: 2, z: 18 },
  { tipo: 'cogumelo', x: 74, y: 2, z: 21 },
  { tipo: 'cogumelo', x: 76, y: 2, z: 21 },
]

const ESTILOS_DA_SALA = `
.sala-painel{position:absolute;top:10px;left:10px;z-index:5;max-width:min(320px,calc(100vw - 20px));padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.92);color:#1d2340;font:13px/1.35 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.18);user-select:none}
.sala-painel summary{font-weight:800;cursor:pointer}
.sala-painel dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:8px 0}
.sala-painel dt{font-weight:700;color:#4a5070}.sala-painel dd{margin:0}
.sala-estacoes{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.sala-estacoes button{min-height:36px;padding:6px 10px;border:2px solid #d6dbee;border-radius:10px;background:#fff;color:#1d2340;font:600 13px system-ui;cursor:pointer}
.sala-painel small{color:#4a5070}
.sala-rotulo{padding:2px 8px;border-radius:8px;background:rgba(29,35,64,.78);color:#fff;font:700 12px system-ui;white-space:nowrap}
`

function SalaDeMovimento() {
  const [medidas, setMedidas] = useState<MedidasDaSala | null>(null)
  const contexto = useMemo<ContextoDoJogo>(() => {
    const e = ESTACOES.find((s) => s.nome === q.get('estacao')) ?? ESTACOES[0]
    const inicio = naSala(e?.x ?? 0, (e?.y ?? 0) + CORPO.doCentroAoPe + 0.2, e?.z ?? 0)
    const salvamento = { ...criarSalvamentoInicial(new Date()), posicao: inicio }
    const loja = criarLoja({
      salvamento,
      jornada: 2,
      quarto: { theme: 'padrao', placedItems: [], pet: null },
      avatar: { slots: {} },
      acesso: { liberado: true, motivo: null, limiteDiarioMinutos: null, usadoHojeSegundos: 0 },
      aoMudar: () => {},
    })
    return {
      loja,
      gerenteTempo: null,
      plataforma: criarPlataformaFalsa({ persistir: false }),
      controle: criarControle(),
      interativos: criarRegistro(),
      rastro: {
        ...inicio,
        giro: e?.giro ?? Math.PI,
        inclinacao: 0.5,
        direcao: (e?.giro ?? Math.PI) - Math.PI,
        velocidade: 0,
        zappy: { x: 0, y: 0, z: 0 },
      },
      ambiente: { luz: 1, noite: false },
      pedidos: { teleporte: null, chaoChegando: new Set(), olharPara: null, conversa: null },
      movimento: criarMovimento(),
    }
  }, [])
  useEffect(() => ligarTeclado(contexto.controle), [contexto])
  useEffect(() => ligarGamepad(contexto.controle, () => {}), [contexto])
  return (
    <Contexto.Provider value={contexto}>
      <Canvas
        className="arq-canvas"
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        camera={{ fov: 55, near: PERTO_DA_CAMERA, far: LONGE_DA_CAMERA }}
      >
        <color attach="background" args={['#cfe8f7']} />
        <hemisphereLight args={['#ffffff', '#8aa27a', 1.5]} />
        <directionalLight position={[40, 60, 20]} intensity={1.6} />
        <Suspense fallback={null}>
          <Physics
            gravity={[0, -GRAVIDADE, 0]}
            timeStep={PASSO_DA_FISICA}
            interpolate
            updatePriority={-1}
          >
            <Sala />
            <ComReserva reserva={null}>
              <ObjetosReativos pecas={PECAS_SOLTAS_DA_SALA} galho={{ x: 70, y: 2, z: 21.2 }} />
            </ComReserva>
            <FogueiraViva x={69} y={2} z={18} />
            <Mecanismos x={64} y={2} z={18} />
            <Personagem />
            <Camera />
            <Medidor />
          </Physics>
        </Suspense>
        <Medidas aoMedir={setMedidas} />
      </Canvas>
      <ControlesDeToque />
      <Painel medidas={medidas} contexto={contexto} />
    </Contexto.Provider>
  )
}

const el = document.getElementById('jogo')
if (el) {
  const estilo = document.createElement('style')
  estilo.textContent = ESTILOS + ESTILOS_DA_SALA
  const raiz = document.createElement('div')
  raiz.className = 'arq-raiz'
  el.append(estilo, raiz)
  createRoot(raiz).render(<SalaDeMovimento />)
}
