import { DemandRenderLoop, perspectiveFitDistance } from '@sistemazero/molda/palco'
import {
  alturaDoChao,
  type DocumentoDeCenario,
  type InstanciaDeCenario,
  type ModeloDoCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  BackSide,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  type InstancedMesh,
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
import { Contornos, criarPartesDoFantasma, type ItemDoLote, LoteDoModelo } from './lotes'
import {
  encaixar,
  fatorUniforme,
  idsEscondidos,
  luzDaHora,
  matrizDoObjeto,
  transformacaoDaMatriz,
} from './matematica'
import { lerGlb, type ModeloCarregado } from './modelos'
import type {
  Encaixe,
  Ferramenta,
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
const FANTASMA = '\u0000fantasma'
const CAIXA_DO_FANTASMA = new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5))
const TOQUE_MAXIMO_PX = 5

type EstadoDoModelo =
  | { estado: 'carregando' }
  | { estado: 'pronto'; modelo: ModeloCarregado; lote: LoteDoModelo }
  | { estado: 'falhou' }

interface Local {
  lote: LoteDoModelo
  indice: number
  caixa: Box3
  matriz: Matrix4
}

interface Gesto {
  pivo: Matrix4
  inicio: Map<string, Matrix4>
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
  private readonly renderer: WebGLRenderer
  private readonly cena = new Scene()
  private readonly camera = new PerspectiveCamera(48, 1, 0.1, 6000)
  private readonly orbita: OrbitControls
  private readonly alca: TransformControls
  private readonly ajudanteDaAlca: Object3D
  private readonly laco: DemandRenderLoop
  private readonly pivo = new Object3D()
  private readonly objetos = new Group()
  private readonly chao = new Group()
  private readonly ceu: Mesh<SphereGeometry, ShaderMaterial>
  private readonly luzDoCeu = new HemisphereLight(0xffffff, 0x8a9a7a, 2)
  private readonly sol = new DirectionalLight(0xffffff, 1.7)
  private readonly nevoa = new Fog(0xdff1fb, 200, 1800)
  private readonly contornos: Contornos
  private readonly fantasma = criarPartesDoFantasma()
  private readonly loteFantasma: LoteDoModelo
  private readonly raio = new Raycaster()
  private readonly ndc = new Vector2()
  private readonly planoDoChao = new Plane(new Vector3(0, 1, 0), 0)

  private documento: DocumentoDeCenario | null = null
  private pendente: DocumentoDeCenario | null = null
  private readonly modelos = new Map<string, EstadoDoModelo>()
  private readonly locais = new Map<string, Local>()
  private readonly matrizes = new Map<string, Matrix4>()
  private readonly trancados = new Set<string>()
  private selecao: string[] = []
  private ferramenta: Ferramenta = 'selecionar'
  private encaixe: Encaixe = { grade: null, angulo: null }
  private gesto: Gesto | null = null
  private toque: { x: number; y: number; ponteiro: number } | null = null
  private chaveDoChao = ''
  private ultimaMedida = ''
  private destruido = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opcoes: OpcoesDoPalco,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap

    this.camera.position.set(16, 13, 20)
    this.cena.fog = this.nevoa

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
    this.cena.add(this.ceu)

    this.sol.castShadow = true
    this.sol.shadow.mapSize.set(2048, 2048)
    this.sol.shadow.bias = -0.0004
    this.sol.shadow.normalBias = 0.05
    this.cena.add(this.luzDoCeu, this.sol, this.sol.target, this.chao, this.objetos, this.pivo)

    this.loteFantasma = new LoteDoModelo(this.objetos, this.fantasma.partes)
    this.contornos = new Contornos(this.cena, COR_DA_SELECAO)

    this.orbita = new OrbitControls(this.camera, canvas)
    this.orbita.enableDamping = !opcoes.movimentoReduzido
    this.orbita.dampingFactor = 0.12
    this.orbita.screenSpacePanning = false
    this.orbita.zoomToCursor = true
    this.orbita.minDistance = 0.6
    this.orbita.maxDistance = 2500
    this.orbita.maxPolarAngle = Math.PI / 2 - 0.02
    this.orbita.target.set(0, 0.5, 0)
    this.orbita.addEventListener('change', this.pedirQuadro)

