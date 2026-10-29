/** Sala local dos componentes compartilhados. Não cria equipamento, recompensa ou ilha no jogo. */
import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, Physics, RigidBody, useRapier } from '@react-three/rapier'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Box3, type Mesh, MeshStandardMaterial, type Object3D, Vector3 } from 'three'
import ave from '../src/assets/bichos/bem-te-vi.glb'
import borboleta from '../src/assets/bichos/borboleta.glb'
import nuvens from '../src/assets/bichos/passaro-das-nuvens.glb'
import pinguim from '../src/assets/bichos/pinguim.glb'
import fogos from '../src/assets/festas/fim-de-ano.glb'
import lanternas from '../src/assets/festas/lanternas.glb'
import barco from '../src/assets/ilhas/barco.glb'
import recife from '../src/assets/ilhas/recife.glb'
import bau from '../src/assets/itens/bau.glb'
import borrao from '../src/assets/lumis/borrao.glb'
import buzio from '../src/assets/lumis/buzio.glb'
import estrelinha from '../src/assets/lumis/estrelinha.glb'
import patins from '../src/assets/movimento/patins.glb'
import iris from '../src/assets/personagens/iris.glb'
import { criarControle } from '../src/controles/controle'
import { Contexto, type ContextoDoJogo, criarMovimento } from '../src/estado/contexto'
import { criarLoja } from '../src/estado/loja'
import { criarRegistro } from '../src/mundo/interativos'
import { CapsulaDoPinguim, PecaDaArte } from '../src/mundo/peca-da-arte'
import { AvatarDoJogo } from '../src/personagem/avatar-do-jogo'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { RODAS_ABAIXO_DA_SOLA } from '../src/sistemas/ajustes-da-arte'
import { CORPO } from '../src/sistemas/corpo'
import type { EntradaDaLocomocao } from '../src/sistemas/locomocao'
import { momentoDoDia } from '../src/sistemas/tempo-do-dia'

const url = (arquivo: string) => new URL(arquivo, import.meta.url).href
const CASOS = [
  'lumis',
  'recife',
  'lanternas',
  'bau',
  'borrao',
  'fogos',
  'voo',
  'pinguim',
  'barco',
  'iris',
  'patins',
  'lanterna',
] as const
type Caso = (typeof CASOS)[number]
type Leitura = {
  objetos: Record<string, { posicao: number[]; minimo: number[]; luzes: number[]; bocas: number[] }>
  colisores: {
    raio: number
    meiaAltura: number
    posicao: { x: number; y: number; z: number }
    giro: { x: number; y: number; z: number; w: number }
  }[]
}
declare global {
  var __arte: Leitura | undefined
  /** A cena, para scripts de conferência medirem as malhas (só no playground). */
  var __arteCena: Object3D | undefined
}

function Observar() {
  const cena = useThree((s) => s.scene)
  const { world } = useRapier()
  useFrame(() => {
    const objetos: Leitura['objetos'] = {}
    cena.updateMatrixWorld(true)
    cena.traverse((o) => {
      if (!o.name.startsWith('arte-') && o.name !== 'avatar-visual') return
      const luzes: number[] = [],
        bocas: number[] = []
      o.traverse((filho) => {
        const m = filho as Mesh
        if (!m.isMesh) return
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
          if (
            mat instanceof MeshStandardMaterial &&
            (mat.name === 'luz' || mat.name.endsWith('Luz') || mat.name.startsWith('lanterna'))
          )
            luzes.push(mat.emissiveIntensity)
        }
        if (m.name.startsWith('iris-cabeca') && m.morphTargetDictionary)
          for (const nome of ['B', 'C', 'D'])
            bocas.push(m.morphTargetInfluences?.[m.morphTargetDictionary[nome] ?? -1] ?? 0)
      })
      objetos[o.name] = {
        posicao: o.getWorldPosition(new Vector3()).toArray(),
        minimo: new Box3().setFromObject(o, true).min.toArray(),
        luzes,
        bocas,
      }
    })
    const colisores: Leitura['colisores'] = []
    world.forEachCollider((c) => {
      if (c.shapeType() === 2)
        colisores.push({
          raio: c.radius(),
          meiaAltura: c.halfHeight(),
          posicao: { ...c.translation() },
          giro: { ...c.rotation() },
        })
    })
    globalThis.__arte = { objetos, colisores }
    globalThis.__arteCena = cena
  })
  useEffect(
    () => () => {
      globalThis.__arte = undefined
    },
    [],
  )
  return null
}

