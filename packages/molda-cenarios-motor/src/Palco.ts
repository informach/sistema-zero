import {
  DemandRenderLoop,
  perspectiveFitDistance,
  SceneAreaSelection,
} from '@sistemazero/molda/palco'
import {
  alturaDoChao,
  apoioNaSuperficie,
  chaveDaBase,
  type DocumentoDeCenario,
  dominioDoChao,
  type EncaixeDeComposicao,
  EncaixeDeComposicaoSchema,
  type InstanciaDeCenario,
  indiceDaOrganizacao,
  type ModeloDoCenario,
  resolverConjuntos,
  volumeDaForma,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  BackSide,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  Sphere,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { type AlvoDeEdicao, criarAlvosDeEdicao, type LocalDoObjeto } from './alvos-de-edicao'
import { EspalhamentoDoPalco } from './Espalhamento'
import { chaveDaForma, criarModeloDaForma } from './formas'
import { geometriaDaGrade } from './grade'
import { Contornos, criarPartesDoFantasma, type ItemDoLote, LoteDoModelo } from './lotes'
import {
  encaixar,
  fatorUniforme,
  idsEscondidos,
  luzDaHora,
  matrizDoObjeto,
  transformacaoDaMatriz,
} from './matematica'
import { conferirConteudoDoModelo, lerGlb, type ModeloCarregado } from './modelos'
import { prepararPreviaDosApoios } from './previa-dos-apoios'
import { limitesDaBase, recorteDaCamera } from './recorte-da-camera'
import { carregarPecasDeTerreno } from './recursos-terreno'
import { RepresentacoesDoModelo } from './representacoes'
import { escolherNaArea } from './selecao-area'
import { type SuperficieDoObjeto, SuperficiesDosObjetos } from './superficies'
import { TerrenoDoPalco } from './Terreno'
import { type EstadoDasTexturas, lerTextura, TexturasDoPalco } from './texturas'
import type {
  ConfiguracaoDoEspalhamento,
  Encaixe,
  Ferramenta,
  ModoDeSelecao,
  MudancaDeTransformacao,
  OpcoesDoPalco,
  Palco,
  Ponto3,
  Tema,
  Vista,
} from './tipos'

const COR_DA_SELECAO = 0x2f7df6
const COR_DO_CHAO = 0xa4d48c
const COR_DE_FORA = 0x8fc27a
const CAIXA_DO_FANTASMA = new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5))
const TOQUE_MAXIMO_PX = 5

type EstadoDoModelo =
  | { estado: 'carregando' }
  | { estado: 'pronto'; modelo: ModeloCarregado; representacoes: RepresentacoesDoModelo }
  | { estado: 'falhou' }

interface Gesto {
  cancelado?: boolean
  documento: DocumentoDeCenario | null
  pivo: Matrix4
  inicio: Map<string, Matrix4>
  apoios: Map<string, InstanciaDeCenario['apoio']>
  atualizarApoios(): void
  atualizarSuperficies(): void
}

const CEU_VERTICE = /* glsl */ `
varying vec3 vDirecao;
void main() {
  vDirecao = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
}`
const CEU_FRAGMENTO = /* glsl */ `
uniform vec3 uCeu;
uniform vec3 uHorizonte;
varying vec3 vDirecao;
void main() {
  float t = pow(clamp(vDirecao.y * 1.6, 0.0, 1.0), 0.55);
  gl_FragColor = vec4(mix(uHorizonte, uCeu, t), 1.0);
  #include <colorspace_fragment>
}`

