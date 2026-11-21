import {
  DemandRenderLoop,
  perspectiveFitDistance,
  SceneAreaSelection,
} from '@sistemazero/molda/palco'
import {
  type ArquivoDeTerreno,
  alturaDoChao,
  apoioNaSuperficie,
  chaveDaBase,
  clonarEstadoDoTerreno,
  comMemoriaDaValidacao,
  type DocumentoDeCenario,
  digestDosBytes,
  dominioDoChao,
  type EncaixeDeComposicao,
  EncaixeDeComposicaoSchema,
  type FonteDeAlturas,
  type InstanciaDeCenario,
  indiceDaOrganizacao,
  inicioDoCenario,
  lerRecursoDeTerreno,
  MAX_BYTES_RECURSO_TERRENO,
  MAX_RECURSOS_TERRENO,
  type ModeloDoCenario,
  marcadorRedimensionavel,
  type OperacaoDeAguaPreparada,
  type OperacaoDeCaminhoPreparada,
  type RecursoDeTerreno,
  referenciasDoTerreno,
  resolverConjuntos,
  type VistaDeCamera,
  VistaDeCameraSchema,
  volumeDaForma,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BufferGeometry,
  Group,
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
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { AguasDoPalco, type EstadoDasAguas } from './agua/aguas'
import { type AlvoDeEdicao, criarAlvosDeEdicao, type LocalDoObjeto } from './alvos-de-edicao'
import { AmbienteDoPalco, type EstadoDoAmbiente } from './ambiente/ambiente'
import { CaminhosDoPalco, type EstadoDosCaminhos } from './curvas/caminhos'
import { type CapturaDeCaminho, EdicaoDePontos } from './curvas/edicao-de-pontos'
import { EspalhamentoDoPalco } from './Espalhamento'
import {
  type ComandoDePreviaDoAmbiente,
  type DonoDaPreviaDoAmbiente,
  EdicaoComTerreno,
} from './edicao-com-terreno'
import { EsculturaDoPalco } from './escultura'
import type { ConfiguracaoDaEscultura } from './escultura-tipos'
import { chaveDaForma, criarModeloDaForma } from './formas'
import { geometriaDaGrade } from './grade'
import { ColisoesVisiveis } from './jogo/colisoes-visiveis'
import { MarcadoresDoPalco } from './jogo/marcadores'
import { Contornos, criarPartesDoFantasma, type ItemDoLote, LoteDoModelo } from './lotes'
import {
  encaixar,
  fatorUniforme,
  idsEscondidos,
  matrizDoObjeto,
  transformacaoDaMatriz,
} from './matematica'
import { conferirConteudoDoModelo, lerGlb, type ModeloCarregado } from './modelos'
import { criarPlanoDoCenario } from './plano'
import { PontosDeAutoria } from './pontos-de-autoria'
import { prepararPreviaDosApoios } from './previa-dos-apoios'
import { limitesDaBase, recorteDaCamera } from './recorte-da-camera'
import { carregarPecasDeTerreno } from './recursos-terreno'
import { RepresentacoesDoModelo } from './representacoes'
import { escolherNaArea } from './selecao-area'
import { type SuperficieDoObjeto, SuperficiesDosObjetos } from './superficies'
import { TerrenoDoPalco } from './Terreno'
import { AguasDoTeste } from './teste/agua'
import { MundoDoTeste } from './teste/colisoes'
import { prepararColisoesDoTeste } from './teste/fontes'
import { PersonagemDoTeste } from './teste/personagem'
import { SessaoDoTeste } from './teste/sessao'
import type { ComandoDoTeste, ConfiguracaoDoTeste, EntradaDoTeste } from './teste/tipos'
import { type EstadoDasTexturas, lerTextura, TexturasDoPalco } from './texturas'
import type {
  ConfiguracaoDoEspalhamento,
  DonoDosPontos,
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
const COR_DE_FORA = 0x8fc27a
const CAIXA_DO_FANTASMA = new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5))
const TOQUE_MAXIMO_PX = 5

type EstadoDoModelo =
  | { estado: 'carregando'; controle: AbortController }
  | { estado: 'pronto'; modelo: ModeloCarregado; representacoes: RepresentacoesDoModelo }
  | { estado: 'falhou' }

const PARA_BAIXO = new Vector3(0, -1, 0)