function Patins({ vestido, lanterna = false }: { vestido: boolean; lanterna?: boolean }) {
  const g = useGLTF(url(patins), false, false)
  const movimento = useRef<EntradaDaLocomocao>({
    velocidade: 0,
    noChao: true,
    velY: 0,
    nadando: false,
    especial: null,
  })
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[0, CORPO.doCentroAoPe, 0]}>
        <CapsuleCollider args={[CORPO.meiaAltura, CORPO.raio]} />
        <group position={[0, -CORPO.doCentroAoPe, 0]}>
          <AvatarDoJogo movimento={movimento} comPatins={vestido} comLanterna={lanterna} />
        </group>
      </RigidBody>
      <group
        name="arte-rodas"
        // O par solto não tem a pose do avatar: sua sola está na origem do arquivo.
        position={[1.5, RODAS_ABAIXO_DA_SOLA, 0]}
        // Nas vistas de perto dos pés o par solto sai do caminho da câmera.
        visible={!new URLSearchParams(location.search).has('vista')}
        dispose={null}
      >
        <primitive object={g.scene} />
      </group>
    </>
  )
}

function Pecas({ caso, ligado, fala }: { caso: Caso; ligado: boolean; fala: number }) {
  switch (caso) {
    case 'lumis':
      return (
        <>
          <PecaDaArte id="estrelinha" url={url(estrelinha)} clipe="parado" posicao={[-0.8, 0, 0]} />
          <PecaDaArte id="buzio" url={url(buzio)} clipe="parado" posicao={[0.8, 0, 0]} />
        </>
      )
    case 'recife':
      return <PecaDaArte id="recife" url={url(recife)} clipe="balancar" escala={0.15} />
    case 'lanternas':
      return <PecaDaArte id="lanternas" url={url(lanternas)} clipe="flutuar" escala={0.6} />
    case 'bau':
      return <PecaDaArte id="bau" url={url(bau)} clipe="abrir" />
    case 'borrao':
      return <PecaDaArte id="borrao" url={url(borrao)} clipe="virar" />
    case 'fogos':
      return <PecaDaArte id="fogos" url={url(fogos)} clipe="estourar" escala={0.4} />
    case 'barco':
      return (
        <PecaDaArte
          id="barco"
          url={url(barco)}
          clipe="balancar"
          posicao={[3, 0, -2]}
          escala={0.6}
        />
      )
    case 'iris':
      return (
        <PecaDaArte
          id="iris"
          url={url(iris)}
          clipe="falar"
          fala={{ id: String(fala), texto: 'Olá, o mar e o céu mostram o caminho da nossa ilha.' }}
        />
      )
    case 'pinguim':
      return (
        <RigidBody type="fixed" colliders={false}>
          <CapsulaDoPinguim deslizando={ligado} />
          <PecaDaArte id="pinguim" url={url(pinguim)} clipe={ligado ? 'deslizar' : 'parado'} />
        </RigidBody>
      )
    case 'patins':
      return <Patins vestido={ligado} />
    case 'lanterna':
      // A lanterna acesa na mão (fase2-06): `?vestido=1` já começa com ela.
      return <Patins vestido={false} lanterna={ligado} />
    case 'voo':
      return (
        <>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[4, 0.9, 1]} />
            <meshStandardMaterial color="#899ab0" />
          </mesh>
          {(
            [
              { tipo: 'bem-te-vi', arquivo: ave, x: -1.5 },
              { tipo: 'borboleta', arquivo: borboleta, x: 0 },
              { tipo: 'passaro-das-nuvens', arquivo: nuvens, x: 1.5 },
            ] as const
          ).map((p) => (
            <PecaDaArte
              key={p.tipo}
              id={p.tipo}
              url={url(p.arquivo)}
              clipe="voar"
              posicao={[p.x, 0, 0]}
              voo={{ tipo: p.tipo, topoDosObstaculos: 0.9 }}
            />
          ))}
        </>
      )
  }
}

/**
 * A câmera perto dos pés para conferir os patins calçados: `?vista=frente`, `lado`, `tras`,
 * `tres` (três quartos) ou `cima`. O avatar olha para +z.
 */
const VISTAS_DOS_PES: Record<string, [number, number, number]> = {
  frente: [0, 0.55, 1.5],
  lado: [1.5, 0.45, 0.05],
  tras: [0.2, 0.6, -1.5],
  tres: [1.0, 0.75, 1.1],
  cima: [0.5, 1.6, 0.7],
}

function Camera({ caso }: { caso: Caso }) {
  const camera = useThree((s) => s.camera),
    size = useThree((s) => s.size)
  useEffect(() => {
    const vista = VISTAS_DOS_PES[new URLSearchParams(location.search).get('vista') ?? '']
    if ((caso === 'patins' || caso === 'lanterna') && vista) {
      camera.position.set(...vista)
      camera.lookAt(0, 0.18, 0)
      return
    }
    const k = size.width < 500 ? 1.55 : 1
    const x = caso === 'barco' ? 3 : 0,
      z = caso === 'barco' ? -2 : 0
    camera.position.set(x + 4 * k, 3.2 * k, z + 6 * k)
    camera.lookAt(x, caso === 'voo' ? 1.7 : 0.8, z)
  }, [camera, caso, size.width])
  return null
}