class PalcoThree implements Palco {
  volumeDoModelo(id: string) {
    const forma = this.visual?.formas?.find((f) => f.id === id)
    if (forma) return volumeDaForma(forma)
    const digest = this.visual?.modelos.find((m) => m.id === id)?.digest
    const estado = digest ? this.modelos.get(digest) : undefined
    if (estado?.estado !== 'pronto') return null
    const { min, max } = estado.modelo.caixa
    return { min: { x: min.x, y: min.y, z: min.z }, max: { x: max.x, y: max.y, z: max.z } }
  }
  private readonly renderer: WebGLRenderer
  private readonly cena = new Scene()
  private readonly camera = new PerspectiveCamera(48, 1, 0.1, 6000)
  private readonly orbita: OrbitControls
  private readonly alca: TransformControls
  private readonly area: SceneAreaSelection
  private readonly espalhamento: EspalhamentoDoPalco
  private modoDeSelecao: ModoDeSelecao = 'ponto'
  private readonly ajudanteDaAlca: Object3D
  private readonly laco: DemandRenderLoop
  private readonly pivo = new Object3D()
  private readonly objetos = new Group()
  private readonly chao = new Group()
  private readonly grade = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.24, depthWrite: false }),
  )
  private readonly ceu: Mesh<SphereGeometry, ShaderMaterial>
  private readonly luzDoCeu = new HemisphereLight(0xffffff, 0x8a9a7a, 2)
  private readonly sol = new DirectionalLight(0xffffff, 1.7)
  private readonly nevoa = new Fog(0xdff1fb, 200, 1800)
  private nevoaDaBase = { perto: 200, longe: 1800 }
  private readonly limitesDaCena = new Box3()
  private readonly limitesDoChao = new Box3()
  private readonly contornos: Contornos
  private readonly fantasma = criarPartesDoFantasma()
  private readonly loteFantasma: LoteDoModelo
  private readonly raio = new Raycaster()
  private readonly ndc = new Vector2()
  private readonly planoDoChao = new Plane(new Vector3(0, 1, 0), 0)

  private documento: DocumentoDeCenario | null = null
  private visual: DocumentoDeCenario | null = null
  private origens: ReadonlyMap<string, string> = new Map()
  private alvos = new Map<string, AlvoDeEdicao>()
  private temChao: (p: { x: number; z: number }) => boolean = () => false
  private pendente: DocumentoDeCenario | null = null
  private readonly modelos = new Map<string, EstadoDoModelo>()
  private estadoDasTexturas: EstadoDasTexturas = { carregando: 0, falhas: [] }
  private falhaDeAcabamento = false
  private readonly texturas = new TexturasDoPalco(
    async (ref, sinal) => {
      if (!this.opcoes.carregarTextura) throw Error('Este ambiente não oferece leitura de texturas')
      return lerTextura(await this.opcoes.carregarTextura(ref, sinal), ref.digest, sinal)
    },
    (estado) => {
      this.estadoDasTexturas = estado
      if (!this.gesto) this.reconstruir()
      else this.opcoes.aoTexturas?.(estado)
    },
  )
  private readonly locais = new Map<string, LocalDoObjeto>()
  private readonly matrizes = new Map<string, Matrix4>()
  private readonly trancados = new Set<string>()
  private selecao: string[] = []
  private ferramenta: Ferramenta = 'selecionar'
  private encaixe: EncaixeDeComposicao = EncaixeDeComposicaoSchema.parse({
    grade: null,
    angulo: null,
  })
  private readonly superficies = new SuperficiesDosObjetos()
  private gesto: Gesto | null = null
  private toque: { x: number; y: number; ponteiro: number } | null = null
  private chaveDoChao = ''
  private chaveDaGrade = ''
  private terreno: TerrenoDoPalco | null = null
  private cargaDoTerreno: AbortController | null = null
  private enquadramentoPendente: { ids?: readonly string[] } | null = null
  private ultimaMedida = ''
  private destruido = false
  private readonly gestosAtivos = new Set<string>()

  private informarGesto(tipo: string, ativo: boolean): void {
    const antes = this.gestosAtivos.size > 0
    if (ativo) this.gestosAtivos.add(tipo)
    else this.gestosAtivos.delete(tipo)
    const depois = this.gestosAtivos.size > 0
    if (antes !== depois) this.opcoes.aoGesto?.(depois)
  }
  private readonly iniciarOrbita = () => this.informarGesto('orbita', true)
  private readonly encerrarOrbita = () => this.informarGesto('orbita', false)

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opcoes: OpcoesDoPalco,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: Boolean(opcoes.fotografia),
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2))
    if (opcoes.fotografia) {
      this.renderer.setPixelRatio(1)
      this.renderer.setSize(256, 256, false)
      this.renderer.setClearColor(0, 0)
      this.camera.near = 0.001
      this.camera.updateProjectionMatrix()
      this.chao.visible = false
      this.grade.visible = false
    }
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap

    this.camera.position.set(16, 13, 20)
    this.cena.fog = opcoes.fotografia ? null : this.nevoa

    this.ceu = new Mesh(
      new SphereGeometry(1, 32, 16),
      new ShaderMaterial({
        vertexShader: CEU_VERTICE,
        fragmentShader: CEU_FRAGMENTO,
        uniforms: { uCeu: { value: new Color() }, uHorizonte: { value: new Color() } },
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    )
    this.ceu.scale.setScalar(3000)
    this.ceu.renderOrder = -1000
    this.ceu.frustumCulled = false
    this.ceu.visible = !opcoes.fotografia
    this.cena.add(this.ceu)

    this.sol.castShadow = true
    this.sol.shadow.mapSize.set(2048, 2048)
    this.sol.shadow.bias = -0.0004
    this.sol.shadow.normalBias = 0.05
    this.cena.add(
      this.luzDoCeu,
      this.sol,
      this.sol.target,
      this.chao,
      this.objetos,
      this.pivo,
      this.grade,
    )

    this.loteFantasma = new LoteDoModelo(this.objetos, this.fantasma.partes)
    this.contornos = new Contornos(this.cena, COR_DA_SELECAO)

    this.orbita = new OrbitControls(this.camera, canvas)
    this.orbita.enableDamping = !opcoes.movimentoReduzido
    this.orbita.dampingFactor = 0.12
    this.orbita.screenSpacePanning = false
    this.orbita.zoomToCursor = true
    this.orbita.minDistance = opcoes.fotografia ? 0.001 : 0.6
    this.orbita.maxDistance = 2500
    this.orbita.maxPolarAngle = Math.PI / 2 - 0.02
    this.orbita.target.set(0, 0.5, 0)
    this.orbita.addEventListener('change', this.pedirQuadro)
    this.orbita.addEventListener('start', this.iniciarOrbita)
    this.orbita.addEventListener('end', this.encerrarOrbita)

    this.alca = new TransformControls(this.camera, canvas)
    this.alca.setSize(0.9)
    this.alca.addEventListener('change', this.pedirQuadro)
    this.alca.addEventListener('dragging-changed', this.aoArrastarAAlca)
    this.alca.addEventListener('objectChange', this.aoMexerNaAlca)
    this.ajudanteDaAlca = this.alca.getHelper()
    this.ajudanteDaAlca.visible = false
    this.alca.enabled = false
    this.cena.add(this.ajudanteDaAlca)

    this.area = new SceneAreaSelection(
      canvas,
      (pontos) => this.opcoes.aoPreverSelecao?.(pontos),
      (regiao, somar) => {
        const candidatos = [...this.alvos].map(([id, local]) => ({
          id,
          centro: local.caixa.getCenter(new Vector3()).applyMatrix4(local.matriz),
          bloqueado: this.trancados.has(id),
        }))
        this.opcoes.aoSelecionarArea?.(escolherNaArea(candidatos, this.camera, regiao), somar)
      },
      (ativo) => {
        this.toque = null
        this.orbita.enabled = !ativo
        this.informarGesto('area', ativo)
        this.pedirQuadro()
      },
    )

    this.espalhamento = new EspalhamentoDoPalco(canvas, {
      documento: () => this.documento,
      alturas: () => this.fonteDeAlturas(),
      ponto: (x, y) => this.pontoParaEspalhar(x, y),
      modelo: (id, doc) => {
        const estado = this.estadoDoModelo(id, doc)
        return estado?.estado === 'pronto' ? estado.modelo : null
      },
      textura: (id, doc) => {
        const ref = doc.texturas?.find((t) => t.id === id)
        return ref ? (this.texturas.obter(ref.digest)?.textura ?? null) : null
      },
      erroDeRecurso: (id, tipo, doc) => {
        if (tipo === 'modelo')
          return this.estadoDoModelo(id, doc)?.estado === 'falhou'
            ? 'Não consegui carregar um modelo do pincel. Tente novamente.'
            : null
        const ref = doc.texturas?.find((t) => t.id === id)
        return this.estadoDasTexturas.falhas.find((f) => f.digest === ref?.digest)?.mensagem ?? null
      },
      pedirQuadro: this.pedirQuadro,
      aoGesto: (ativo) => {
        this.toque = null
        this.orbita.enabled = !ativo
        this.informarGesto('pincel', ativo)
      },
      aoPrevia: (estado) => this.opcoes.aoPreverEspalhamento?.(estado),
      aoAplicar: (gesto) => this.opcoes.aoEspalhar?.(gesto),
    })
    this.cena.add(this.espalhamento.grupo)

    canvas.addEventListener('pointerdown', this.aoApertar)
    canvas.addEventListener('pointerup', this.aoSoltar)
    canvas.addEventListener('pointercancel', this.aoCancelar)

    this.aplicarLuz(12)
    this.laco = new DemandRenderLoop(canvas, this.renderer, this.camera, this.quadro)
  }

  // ---- contrato público -------------------------------------------------

  definirDocumento(documento: DocumentoDeCenario): void {
    if (this.destruido) return
    if (this.gesto) {
      // No meio de um gesto a prévia é do palco; o documento novo entra quando ele acabar.
      this.pendente = documento
      return
    }
    this.documento = documento
    const projecao = resolverConjuntos(documento)
    this.visual = projecao.documento
    this.origens = projecao.origens
    this.temChao = dominioDoChao(documento.base)
    this.espalhamento.contextoAlterado()
    this.aplicarChao(documento)
    this.aplicarLuz(documento.iluminacao.hora)
    this.pedirModelos(this.visual)
    this.pedirTexturas(this.visual)
    // definir publica o estado sincronicamente e reconstrói uma única vez pelo callback.
    this.atualizarGrade()
  }

  definirSelecao(ids: readonly string[]): void {
    this.selecao = [...ids]
    this.atualizarSelecao()
  }

  recarregarTexturas(): void {
    this.texturas.repetirFalhas()
  }

  definirFerramenta(ferramenta: Ferramenta): void {
    this.ferramenta = ferramenta
    this.atualizarAlca()
  }

  definirModoDeSelecao(modo: ModoDeSelecao): void {
    if (modo !== 'ponto') this.definirEspalhamento(null)
    this.modoDeSelecao = modo
    this.area.setTool(modo === 'retangulo' ? 'box' : modo === 'laco' ? 'lasso' : 'point')
    this.atualizarAlca()
  }

  definirEspalhamento(configuracao: ConfiguracaoDoEspalhamento | null): void {
    if (!this.espalhamento.definir(configuracao)) return
    if (configuracao) {
      this.modoDeSelecao = 'ponto'
      this.area.setTool('point')
    }
    if (this.visual) {
      this.pedirModelos(this.visual)
      this.pedirTexturas(this.visual)
    }
    this.atualizarAlca()
  }

  recarregarModelos(): void {
    for (const [id, estado] of this.modelos) if (estado.estado === 'falhou') this.modelos.delete(id)
    if (this.visual) this.pedirModelos(this.visual)
    this.espalhamento.invalidar()
  }

  private estadoDoModelo(id: string, doc: DocumentoDeCenario) {
    const forma = doc.formas?.find((f) => f.id === id)
    const chave = forma ? chaveDaForma(forma) : doc.modelos.find((m) => m.id === id)?.digest
    return chave ? this.modelos.get(chave) : undefined
  }

  private pontoParaEspalhar(clientX: number, clientY: number): Ponto3 | null {
    const doc = this.documento
    if (!doc || doc.base.tipo === 'perfil' || (doc.base.tipo === 'terreno' && !this.terreno))
      return null
    const caixa = this.canvas.getBoundingClientRect()
    if (
      clientX < caixa.left ||
      clientX > caixa.right ||
      clientY < caixa.top ||
      clientY > caixa.bottom
    )
      return null
    this.mirar(clientX, clientY)
    const ponto = this.terreno
      ? this.terreno.pontoSobRaio(this.raio)
      : this.raio.ray.intersectPlane(this.planoDoChao, new Vector3())
    if (!ponto || !this.temChao(ponto)) return null
    return { x: ponto.x, y: ponto.y, z: ponto.z }
  }

  private pedirTexturas(doc: DocumentoDeCenario) {
    const consulta = this.espalhamento.documentoDeConsulta()
    const usadas = new Set(
      doc.instancias.flatMap((o) => (o.aparencia?.textura ? [o.aparencia.textura.id] : [])),
    )
    const previas = new Set(
      this.espalhamento.prototipos.flatMap((o) =>
        o.aparencia?.textura ? [o.aparencia.textura.id] : [],
      ),
    )
    const refs = [
      ...(doc.texturas ?? []).filter((t) => usadas.has(t.id)),
      ...(consulta?.texturas ?? []).filter((t) => previas.has(t.id)),
    ]
    this.texturas.definir([...new Map(refs.map((t) => [t.digest, t])).values()])
  }

  definirEncaixe(encaixe: Encaixe): void {
    this.encaixe = EncaixeDeComposicaoSchema.parse(encaixe)
    // A translação usa a origem modular; o snap nativo do Three assume origem zero.
    this.alca.setTranslationSnap(null)
    this.alca.setRotationSnap(this.encaixe.angulo ? (this.encaixe.angulo * Math.PI) / 180 : null)
    this.alca.setScaleSnap(this.encaixe.grade ? 0.25 : null)
    this.atualizarGrade()
  }

  definirTema(_tema: Tema): void {
    // O mundo é o mesmo no claro e no escuro; só a moldura da ferramenta muda.
    this.pedirQuadro()
  }

  definirVista(vista: Vista): void {
    const alvo = this.orbita.target,
      distancia = Math.max(4, this.camera.position.distanceTo(alvo))
    const direcao = new Vector3()
    if (vista === 'cima') direcao.set(0, 1, 0.0001)
    else if (vista === 'frente') direcao.set(0, 0.12, 1)
    else if (vista === 'lado') direcao.set(1, 0.12, 0)
    else direcao.set(0.55, 0.5, 0.67)
    this.camera.position.copy(alvo).addScaledVector(direcao.normalize(), distancia)
    this.camera.lookAt(alvo)
    this.orbita.update()
    this.pedirQuadro()
  }

  pontoNoChao(clientX: number, clientY: number): Ponto3 | null {
    const doc = this.documento
    if (!doc) return null
    this.mirar(clientX, clientY)
    if (doc.base.tipo === 'terreno' && !this.terreno) return null
    const andar = this.encaixe.andar
    const plano = andar
      ? new Plane(new Vector3(0, 1, 0), -(this.encaixe.origem.y + andar.nivel * andar.altura))
      : this.planoDoChao
    const ponto = andar
      ? this.raio.ray.intersectPlane(plano, new Vector3())
      : this.terreno
        ? this.terreno.pontoSobRaio(this.raio)
        : this.raio.ray.intersectPlane(this.planoDoChao, new Vector3())
    const superficie = this.encaixe.superficie ? this.superficies.acertar(this.raio) : null
    if (superficie && (!ponto || superficie.distancia < ponto.distanceTo(this.raio.ray.origin))) {
      // Ponto real da malha tem precedência sobre a grade: quantizar depois o faria flutuar.
      return {
        x: superficie.ponto.x,
        y: superficie.ponto.y,
        z: superficie.ponto.z,
        apoio: this.apoiarNaSuperficie(superficie.id, superficie.ponto),
      }
    }
    if (!ponto) return null
    const meio = this.meioDoLote(doc)
    const minX = doc.base.tipo === 'terreno' ? doc.base.origem.x : -meio.x
    const minZ = doc.base.tipo === 'terreno' ? doc.base.origem.z : -meio.z
    const x = Math.min(
      minX + meio.x * 2,
      Math.max(minX, encaixar(ponto.x, this.encaixe.grade, this.encaixe.origem.x)),
    )
    const z = Math.min(
      minZ + meio.z * 2,
      Math.max(minZ, encaixar(ponto.z, this.encaixe.grade, this.encaixe.origem.z)),
    )
    return {
      x,
      y: andar ? ponto.y : alturaDoChao(doc.base, x, z, this.fonteDeAlturas()),
      z,
      ...(andar ? { apoio: { tipo: 'absoluto' as const } } : {}),
    }
  }

  fonteDeAlturas() {
    return this.terreno?.altura
  }

  private apoiarNaSuperficie(id: string, ponto: Vector3) {
    const doc = this.documento!
    // Medidas legadas são lidas do GLB para a consulta. O host confirma e grava essas mesmas
    // medidas no lote de colocação/gesto, junto do novo apoio, sem alterar o documento aqui.
    const modelos = doc.modelos.map((m) =>
      m.volume ? m : { ...m, volume: this.volumeDoModelo(m.id) ?? undefined },
    )
    return apoioNaSuperficie({ ...doc, modelos }, id, ponto, this.fonteDeAlturas())
  }

  enquadrar(ids?: readonly string[]): void {
    if (this.documento?.base.tipo === 'terreno' && !this.terreno) {
      this.enquadramentoPendente = { ...(ids ? { ids: [...ids] } : {}) }
      return
    }
    const caixa = new Box3()
    const escolhidos = ids?.length ? ids : [...this.alvos.keys()]
    const cantos = new Box3()
    for (const id of escolhidos) {
      const local = this.alvos.get(id)
      if (!local) continue
      caixa.union(cantos.copy(local.caixa).applyMatrix4(local.matriz))
    }
    const esfera = new Sphere()
    if (caixa.isEmpty() && this.terreno) caixa.setFromObject(this.terreno.grupo)
    if (caixa.isEmpty()) esfera.set(new Vector3(0, 1, 0), 12)
    else caixa.getBoundingSphere(esfera)
    const raio = Math.max(this.opcoes.fotografia ? 0.01 : 1.5, esfera.radius)
    const distancia = perspectiveFitDistance(raio, this.camera.fov, this.camera.aspect || 1) * 1.15
    const direcao = this.camera.position.clone().sub(this.orbita.target)
    if (direcao.lengthSq() < 1e-6) direcao.set(0.55, 0.5, 0.67)
    direcao.normalize()
    if (direcao.y < 0.25) direcao.setY(0.25).normalize()
    this.orbita.target.copy(esfera.center)
    this.camera.position.copy(esfera.center).addScaledVector(direcao, distancia)
    this.atualizarRecorte()
    this.orbita.update()
    this.pedirQuadro()
  }

  async aguardarRecursos(sinal?: AbortSignal): Promise<void> {
    const limite = Date.now() + 60_000
    while (true) {
      sinal?.throwIfAborted()
      if (this.destruido) throw new Error('O palco foi encerrado')
      const estados = [...this.modelos.values()]
      if (
        estados.some((e) => e.estado === 'falhou') ||
        this.estadoDasTexturas.falhas.length ||
        this.falhaDeAcabamento
      )
        throw new Error('Não consegui carregar todos os arquivos da composição')
      if (
        !estados.some((e) => e.estado === 'carregando') &&
        !this.estadoDasTexturas.carregando &&
        (this.documento?.base.tipo !== 'terreno' || this.terreno)
      )
        return
      if (Date.now() >= limite)
        throw new Error('O carregamento da composição demorou demais. Tente novamente.')
      await new Promise<void>((resolve) => setTimeout(resolve, 30))
    }
  }

  capturar(largura = 640): Promise<Blob | null> {
    if (this.destruido) return Promise.resolve(null)
    const alcaVisivel = this.ajudanteDaAlca.visible
    const previaVisivel = this.espalhamento.grupo.visible
    this.espalhamento.grupo.visible = false
    this.ajudanteDaAlca.visible = false
    this.contornos.definirVisivel(false)
    try {
      this.atualizarRecorte()
      this.posicionarSol()
      this.ceu.position.copy(this.camera.position)
      this.renderer.render(this.cena, this.camera)
      const origem = this.renderer.domElement
      const escala = Math.min(1, largura / Math.max(1, origem.width))
      const copia = origem.ownerDocument.createElement('canvas')
      copia.width = Math.max(1, Math.round(origem.width * escala))
      copia.height = Math.max(1, Math.round(origem.height * escala))
      copia.getContext('2d')?.drawImage(origem, 0, 0, copia.width, copia.height)
      return new Promise((resolver) => copia.toBlob((blob) => resolver(blob), 'image/webp', 0.86))
    } finally {
      this.ajudanteDaAlca.visible = alcaVisivel
      this.espalhamento.grupo.visible = previaVisivel
      this.contornos.definirVisivel(true)
      this.pedirQuadro()
    }
  }

  destruir(): void {
    if (this.destruido) return
    this.destruido = true
    this.laco.dispose()
    this.espalhamento.descartar()
    this.canvas.removeEventListener('pointerdown', this.aoApertar)
    this.canvas.removeEventListener('pointerup', this.aoSoltar)
    this.canvas.removeEventListener('pointercancel', this.aoCancelar)
    this.area.dispose()
    this.alca.detach()
    this.alca.dispose()
    this.orbita.dispose()
    this.gestosAtivos.clear()
    this.opcoes.aoGesto?.(false)
    this.contornos.descartar()
    this.grade.geometry.dispose()
    this.grade.material.dispose()
    this.superficies.descartar()
    this.loteFantasma.descartar()
    this.fantasma.descartar()
    for (const estado of this.modelos.values())
      if (estado.estado === 'pronto') {
        estado.representacoes.descartar()
        estado.modelo.descartar()
      }
    this.modelos.clear()
    this.alvos.clear()
    this.locais.clear()
    this.matrizes.clear()
    this.origens = new Map()
    this.visual = null
    this.documento = null
    this.pendente = null
    this.texturas.descartar()
    this.limparChao()
    this.ceu.geometry.dispose()
    this.ceu.material.dispose()
    this.sol.shadow.dispose()
    this.renderer.dispose()
    if (this.opcoes.fotografia) this.renderer.forceContextLoss()
  }

  // ---- desenho ------------------------------------------------------------

  private readonly pedirQuadro = (): void => {
    // As alças avisam "mudou" já ao serem configuradas, antes de o laço de desenho existir.
    if (!this.destruido) (this.laco as DemandRenderLoop | undefined)?.request()
  }

  private readonly quadro = (): boolean => {
    this.atualizarRecorte()
    const mexeu = this.orbita.update()
    this.atualizarRecorte()
    this.espalhamento.quadro(mexeu)
    this.ceu.position.copy(this.camera.position)
    this.posicionarSol()
    this.renderer.render(this.cena, this.camera)
    this.medir()
    return mexeu
  }

  private atualizarRecorte(): void {
    if (!this.documento) return
    this.superficies.limites(this.limitesDaCena)
    if (!this.opcoes.fotografia)
      this.limitesDaCena.union(limitesDaBase(this.documento.base, this.limitesDoChao))
    const r = recorteDaCamera(
      this.limitesDaCena,
      this.camera.position,
      this.orbita.target,
      this.camera.fov,
      this.camera.aspect,
      Boolean(this.opcoes.fotografia),
    )
    this.orbita.maxDistance = r.orbita
    if (this.camera.near !== r.perto || this.camera.far !== r.longe) {
      this.camera.near = r.perto
      this.camera.far = r.longe
      this.camera.updateProjectionMatrix()
    }
    this.nevoa.near = Math.max(this.nevoaDaBase.perto, r.nevoaInicio)
    this.nevoa.far = Math.max(this.nevoaDaBase.longe, r.nevoaFim, this.nevoa.near + 1)
  }

  private medir() {
    if (!this.opcoes.aoMedir) return
    const info = this.renderer.info.render
    const memoria = this.renderer.info.memory
    let carregando = 0
    for (const estado of this.modelos.values()) if (estado.estado === 'carregando') carregando++
    const chave = `${this.locais.size}:${info.triangles}:${info.calls}:${carregando}:${memoria.geometries}:${memoria.textures}`
    if (chave === this.ultimaMedida) return
    this.ultimaMedida = chave
    this.opcoes.aoMedir({
      objetos: this.locais.size,
      triangulos: info.triangles,
      desenhos: info.calls,
      carregando,
      geometrias: memoria.geometries,
      texturas: memoria.textures,
    })
  }

  private posicionarSol() {
    const alvo = this.orbita.target
    const alcance = Math.min(260, Math.max(24, this.camera.position.distanceTo(alvo) * 1.4))
    const camera = this.sol.shadow.camera
    if (Math.abs(camera.right - alcance) > alcance * 0.08) {
      camera.left = -alcance
      camera.right = alcance
      camera.top = alcance
      camera.bottom = -alcance
      camera.near = 1
      camera.far = 900
      camera.updateProjectionMatrix()
    }
    this.sol.target.position.copy(alvo)
    this.sol.position.copy(alvo).addScaledVector(this.direcaoDoSol, 400)
  }

  private readonly direcaoDoSol = new Vector3(0.4, 0.8, 0.4)

  private aplicarLuz(hora: number) {
    const luz = luzDaHora(hora)
    this.direcaoDoSol.set(luz.sol.x, luz.sol.y, luz.sol.z)
    this.sol.color.setHex(luz.corDoSol)
    this.sol.intensity = luz.forcaDoSol
    this.luzDoCeu.intensity = luz.forcaDoCeu
    this.luzDoCeu.color.setHex(0xffffff)
    this.ceu.material.uniforms.uCeu!.value.setHex(luz.corDoCeu)
    this.ceu.material.uniforms.uHorizonte!.value.setHex(luz.corDoHorizonte)
    this.nevoa.color.setHex(luz.corDoHorizonte)
  }

  // ---- chão ---------------------------------------------------------------

  private meioDoLote(doc: DocumentoDeCenario): { x: number; z: number } {
    const base = doc.base
    if (base.tipo === 'terreno')
      return { x: (base.colunas * base.passo) / 2, z: (base.linhas * base.passo) / 2 }
    return base.tipo === 'plano'
      ? { x: base.largura / 2, z: base.comprimento / 2 }
      : { x: 256, z: 256 }
  }

  private limparChao() {
    this.cargaDoTerreno?.abort()
    this.cargaDoTerreno = null
    this.terreno?.descartar()
    this.terreno = null
    for (const filho of [...this.chao.children]) {
      this.chao.remove(filho)
      const peca = filho as Mesh | LineSegments
      peca.geometry.dispose()
      const material = peca.material
      if (Array.isArray(material)) for (const m of material) m.dispose()
      else material.dispose()
    }
  }

  private aplicarChao(doc: DocumentoDeCenario) {
    const meio = this.meioDoLote(doc)
    const chave = chaveDaBase(doc.base)
    if (chave === this.chaveDoChao) return
    this.chaveDoChao = chave
    this.limparChao()
    if (doc.base.tipo === 'terreno') {
      const base = doc.base
      const controle = new AbortController()
      this.cargaDoTerreno = controle
      this.opcoes.aoTerreno?.({ estado: 'carregando', chave })
      const carregar =
        this.opcoes.carregarTerreno ??
        (async () => {
          throw new Error('O host não oferece os arquivos do terreno')
        })
      void carregarPecasDeTerreno(base, carregar, controle.signal)
        .then((recursos) => {
          if (this.destruido || this.cargaDoTerreno !== controle || controle.signal.aborted) return
          this.terreno = new TerrenoDoPalco(base, recursos)
          this.chao.add(this.terreno.grupo)
          this.atualizarGrade()
          this.reconstruir()
          if (this.enquadramentoPendente) {
            const pedido = this.enquadramentoPendente
            this.enquadramentoPendente = null
            this.enquadrar(pedido.ids)
          }
          this.opcoes.aoTerreno?.({ estado: 'pronto', chave })
          this.pedirQuadro()
        })
        .catch((e) => {
          if (this.destruido || this.cargaDoTerreno !== controle || controle.signal.aborted) return
          this.opcoes.aoTerreno?.({ estado: 'erro', chave, erro: e })
          this.pedirQuadro()
        })
      this.nevoa.near = Math.max(120, meio.x * 1.8, meio.z * 1.8)
      this.nevoa.far = Math.max(900, meio.x * 8, meio.z * 8)
      this.nevoaDaBase = { perto: this.nevoa.near, longe: this.nevoa.far }
      return
    }
    this.opcoes.aoTerreno?.({ estado: 'pronto', chave })
    const largura = meio.x * 2,
      comprimento = meio.z * 2

    const fora = new Mesh(
      new PlaneGeometry(6000, 6000),
      new MeshStandardMaterial({ color: COR_DE_FORA, roughness: 1 }),
    )
    fora.rotation.x = -Math.PI / 2
    fora.position.y = -0.03
    fora.receiveShadow = true

    const lote = new Mesh(
      new PlaneGeometry(largura, comprimento),
      new MeshStandardMaterial({
        color: COR_DO_CHAO,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    )
    lote.rotation.x = -Math.PI / 2
    lote.receiveShadow = true

    this.chao.add(fora, lote)
    const alcance = Math.max(largura, comprimento)
    this.nevoa.near = Math.max(120, alcance * 0.9)
    this.nevoa.far = Math.max(900, alcance * 4)
    this.nevoaDaBase = { perto: this.nevoa.near, longe: this.nevoa.far }
  }

  // ---- modelos e objetos --------------------------------------------------

  private atualizarGrade() {
    if (!this.documento) return
    const chave = JSON.stringify([this.chaveDoChao, this.encaixe, Boolean(this.fonteDeAlturas())])
    if (chave === this.chaveDaGrade) return
    this.chaveDaGrade = chave
    const geometria = geometriaDaGrade(this.documento, this.encaixe, this.fonteDeAlturas())
    this.grade.geometry.dispose()
    this.grade.geometry = geometria
    this.pedirQuadro()
  }

  private pedirModelos(doc: DocumentoDeCenario) {
    const consulta = this.espalhamento?.documentoDeConsulta()
    const vivos = new Set<string>()
    for (const modelo of [...doc.modelos, ...(consulta?.modelos ?? [])]) {
      vivos.add(modelo.digest)
      if (!this.modelos.has(modelo.digest)) this.carregar(modelo)
    }
    const usadas = new Set(doc.instancias.map((o) => o.modelo)),
      previas = new Set(this.espalhamento?.prototipos.map((o) => o.modelo))
    const formas = [
      ...(doc.formas ?? []).filter((f) => usadas.has(f.id)),
      ...(consulta?.formas ?? []).filter((f) => previas.has(f.id)),
    ]
    for (const f of formas) {
      const chave = chaveDaForma(f)
      vivos.add(chave)
      if (!this.modelos.has(chave)) {
        const modelo = criarModeloDaForma(f)
        this.modelos.set(chave, {
          estado: 'pronto',
          modelo,
          representacoes: new RepresentacoesDoModelo(this.objetos, modelo),
        })
      }
    }
    for (const [digest, estado] of this.modelos) {
      if (vivos.has(digest)) continue
      if (estado.estado === 'pronto') {
        estado.representacoes.descartar()
        estado.modelo.descartar()
      }
      this.modelos.delete(digest)
    }
  }

  private carregar(modelo: ModeloDoCenario) {
    // Uma leitura antiga pode terminar depois de remover e recolocar o mesmo hash.
    // Só a leitura que ainda ocupa a entrada pode publicar sucesso ou falha.
    const pedido: EstadoDoModelo = { estado: 'carregando' }
    let publicado: EstadoDoModelo | undefined
    this.modelos.set(modelo.digest, pedido)
    this.opcoes
      .carregarModelo(modelo)
      .then((bytes) => conferirConteudoDoModelo(bytes, modelo.digest))
      .then((bytes) => lerGlb(bytes))
      .then((carregado) => {
        if (this.destruido || this.modelos.get(modelo.digest) !== pedido) {
          carregado.descartar()
          return
        }
        publicado = {
          estado: 'pronto',
          modelo: carregado,
          representacoes: new RepresentacoesDoModelo(this.objetos, carregado),
        }
        this.modelos.set(modelo.digest, publicado)
        if (!this.gesto) this.reconstruir()
      })
      .catch((erro) => {
        if (
          this.destruido ||
          (this.modelos.get(modelo.digest) !== pedido &&
            this.modelos.get(modelo.digest) !== publicado)
        )
          return
        if (publicado?.estado === 'pronto') {
          publicado.representacoes.descartar()
          publicado.modelo.descartar()
        }
        this.modelos.set(modelo.digest, { estado: 'falhou' })
        this.opcoes.aoFalhar?.(modelo, erro)
        if (!this.gesto) this.reconstruir()
        this.pedirQuadro()
      })
  }

  private matrizDe(id: string): Matrix4 {
    let matriz = this.matrizes.get(id)
    if (!matriz) {
      matriz = new Matrix4()
      this.matrizes.set(id, matriz)
    }
    return matriz
  }

  private reconstruir() {
    this.espalhamento?.recursosAlterados()
    const doc = this.visual
    if (!doc) return
    if (doc.base.tipo === 'terreno' && !this.terreno) {
      this.opcoes.aoTexturas?.(this.estadoDasTexturas)
      this.locais.clear()
      this.alvos.clear()
      this.superficies.definir([])
      this.loteFantasma.preencher([])
      for (const e of this.modelos.values())
        if (e.estado === 'pronto') for (const lote of e.representacoes.lotes()) lote.preencher([])
      this.atualizarSelecao()
      this.pedirQuadro()
      return
    }
    const organizacao = indiceDaOrganizacao(doc)
    const escondidos = idsEscondidos(doc, organizacao)
    const tabela = new Map([
      ...doc.modelos.map((m) => [m.id, m.digest] as const),
      ...(doc.formas?.map((f) => [f.id, chaveDaForma(f)] as const) ?? []),
    ])
    const porLote = new Map<LoteDoModelo, ItemDoLote[]>()
    const falhasDeAcabamento: EstadoDasTexturas['falhas'] = []
    const texturas = new Map(doc.texturas?.map((t) => [t.id, t]) ?? [])
    const vistos = new Set<string>()
    this.trancados.clear()
    for (const [id, flags] of organizacao.flags) if (flags.bloqueado) this.trancados.add(id)
    for (const o of doc.instancias) {
      if (organizacao.flags.get(o.id)?.bloqueado) this.trancados.add(o.id)
      if (escondidos.has(o.id)) continue
      vistos.add(o.id)
      const matriz = matrizDoObjeto(doc, o, this.matrizDe(o.id), this.fonteDeAlturas())
      const digest = tabela.get(o.modelo)
      const estado = digest ? this.modelos.get(digest) : undefined
      const acabamento = o.aparencia?.textura
      const ref = acabamento ? texturas.get(acabamento.id) : undefined
      const textura = ref ? this.texturas.obter(ref.digest)?.textura : undefined
      let chave = this.loteFantasma
      if (estado?.estado === 'pronto') {
        if (textura && acabamento && ref) {
          try {
            chave = estado.representacoes.obter(o.espelho, {
              textura,
              repeticaoMetros: acabamento.repeticaoMetros,
            })
          } catch (erro) {
            falhasDeAcabamento.push({
              digest: ref.digest,
              nome: `${ref.nome ?? 'Textura'} em ${o.nome}`,
              mensagem:
                erro instanceof Error ? erro.message : 'Não consegui preparar esta superfície',
            })
            chave = estado.representacoes.obter(o.espelho)
          }
        } else chave = estado.representacoes.obter(o.espelho)
      }
      let itens = porLote.get(chave)
      if (!itens) {
        itens = []
        porLote.set(chave, itens)
      }
      itens.push({ id: o.id, matriz, cor: o.aparencia?.cor })
    }
    for (const id of [...this.matrizes.keys()]) if (!vistos.has(id)) this.matrizes.delete(id)

    this.locais.clear()
    const registrar = (lote: LoteDoModelo, caixa: Box3, itens: readonly ItemDoLote[]) => {
      lote.preencher(itens)
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i]!
        this.locais.set(item.id, { lote, indice: i, caixa, matriz: item.matriz })
      }
    }
    registrar(this.loteFantasma, CAIXA_DO_FANTASMA, porLote.get(this.loteFantasma) ?? [])
    const usadas = new Set(porLote.keys())
    for (const estado of this.modelos.values())
      if (estado.estado === 'pronto') {
        estado.representacoes.manter(usadas)
        for (const lote of estado.representacoes.lotes())
          registrar(lote, estado.modelo.caixa, porLote.get(lote) ?? [])
      }

    const superficies: SuperficieDoObjeto[] = []
    for (const [id, local] of this.locais) {
      for (const [parte, malha] of local.lote.malhas.entries()) {
        const matriz = new Matrix4()
        malha.getMatrixAt(local.indice, matriz)
        superficies.push({
          id: this.origens.get(id) ?? id,
          chave: id,
          pendente: local.lote === this.loteFantasma,
          relativa: local.lote.matrizDaParte(parte),
          geometria: malha.geometry,
          material: malha.material,
          matriz,
        })
      }
    }
    this.superficies.definir(superficies)
    this.alvos = criarAlvosDeEdicao(this.documento!, this.locais, this.origens)
    this.falhaDeAcabamento = falhasDeAcabamento.length > 0
    this.opcoes.aoTexturas?.({
      ...this.estadoDasTexturas,
      falhas: [...this.estadoDasTexturas.falhas, ...falhasDeAcabamento],
    })

    this.atualizarSelecao()
  }

  // ---- seleção e alça -----------------------------------------------------

  private movidos(): string[] {
    return this.selecao.filter((id) => this.alvos.has(id) && !this.trancados.has(id))
  }

  private atualizarSelecao() {
    this.desenharContornos()
    this.atualizarAlca()
  }

  private desenharContornos() {
    this.contornos.comecar()
    let n = 0
    for (const id of this.selecao) {
      const local = this.alvos.get(id)
      if (!local) continue
      if (++n > 400) break
      this.contornos.por(local.matriz, local.caixa)
    }
    this.contornos.terminar()
    this.pedirQuadro()
  }

  private atualizarAlca() {
    const movidos = this.movidos()
    const ligada =
      !this.espalhamento?.habilitado &&
      this.modoDeSelecao === 'ponto' &&
      this.ferramenta !== 'selecionar' &&
      this.ferramenta !== 'espalhar' &&
      movidos.length > 0
    if (!ligada) {
      if (this.alca.object) this.alca.detach()
      this.alca.enabled = false
      this.alca.axis = null
      this.ajudanteDaAlca.visible = false
      this.pedirQuadro()
      return
    }
    if (!this.gesto) this.posicionarPivo(movidos)
    this.alca.setMode(
      this.ferramenta === 'mover' ? 'translate' : this.ferramenta === 'girar' ? 'rotate' : 'scale',
    )
    // O tamanho segue os eixos do próprio objeto; mover e girar seguem os do mundo.
    this.alca.setSpace(this.ferramenta === 'tamanho' ? 'local' : 'world')
    if (this.alca.object !== this.pivo) this.alca.attach(this.pivo)
    this.alca.enabled = true
    this.ajudanteDaAlca.visible = true
    this.pedirQuadro()
  }

  private posicionarPivo(movidos: readonly string[]) {
    const centro = new Vector3(),
      ponto = new Vector3(),
      giro = new Quaternion(),
      escala = new Vector3()
    for (const id of movidos) centro.add(ponto.setFromMatrixPosition(this.alvos.get(id)!.matriz))
    centro.divideScalar(movidos.length)
    this.pivo.position.copy(centro)
    this.pivo.scale.set(1, 1, 1)
    if (movidos.length === 1 && this.ferramenta === 'tamanho') {
      this.alvos.get(movidos[0]!)!.matriz.decompose(ponto, giro, escala)
      this.pivo.quaternion.copy(giro)
    } else this.pivo.quaternion.identity()
    this.pivo.updateMatrix()
    this.pivo.updateMatrixWorld(true)
  }

  private readonly aoArrastarAAlca = (evento: { value: unknown }): void => {
    const arrastando = Boolean(evento.value)
    this.orbita.enabled = !arrastando
    if (arrastando) {
      this.pivo.updateMatrix()
      const inicio = new Map<string, Matrix4>()
      for (const id of this.movidos()) inicio.set(id, this.alvos.get(id)!.matriz.clone())
      const atuais = new Map([...inicio.keys()].map((id) => [id, this.alvos.get(id)!.matriz]))
      const atualizar = this.documento
        ? prepararPreviaDosApoios(
            this.documento,
            this.locais,
            [...inicio.keys()],
            this.fonteDeAlturas(),
            (id, matriz) => this.superficies.atualizar(id, matriz),
          )
        : () => {}
      this.gesto = {
        documento: this.documento,
        pivo: this.pivo.matrix.clone(),
        inicio,
        apoios: new Map(),
        atualizarApoios: () => atualizar(atuais),
        atualizarSuperficies: () => {
          for (const id of inicio.keys())
            for (const peca of this.alvos.get(id)?.pecas ?? []) {
              const local = this.locais.get(peca)
              if (local) this.superficies.atualizar(peca, local.matriz)
            }
        },
      }
      this.informarGesto('alca', true)
      return
    }
    const gesto = this.gesto
    this.gesto = null
    this.informarGesto('alca', false)
    // Uma cabeça nova invalida o gesto iniciado na anterior, como no pincel de objetos.
    if (gesto && !gesto.cancelado && (!this.pendente || this.pendente === gesto.documento)) {
      const mudancas: MudancaDeTransformacao[] = []
      for (const [id, antes] of gesto.inicio) {
        const local = this.alvos.get(id)
        if (!local || local.matriz.equals(antes)) continue
        mudancas.push({
          id,
          transformacao: transformacaoDaMatriz(local.matriz),
          ...(gesto.apoios.has(id) ? { apoio: gesto.apoios.get(id)! } : {}),
        })
      }
      if (mudancas.length && this.opcoes.aoTransformar?.(mudancas) === false && !this.pendente)
        this.pendente = gesto.documento
    }
    if (this.pendente) {
      const documento = this.pendente
      this.pendente = null
      this.definirDocumento(documento)
    } else this.atualizarAlca()
  }

  private readonly delta = new Matrix4()
  private readonly inversa = new Matrix4()

  private readonly aoMexerNaAlca = (): void => {
    const gesto = this.gesto
    if (!gesto) return
    if (
      this.ferramenta === 'tamanho' &&
      (gesto.inicio.size > 1 || [...gesto.inicio.keys()].some((id) => this.alvos.get(id)?.uniforme))
    ) {
      const s = this.pivo.scale
      this.pivo.scale.setScalar(fatorUniforme(s.x, s.y, s.z))
    }
    if (this.ferramenta === 'mover') {
      const eixo = this.alca.axis ?? ''
      for (const e of ['x', 'y', 'z'] as const)
        if (eixo.includes(e.toUpperCase())) {
          const passo =
            e === 'y' && this.encaixe.andar ? this.encaixe.andar.altura : this.encaixe.grade
          this.pivo.position[e] = encaixar(this.pivo.position[e], passo, this.encaixe.origem[e])
        }
    }
    this.pivo.updateMatrix()
    this.delta.multiplyMatrices(this.pivo.matrix, this.inversa.copy(gesto.pivo).invert())
    for (const [id, antes] of gesto.inicio) {
      const local = this.alvos.get(id)
      if (!local) continue
      local.matriz.multiplyMatrices(this.delta, antes)
      if (this.ferramenta === 'mover' && this.encaixe.superficie && this.documento) {
        const caixa = local.caixa.clone().applyMatrix4(local.matriz)
        const p = new Vector3().setFromMatrixPosition(local.matriz)
        const raio = new Raycaster(new Vector3(p.x, caixa.max.y + 0.01, p.z), new Vector3(0, -1, 0))
        const acerto = this.superficies.acertar(raio, new Set(gesto.inicio.keys()))
        const chao = alturaDoChao(this.documento.base, p.x, p.z, this.fonteDeAlturas())
        const usarObjeto = acerto && acerto.ponto.y >= chao
        local.matriz.elements[13]! += (usarObjeto ? acerto.ponto.y : chao) - caixa.min.y
        gesto.apoios.set(
          id,
          usarObjeto
            ? this.apoiarNaSuperficie(acerto.id, acerto.ponto)
            : { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
        )
      }
      local.atualizar()
    }
    gesto.atualizarApoios()
    gesto.atualizarSuperficies()
    this.desenharContornos()
  }

  // ---- toque --------------------------------------------------------------

  private mirar(clientX: number, clientY: number) {
    const caixa = this.canvas.getBoundingClientRect()
    this.ndc.set(
      ((clientX - caixa.left) / Math.max(1, caixa.width)) * 2 - 1,
      -((clientY - caixa.top) / Math.max(1, caixa.height)) * 2 + 1,
    )
    this.raio.setFromCamera(this.ndc, this.camera)
  }

  private readonly aoApertar = (evento: PointerEvent): void => {
    if (this.espalhamento.habilitado) return
    if (evento.button !== 0 || this.modoDeSelecao !== 'ponto') return
    this.toque = { x: evento.clientX, y: evento.clientY, ponteiro: evento.pointerId }
  }

  private readonly aoCancelar = (): void => {
    this.toque = null
    if (this.gesto) {
      this.gesto.cancelado = true
      this.pendente ??= this.gesto.documento
      this.alca.reset()
      this.alca.dragging = false
    }
  }

  private readonly aoSoltar = (evento: PointerEvent): void => {
    const toque = this.toque
    this.toque = null
    if (!toque || toque.ponteiro !== evento.pointerId) return
    if (Math.hypot(evento.clientX - toque.x, evento.clientY - toque.y) > TOQUE_MAXIMO_PX) return
    // Soltar em cima de uma alça é o fim de um gesto, não uma escolha.
    if (this.gesto || this.alca.dragging || this.alca.axis) return
    this.mirar(evento.clientX, evento.clientY)
    const id = this.superficies.escolher(this.raio)?.id
    this.opcoes.aoSelecionar?.(
      id ? (this.origens.get(id) ?? id) : null,
      evento.shiftKey || evento.ctrlKey || evento.metaKey,
    )
  }
}

export function criarPalco(canvas: HTMLCanvasElement, opcoes: OpcoesDoPalco): Palco {
  return new PalcoThree(canvas, opcoes)
}

/** Para a interface saber se um objeto pode ser mexido sem perguntar ao palco. */
export function estaTrancado(doc: DocumentoDeCenario, o: InstanciaDeCenario): boolean {
  return Boolean(o.bloqueado || indiceDaOrganizacao(doc).flags.get(o.id)?.bloqueado)
}