interface Gesto {
  cancelado?: boolean
  documento: DocumentoDeCenario | null
  pivo: Matrix4
  inicio: Map<string, Matrix4>
  /** Os ids movidos, montados uma vez por gesto para o encaixe em superfície ignorá-los. */
  movidos?: Set<string>
  apoios: Map<string, InstanciaDeCenario['apoio']>
  atualizarApoios(): void
  atualizarSuperficies(): void
}

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
  private readonly ambiente: AmbienteDoPalco
  private estadoDoAmbiente: EstadoDoAmbiente | null = null
  private readonly limitesDaCena = new Box3()
  private readonly focoDoTeste = new Vector3()
  private readonly limitesDoChao = new Box3()
  private readonly limitesDasGuias = new Box3()
  private readonly marcadores = new MarcadoresDoPalco()
  private guiasDoJogo = false
  private aspectoDasGuias = 0
  private readonly contornos: Contornos
  private readonly fantasma = criarPartesDoFantasma()
  private readonly loteFantasma: LoteDoModelo
  private readonly raio = new Raycaster()
  private readonly raioDoEncaixe = new Raycaster()
  private colisoesNoGesto = Number.NEGATIVE_INFINITY
  private readonly origemDoEncaixe = new Vector3()
  private readonly ndc = new Vector2()
  private readonly planoDoChao = new Plane(new Vector3(0, 1, 0), 0)
  private readonly planoDosControles = new Plane(new Vector3(0, 1, 0), 0)

  private documento: DocumentoDeCenario | null = null
  private visual: DocumentoDeCenario | null = null
  private origens: ReadonlyMap<string, string> = new Map()
  private alvos = new Map<string, AlvoDeEdicao>()
  private ponteiroDaAlca: number | null = null
  private readonly colisoesVisiveis = new ColisoesVisiveis()
  private mostrarColisoes = false
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
      if (!this.gesto) this.reconstruirEmBreve()
      else this.opcoes.aoTexturas?.(estado)
    },
  )
  private readonly locais = new Map<string, LocalDoObjeto>()
  private readonly matrizes = new Map<string, Matrix4>()
  private readonly trancados = new Set<string>()
  private selecao: string[] = []
  private ferramenta: Ferramenta = 'selecionar'
  /** A faixa não libera tamanho por eixo: o puxador de tamanho escala sempre por igual. */
  private tamanhoSoUniforme = false
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
  private readonly aguas: AguasDoPalco
  private readonly caminhos = new CaminhosDoPalco()
  private estadoDosCaminhos: EstadoDosCaminhos = { carregando: 0, falhas: [], avisos: [] }
  private readonly alturaDoPlano: FonteDeAlturas = () => 0
  private readonly pontosDaAgua = new PontosDeAutoria()
  private readonly pontosDoCaminho: EdicaoDePontos
  private donoDosPontos: DonoDosPontos | null = null
  private readonly edicaoDoAmbiente = new EdicaoComTerreno({
    prever: (operacao) => {
      if (!this.terreno || !operacao.terreno)
        throw Error('Aguarde o relevo antes de prever a mudança.')
      this.terreno.prever(operacao.terreno, operacao.regioes)
      this.aguas.atualizarTerreno(operacao.regioes)
      this.marcadores.atualizarTerreno(operacao.regioes)
      this.superficies.invalidarGeometrias(this.caminhos.atualizarTerreno(operacao.regioes))
    },
    restaurar: () => {
      this.terreno?.cancelarPrevia()
      this.aguas.atualizarTerreno()
      this.marcadores.atualizarTerreno()
      this.caminhos.atualizarTerreno()
    },
  })
  private estadoDasAguas: EstadoDasAguas = { carregando: 0, falhas: [] }
  private readonly escultura: EsculturaDoPalco
  private gradeAntesDaEscultura: boolean | null = null
  private recursosDoTerreno: ReadonlyMap<string, RecursoDeTerreno> = new Map()
  private planoFisico: Mesh | null = null
  private fundoDecorativo: Mesh | null = null
  private teste: SessaoDoTeste | null = null
  private preparandoTeste: AbortController | null = null
  private vistaDaEdicao: {
    posicao: Vector3
    rotacao: Quaternion
    alvo: Vector3
    near: number
    fov: number
    grade: boolean
    fundo: boolean
    guias: boolean
    colisoes: boolean
  } | null = null
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
    this.aguas = new AguasDoPalco(this.renderer.capabilities.maxTextureSize)
    this.cena.add(this.aguas.grupo, this.pontosDaAgua.grupo, this.caminhos.grupo)
    this.marcadores.grupo.visible = false
    this.cena.add(this.marcadores.grupo)
    this.colisoesVisiveis.grupo.visible = false
    this.cena.add(this.colisoesVisiveis.grupo)

    this.camera.position.set(16, 13, 20)
    this.ambiente = new AmbienteDoPalco(
      this.cena,
      opcoes.fotografia,
      this.renderer.capabilities.maxTextureSize,
    )
    this.cena.add(this.chao, this.objetos, this.pivo, this.grade)

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
        for (const e of [
          ...(this.documento?.caminhos ?? []),
          ...(this.documento?.aguas ?? []),
          ...(this.documento?.marcadores ?? []),
        ]) {
          if (this.alvos.has(e.id)) continue
          const caixa = this.caminhos.limitesDo(e.id, new Box3())
          if (caixa.isEmpty()) this.aguas.limitesDo(e.id, caixa)
          if (caixa.isEmpty()) this.marcadores.limitesDo(e.id, caixa)
          if (!caixa.isEmpty())
            candidatos.push({
              id: e.id,
              centro: caixa.getCenter(new Vector3()),
              bloqueado: this.trancados.has(e.id),
            })
        }
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
    this.escultura = new EsculturaDoPalco(canvas, {
      documento: () => this.documento,
      terreno: () => this.terreno,
      ponto: (x, y) => this.pontoParaEsculpir(x, y),
      pedirQuadro: this.pedirQuadro,
      aoGesto: (ativo) => {
        this.toque = null
        this.orbita.enabled = !ativo
        if (ativo) {
          this.gradeAntesDaEscultura = this.grade.visible
          this.grade.visible = false
        } else if (this.gradeAntesDaEscultura !== null) {
          this.grade.visible = this.gradeAntesDaEscultura
          this.gradeAntesDaEscultura = null
        }
        this.informarGesto('escultura', ativo)
      },
      aoEstado: (estado) => this.opcoes.aoPreverTerreno?.(estado),
      aoAtualizar: (regioes) => {
        this.aguas.atualizarTerreno(regioes)
        this.marcadores.atualizarTerreno(regioes)
        this.superficies.invalidarGeometrias(this.caminhos.atualizarTerreno(regioes))
        if (this.destruido) return
        // Com o pincel em uso, o relevo, a água e os caminhos já acompanham a cada quadro; os
        // objetos apoiados seguem no máximo a cada 100 ms (refazer tudo a cada quadro travava
        // cenas grandes). No fim do gesto (sem regiões), na hora.
        if (regioes) this.reconstruirEmBreve()
        else this.reconstruir()
      },
      aplicar: (gesto) => {
        if (!this.opcoes.aoEsculpir) throw new Error('Este ambiente não recebe edições de terreno')
        this.opcoes.aoEsculpir(gesto)
      },
    })
    this.cena.add(this.escultura.grupo)

    this.pontosDoCaminho = new EdicaoDePontos(canvas, {
      documento: () => this.documento,
      camera: this.camera,
      ponto: (x, y, altura) => this.pontoParaControles(x, y, altura),
      altura: (x, z) =>
        this.documento ? alturaDoChao(this.documento.base, x, z, this.fonteDeAlturas()) : NaN,
      aoGesto: (ativo) => {
        this.toque = null
        this.orbita.enabled = !ativo
        this.informarGesto('pontos', ativo)
      },
      aoEditar: (gesto) =>
        this.opcoes.aoEditarPontosDeCaminho?.(gesto, this.donoDosPontos ?? 'caminhos'),
      aoCancelar: () => {
        const dono = this.donoDosPontos ?? 'caminhos'
        this.definirCapturaDeCaminho(null, dono)
        this.opcoes.aoCancelarPontosDeCaminho?.(dono)
      },
      aoErro: (mensagem) =>
        this.opcoes.aoErroDePontosDeCaminho?.(mensagem, this.donoDosPontos ?? 'caminhos'),
      pedirQuadro: this.pedirQuadro,
    })
    this.cena.add(this.pontosDoCaminho.grupo)

    canvas.addEventListener('pointerdown', this.aoApertar)
    canvas.addEventListener('pointerdown', this.protegerGestoDaAlca, true)
    canvas.addEventListener('pointerup', this.aoSoltar)
    canvas.addEventListener('pointercancel', this.aoCancelar)
    canvas.ownerDocument.defaultView?.addEventListener('keydown', this.cancelarAlcaPelaTecla, true)
    canvas.ownerDocument.defaultView?.addEventListener('blur', this.aoCancelar)

    this.laco = new DemandRenderLoop(canvas, this.renderer, this.camera, this.quadro)
  }

  // ---- contrato público -------------------------------------------------

  definirDocumento(documento: DocumentoDeCenario): void {
    if (this.destruido) return
    if (this.documento !== documento) {
      this.edicaoDoAmbiente.finalizar(true)
      this.pontosDaAgua.definir(null)
      this.pontosDoCaminho.contextoAlterado()
      this.donoDosPontos = null
    }
    if (this.documento !== documento) this.escultura.contextoAlterado()
    if (this.documento !== documento && (this.teste || this.preparandoTeste)) this.encerrarTeste()
    if (this.gesto) {
      // No meio de um gesto a prévia é do palco; o documento novo entra quando ele acabar.
      this.pendente = documento
      return
    }
    this.documento = documento
    const projecao = resolverConjuntos(this.edicaoDoAmbiente.projetar(documento))
    this.visual = projecao.documento
    this.origens = projecao.origens
    this.temChao = dominioDoChao(documento.base)
    this.espalhamento.contextoAlterado()
    this.aplicarChao(documento)
    this.pedirModelos(this.visual)
    this.pedirTexturas(this.visual)
    // definir publica o estado sincronicamente e reconstrói uma única vez pelo callback.
    this.atualizarGrade()
  }

  definirSelecao(ids: readonly string[]): void {
    this.selecao = [...ids]
    this.atualizarSelecao()
  }
  definirGuiasDoJogo(visiveis: boolean): void {
    if (this.teste || this.preparandoTeste) throw Error('Saia do teste antes de alterar as guias.')
    if (visiveis && this.opcoes.fotografia)
      throw Error('Retratos de composição não contêm guias de edição.')
    this.guiasDoJogo = visiveis
    this.reconstruir()
    this.atualizarSelecao()
    this.pedirQuadro()
  }

  definirColisoesVisiveis(visiveis: boolean): void {
    if (this.destruido || this.teste || this.preparandoTeste || this.gesto)
      throw Error('Termine o gesto e saia do Testar antes de inspecionar colisões.')
    if (visiveis && this.opcoes.fotografia)
      throw Error('Retratos de composição não contêm a inspeção de colisões.')
    this.mostrarColisoes = visiveis
    this.atualizarColisoesVisiveis()
    this.pedirQuadro()
  }

  capturarCamera(): VistaDeCamera {
    if (this.destruido || this.teste || this.preparandoTeste)
      throw Error('Use a câmera de edição fora do Testar.')
    return VistaDeCameraSchema.parse({
      posicao: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      alvo: { x: this.orbita.target.x, y: this.orbita.target.y, z: this.orbita.target.z },
      campoDeVisao: this.camera.fov,
    })
  }

  restaurarCamera(vista: VistaDeCamera): void {
    if (
      this.destruido ||
      this.teste ||
      this.preparandoTeste ||
      this.gestosAtivos.size ||
      this.pontosDoCaminho.habilitada ||
      this.edicaoDoAmbiente.ativa ||
      this.pontosDaAgua.habilitada
    )
      throw Error('Termine o gesto e saia do Testar antes de restaurar a câmera.')
    const v = VistaDeCameraSchema.parse(vista)
    this.camera.position.set(v.posicao.x, v.posicao.y, v.posicao.z)
    this.orbita.target.set(v.alvo.x, v.alvo.y, v.alvo.z)
    this.camera.fov = v.campoDeVisao
    this.camera.updateProjectionMatrix()
    this.camera.lookAt(this.orbita.target)
    this.orbita.update()
    this.atualizarRecorte()
    this.pedirQuadro()
  }

  recarregarTexturas(): void {
    this.texturas.repetirFalhas()
  }

  definirFerramenta(ferramenta: Ferramenta): void {
    this.ferramenta = ferramenta
    this.atualizarAlca()
  }

  /** Sem a faixa do tamanho por eixo, qualquer puxador do tamanho escala por igual. */
  definirTamanhoSoUniforme(soUniforme: boolean): void {
    this.tamanhoSoUniforme = soUniforme
  }

  definirModoDeSelecao(modo: ModoDeSelecao): void {
    if (modo !== 'ponto') this.definirEscultura(null)
    if (modo !== 'ponto') this.definirEspalhamento(null)
    this.modoDeSelecao = modo
    this.area.setTool(modo === 'retangulo' ? 'box' : modo === 'laco' ? 'lasso' : 'point')
    this.atualizarAlca()
  }

  definirEspalhamento(configuracao: ConfiguracaoDoEspalhamento | null): void {
    if (configuracao && this.edicaoDoAmbiente.tipo === 'ambiente')
      throw Error('Conclua ou cancele a prévia antes de abrir o pincel.')
    if (configuracao) this.definirCapturaDeAgua(null)
    if (configuracao) this.definirCapturaDeCaminho(null, this.donoDosPontos ?? 'caminhos')
    if (configuracao) this.escultura?.definir(null)
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
    if (doc.base.tipo === 'terreno')
      for (const camada of doc.base.solo?.camadas ?? [])
        if (camada.textura) usadas.add(camada.textura.id)
    if (doc.iluminacao.ceu?.tipo === 'panorama') usadas.add(doc.iluminacao.ceu.textura)
    // Trilha ou estrada com textura esperava uma imagem que ninguém pedia: não desenhava e o
    // Testar ficava esperando os caminhos para sempre.
    for (const c of doc.caminhos) if (c.aparencia?.textura) usadas.add(c.aparencia.textura.id)
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
        apoio: this.apoiarNaSuperficie(superficie.id, superficie.ponto, superficie.parte),
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

  private pontoParaControles(x: number, y: number, altura?: number): Ponto3 | null {
    if (altura == null) return this.pontoNoChao(x, y)
    if (!this.documento || (this.documento.base.tipo === 'terreno' && !this.terreno)) return null
    this.mirar(x, y)
    this.planoDosControles.constant = -altura
    const p = this.raio.ray.intersectPlane(this.planoDosControles, new Vector3())
    return p
      ? {
          x: encaixar(p.x, this.encaixe.grade, this.encaixe.origem.x),
          y: altura,
          z: encaixar(p.z, this.encaixe.grade, this.encaixe.origem.z),
        }
      : null
  }

  fonteDeAlturas() {
    const fonte =
      this.terreno?.altura ??
      (this.documento?.base.tipo === 'plano' ? this.alturaDoPlano : undefined)
    if (fonte) fonte.parteDoCaminho = (id, chave) => this.caminhos.parte(id, chave)
    return fonte
  }
  estadoDoTerreno() {
    return this.terreno ? clonarEstadoDoTerreno(this.terreno.estado) : null
  }

  definirEscultura(configuracao: ConfiguracaoDaEscultura | null) {
    if (configuracao && this.edicaoDoAmbiente.tipo === 'ambiente')
      throw Error('Conclua ou cancele a prévia antes de esculpir.')
    if (configuracao) {
      this.definirCapturaDeAgua(null)
      this.definirCapturaDeCaminho(null, this.donoDosPontos ?? 'caminhos')
      this.espalhamento.definir(null)
      this.modoDeSelecao = 'ponto'
      this.area.setTool('point')
    }
    this.escultura.definir(this.teste || this.preparandoTeste ? null : configuracao)
    this.atualizarAlca()
  }
  definirCapturaDeAgua(pontos: readonly Ponto3[] | null) {
    if (this.destruido) return
    if (pontos && this.edicaoDoAmbiente.tipo === 'ambiente')
      throw Error('Conclua ou cancele a prévia antes de editar a água.')
    if (pontos && (this.teste || this.preparandoTeste || this.gesto || this.escultura.ocupada))
      throw Error('Termine o gesto antes de escolher os pontos da água.')
    if (pontos) {
      this.pontosDoCaminho.definir(null)
      this.donoDosPontos = null
      this.espalhamento.definir(null)
      this.escultura.definir(null)
      this.modoDeSelecao = 'ponto'
      this.area.setTool('point')
    }
    this.toque = null
    this.pontosDaAgua.definir(pontos)
    this.atualizarAlca()
    this.pedirQuadro()
  }
  definirCapturaDeCaminho(configuracao: CapturaDeCaminho | null, dono: DonoDosPontos = 'caminhos') {
    if (this.destruido) return
    if (configuracao && this.edicaoDoAmbiente.tipo === 'ambiente')
      throw Error('Conclua ou cancele a prévia antes de editar pontos.')
    if (this.donoDosPontos && this.donoDosPontos !== dono) {
      if (!configuracao) return
      throw Error('Termine a edição de pontos atual antes de abrir outra ferramenta.')
    }
    if (
      configuracao &&
      (this.teste || this.preparandoTeste || this.gesto || this.escultura.ocupada)
    )
      throw Error('Termine o gesto antes de editar os pontos do caminho.')
    if (configuracao) {
      this.pontosDaAgua.definir(null)
      this.espalhamento.definir(null)
      this.escultura.definir(null)
      this.modoDeSelecao = 'ponto'
      this.area.setTool('point')
    }
    this.toque = null
    this.pontosDoCaminho.definir(configuracao)
    this.donoDosPontos = configuracao ? dono : null
    this.atualizarAlca()
    this.pedirQuadro()
  }
  preverAmbiente(
    origem: DocumentoDeCenario,
    comandos: readonly ComandoDePreviaDoAmbiente[],
    dono: DonoDaPreviaDoAmbiente = 'luz',
  ) {
    if (
      this.destruido ||
      this.teste ||
      this.preparandoTeste ||
      this.gestosAtivos.size ||
      this.pontosDoCaminho.habilitada ||
      this.pontosDaAgua.habilitada ||
      this.escultura.habilitado ||
      this.espalhamento.habilitado
    )
      throw Error('Termine a ferramenta atual e saia do Testar antes de prever o ambiente.')
    this.edicaoDoAmbiente.preverComandos(origem, this.documento, comandos, dono)
    this.pedirTexturas(this.edicaoDoAmbiente.projetar(origem))
    this.reconstruir()
  }
  finalizarPreviaDeAmbiente(cancelar = true, dono: DonoDaPreviaDoAmbiente = 'luz') {
    if (this.destruido || this.edicaoDoAmbiente.tipo !== 'ambiente') return
    if (this.edicaoDoAmbiente.dono !== dono) return
    this.edicaoDoAmbiente.finalizar(cancelar, 'ambiente', dono)
    if (cancelar) {
      if (this.documento) this.pedirTexturas(this.documento)
      this.reconstruir()
    } else this.atualizarAlca()
  }
  preverAgua(origem: DocumentoDeCenario, operacao: OperacaoDeAguaPreparada) {
    if (
      this.destruido ||
      this.teste ||
      this.preparandoTeste ||
      this.gesto ||
      this.escultura.ocupada ||
      this.pontosDoCaminho.ocupada
    )
      throw Error('Termine o gesto antes de prever a água.')
    this.edicaoDoAmbiente.prever(origem, this.documento, operacao)
    this.reconstruir()
  }
  finalizarPreviaDeAgua(cancelar = true) {
    if (this.destruido) return
    if (this.edicaoDoAmbiente.tipo !== 'agua') return
    this.edicaoDoAmbiente.finalizar(cancelar, 'agua')
    if (cancelar) {
      this.reconstruir()
    }
    this.atualizarAlca()
  }
  preverCaminho(origem: DocumentoDeCenario, operacao: OperacaoDeCaminhoPreparada) {
    if (
      this.destruido ||
      this.teste ||
      this.preparandoTeste ||
      this.gesto ||
      this.escultura.ocupada ||
      this.pontosDoCaminho.ocupada
    )
      throw Error('Termine o gesto antes de prever o caminho.')
    this.edicaoDoAmbiente.prever(origem, this.documento, operacao)
    const visual = this.edicaoDoAmbiente.projetar(origem)
    this.pedirModelos(visual)
    this.pedirTexturas(visual)
    this.reconstruir()
  }
  finalizarPreviaDeCaminho(cancelar = true) {
    if (this.destruido || this.edicaoDoAmbiente.tipo !== 'caminho') return
    this.edicaoDoAmbiente.finalizar(cancelar, 'caminho')
    if (cancelar) {
      if (this.documento) {
        this.pedirModelos(this.documento)
        this.pedirTexturas(this.documento)
      }
      this.reconstruir()
    }
    this.atualizarAlca()
  }
  finalizarEscultura(cancelar = false) {
    if (this.destruido) return
    this.escultura.finalizarEnvio(cancelar)
    if (cancelar) this.limparRecursosNaoReferenciados()
    this.atualizarAlca()
  }
  private limparRecursosNaoReferenciados() {
    const base = this.documento?.base
    const usados = new Set(
      base?.tipo === 'terreno' ? referenciasDoTerreno(base).map((p) => p.digest) : [],
    )
    this.recursosDoTerreno = new Map(
      [...this.recursosDoTerreno].filter(([digest]) => usados.has(digest)),
    )
  }
  descartarRecursosDoTerreno(digests: readonly string[]) {
    const base = this.documento?.base
    const usados = new Set(
      base?.tipo === 'terreno' ? referenciasDoTerreno(base).map((p) => p.digest) : [],
    )
    const restantes = new Map(this.recursosDoTerreno)
    for (const digest of digests) if (!usados.has(digest)) restantes.delete(digest)
    this.recursosDoTerreno = restantes
  }
  private pontoParaEsculpir(x: number, y: number) {
    if (!this.terreno || this.teste || this.preparandoTeste) return null
    const caixa = this.canvas.getBoundingClientRect()
    if (x < caixa.left || x > caixa.right || y < caixa.top || y > caixa.bottom) return null
    this.mirar(x, y)
    const p = this.terreno.pontoParaEditar(this.raio, true)
    return p ? { x: p.x, y: p.y, z: p.z } : null
  }

  async prepararRecursosDoTerreno(arquivos: readonly ArquivoDeTerreno[], sinal?: AbortSignal) {
    const origem = this.documento
    if (this.destruido || !origem) throw new Error('Abra um cenário para preparar o terreno')
    if (origem.base.tipo === 'terreno' && !this.terreno)
      throw new Error('Aguarde o relevo antes de editar')
    if (arquivos.length > MAX_RECURSOS_TERRENO) throw new Error('O terreno tem peças demais')
    sinal?.throwIfAborted()
    const leitura = arquivos.map(({ digest, conteudo }) => {
      if (
        !/^[a-f0-9]{64}$/.test(digest) ||
        !conteudo.byteLength ||
        conteudo.byteLength > MAX_BYTES_RECURSO_TERRENO
      )
        throw new Error('O recurso de terreno é inválido')
      return { digest, conteudo: conteudo.slice() }
    })
    const preparados = new Map<string, RecursoDeTerreno>()
    for (const arquivo of leitura) {
      sinal?.throwIfAborted()
      if ((await digestDosBytes(arquivo.conteudo)) !== arquivo.digest)
        throw new Error('O conteúdo não corresponde ao recurso de terreno')
      preparados.set(arquivo.digest, lerRecursoDeTerreno(arquivo.conteudo))
    }
    sinal?.throwIfAborted()
    if (this.destruido || this.documento !== origem)
      throw new DOMException('O cenário mudou durante a preparação', 'AbortError')
    this.recursosDoTerreno = new Map([...this.recursosDoTerreno, ...preparados])
  }

  async iniciarTeste(config: ConfiguracaoDoTeste, sinal?: AbortSignal): Promise<void> {
    if (this.destruido || !this.documento || !this.visual)
      throw new Error('Abra um cenário antes de testar')
    if (this.documento.base.tipo === 'perfil')
      throw new Error('Converta o relevo antes de caminhar neste cenário')
    if (
      this.gesto ||
      this.gestosAtivos.size ||
      this.escultura.ocupada ||
      this.edicaoDoAmbiente.ativa ||
      this.pontosDaAgua.habilitada ||
      this.pontosDoCaminho.habilitada
    )
      throw new Error('Termine o gesto antes de testar')
    this.encerrarTeste()
    const controle = new AbortController(),
      cancelar = () => controle.abort()
    this.preparandoTeste = controle
    this.atualizarAlca()
    sinal?.addEventListener('abort', cancelar, { once: true })
    let modelo: ModeloCarregado | null = null,
      mundo: MundoDoTeste | null = null,
      personagem: PersonagemDoTeste | null = null
    try {
      sinal?.throwIfAborted()
      await this.aguardarRecursos(controle.signal)
      if (this.estadoDasAguas.carregando || this.estadoDasAguas.falhas.length)
        throw new Error(
          this.estadoDasAguas.falhas[0]?.mensagem ??
            'Espere a água e suas margens terminarem de carregar.',
        )
      if (this.estadoDosCaminhos.carregando || this.estadoDosCaminhos.falhas.length)
        throw new Error(
          this.estadoDosCaminhos.falhas[0]?.mensagem ??
            'Espere os caminhos terminarem de carregar.',
        )
      controle.signal.throwIfAborted()
      if (config.modelo) {
        const bytes = await conferirConteudoDoModelo(
          await this.opcoes.carregarModelo(config.modelo, controle.signal),
          config.modelo.digest,
        )
        controle.signal.throwIfAborted()
        modelo = await lerGlb(bytes)
        controle.signal.throwIfAborted()
      }
      personagem = new PersonagemDoTeste(modelo, config)
      const pacote = this.prepararColisoes()
      try {
        mundo = new MundoDoTeste(pacote.fontes)
      } finally {
        pacote.descartar()
      }
      if (
        config.inicio &&
        ![config.inicio.x, config.inicio.y, config.inicio.z].every(
          (n) => Number.isFinite(n) && Math.abs(n) <= 100_000,
        )
      )
        throw new Error('O ponto inicial do teste é inválido')
      if (
        config.giroInicial != null &&
        (!Number.isFinite(config.giroInicial) || Math.abs(config.giroInicial) > 100_000)
      )
        throw Error('O giro inicial do teste é inválido.')
      const marco =
        !config.inicio && config.marcadorDeInicio !== null
          ? inicioDoCenario(this.documento, this.fonteDeAlturas(), config.marcadorDeInicio)
          : null
      if (!config.inicio && config.marcadorDeInicio && !marco)
        throw Error('Escolha um ponto de início visível do cenário.')
      const pontoInicial = config.inicio ?? marco?.posicao,
        configuracao = { ...config, giroInicial: config.giroInicial ?? marco?.giro },
        foco = pontoInicial
          ? new Vector3(pontoInicial.x, pontoInicial.y, pontoInicial.z)
          : this.orbita.target.clone(),
        inicio = foco.clone()
      this.superficies.limites(this.limitesDaCena)
      const topo = pontoInicial
        ? foco.y + personagem.altura
        : Math.max(
            foco.y,
            this.limitesDaCena.isEmpty() ? 0 : this.limitesDaCena.max.y,
            this.documento.base.tipo === 'terreno' ? this.documento.base.max : 0,
          ) +
          personagem.altura * 2
      const de = new Vector3(foco.x, topo, foco.z),
        ate = new Vector3(foco.x, Math.min(foco.y - 1000, -1000), foco.z)
      const piso = mundo.rastrear(de, ate)
      if (config.modo !== 'voo' && (!piso || piso.normal.y < Math.cos((48 * Math.PI) / 180)))
        throw new Error('Aponte a vista para um chão caminhável antes de testar')
      if (piso) inicio.copy(piso.ponto).y += 0.001
      else inicio.y += personagem.altura
      controle.signal.throwIfAborted()
      this.vistaDaEdicao = {
        posicao: this.camera.position.clone(),
        rotacao: this.camera.quaternion.clone(),
        alvo: this.orbita.target.clone(),
        near: this.camera.near,
        fov: this.camera.fov,
        grade: this.grade.visible,
        fundo: this.fundoDecorativo?.visible ?? false,
        guias: this.marcadores.grupo.visible,
        colisoes: this.colisoesVisiveis.grupo.visible,
      }
      this.orbita.enabled = false
      this.area.setTool('point')
      this.definirEspalhamento(null)
      this.definirEscultura(null)
      this.grade.visible = false
      this.marcadores.grupo.visible = false
      this.colisoesVisiveis.grupo.visible = false
      if (this.fundoDecorativo) this.fundoDecorativo.visible = false
      this.contornos.definirVisivel(false)
      const escondidosDoTeste = idsEscondidos(this.visual!)
      this.teste = new SessaoDoTeste(
        this.canvas,
        this.camera,
        this.cena,
        mundo,
        personagem,
        inicio,
        configuracao,
        (estado) => this.opcoes.aoTeste?.(estado),
        this.pedirQuadro,
        new AguasDoTeste(
          this.visual!.aguas.filter((a) => !escondidosDoTeste.has(a.id)),
          this.fonteDeAlturas() ?? (() => 0),
          this.aguas.consultasDoTeste(),
        ).nivel,
      )
      this.preparandoTeste = null
      this.atualizarAlca()
      this.pedirQuadro()
      modelo = null
      mundo = null
      personagem = null
    } catch (e) {
      personagem?.descartar()
      if (!personagem) modelo?.descartar()
      mundo?.descartar()
      if (this.preparandoTeste === controle) this.encerrarTeste()
      throw e
    } finally {
      sinal?.removeEventListener('abort', cancelar)
    }
  }

  comandarTeste(comando: ComandoDoTeste) {
    this.teste?.comandar(comando)
  }
  entradaDoTeste(entrada: Partial<EntradaDoTeste>) {
    this.teste?.entrada(entrada)
  }
  estadoDoTeste() {
    return this.teste?.estado() ?? null
  }
  encerrarTeste(): void {
    this.preparandoTeste?.abort()
    this.preparandoTeste = null
    const tinha = Boolean(this.teste || this.vistaDaEdicao)
    this.teste?.descartar()
    this.teste = null
    const vista = this.vistaDaEdicao
    this.vistaDaEdicao = null
    if (vista) {
      this.camera.position.copy(vista.posicao)
      this.camera.quaternion.copy(vista.rotacao)
      this.orbita.target.copy(vista.alvo)
      this.orbita.enabled = true
      this.camera.near = vista.near
      this.camera.fov = vista.fov
      this.camera.updateProjectionMatrix()
      this.grade.visible = vista.grade
      this.marcadores.grupo.visible = vista.guias
      this.colisoesVisiveis.grupo.visible = vista.colisoes
      if (this.fundoDecorativo) this.fundoDecorativo.visible = vista.fundo
      this.contornos.definirVisivel(true)
      this.area.setTool(
        this.modoDeSelecao === 'retangulo'
          ? 'box'
          : this.modoDeSelecao === 'laco'
            ? 'lasso'
            : 'point',
      )
      this.atualizarAlca()
      this.pedirQuadro()
    }
    if (tinha) this.opcoes.aoTeste?.(null)
    this.atualizarAlca()
  }

  private apoiarNaSuperficie(id: string, ponto: Vector3, parte?: string) {
    const doc = this.documento!
    // Medidas legadas são lidas do GLB para a consulta. O host confirma e grava essas mesmas
    // medidas no lote de colocação/gesto, junto do novo apoio, sem alterar o documento aqui.
    const modelos = doc.modelos.map((m) =>
      m.volume ? m : { ...m, volume: this.volumeDoModelo(m.id) ?? undefined },
    )
    if (!parte && doc.caminhos.some((c) => c.id === id))
      return {
        tipo: 'terreno' as const,
        deslocamento: ponto.y - alturaDoChao(doc.base, ponto.x, ponto.z, this.fonteDeAlturas()),
        inclinar: false,
      }
    return apoioNaSuperficie({ ...doc, modelos }, id, ponto, this.fonteDeAlturas(), parte)
  }

  enquadrar(ids?: readonly string[]): void {
    if (this.teste) return
    if (this.documento?.base.tipo === 'terreno' && !this.terreno) {
      this.enquadramentoPendente = { ...(ids ? { ids: [...ids] } : {}) }
      return
    }
    const caixa = new Box3()
    const escolhidos = ids?.length
      ? ids
      : [
          ...this.alvos.keys(),
          ...(this.documento?.caminhos.map((c) => c.id) ?? []),
          ...(this.guiasDoJogo ? (this.documento?.marcadores.map((m) => m.id) ?? []) : []),
        ]
    const cantos = new Box3()
    for (const id of escolhidos) {
      const local = this.alvos.get(id)
      if (!local) {
        this.caminhos.limitesDo(id, cantos)
        if (cantos.isEmpty()) this.aguas.limitesDo(id, cantos)
        if (cantos.isEmpty()) this.marcadores.limitesDo(id, cantos)
        caixa.union(cantos)
        continue
      }
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
      const falhaDeCaminho = this.estadoDosCaminhos.falhas[0]
      if (falhaDeCaminho) throw new Error(`${falhaDeCaminho.nome}: ${falhaDeCaminho.mensagem}`)
      const falhaDoAmbiente = this.estadoDoAmbiente?.falhas[0]
      if (falhaDoAmbiente) throw Error(falhaDoAmbiente)
      if (
        estados.some((e) => e.estado === 'falhou') ||
        this.estadoDasTexturas.falhas.length ||
        this.falhaDeAcabamento
      )
        throw new Error('Não consegui carregar todos os arquivos da composição')
      if (
        !estados.some((e) => e.estado === 'carregando') &&
        !this.estadoDasTexturas.carregando &&
        !this.estadoDosCaminhos.carregando &&
        !this.estadoDoAmbiente?.carregando &&
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
    if (
      this.edicaoDoAmbiente.ativa ||
      this.pontosDaAgua.habilitada ||
      this.pontosDoCaminho.habilitada
    )
      return Promise.reject(Error('Conclua ou cancele a edição antes de criar retratos.'))
    const alcaVisivel = this.ajudanteDaAlca.visible
    const previaVisivel = this.espalhamento.grupo.visible
    const cursorDoTerreno = this.escultura.grupo.visible
    const guiasVisiveis = this.marcadores.grupo.visible
    const colisoesVisiveis = this.colisoesVisiveis.grupo.visible
    this.marcadores.grupo.visible = false
    this.colisoesVisiveis.grupo.visible = false
    this.escultura.grupo.visible = false
    this.espalhamento.grupo.visible = false
    this.ajudanteDaAlca.visible = false
    this.contornos.definirVisivel(false)
    try {
      this.atualizarRecorte()
      this.posicionarAmbiente()
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
      this.escultura.grupo.visible = cursorDoTerreno
      this.marcadores.grupo.visible = guiasVisiveis
      this.colisoesVisiveis.grupo.visible = colisoesVisiveis
      this.contornos.definirVisivel(true)
      this.pedirQuadro()
    }
  }

  destruir(): void {
    if (this.destruido) return
    this.encerrarTeste()
    this.destruido = true
    for (const estado of this.modelos.values())
      if (estado.estado === 'carregando') estado.controle.abort()
    if (this.reconstrucaoAgendada) clearTimeout(this.reconstrucaoAgendada)
    this.laco.dispose()
    this.espalhamento.descartar()
    this.escultura.descartar()
    this.pontosDoCaminho.descartar()
    this.edicaoDoAmbiente.finalizar(false)
    this.pontosDaAgua.descartar()
    this.aguas.descartar()
    this.caminhos.descartar()
    this.marcadores.descartar()
    this.colisoesVisiveis.descartar()
    this.ambiente.descartar()
    this.canvas.removeEventListener('pointerdown', this.aoApertar)
    this.canvas.removeEventListener('pointerdown', this.protegerGestoDaAlca, true)
    this.canvas.removeEventListener('pointerup', this.aoSoltar)
    this.canvas.removeEventListener('pointercancel', this.aoCancelar)
    this.canvas.ownerDocument.defaultView?.removeEventListener(
      'keydown',
      this.cancelarAlcaPelaTecla,
      true,
    )
    this.canvas.ownerDocument.defaultView?.removeEventListener('blur', this.aoCancelar)
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
    this.recursosDoTerreno = new Map()
    this.visual = null
    this.documento = null
    this.pendente = null
    this.texturas.descartar()
    this.limparChao()
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
    const mexeu = this.teste ? this.teste.quadro() : this.orbita.update()
    if (
      this.guiasDoJogo &&
      !this.teste &&
      !this.preparandoTeste &&
      !this.gesto &&
      this.camera.aspect !== this.aspectoDasGuias
    )
      this.reconstruir()
    this.atualizarRecorte()
    this.espalhamento.quadro(mexeu)
    this.escultura.quadro()
    this.camera.updateMatrixWorld()
    const aguaAnimada = this.aguas.quadro(
      this.camera,
      performance.now() / 1000,
      Boolean(this.opcoes.movimentoReduzido),
    )
    this.posicionarAmbiente()
    this.renderer.render(this.cena, this.camera)
    this.medir()
    return mexeu || aguaAnimada
  }

  private atualizarRecorte(): void {
    if (!this.documento) return
    this.superficies.limites(this.limitesDaCena)
    this.limitesDaCena.union(this.marcadores.limites(this.limitesDasGuias))
    if (!this.opcoes.fotografia)
      this.limitesDaCena.union(limitesDaBase(this.documento.base, this.limitesDoChao))
    const r = recorteDaCamera(
      this.limitesDaCena,
      this.camera.position,
      this.teste ? this.teste.foco(this.focoDoTeste) : this.orbita.target,
      this.camera.fov,
      this.camera.aspect,
      Boolean(this.opcoes.fotografia),
    )
    this.orbita.maxDistance = r.orbita
    const perto = this.teste ? Math.max(0.005, this.teste.altura * 0.015) : r.perto
    if (this.camera.near !== perto || this.camera.far !== r.longe) {
      this.camera.near = perto
      this.camera.far = r.longe
      this.camera.updateProjectionMatrix()
    }
    this.ambiente.atualizarNevoa(r.nevoaInicio, r.nevoaFim)
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

  private posicionarAmbiente() {
    const alvo = this.teste ? this.teste.foco(this.focoDoTeste) : this.orbita.target
    this.ambiente.quadro(this.camera, alvo)
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
    this.aguas.limpar()
    this.caminhos.limpar()
    this.planoFisico = null
    this.fundoDecorativo = null
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
      void carregarPecasDeTerreno(base, carregar, controle.signal, this.recursosDoTerreno)
        .then((recursos) => {
          if (this.destruido || this.cargaDoTerreno !== controle || controle.signal.aborted) return
          this.recursosDoTerreno = recursos
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
      this.ambiente.definirNevoaDaBase(
        Math.max(120, meio.x * 1.8, meio.z * 1.8),
        Math.max(900, meio.x * 8, meio.z * 8),
      )
      return
    }
    this.opcoes.aoTerreno?.({ estado: 'pronto', chave })
    this.recursosDoTerreno = new Map()
    const largura = meio.x * 2,
      comprimento = meio.z * 2

    const fora = new Mesh(
      new PlaneGeometry(6000, 6000),
      new MeshStandardMaterial({ color: COR_DE_FORA, roughness: 1 }),
    )
    fora.rotation.x = -Math.PI / 2
    fora.position.y = -0.03
    fora.receiveShadow = true
    this.fundoDecorativo = fora

    const lote = criarPlanoDoCenario(largura, comprimento)
    this.planoFisico = lote

    this.chao.add(fora, lote)
    const alcance = Math.max(largura, comprimento)
    this.ambiente.definirNevoaDaBase(Math.max(120, alcance * 0.9), Math.max(900, alcance * 4))
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
      // A leitura de um modelo que saiu do cenário para de baixar e de decodificar.
      if (estado.estado === 'carregando') estado.controle.abort()
      if (estado.estado === 'pronto') {
        this.aguas.esquecerModelo(estado.modelo)
        this.caminhos.esquecerModelo(estado.modelo)
        estado.representacoes.descartar()
        estado.modelo.descartar()
      }
      this.modelos.delete(digest)
    }
  }

  private carregar(modelo: ModeloDoCenario) {
    // Uma leitura antiga pode terminar depois de remover e recolocar o mesmo hash.
    // Só a leitura que ainda ocupa a entrada pode publicar sucesso ou falha.
    const pedido: EstadoDoModelo = { estado: 'carregando', controle: new AbortController() }
    let publicado: EstadoDoModelo | undefined
    this.modelos.set(modelo.digest, pedido)
    this.opcoes
      .carregarModelo(modelo, pedido.controle.signal)
      .then((bytes) => conferirConteudoDoModelo(bytes, modelo.digest))
      .then((bytes) => {
        pedido.controle.signal.throwIfAborted()
        return lerGlb(bytes)
      })
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
        if (!this.gesto) this.reconstruirEmBreve()
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
        if (!this.gesto) this.reconstruirEmBreve()
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

  private atualizarGuias() {
    if (this.destruido || this.teste || this.preparandoTeste) return
    this.aspectoDasGuias = this.camera.aspect
    const doc = this.documento ? this.edicaoDoAmbiente.projetar(this.documento) : null
    if (!doc || !this.guiasDoJogo || this.opcoes.fotografia) {
      this.marcadores.grupo.visible = false
      this.marcadores.limpar()
      this.opcoes.aoMarcadores?.({ carregando: 0, falhas: [] })
      return
    }
    this.marcadores.grupo.visible = true
    const estado = this.marcadores.definir(doc, this.fonteDeAlturas(), this.camera.aspect)
    this.opcoes.aoMarcadores?.(estado)
  }

  private prepararColisoes() {
    const chao = this.terreno?.fontesDoTeste() ?? []
    chao.push(...this.aguas.fontesDoTeste(), ...this.caminhos.fontesDoTeste())
    if (this.planoFisico) {
      this.planoFisico.updateWorldMatrix(true, false)
      chao.push({ geometria: this.planoFisico.geometry, matriz: this.planoFisico.matrixWorld })
    }
    return prepararColisoesDoTeste(
      this.visual!,
      this.superficies.fontesDoTeste(),
      this.locais,
      chao,
    )
  }

  private atualizarColisoesVisiveis() {
    if (this.teste || this.preparandoTeste) return
    const visivel =
      this.mostrarColisoes &&
      !this.opcoes.fotografia &&
      Boolean(this.visual) &&
      (this.visual!.base.tipo !== 'terreno' || Boolean(this.terreno))
    this.colisoesVisiveis.grupo.visible = visivel
    if (!visivel) {
      this.colisoesVisiveis.limpar()
      this.opcoes.aoColisoesVisiveis?.({ fontes: 0, triangulos: 0, erro: null })
      return
    }
    const pacote = this.prepararColisoes()
    try {
      const estado = this.colisoesVisiveis.definir(pacote.fontes)
      this.opcoes.aoColisoesVisiveis?.(estado)
    } finally {
      pacote.descartar()
    }
  }

  private ultimaReconstrucao = Number.NEGATIVE_INFINITY
  private reconstrucaoAgendada: ReturnType<typeof setTimeout> | null = null
  /**
   * Para o que chega aos poucos (cada modelo ou textura que termina de carregar): a primeira
   * chegada reconstrói na hora; as seguintes, dentro de 100 ms, viram uma reconstrução só. Abrir
   * uma cena com 200 modelos reconstruía 20 mil objetos 200 vezes.
   */
  private reconstruirEmBreve() {
    if (this.destruido || this.reconstrucaoAgendada) return
    const espera = this.ultimaReconstrucao + 100 - performance.now()
    if (espera <= 0) {
      this.reconstruir()
      return
    }
    this.reconstrucaoAgendada = setTimeout(() => {
      this.reconstrucaoAgendada = null
      if (this.destruido) return
      if (this.gesto) return
      this.reconstruir()
    }, espera)
  }

  private reconstruir() {
    if (this.reconstrucaoAgendada) {
      clearTimeout(this.reconstrucaoAgendada)
      this.reconstrucaoAgendada = null
    }
    this.ultimaReconstrucao = performance.now()
    // Apoios em objetos e caminhos consultam índices e estruturas uma vez por reconstrução.
    comMemoriaDaValidacao(() => this.reconstruirAgora())
  }

  private reconstruirAgora() {
    this.atualizarGuias()
    if (this.documento) {
      const autoral = this.edicaoDoAmbiente.projetar(this.documento),
        organizacao = indiceDaOrganizacao(autoral),
        texturas = new Map(autoral.texturas?.map((t) => [t.id, t]))
      const ambiente = this.ambiente.definir(autoral, this.fonteDeAlturas(), (ref) => ({
        textura: this.texturas.obter(ref.digest)?.textura,
        erro: this.estadoDasTexturas.falhas.find((f) => f.digest === ref.digest)?.mensagem,
      }))
      this.estadoDoAmbiente = ambiente
      this.opcoes.aoAmbiente?.(ambiente)
      this.estadoDosCaminhos = this.caminhos.definir(
        autoral,
        this.terreno,
        (id) => {
          const e = this.estadoDoModelo(id, autoral)
          return e?.estado === 'pronto' ? e.modelo : null
        },
        (id) => {
          const ref = texturas.get(id)
          return ref ? (this.texturas.obter(ref.digest)?.textura ?? null) : null
        },
        idsEscondidos(autoral, organizacao),
      )
      this.opcoes.aoCaminhos?.(this.estadoDosCaminhos)
      const projecao = resolverConjuntos(autoral, this.fonteDeAlturas())
      this.visual = projecao.documento
      this.origens = projecao.origens
    }
    this.espalhamento?.recursosAlterados()
    const doc = this.visual
    if (!doc) return
    if (doc.base.tipo === 'terreno' && !this.terreno) {
      this.atualizarColisoesVisiveis()
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
    this.estadoDasAguas = this.aguas.definir(
      doc,
      this.terreno,
      (id) => {
        const estado = this.estadoDoModelo(id, doc)
        return estado?.estado === 'pronto' ? estado.modelo : null
      },
      escondidos,
    )
    this.opcoes.aoAguas?.(this.estadoDasAguas)
    const tabela = new Map([
      ...doc.modelos.map((m) => [m.id, m.digest] as const),
      ...(doc.formas?.map((f) => [f.id, chaveDaForma(f)] as const) ?? []),
    ])
    const porLote = new Map<LoteDoModelo, ItemDoLote[]>()
    const falhasDeAcabamento: EstadoDasTexturas['falhas'] = []
    const texturas = new Map(doc.texturas?.map((t) => [t.id, t]) ?? [])
    this.terreno?.definirTexturas((id) => {
      const ref = texturas.get(id)
      return ref ? this.texturas.obter(ref.digest)?.textura : undefined
    })
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
    this.superficies.definir([...superficies, ...this.caminhos.superficies()])
    this.alvos = criarAlvosDeEdicao(
      this.documento!,
      this.locais,
      this.origens,
      this.fonteDeAlturas(),
    )
    for (const [id, alvo] of this.marcadores.alvos()) this.alvos.set(id, alvo)
    this.falhaDeAcabamento = falhasDeAcabamento.length > 0
    this.atualizarColisoesVisiveis()
    this.opcoes.aoTexturas?.({
      ...this.estadoDasTexturas,
      falhas: [...this.estadoDasTexturas.falhas, ...falhasDeAcabamento],
    })

    this.atualizarSelecao()
    this.pedirQuadro()
  }

  // ---- seleção e alça -----------------------------------------------------

  private movidos(): string[] {
    // Uma escolha mista nunca move silenciosamente só seus objetos.
    if (this.selecao.some((id) => !this.alvos.has(id))) return []
    if (
      this.ferramenta === 'tamanho' &&
      this.selecao.some((id) => {
        const m = this.marcadores.marcador(id)
        return m && !marcadorRedimensionavel(m)
      })
    )
      return []
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
      if (!local) {
        const caixa = this.caminhos.limitesDo(id, new Box3())
        if (caixa.isEmpty()) this.aguas.limitesDo(id, caixa)
        if (caixa.isEmpty()) this.marcadores.limitesDo(id, caixa)
        if (!caixa.isEmpty() && ++n <= 400) this.contornos.por(new Matrix4(), caixa)
        continue
      }
      if (++n > 400) break
      this.contornos.por(local.matriz, local.caixa)
    }
    this.contornos.terminar()
    this.pedirQuadro()
  }

  private atualizarAlca() {
    const movidos = this.movidos()
    const ligada =
      !this.teste &&
      !this.preparandoTeste &&
      !this.espalhamento?.habilitado &&
      !this.escultura?.habilitado &&
      !this.edicaoDoAmbiente.ativa &&
      !this.pontosDaAgua.habilitada &&
      !this.pontosDoCaminho?.habilitada &&
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
    const giroVertical =
      this.ferramenta === 'girar' && movidos.some((id) => this.marcadores.marcador(id))
    this.alca.showX = !giroVertical
    this.alca.showY = true
    this.alca.showZ = !giroVertical
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
    this.ponteiroDaAlca = null
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
      (this.tamanhoSoUniforme ||
        gesto.inicio.size > 1 ||
        [...gesto.inicio.keys()].some((id) => this.alvos.get(id)?.uniforme))
    ) {
      const s = this.pivo.scale
      this.pivo.scale.setScalar(fatorUniforme(s.x, s.y, s.z))
    }
    // Arrastar a alça além do centro dá escala negativa: a prévia aparecia espelhada e o que
    // era gravado não (o espelho tem ferramenta própria). Tamanho fica sempre positivo.
    if (this.ferramenta === 'tamanho')
      for (const e of ['x', 'y', 'z'] as const)
        this.pivo.scale[e] = Math.min(100, Math.max(0.01, this.pivo.scale[e]))
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
      const marcador = this.marcadores.marcador(id)
      if (marcador) {
        // O apoio do marcador é sua raiz, não a base de uma caixa de seleção.
        // Mover X/Z conserva a distância ao relevo; Y edita essa distância.
        const eixo = this.alca.axis ?? ''
        if (
          marcador.noChao &&
          (this.ferramenta !== 'mover' || !eixo.includes('Y')) &&
          this.documento
        )
          local.matriz.elements[13] =
            marcador.posicao.y +
            alturaDoChao(
              this.documento.base,
              local.matriz.elements[12]!,
              local.matriz.elements[14]!,
              this.fonteDeAlturas(),
            )
      }
      if (!marcador && this.ferramenta === 'mover' && this.encaixe.superficie && this.documento) {
        const caixa = local.caixa.clone().applyMatrix4(local.matriz)
        const p = new Vector3().setFromMatrixPosition(local.matriz)
        // Um raio e um conjunto por gesto, não por objeto a cada movimento do ponteiro.
        const raio = this.raioDoEncaixe
        raio.set(this.origemDoEncaixe.set(p.x, caixa.max.y + 0.01, p.z), PARA_BAIXO)
        gesto.movidos ??= new Set(gesto.inicio.keys())
        const acerto = this.superficies.acertar(raio, gesto.movidos)
        const chao = alturaDoChao(this.documento.base, p.x, p.z, this.fonteDeAlturas())
        const usarObjeto = acerto && acerto.ponto.y >= chao
        local.matriz.elements[13]! += (usarObjeto ? acerto.ponto.y : chao) - caixa.min.y
        gesto.apoios.set(
          id,
          usarObjeto
            ? this.apoiarNaSuperficie(acerto.id, acerto.ponto, acerto.parte)
            : { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
        )
      }
      local.atualizar()
    }
    gesto.atualizarApoios()
    gesto.atualizarSuperficies()
    // As colisões visíveis refazem todas as fontes (até 200 mil triângulos): durante o arrasto,
    // no máximo a cada 150 ms; ao soltar, a reconstrução da cena deixa tudo exato.
    if (
      this.mostrarColisoes &&
      performance.now() - this.colisoesNoGesto > 150 &&
      [...gesto.inicio.keys()].some((id) => !this.marcadores.marcador(id))
    ) {
      this.colisoesNoGesto = performance.now()
      this.atualizarColisoesVisiveis()
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
    if (this.teste || this.preparandoTeste) return
    if (this.espalhamento.habilitado || this.escultura.habilitado) return
    if (evento.button !== 0 || this.modoDeSelecao !== 'ponto') return
    if (this.gesto) this.ponteiroDaAlca ??= evento.pointerId
    if (this.pontosDaAgua.habilitada && this.toque) {
      this.toque = null
      return
    }
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

  private readonly protegerGestoDaAlca = (e: PointerEvent): void => {
    if (this.gesto && this.ponteiroDaAlca !== null && this.ponteiroDaAlca !== e.pointerId) {
      this.aoCancelar()
      e.stopImmediatePropagation()
    }
  }

  private readonly cancelarAlcaPelaTecla = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.gesto) {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.aoCancelar()
    }
  }

  private readonly aoSoltar = (evento: PointerEvent): void => {
    const toque = this.toque
    this.toque = null
    if (!toque || toque.ponteiro !== evento.pointerId) return
    if (Math.hypot(evento.clientX - toque.x, evento.clientY - toque.y) > TOQUE_MAXIMO_PX) return
    // Soltar em cima de uma alça é o fim de um gesto, não uma escolha.
    if (this.gesto || this.alca.dragging || this.alca.axis) return
    if (this.pontosDoCaminho.clicar(evento.clientX, evento.clientY)) return
    if (this.edicaoDoAmbiente.ativa) return
    if (this.pontosDaAgua.habilitada) {
      const ponto = this.pontoNoChao(evento.clientX, evento.clientY)
      if (ponto) this.opcoes.aoCapturarPontoDaAgua?.(ponto)
      return
    }
    this.mirar(evento.clientX, evento.clientY)
    const marcador = this.marcadores.escolher(
      this.raio,
      this.camera,
      this.canvas.getBoundingClientRect().height,
    )
    if (marcador) {
      const somar = evento.shiftKey || evento.ctrlKey || evento.metaKey
      if (somar || !this.opcoes.aoSelecionarMarcador) this.opcoes.aoSelecionar?.(marcador.id, somar)
      else this.opcoes.aoSelecionarMarcador(marcador.id)
      return
    }
    const objeto = this.superficies.escolher(this.raio)
    const agua = this.aguas.pontoSobRaio(this.raio)
    const somar = evento.shiftKey || evento.ctrlKey || evento.metaKey
    if (agua && (!objeto || agua.distancia < objeto.distancia) && this.opcoes.aoSelecionarAgua) {
      if (somar) this.opcoes.aoSelecionar?.(agua.id, true)
      else this.opcoes.aoSelecionarAgua(agua.id)
      return
    }
    const id = objeto?.id
    if (
      id &&
      this.documento?.caminhos.some((c) => c.id === id) &&
      this.opcoes.aoSelecionarCaminho
    ) {
      if (somar) this.opcoes.aoSelecionar?.(id, true)
      else this.opcoes.aoSelecionarCaminho(id)
      return
    }
    this.opcoes.aoSelecionar?.(id ? (this.origens.get(id) ?? id) : null, somar)
  }
}

export function criarPalco(canvas: HTMLCanvasElement, opcoes: OpcoesDoPalco): Palco {
  return new PalcoThree(canvas, opcoes)
}

/** Para a interface saber se um objeto pode ser mexido sem perguntar ao palco. */
export function estaTrancado(doc: DocumentoDeCenario, o: InstanciaDeCenario): boolean {
  return Boolean(o.bloqueado || indiceDaOrganizacao(doc).flags.get(o.id)?.bloqueado)
}
