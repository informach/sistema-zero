import { advance, Canvas, useFrame, useThree } from '@react-three/fiber'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CanvasTexture, type Group, NearestFilter, RepeatWrapping, SRGBColorSpace } from 'three'
import { Contexto, type ContextoDoJogo } from '../src/estado/contexto'
import { criarLoja } from '../src/estado/loja'
import { AvatarDoJogo } from '../src/personagem/avatar-do-jogo'
import {
  acharBracos,
  type BracosDoAvatar,
  CORDA_NO_CORPO,
  INCLINACAO_NO_CIPO,
  segurarACorda,
} from '../src/personagem/bracos'
import type { EntradaDaLocomocao } from '../src/sistemas/locomocao'

/**
 * Visualizador das animações do avatar (fora do jogo, para conferir os clipes). O avatar fica no
 * lugar, visto de lado, e o chão quadriculado corre para trás na velocidade pedida: com o passo
 * certo, o pé que está no chão anda junto com o quadriculado (não patina).
 *
 * Parâmetros: `?v=1.4` (velocidade fixa), `?varrer=1` (vai de parado a 7,2 m/s e volta),
 * `?pulo=1` (pula a cada 2 s), `?nado=1`, `?cipo=1` (pendurado, com as mãos na corda como no
 * jogo), `?escalar=1` (subindo no tronco), `?lado=frente` (câmera de frente), `?zoom=1.5`,
 * `?alvo=0.95` e `?altura=1.2` (para onde e de que altura a câmera olha). Com `?quadros=1` o tempo
 * só anda por `__quadros(n)` (n quadros de 1/30 s), para gravar um GIF com o tempo certo.
 */
const q = new URLSearchParams(location.search)
const GRAVIDADE = -24
const PULO = 8.5
const QUADRO_A_QUADRO = q.get('quadros') === '1'
const TAMANHO_DO_CHAO = 40
const REPETICOES = 80

function Chao({ movimento }: { movimento: { current: EntradaDaLocomocao } }) {
  const textura = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#9fd47e'
      g.fillRect(0, 0, 64, 64)
      g.fillStyle = '#7fb85e'
      g.fillRect(0, 0, 32, 32)
      g.fillRect(32, 32, 32, 32)
    }
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.magFilter = NearestFilter
    t.colorSpace = SRGBColorSpace
    // 40 m de chão com 80 repetições: cada repetição tem 50 cm e cada quadrado do xadrez, 25 cm.
    t.repeat.set(REPETICOES, REPETICOES)
    return t
  }, [])
  useFrame((_, dt) => {
    // O chão corre para trás do avatar (−z), na velocidade do passo.
    textura.offset.y -= (movimento.current.velocidade * dt * REPETICOES) / TAMANHO_DO_CHAO
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[TAMANHO_DO_CHAO, TAMANHO_DO_CHAO]} />
      <meshStandardMaterial map={textura} />
    </mesh>
  )
}

function Camera() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const zoom = Number(q.get('zoom') ?? 1)
    const d = 5.2 / zoom
    if (q.get('lado') === 'frente') camera.position.set(0.6, 1.3, d)
    else camera.position.set(d, Number(q.get('altura') ?? 1.2), 0.3)
    camera.lookAt(0, Number(q.get('alvo') ?? 0.95), 0)
  }, [camera])
  return null
}

function Motor({
  movimento,
  aoMudar,
}: {
  movimento: { current: EntradaDaLocomocao }
  aoMudar: (texto: string) => void
}) {
  const t = useRef(0)
  const y = useRef(0)
  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    t.current += dt
    const m = movimento.current
    if (q.get('cipo') === '1') {
      m.pendurado = 'cipo'
      m.velocidade = 0
    } else if (q.get('escalar') === '1') {
      m.pendurado = 'escalada'
      m.velocidade = Number(q.get('v') ?? 1.7)
    } else if (q.get('nado') === '1') {
      m.nadando = true
      m.velocidade = 2.6
    } else if (q.get('pulo') === '1') {
      // Pula a cada 2 s, parado: sobe, cai e aterrissa.
      if (m.noChao && t.current > 2) {
        t.current = 0
        m.noChao = false
        m.velY = PULO
      } else if (!m.noChao) {
        m.velY += GRAVIDADE * dt
        y.current += m.velY * dt
        if (y.current <= 0) {
          y.current = 0
          m.velY = 0
          m.noChao = true
        }
      }
      m.velocidade = Number(q.get('v') ?? 0)
    } else if (q.get('varrer') === '1') {
      const ciclo = (t.current % 16) / 16
      m.velocidade = 7.2 * (ciclo < 0.5 ? ciclo * 2 : 2 - ciclo * 2)
    } else {
      m.velocidade = Number(q.get('v') ?? 1.4)
    }
    aoMudar(
      `${m.velocidade.toFixed(2)} m/s${m.noChao ? '' : ' (no ar)'}${m.nadando ? ' (nado)' : ''}`,
    )
  })
  return null
}

