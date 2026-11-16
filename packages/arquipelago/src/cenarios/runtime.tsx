// biome-ignore-all lint/a11y/noStaticElementInteractions: Picking de objetos Three.js, com alternativas de teclado na árvore e no inspetor.
import { OrbitControls, TransformControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics, RigidBody, TrimeshCollider } from '@react-three/rapier'
import type {
  ComandoDeCenario,
  DocumentoDeCenario,
  InstanciaDeCenario,
} from '@sistemazero/molda-cenarios-core'
import { validarDocumento } from '@sistemazero/molda-cenarios-core'
import type {
  CenarioRuntimeMontagem,
  CenarioRuntimePort,
  EstadoDeViewport,
} from '@sistemazero/molda-cenarios-core/runtime'
import {
  Component,
  type ComponentRef,
  type ReactNode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createRoot } from 'react-dom/client'
import {
  Box3,
  Euler,
  Group,
  type Matrix4,
  PCFShadowMap,
  Quaternion,
  type Camera as ThreeCamera,
  Vector3,
  type WebGLRenderer,
} from 'three'
import { ConversaDaIrisDeEstudo } from '../interface/conversa-iris-estudo'
import { ControlesDeToque } from '../interface/toque'
import { TextoSobreMadeira } from '../mundo/faisca/caminhos'
import { Iris } from '../mundo/faisca/piloto'
import { prepararGpuDaFaisca } from '../mundo/faisca/preparar-gpu'
import { OceanoMacro } from '../mundo/macro/oceano'
import { PonteMacro } from '../mundo/macro/ponte'
import { TerrenosMacro } from '../mundo/macro/terrenos'
import { GRAVIDADE, PASSO_DA_FISICA } from '../mundo/medidas'
import { Camera } from '../personagem/camera'
import { Personagem } from '../personagem/personagem'
import { CORPO } from '../sistemas/corpo'
import { ARQUIPELAGO, conexaoDaIlha } from '../sistemas/geografia-do-arquipelago'
import { AguasDoCenario } from './aguas'
import { assentarInstancias, estadoHerdado, matrizDaInstancia } from './apoio'
import { type ArteDeCenario, carregarArteDeCenario } from './arte'
import { ContextoDoCenario, criarContextoDoEnsaio } from './ensaio'
import { FundacoesDoCenario, ObjetosDoCenario } from './objetos'
import { prepararPasseios } from './passeios'
import { PontosDeCaminho } from './pontos'
import { criarTerrenoDeCenario } from './terreno'

interface Snapshot {
  documento: DocumentoDeCenario
  viewport: EstadoDeViewport
  revisao: number
  testando: boolean
}
class FalhaDoPalco extends Component<
  { children: ReactNode; aoErro: (e: Error) => void; revisao: number },
  { erro: boolean }