/**
 * `?calcado=shoes-04`, `?calca=bottom-04` ou `?roupa=outfit-02`: as peças do avatar que mais
 * encostam nos patins (o calçado some com eles calçados).
 */
function slotsDaUrl() {
  const q = new URLSearchParams(location.search)
  const peca = (nome: string, cor: string) => {
    const asset = q.get(nome)
    return asset ? { asset, color: cor } : undefined
  }
  const slots: Record<string, { asset: string; color: string }> = {}
  const calcado = peca('calcado', '#2c3e50')
  const calca = peca('calca', '#34495e')
  const roupa = peca('roupa', '#e84393')
  if (calcado) slots.shoes = calcado
  if (calca) slots.bottom = calca
  if (roupa) slots.outfit = roupa
  return slots
}

function Sala() {
  const q = new URLSearchParams(location.search)
  const [caso, setCaso] = useState<Caso>(CASOS.find((c) => c === q.get('caso')) ?? 'lumis')
  const [noite, setNoite] = useState(false),
    // `?vestido=1`: os patins já calçados (ou o pinguim já deslizando).
    [ligado, setLigado] = useState(q.get('vestido') === '1'),
    [fala, setFala] = useState(0)
  const contexto = useMemo<ContextoDoJogo>(
    () => ({
      loja: criarLoja({
        salvamento: criarSalvamentoInicial(new Date()),
        jornada: 2,
        quarto: { theme: 'padrao', placedItems: [], pet: null },
        avatar: { slots: slotsDaUrl() },
        acesso: { liberado: true, motivo: null, limiteDiarioMinutos: null, usadoHojeSegundos: 0 },
        aoMudar: () => {},
      }),
      plataforma: criarPlataformaFalsa({ persistir: false }),
      gerenteTempo: null,
      controle: criarControle(),
      interativos: criarRegistro(),
      movimento: criarMovimento(),
      rastro: {
        x: 0,
        y: 1,
        z: 0,
        giro: 0,
        inclinacao: 0.5,
        direcao: 0,
        velocidade: 0,
        zappy: { x: 0, y: 0, z: 0 },
      },
      ambiente: {
        luz: 1,
        noite: false,
      },
      pedidos: {
        teleporte: null,
        chaoChegando: new Set(),
        olharPara: null,
        conversa: null,
      },
    }),
    [],
  )
  contexto.ambiente.noite = momentoDoDia((noite ? 13 : 5) * 60_000, 0).noite
  return (
    <Contexto.Provider value={contexto}>
      <main
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#e8f1f9',
          color: '#21344d',
          font: '15px system-ui',
        }}
      >
        <header
          style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <strong>Conferência da arte</strong>
          <label>
            Peça{' '}
            <select
              aria-label="Peça"
              value={caso}
              onChange={(e) => {
                setCaso(e.target.value as Caso)
                setLigado(false)
              }}
              style={{ minHeight: 44 }}
            >
              {CASOS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setNoite(!noite)} style={{ minHeight: 44 }}>
            {noite ? 'Mostrar dia' : 'Mostrar noite'}
          </button>
          {(caso === 'pinguim' || caso === 'patins') && (
            <button type="button" style={{ minHeight: 44 }} onClick={() => setLigado(!ligado)}>
              {ligado ? 'Voltar ao normal' : caso === 'pinguim' ? 'Deslizar' : 'Elevar com patins'}
            </button>
          )}
          <button type="button" onClick={() => setFala(fala + 1)} style={{ minHeight: 44 }}>
            Recomeçar
          </button>
        </header>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Canvas camera={{ fov: 42 }} dpr={[1, 1.5]}>
            <color attach="background" args={[noite ? '#182744' : '#cce3ef']} />
            <hemisphereLight intensity={noite ? 0.7 : 2} />
            <directionalLight position={[5, 8, 5]} intensity={2} />
            <Camera caso={caso} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
              <planeGeometry args={[80, 80]} />
              <meshStandardMaterial color={noite ? '#40566b' : '#9eb891'} />
            </mesh>
            <Suspense fallback={null}>
              <Physics timeStep={1 / 60} gravity={[0, 0, 0]}>
                <Pecas key={`${caso}-${fala}`} caso={caso} ligado={ligado} fala={fala} />
                <Observar />
              </Physics>
            </Suspense>
          </Canvas>
        </div>
        <p style={{ margin: 0, padding: 12 }}>
          GLBs originais e componentes do jogo. Esta sala não libera as ilhas futuras.
        </p>
      </main>
    </Contexto.Provider>
  )
}
const elemento = document.getElementById('jogo')
if (elemento) createRoot(elemento).render(<Sala />)