    this.alca = new TransformControls(this.camera, canvas)
    this.alca.setSize(0.9)
    this.alca.addEventListener('change', this.pedirQuadro)
    this.alca.addEventListener('dragging-changed', this.aoArrastarAAlca)
    this.alca.addEventListener('objectChange', this.aoMexerNaAlca)
    this.ajudanteDaAlca = this.alca.getHelper()
    this.ajudanteDaAlca.visible = false
    this.alca.enabled = false
    this.cena.add(this.ajudanteDaAlca)

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
    this.aplicarChao(documento)
    this.aplicarLuz(documento.iluminacao.hora)
    this.pedirModelos(documento)
    this.reconstruir()
  }

  definirSelecao(ids: readonly string[]): void {
    this.selecao = [...ids]
    this.atualizarSelecao()
  }

  definirFerramenta(ferramenta: Ferramenta): void {
    this.ferramenta = ferramenta
    this.atualizarAlca()
  }

  definirEncaixe(encaixe: Encaixe): void {
    this.encaixe = encaixe
    this.alca.setTranslationSnap(encaixe.grade)
    this.alca.setRotationSnap(encaixe.angulo ? (encaixe.angulo * Math.PI) / 180 : null)
    this.alca.setScaleSnap(encaixe.grade ? 0.25 : null)
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
    const ponto = this.raio.ray.intersectPlane(this.planoDoChao, new Vector3())
    if (!ponto) return null
    const meio = this.meioDoLote(doc)
    const x = Math.min(meio.x, Math.max(-meio.x, encaixar(ponto.x, this.encaixe.grade)))
    const z = Math.min(meio.z, Math.max(-meio.z, encaixar(ponto.z, this.encaixe.grade)))
    return { x, y: alturaDoChao(doc.base, x, z), z }
  }

  enquadrar(ids?: readonly string[]): void {
    const caixa = new Box3()
    const escolhidos = ids?.length ? ids : [...this.locais.keys()]
    const cantos = new Box3()
    for (const id of escolhidos) {
      const local = this.locais.get(id)
      if (!local) continue
      caixa.union(cantos.copy(local.caixa).applyMatrix4(local.matriz))
    }
    const esfera = new Sphere()
    if (caixa.isEmpty()) esfera.set(new Vector3(0, 1, 0), 12)
    else caixa.getBoundingSphere(esfera)
    const raio = Math.max(1.5, esfera.radius)
    const distancia = perspectiveFitDistance(raio, this.camera.fov, this.camera.aspect || 1) * 1.15
    const direcao = this.camera.position.clone().sub(this.orbita.target)
    if (direcao.lengthSq() < 1e-6) direcao.set(0.55, 0.5, 0.67)
    direcao.normalize()
    if (direcao.y < 0.25) direcao.setY(0.25).normalize()
    this.orbita.target.copy(esfera.center)
    this.camera.position.copy(esfera.center).addScaledVector(direcao, distancia)
    this.orbita.update()
    this.pedirQuadro()
  }

  capturar(largura = 640): Promise<Blob | null> {
    if (this.destruido) return Promise.resolve(null)
    const alcaVisivel = this.ajudanteDaAlca.visible
    this.ajudanteDaAlca.visible = false
    this.contornos.definirVisivel(false)
    this.renderer.render(this.cena, this.camera)
    const origem = this.renderer.domElement
    const escala = Math.min(1, largura / Math.max(1, origem.width))
    const copia = origem.ownerDocument.createElement('canvas')
    copia.width = Math.max(1, Math.round(origem.width * escala))
    copia.height = Math.max(1, Math.round(origem.height * escala))
    copia.getContext('2d')?.drawImage(origem, 0, 0, copia.width, copia.height)
    this.ajudanteDaAlca.visible = alcaVisivel
    this.contornos.definirVisivel(true)
    this.pedirQuadro()
    return new Promise((resolver) => copia.toBlob((blob) => resolver(blob), 'image/webp', 0.86))
  }

  destruir(): void {
    if (this.destruido) return
    this.destruido = true
    this.laco.dispose()
    this.canvas.removeEventListener('pointerdown', this.aoApertar)
    this.canvas.removeEventListener('pointerup', this.aoSoltar)
    this.canvas.removeEventListener('pointercancel', this.aoCancelar)
    this.alca.detach()
    this.alca.dispose()
    this.orbita.dispose()
    this.contornos.descartar()
    this.loteFantasma.descartar()
    this.fantasma.descartar()
    for (const estado of this.modelos.values())
      if (estado.estado === 'pronto') {
        estado.lote.descartar()
        estado.modelo.descartar()
      }
    this.modelos.clear()
    this.limparChao()
    this.ceu.geometry.dispose()
    this.ceu.material.dispose()
    this.renderer.dispose()
  }

  // ---- desenho ------------------------------------------------------------

  private readonly pedirQuadro = (): void => {
    // As alças avisam "mudou" já ao serem configuradas, antes de o laço de desenho existir.
    if (!this.destruido) (this.laco as DemandRenderLoop | undefined)?.request()
  }

  private readonly quadro = (): boolean => {
    const mexeu = this.orbita.update()
    this.ceu.position.copy(this.camera.position)
    this.posicionarSol()
    this.renderer.render(this.cena, this.camera)
    this.medir()
    return mexeu
  }

  private medir() {
    if (!this.opcoes.aoMedir) return
    const info = this.renderer.info.render
    let carregando = 0
    for (const estado of this.modelos.values()) if (estado.estado === 'carregando') carregando++
    const chave = `${this.locais.size}:${info.triangles}:${info.calls}:${carregando}`
    if (chave === this.ultimaMedida) return
    this.ultimaMedida = chave
    this.opcoes.aoMedir({
      objetos: this.locais.size,
      triangulos: info.triangles,
      desenhos: info.calls,
      carregando,
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
    return base.tipo === 'plano'
      ? { x: base.largura / 2, z: base.comprimento / 2 }
      : { x: 256, z: 256 }
  }

  private limparChao() {
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
    const chave = `${meio.x}x${meio.z}`
    if (chave === this.chaveDoChao) return
    this.chaveDoChao = chave
    this.limparChao()
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

    // Grade: fios finos de metro em metro (ou mais largos em lotes grandes) e fortes a cada dez.
    const passo = Math.max(largura, comprimento) > 512 ? 8 : 1
    const finos: number[] = [],
      fortes: number[] = []
    const fio = (lista: number[], x1: number, z1: number, x2: number, z2: number) =>
      lista.push(x1, 0, z1, x2, 0, z2)
    for (let x = -meio.x; x <= meio.x + 1e-6; x += passo) {
      const forte = Math.abs(Math.round(x / (passo * 10)) * passo * 10 - x) < 1e-6
      fio(forte ? fortes : finos, x, -meio.z, x, meio.z)
    }
    for (let z = -meio.z; z <= meio.z + 1e-6; z += passo) {
      const forte = Math.abs(Math.round(z / (passo * 10)) * passo * 10 - z) < 1e-6
      fio(forte ? fortes : finos, -meio.x, z, meio.x, z)
    }
    const linhas = (pontos: number[], opacidade: number) => {
      const geometria = new BufferGeometry()
      geometria.setAttribute('position', new Float32BufferAttribute(pontos, 3))
      const grade = new LineSegments(
        geometria,
        new LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: opacidade,
          depthWrite: false,
        }),
      )
      grade.position.y = 0.012
      return grade
    }
    this.chao.add(fora, lote, linhas(finos, 0.16), linhas(fortes, 0.42))
    const alcance = Math.max(largura, comprimento)
    this.nevoa.near = Math.max(120, alcance * 0.9)
    this.nevoa.far = Math.max(900, alcance * 4)
  }

  // ---- modelos e objetos --------------------------------------------------

  private pedirModelos(doc: DocumentoDeCenario) {
    const vivos = new Set<string>()
    for (const modelo of doc.modelos) {
      vivos.add(modelo.digest)
      if (!this.modelos.has(modelo.digest)) this.carregar(modelo)
    }
    for (const [digest, estado] of this.modelos) {
      if (vivos.has(digest)) continue
      if (estado.estado === 'pronto') {
        estado.lote.descartar()
        estado.modelo.descartar()
      }
      this.modelos.delete(digest)
    }
  }

  private carregar(modelo: ModeloDoCenario) {
    this.modelos.set(modelo.digest, { estado: 'carregando' })
    this.opcoes
      .carregarModelo(modelo)
      .then((bytes) => lerGlb(bytes))
      .then((carregado) => {
        if (this.destruido || this.modelos.get(modelo.digest)?.estado !== 'carregando') {
          carregado.descartar()
          return
        }
        this.modelos.set(modelo.digest, {
          estado: 'pronto',
          modelo: carregado,
          lote: new LoteDoModelo(this.objetos, carregado.partes),
        })
        if (!this.gesto) this.reconstruir()
      })
      .catch((erro) => {
        if (this.destruido) return
        if (this.modelos.get(modelo.digest)?.estado === 'carregando')
          this.modelos.set(modelo.digest, { estado: 'falhou' })
        this.opcoes.aoFalhar?.(modelo, erro)
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
    const doc = this.documento
    if (!doc) return
    const escondidos = idsEscondidos(doc)
    const tabela = new Map(doc.modelos.map((m) => [m.id, m.digest]))
    const porLote = new Map<string, ItemDoLote[]>()
    const vistos = new Set<string>()
    this.trancados.clear()
    const gruposTrancados = this.gruposTrancados(doc)
    for (const o of doc.instancias) {
      if (o.bloqueado || (o.grupo && gruposTrancados.has(o.grupo))) this.trancados.add(o.id)
      if (escondidos.has(o.id)) continue
      vistos.add(o.id)
      const matriz = matrizDoObjeto(doc, o, this.matrizDe(o.id))
      const digest = tabela.get(o.modelo)
      const estado = digest ? this.modelos.get(digest) : undefined
      const chave = estado?.estado === 'pronto' && digest ? digest : FANTASMA
      let itens = porLote.get(chave)
      if (!itens) {
        itens = []
        porLote.set(chave, itens)
      }
      itens.push({ id: o.id, matriz })
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
    registrar(this.loteFantasma, CAIXA_DO_FANTASMA, porLote.get(FANTASMA) ?? [])
    for (const [digest, estado] of this.modelos)
      if (estado.estado === 'pronto')
        registrar(estado.lote, estado.modelo.caixa, porLote.get(digest) ?? [])

    this.atualizarSelecao()
  }

  private gruposTrancados(doc: DocumentoDeCenario): Set<string> {
    const grupos = new Map(doc.grupos.map((g) => [g.id, g]))
    const trancados = new Set<string>()
    for (const g of doc.grupos) {
      let atual: string | null = g.id
      for (let n = 0; atual && n < 64; n++) {
        const grupo = grupos.get(atual)
        if (!grupo) break
        if (grupo.bloqueado) {
          trancados.add(g.id)
          break
        }
        atual = grupo.grupo
      }
    }
    return trancados
  }

  // ---- seleção e alça -----------------------------------------------------

  private movidos(): string[] {
    return this.selecao.filter((id) => this.locais.has(id) && !this.trancados.has(id))
  }

  private atualizarSelecao() {
    this.desenharContornos()
    this.atualizarAlca()
  }

  private desenharContornos() {
    this.contornos.comecar()
    let n = 0
    for (const id of this.selecao) {
      const local = this.locais.get(id)
      if (!local) continue
      if (++n > 400) break
      this.contornos.por(local.matriz, local.caixa)
    }
    this.contornos.terminar()
    this.pedirQuadro()
  }

  private atualizarAlca() {
    const movidos = this.movidos()
    const ligada = this.ferramenta !== 'selecionar' && movidos.length > 0
    if (!ligada) {
      if (this.alca.object) this.alca.detach()
      this.alca.enabled = false
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
    for (const id of movidos) centro.add(ponto.setFromMatrixPosition(this.locais.get(id)!.matriz))
    centro.divideScalar(movidos.length)
    this.pivo.position.copy(centro)
    this.pivo.scale.set(1, 1, 1)
    if (movidos.length === 1 && this.ferramenta === 'tamanho') {
      this.locais.get(movidos[0]!)!.matriz.decompose(ponto, giro, escala)
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
      for (const id of this.movidos()) inicio.set(id, this.locais.get(id)!.matriz.clone())
      this.gesto = { pivo: this.pivo.matrix.clone(), inicio }
      this.opcoes.aoGesto?.(true)
      return
    }
    const gesto = this.gesto
    this.gesto = null
    this.opcoes.aoGesto?.(false)
    if (gesto) {
      const mudancas: MudancaDeTransformacao[] = []
      for (const [id, antes] of gesto.inicio) {
        const local = this.locais.get(id)
        if (!local || local.matriz.equals(antes)) continue
        mudancas.push({ id, transformacao: transformacaoDaMatriz(local.matriz) })
      }
      if (mudancas.length) this.opcoes.aoTransformar?.(mudancas)
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
    if (this.ferramenta === 'tamanho' && gesto.inicio.size > 1) {
      const s = this.pivo.scale
      this.pivo.scale.setScalar(fatorUniforme(s.x, s.y, s.z))
    }
    this.pivo.updateMatrix()
    this.delta.multiplyMatrices(this.pivo.matrix, this.inversa.copy(gesto.pivo).invert())
    for (const [id, antes] of gesto.inicio) {
      const local = this.locais.get(id)
      if (!local) continue
      local.matriz.multiplyMatrices(this.delta, antes)
      local.lote.atualizar(local.indice, local.matriz)
    }
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
    if (evento.button !== 0) return
    this.toque = { x: evento.clientX, y: evento.clientY, ponteiro: evento.pointerId }
  }

  private readonly aoCancelar = (): void => {
    this.toque = null
  }

  private readonly aoSoltar = (evento: PointerEvent): void => {
    const toque = this.toque
    this.toque = null
    if (!toque || toque.ponteiro !== evento.pointerId) return
    if (Math.hypot(evento.clientX - toque.x, evento.clientY - toque.y) > TOQUE_MAXIMO_PX) return
    // Soltar em cima de uma alça é o fim de um gesto, não uma escolha.
    if (this.gesto || this.alca.dragging || this.alca.axis) return
    this.mirar(evento.clientX, evento.clientY)
    const malhas: InstancedMesh[] = [...this.loteFantasma.malhas]
    for (const estado of this.modelos.values())
      if (estado.estado === 'pronto') malhas.push(...estado.lote.malhas)
    const acerto = this.raio.intersectObjects(malhas, false)[0]
    const lote = acerto?.object.userData.lote as LoteDoModelo | undefined
    const id = lote && acerto?.instanceId !== undefined ? lote.ids[acerto.instanceId] : undefined
    this.opcoes.aoSelecionar?.(id ?? null, evento.shiftKey || evento.ctrlKey || evento.metaKey)
  }
}

export function criarPalco(canvas: HTMLCanvasElement, opcoes: OpcoesDoPalco): Palco {
  return new PalcoThree(canvas, opcoes)
}

/** Para a interface saber se um objeto pode ser mexido sem perguntar ao palco. */
export function estaTrancado(doc: DocumentoDeCenario, o: InstanciaDeCenario): boolean {
  if (o.bloqueado) return true
  const grupos = new Map(doc.grupos.map((g) => [g.id, g]))
  let atual = o.grupo
  for (let n = 0; atual && n < 64; n++) {
    const grupo = grupos.get(atual)
    if (!grupo) return false
    if (grupo.bloqueado) return true
    atual = grupo.grupo
  }
  return false
}