> {
  state = { erro: false }
  static getDerivedStateFromError() {
    return { erro: true }
  }
  componentDidCatch(e: Error) {
    this.props.aoErro(e)
  }
  componentDidUpdate(
    anterior: Readonly<{ children: ReactNode; aoErro: (e: Error) => void; revisao: number }>,
  ) {
    if (anterior.revisao !== this.props.revisao && this.state.erro) this.setState({ erro: false })
  }
  render() {
    return this.state.erro ? null : this.props.children
  }
}
/** A cena editada e a cena testada compartilham todos os modelos e colisores. */
export const montar: CenarioRuntimeMontagem['montar'] = async (elemento, opcoes) => {
  const indiceDoCatalogo = new Map(opcoes.catalogo.map((m) => [m.id, m]))
  validarDocumento(opcoes.documento, indiceDoCatalogo)
  if (opcoes.documento.base.id !== 'faisca-v2')
    throw Error('Este runtime não oferece a base solicitada')
  const host = document.createElement('div')
  host.style.cssText = 'width:100%;height:100%;position:relative;overflow:hidden'
  elemento.append(host)
  const root = createRoot(host),
    ouvintes = new Set<() => void>(),
    abort = new AbortController()
  let snapshot: Snapshot = {
      documento: opcoes.documento,
      viewport: opcoes.estado,
      revisao: opcoes.revisao,
      testando: false,
    },
    desmontado = false,
    gesto = false,
    pronta = -1,
    erro: Error | null = null
  let gl: WebGLRenderer | null = null,
    camera: ThreeCamera | null = null,
    enquadrar: ((ids?: readonly string[]) => void) | null = null,
    colocar: ((id: string, x: number, y: number) => Promise<void>) | null = null
  let contextoAtivo: ReturnType<typeof criarContextoDoEnsaio> | null = null
  let cameraAutoral:
    | ((p: { x: number; y: number; z: number }, a: { x: number; y: number; z: number }) => void)
    | null = null
  const esperas = new Set<{ revisao: number; resolve: () => void; reject: (e: Error) => void }>()
  const emitir = (m: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...m }
    for (const f of ouvintes) f()
  }
  const falhar = (e: unknown) => {
    erro = e instanceof Error ? e : Error(String(e))
    for (const p of esperas) p.reject(erro)
    esperas.clear()
    host.dispatchEvent(new CustomEvent('cenario-erro', { bubbles: true, detail: erro.message }))
  }
  const pronto = (r: number) => {
    if (r !== snapshot.revisao) return
    pronta = r
    for (const p of esperas)
      if (p.revisao <= r) {
        p.resolve()
        esperas.delete(p)
      }
  }
  const aguardar = (r: number) => {
    if (erro) return Promise.reject(erro)
    if (desmontado) return Promise.reject(Error('Viewport encerrado'))
    if (pronta === r) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const p = {
        revisao: r,
        resolve: () => {
          clearTimeout(timer)
          resolve()
        },
        reject: (e: Error) => {
          clearTimeout(timer)
          reject(e)
        },
      }
      const timer = setTimeout(() => {
        esperas.delete(p)
        reject(Error('O viewport não terminou de preparar a revisão'))
      }, 60000)
      esperas.add(p)
    })
  }
  const editar = async (c: ComandoDeCenario[]) => {
    try {
      await opcoes.aoEditar(c)
    } catch (e) {
      falhar(e)
      throw e
    }
  }
  function App() {
    const s = useSyncExternalStore(
      (fn) => {
        ouvintes.add(fn)
        return () => ouvintes.delete(fn)
      },
      () => snapshot,
    )
    const terreno = useMemo(() => criarTerrenoDeCenario(s.documento), [s.documento])
    const [contexto] = useState(() => criarContextoDoEnsaio(terreno.exata))
    contextoAtivo = contexto
    const [arte, setArte] = useState<ArteDeCenario | null>(null)
    const ids = useMemo(
      () =>
        new Set([
          ...s.documento.instancias.map((p) => p.modelo),
          ...s.documento.aguas.flatMap((a) => (a.modelo ? [a.modelo] : [])),
          ...opcoes.catalogo
            .filter((m) =>
              /caminho_(lajes|terra)_(reto|curvo)|trilha_terra_(reta|curva)/.test(m.caminho),
            )
            .map((m) => m.id),
        ]),
      [s.documento],
    )
    const chave = [...ids].sort().join('|')
    useEffect(() => {
      const a = new AbortController()
      let carregada: ArteDeCenario | null = null
      setArte(null)
      carregarArteDeCenario(opcoes.catalogo, new Set(chave.split('|')), opcoes.urlDaArte, a.signal)
        .then((r) => {
          carregada = r
          if (a.signal.aborted) r.soltar()
          else setArte(r)
        })
        .catch((e) => {
          if (!a.signal.aborted) falhar(e)
        })
      return () => {
        a.abort()
        carregada?.soltar()
      }
    }, [chave])
    return (
      <ContextoDoCenario contexto={contexto} doc={s.documento} ativo={s.testando}>
        <Canvas
          shadows={{ type: PCFShadowMap }}
          camera={{ position: [45, 40, 188], fov: 48, near: 0.06, far: 5000 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl: g, camera: c }) => {
            gl = g
            camera = c
            g.shadowMap.type = PCFShadowMap
            g.domElement.tabIndex = 0
            g.domElement.setAttribute('aria-label', 'Área 3D da Faísca')
          }}
        >
          <FalhaDoPalco aoErro={falhar} revisao={s.revisao}>
            <Suspense fallback={null}>
              {arte && <Cena s={s} arte={arte} terreno={terreno} />}
            </Suspense>
          </FalhaDoPalco>
        </Canvas>
        {s.testando && (
          <>
            <ControlesDeToque />
            <ConversaDaIrisDeEstudo />
          </>
        )}
      </ContextoDoCenario>
    )
  }
  function Cena({
    s,
    arte,
    terreno,
  }: {
    s: Snapshot
    arte: ArteDeCenario
    terreno: ReturnType<typeof criarTerrenoDeCenario>
  }) {
    const { camera: c, gl: g, scene } = useThree(),
      orbit = useRef<ComponentRef<typeof OrbitControls>>(null),
      transform = useRef<ComponentRef<typeof TransformControls>>(null),
      proxy = useMemo(() => new Group(), [])
    const [preview, setPreview] = useState<Map<string, InstanciaDeCenario> | null>(null)
    const catalogo = useMemo(() => new Map(opcoes.catalogo.map((m) => [m.id, m])), [])
    const assentadas = useMemo(
      () => assentarInstancias(s.documento, catalogo, terreno.exata),
      [s.documento, terreno, catalogo],
    )
    const objetos = useMemo(
      () =>
        assentadas
          .filter((p) => !estadoHerdado(s.documento, p).oculto)
          .map((p) => preview?.get(p.id) ?? p),
      [assentadas, preview, s.documento],
    )
    const selecionadas = useMemo(
      () =>
        objetos.filter(
          (p) => s.viewport.selecionados.includes(p.id) && !estadoHerdado(s.documento, p).bloqueado,
        ),
      [objetos, s.viewport.selecionados, s.documento],
    )
    const pisos = useMemo(
      () => prepararPasseios(s.documento, opcoes.catalogo, arte, terreno.exata),
      [s.documento, arte, terreno],
    )
    const placas = useMemo(
      () =>
        objetos
          .filter((p) => p.sinal)
          .map((p) => ({
            id: p.id,
            peca: p.modelo,
            x: p.transformacao.posicao.x,
            z: p.transformacao.posicao.z,
            giro: p.transformacao.rotacao.y,
            escala: p.transformacao.escala,
            altura: p.transformacao.posicao.y,
            sinal: p.sinal,
          })),
      [objetos],
    )
    useEffect(
      () => () => {
        for (const p of pisos) p.geo.dispose()
      },
      [pisos],
    )
    const foco = useMemo(() => ({ x: 0, z: 135 }), []),
      setores = useRef(0),
      medidas = useRef({ dt: 0, n: 0 })
    const escolher = (id: string, multipla = false) => {
      if (s.testando || gesto) return
      const ids = multipla
        ? s.viewport.selecionados.includes(id)
          ? s.viewport.selecionados.filter((v) => v !== id)
          : [...s.viewport.selecionados, id]
        : [id]
      opcoes.aoSelecionar(ids)
    }
    useEffect(() => {
      let ativo = true
      prepararGpuDaFaisca(g, scene, c)
        .then(() => {
          if (ativo) {
            g.render(scene, c)
            requestAnimationFrame(() => {
              if (ativo) pronto(s.revisao)
            })
          }
        })
        .catch(falhar)
      return () => {
        ativo = false
      }
    }, [g, scene, c, s.revisao])
    useFrame((_, dt) => {
      camera = c
      const m = medidas.current
      m.dt += dt
      m.n++
      if (m.dt >= 0.5) {
        opcoes.aoMedir({
          chamadas: g.info.render.calls,
          triangulos: g.info.render.triangles,
          geometrias: g.info.memory.geometries,
          texturas: g.info.memory.textures,
          fps: Math.round(m.n / m.dt),
        })
        m.dt = 0
        m.n = 0
      }
      if (orbit.current && !s.testando) {
        const p = orbit.current.target
        foco.x = p.x
        foco.z = p.z
      }
    })
    useLayoutEffect(() => {
      if (gesto) return
      proxy.position.set(0, 0, 0)
      proxy.rotation.set(0, 0, 0)
      proxy.scale.setScalar(1)
      if (selecionadas.length) {
        for (const p of selecionadas)
          proxy.position.add(
            new Vector3(
              p.transformacao.posicao.x,
              p.transformacao.posicao.y,
              p.transformacao.posicao.z,
            ),
          )
        proxy.position.divideScalar(selecionadas.length)
      }
      proxy.updateMatrixWorld(true)
    }, [selecionadas, proxy])
    const inicio = useRef<{ matriz: Matrix4; objetos: InstanciaDeCenario[] } | null>(null)
    const mudanca = () => {
      const a = inicio.current
      if (!a) return
      proxy.updateMatrixWorld(true)
      if (s.viewport.ferramenta === 'escala') {
        const f = Math.max(0.01, proxy.scale.x, proxy.scale.y, proxy.scale.z)
        proxy.scale.setScalar(f)
        proxy.updateMatrixWorld(true)
      }
      const delta = proxy.matrixWorld.clone().multiply(a.matriz.clone().invert()),
        map = new Map<string, InstanciaDeCenario>()
      for (const p of a.objetos) {
        const m = delta.clone().multiply(matrizDaInstancia(p)),
          pos = new Vector3(),
          q = new Quaternion(),
          scale = new Vector3()
        m.decompose(pos, q, scale)
        const rot = new Euler().setFromQuaternion(q)
        map.set(p.id, {
          ...p,
          transformacao: {
            posicao: { x: pos.x, y: pos.y, z: pos.z },
            rotacao: { x: rot.x, y: rot.y, z: rot.z },
            escala: scale.x,
          },
        })
      }
      setPreview(map)
    }
    const terminar = async () => {
      const a = inicio.current
      if (!a) return
      inicio.current = null
      gesto = false
      opcoes.aoGesto(false)
      if (orbit.current) orbit.current.enabled = true
      if (!preview?.size) return
      const comandos: ComandoDeCenario[] = [...preview.values()].map((p) => {
        const original = s.documento.instancias.find((i) => i.id === p.id)!,
          antiga = a.objetos.find((i) => i.id === p.id)!,
          apoio = structuredClone(original.apoio)
        if (apoio.tipo !== 'absoluto')
          apoio.deslocamento += p.transformacao.posicao.y - antiga.transformacao.posicao.y
        return {
          tipo: 'instancia.atualizar',
          id: p.id,
          alteracoes: { transformacao: p.transformacao, apoio },
        }
      })
      try {
        await editar(comandos)
      } finally {
        setPreview(null)
      }
    }
    useEffect(() => {
      cameraAutoral = (p, a) => {
        if (snapshot.testando) throw Error('Retorne à edição')
        c.position.set(p.x, p.y, p.z)
        orbit.current?.target.set(a.x, a.y, a.z)
        c.lookAt(a.x, a.y, a.z)
        orbit.current?.update()
      }
      enquadrar = (ids) => {
        const ps = ids?.length ? objetos.filter((p) => ids.includes(p.id)) : objetos
        const box = new Box3()
        for (const p of ps) {
          const m = catalogo.get(p.modelo)!
          box.union(
            new Box3(new Vector3(...m.min), new Vector3(...m.max)).applyMatrix4(
              matrizDaInstancia(p),
            ),
          )
        }
        if (box.isEmpty()) return
        const centro = box.getCenter(new Vector3()),
          tamanho = box.getSize(new Vector3()).length(),
          d = Math.max(5, tamanho * 0.8)
        orbit.current?.target.copy(centro)
        c.position.copy(centro).add(new Vector3(d * 0.6, d * 0.7, d))
        orbit.current?.update()
      }
      colocar = async (id, x, y) => {
        const meta = catalogo.get(id)
        if (!meta) throw Error('Modelo ausente')
        const rect = g.domElement.getBoundingClientRect(),
          { Raycaster, Vector2 } = await import('three'),
          ray = new Raycaster()
        ray.setFromCamera(
          new Vector2(
            ((x - rect.left) / rect.width) * 2 - 1,
            (-(y - rect.top) / rect.height) * 2 + 1,
          ),
          c,
        )
        const hits = ray
          .intersectObjects(scene.children, true)
          .filter((h) => h.object.userData.chao)
        const h = hits[0]
        if (!h) throw Error('Solte a peça sobre o terreno')
        await editar([
          {
            tipo: 'instancia.criar',
            instancia: {
              id: `objeto-${crypto.randomUUID()}`,
              nome: meta.nome,
              modelo: id,
              grupo: null,
              bloqueado: false,
              oculto: false,
              fisica: 'nenhuma',
              apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false },
              transformacao: {
                posicao: { x: h.point.x, y: h.point.y - meta.min[1], z: h.point.z },
                rotacao: { x: 0, y: 0, z: 0 },
                escala: 1,
              },
            },
          },
        ])
      }
      return () => {
        cameraAutoral = null
        enquadrar = null
        colocar = null
      }
    }, [objetos, catalogo, c, g, scene])
    useEffect(() => {
      if (s.testando) return
      if (s.viewport.vista === 'superior') {
        const alvo = orbit.current?.target ?? new Vector3(0, 4, 135)
        c.position.copy(alvo).add(new Vector3(0, 120, 0.001))
        c.lookAt(alvo)
      }
      orbit.current?.update()
    }, [s.viewport.vista, s.testando, c])
    const terrenoClick = (e: {
      point: Vector3
      shiftKey: boolean
      stopPropagation: () => void
    }) => {
      if (s.testando || gesto) return
      if (s.viewport.ferramenta === 'terreno') {
        e.stopPropagation()
        const b = s.viewport.pincel
        void editar([
          {
            tipo: 'relevo.definir',
            relevo: {
              id: `pincel-${crypto.randomUUID()}`,
              tipo: b.tipo,
              centro: { x: e.point.x, z: e.point.z },
              raio: b.raio,
              valor: b.valor,
              intensidade: b.intensidade,
            },
          },
        ])
        return
      }
      if (!e.shiftKey) opcoes.aoSelecionar([])
    }
    return (
      <>
        <color attach="background" args={[s.documento.iluminacao.noite ? '#233349' : '#c6dce0']} />
        <fog attach="fog" args={['#c6dce0', 1600, 3100]} />
        <hemisphereLight
          intensity={s.documento.iluminacao.noite ? 1.2 : 1.15}
          args={['#fff1d3', '#65755a']}
        />
        <directionalLight
          position={[70, 120, 180]}
          intensity={s.documento.iluminacao.noite ? 0.8 : 2}
          color={s.documento.iluminacao.noite ? '#a9bddf' : '#fff0d0'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-85}
          shadow-camera-right={85}
          shadow-camera-top={85}
          shadow-camera-bottom={-85}
          shadow-normalBias={0.04}
        />
        <Physics
          paused={!s.testando}
          gravity={[0, -GRAVIDADE, 0]}
          timeStep={PASSO_DA_FISICA}
          interpolate
          updatePriority={-1}
        >
          <OceanoMacro />
          <group onClick={terrenoClick}>
            <TerrenosMacro
              fonte={terreno}
              foco={s.testando ? null : foco}
              aoMudar={(n) => {
                setores.current = n
              }}
              aoPronto={() => {}}
            />
          </group>
          {ARQUIPELAGO.slice(1).map((i) => (
            <PonteMacro key={i.id} conexao={conexaoDaIlha(i.id)} estado="quebrada" progresso={0} />
          ))}
          <ObjetosDoCenario
            objetos={objetos.filter((p) => !p.ator)}
            catalogo={catalogo}
            arte={arte}
            escolher={escolher}
          />
          {objetos
            .filter((p) => p.ator === 'iris')
            .map((p) => (
              <group
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation()
                  escolher(p.id, e.shiftKey)
                }}
              >
                <Iris
                  arte={{
                    modelos: new Map([['coelho', arte.modelos.get(p.modelo)!]]),
                    soltar: () => {},
                  }}
                  origem={{ x: p.transformacao.posicao.x, z: p.transformacao.posicao.z }}
                  piso={terreno.exata}
                  ativo={s.testando}
                  escala={p.transformacao.escala}
                  giro={p.transformacao.rotacao.y}
                />
              </group>
            ))}
          <TextoSobreMadeira colecao={placas} assentar={(p) => ({ y: p.altura })} />
          <AguasDoCenario doc={s.documento} arte={arte} escolher={escolher} />
          <FundacoesDoCenario objetos={objetos} catalogo={catalogo} altura={terreno.exata} />
          <RigidBody type="fixed" colliders={false}>
            {pisos.map((p) => (
              <group key={p.geo.uuid}>
                <mesh
                  geometry={p.geo}
                  material={p.material}
                  receiveShadow
                  dispose={null}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!s.testando) escolher(p.id, e.shiftKey)
                  }}
                />
                <TrimeshCollider args={[p.vertices, p.indices]} />
              </group>
            ))}
          </RigidBody>
          {s.testando && (
            <>
              <Personagem
                partida={{ x: 0, y: terreno.exata(0, 149) + CORPO.doCentroAoPe + 0.12, z: 149 }}
                interior={() => false}
              />
              <Camera chaoDoCenario={terreno.exata} baseDoCenario={terreno.exata} />
            </>
          )}
        </Physics>
        {!s.testando && (
          <>
            <PontosDeCaminho
              doc={s.documento}
              estado={s.viewport}
              altura={terreno.exata}
              selecionar={opcoes.aoSelecionar}
              gesto={(ativo) => {
                gesto = ativo
                opcoes.aoGesto(ativo)
              }}
              editar={editar}
            />
            <OrbitControls
              ref={orbit}
              makeDefault
              target={[0, 4, 137]}
              enableRotate={s.viewport.vista !== 'superior'}
              minDistance={1}
              maxDistance={2000}
            />
            <primitive object={proxy} />
            {selecionadas.length > 0 &&
              ['mover', 'girar', 'escala'].includes(s.viewport.ferramenta) && (
                <TransformControls
                  ref={transform}
                  object={proxy}
                  mode={
                    s.viewport.ferramenta === 'mover'
                      ? 'translate'
                      : s.viewport.ferramenta === 'girar'
                        ? 'rotate'
                        : 'scale'
                  }
                  translationSnap={s.viewport.encaixe ? 0.25 : null}
                  rotationSnap={s.viewport.encaixe ? Math.PI / 12 : null}
                  scaleSnap={s.viewport.encaixe ? 0.05 : null}
                  onMouseDown={() => {
                    gesto = true
                    opcoes.aoGesto(true)
                    proxy.updateMatrixWorld(true)
                    inicio.current = { matriz: proxy.matrixWorld.clone(), objetos: selecionadas }
                    if (orbit.current) orbit.current.enabled = false
                  }}
                  onObjectChange={mudanca}
                  onMouseUp={() => void terminar()}
                />
              )}
          </>
        )}
      </>
    )
  }
  root.render(<App />)
  return {
    posicionarCamera(p, a) {
      if (!cameraAutoral) throw Error('Viewport indisponível')
      cameraAutoral(p, a)
    },
    async atualizar(documento, viewport, revisao) {
      if (revisao < snapshot.revisao) throw Error('A revisão do viewport não pode retroceder')
      if (documento !== snapshot.documento) validarDocumento(documento, indiceDoCatalogo)
      if (gesto) throw Error('Gesto manual em andamento')
      if (snapshot.testando && documento !== snapshot.documento) throw Error('Retorne à edição')
      if (documento !== snapshot.documento) pronta = -1
      erro = null
      emitir({ documento, viewport, revisao })
      await aguardar(revisao)
    },
    enquadrar(ids) {
      enquadrar?.(ids)
    },
    async testar(iniciar) {
      if (gesto) throw Error('Finalize o gesto')
      await aguardar(snapshot.revisao)
      emitir({ testando: iniciar })
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    },
    async capturar(revisaoEsperada = snapshot.revisao) {
      if (gesto) throw Error('Gesto em andamento')
      if (revisaoEsperada !== snapshot.revisao) throw Error('Revisão de captura diferente')
      await aguardar(revisaoEsperada)
      const renderer = gl
      if (!renderer || !camera) throw Error('Viewport indisponível')
      return new Promise<Blob>((resolve, reject) => {
        renderer.domElement.toBlob(
          (b) => (b ? resolve(b) : reject(Error('Falha na captura'))),
          'image/png',
        )
      })
    },
    estado: () => ({
      revisao: snapshot.revisao,
      revisaoPronta: pronta,
      modo: snapshot.testando ? 'testando' : 'editando',
      ...(contextoAtivo
        ? {
            avatar: {
              x: contextoAtivo.rastro.x,
              y: contextoAtivo.rastro.y,
              z: contextoAtivo.rastro.z,
            },
            nadando: contextoAtivo.loja.getState().nadando,
          }
        : {}),
    }),
    async colocar(id, x, y) {
      if (snapshot.testando || gesto) throw Error('Retorne à edição')
      if (!colocar) throw Error('Viewport indisponível')
      await colocar(id, x, y)
    },
    desmontar() {
      if (desmontado) return
      desmontado = true
      abort.abort()
      for (const e of esperas) e.reject(Error('Viewport encerrado'))
      esperas.clear()
      root.unmount()
      host.remove()
      ouvintes.clear()
      gl?.dispose()
    },
  } satisfies CenarioRuntimePort
}