const CIPO_NA_MAO = q.get('cipo') === '1'

/**
 * Pendurado como no jogo: o corpo inclinado para trás em volta das mãos e as mãos fechadas na
 * corda (`segurarACorda`), com a corda desenhada passando à frente do queixo.
 */
function NaCorda({ movimento }: { movimento: { current: EntradaDaLocomocao } }) {
  const corpo = useRef<Group>(null)
  const bracos = useRef<BracosDoAvatar | null>(null)
  // A corda fica no lugar; o corpo gira em volta do ponto dela, como no jogo.
  const [cx, cy, cz] = [0, CORDA_NO_CORPO.y + 0.4, 0]
  const depoisDaPose = useMemo(
    () => () => {
      const g = corpo.current
      if (!g) return
      if (!bracos.current) bracos.current = acharBracos(g)
      if (bracos.current) segurarACorda(bracos.current, g)
    },
    [],
  )
  // O rig mede onde o avatar está ao ficar de pé: o corpo só pendura depois disso (o jogo também
  // pega o cipó com o avatar já de pé).
  const quadros = useRef(0)
  useFrame(() => {
    const g = corpo.current
    if (!g || ++quadros.current !== 45) return
    g.rotation.set(-INCLINACAO_NO_CIPO, 0, 0, 'YXZ')
    const p = CORDA_NO_CORPO.clone().applyEuler(g.rotation)
    g.position.set(cx - p.x, cy - p.y, cz - p.z)
  })
  return (
    <>
      <mesh position={[cx, cy + 1.5, cz]}>
        <cylinderGeometry args={[0.05, 0.05, 3.6, 10]} />
        <meshStandardMaterial color="#5d7d3a" />
      </mesh>
      <group ref={corpo}>
        <AvatarDoJogo movimento={movimento} depoisDaPose={depoisDaPose} />
      </group>
    </>
  )
}

function Visualizador() {
  const [texto, setTexto] = useState('')
  const movimento = useRef<EntradaDaLocomocao>({
    velocidade: 0,
    noChao: true,
    velY: 0,
    nadando: false,
    pendurado: null,
  })
  const contexto = useMemo(() => {
    const loja = criarLoja({
      salvamento: criarSalvamentoInicial(new Date()),
      jornada: 2,
      quarto: { theme: 'padrao', placedItems: [] } as never,
      avatar: { slots: {} },
      acesso: { liberado: true } as never,
      aoMudar: () => {},
    })
    return { loja } as unknown as ContextoDoJogo
  }, [])
  return (
    <Contexto.Provider value={contexto}>
      <Canvas
        shadows
        frameloop={QUADRO_A_QUADRO ? 'never' : 'always'}
        camera={{ fov: 40, near: 0.1, far: 100 }}
      >
        <color attach="background" args={['#cfe8f7']} />
        <hemisphereLight args={['#ffffff', '#6a8f55', 1.4]} />
        <directionalLight position={[4, 8, 3]} intensity={1.6} castShadow />
        <Camera />
        <Chao movimento={movimento} />
        <Motor movimento={movimento} aoMudar={setTexto} />
        {CIPO_NA_MAO ? (
          <NaCorda movimento={movimento} />
        ) : (
          <group rotation={q.get('nado') === '1' ? [1.1, 0, 0] : [0, 0, 0]} position={[0, 0, 0]}>
            <AvatarDoJogo movimento={movimento} />
          </group>
        )}
      </Canvas>
      <p
        style={{
          position: 'fixed',
          top: 8,
          left: 12,
          margin: 0,
          font: '600 16px system-ui',
          color: '#1d2b4f',
        }}
      >
        {texto}
      </p>
    </Contexto.Provider>
  )
}

if (QUADRO_A_QUADRO) {
  let agora = performance.now()
  ;(globalThis as { __quadros?: (n: number) => void }).__quadros = (n) => {
    for (let i = 0; i < n; i++) {
      agora += 1000 / 30
      advance(agora)
    }
  }
}

const el = document.getElementById('jogo')
if (el) createRoot(el).render(<Visualizador />)
