import {
  alturaDoChao,
  type ComandoDeCenario,
  capturarFragmento,
  chaveDaBase,
  type EncaixeDeComposicao,
  entidadesSelecionaveis,
  entidadesTransformaveis,
  FAMILIA_DA_FERRAMENTA,
  indiceDaOrganizacao,
  type ModeloDoCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type ConfiguracaoDoTeste,
  criarPalco,
  type DonoDosPontos,
  type EstadoDasAguas,
  type EstadoDasColisoesVisiveis,
  type EstadoDasTexturas,
  type EstadoDoAmbiente,
  type EstadoDosCaminhos,
  type EstadoDosMarcadores,
  type Estatisticas,
  type Ferramenta,
  type ModoDeSelecao,
  type Palco,
  type Vista,
} from '@sistemazero/molda-cenarios-motor'
import {
  ArrowLeft,
  Blocks,
  Box,
  Boxes,
  Check,
  Clipboard,
  Cloud,
  CloudOff,
  Copy,
  Download,
  Flag,
  Haze,
  History,
  Lasso,
  Lightbulb,
  ListChecks,
  ListTree,
  Loader2,
  type LucideIcon,
  Magnet,
  Maximize,
  Moon,
  Mountain,
  MousePointer2,
  Move,
  Paintbrush,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Redo2,
  RefreshCw,
  RotateCw,
  Route,
  Scaling,
  Scan,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  TriangleAlert,
  Undo2,
  Waves,
} from 'lucide-react'
import {
  type DragEvent,
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  comandosDoGesto,
  comandosParaApagar,
  comandosParaDuplicar,
  comandosParaForma,
  comandosParaPor,
  comandosParaPorConjunto,
  comandosParaTrocar,
  comMedidasConferidas,
  type LocalDeColocacao,
  novoIdAleatorio,
} from '../acoes'
import { NOMES_AGUA } from '../agua-formulario'
import { comandosParaRemoverAgua } from '../agua-remocao'
import {
  alvosDaTransferencia,
  comandosParaRecortarEscolha,
  useAreaDeTransferencia,
} from '../area-de-transferencia'
import { NOMES_CAMINHO } from '../caminho-formulario'
import { comandosParaRemoverCaminho } from '../caminho-remocao'
import { type ControladorDaOficina, criarControlador } from '../controlador'
import { COPY } from '../copy'
import { useEdicaoAoVivo } from '../edicao-ao-vivo'
import { FerramentasPorVir, useFerramentas } from '../faixas'
import { encerrarPreparacao } from '../importar'
import { NOMES_JOGO } from '../jogo-formulario'
import { Chegando, Dialogo, Falhou, useCarga } from '../pecas'
import type {
  Biblioteca,
  CenarioAberto,
  CenariosHost,
  ConjuntoDeBiblioteca,
  EscolhaDeModelo,
  ModeloDeBiblioteca,
  MoldeDisponivel,
  Mundo,
} from '../portas'
import { comandosParaPropriedades } from '../propriedades-formulario'
import { useAgua } from '../useAgua'
import { useAmbiente } from '../useAmbiente'
import { useCaminhos } from '../useCaminhos'
import { useConjuntos } from '../useConjuntos'
import { useJogo } from '../useJogo'
import { usePincelDeObjetos } from '../usePincelDeObjetos'
import { useRetratos } from '../useRetratos'
import { useTerreno } from '../useTerreno'
import { Agua, FERRAMENTAS_AGUA } from './Agua'
import { Aparencia } from './Aparencia'
import { Caminhos, FERRAMENTAS_CAMINHOS } from './Caminhos'
import { Encaixes } from './Encaixes'
import { Espalhar } from './Espalhar'
import Exportar from './Exportar'
import { Formas } from './Formas'
import { ARRASTO_DE_MODELO, Gaveta } from './Gaveta'
import { FERRAMENTAS_JOGO, FERRAMENTAS_LUZ, Jogo } from './Jogo'
import { LuzECeu } from './LuzECeu'
import { EscolherBibliotecas } from './Mundo'
import { Organizacao } from './Organizacao'
import { Organizar } from './Organizar'
import { Painel } from './Painel'
import { Propriedades } from './Propriedades'
import { FERRAMENTAS_TERRENO_RAIL, NOMES_TERRENO, Terreno } from './Terreno'
import { ControlesDoTesteAoVivo, criarLojaDoTeste, PrepararTeste } from './Testar'
import { Versoes } from './Versoes'

type Aba = 'terreno' | 'agua' | 'objetos' | 'caminhos' | 'jogo' | 'luz'

const ABAS: readonly [Aba, LucideIcon][] = [
  ['terreno', Mountain],
  ['agua', Waves],
  ['objetos', Box],
  ['caminhos', Route],
  ['jogo', Flag],
  ['luz', Sun],
]
const FERRAMENTAS: readonly [Ferramenta, LucideIcon, string, string][] = [
  ['selecionar', MousePointer2, COPY.oficina.escolher, 'V'],
  ['mover', Move, COPY.oficina.mover, 'M'],
  ['girar', RotateCw, COPY.oficina.girar, 'R'],
  ['tamanho', Scaling, COPY.oficina.tamanho, 'T'],
  ['espalhar', Paintbrush, 'Espalhar', 'E'],
]
const HORAS: readonly [number, LucideIcon, string][] = [
  [8, Sunrise, COPY.painel.horas.manha],
  [12, Sun, COPY.painel.horas.meioDia],
  [17.5, Sunset, COPY.painel.horas.tarde],
  [22, Moon, COPY.painel.horas.noite],
]
const VISTAS: readonly Vista[] = ['livre', 'cima', 'frente', 'lado']

function digitando(alvo: EventTarget | null): boolean {
  const elemento = alvo as HTMLElement | null
  return Boolean(
    elemento?.closest?.('input, textarea, select, [contenteditable="true"], dialog[open]'),
  )
}

function Ladrilho({
  icone: Icone,
  rotulo,
  rotuloAcessivel,
  atalho,
  ligado,
  alternavel,
  desligado,
  aoTocar,
}: {
  icone: LucideIcon
  rotulo: string
  rotuloAcessivel?: string
  atalho?: string
  ligado?: boolean
  alternavel?: boolean
  desligado?: boolean
  aoTocar(): void
}): JSX.Element {
  return (
    <button
      type="button"
      className="mld-tile"
      aria-pressed={ligado}
      data-toggle={alternavel ? '' : undefined}
      disabled={desligado}
      title={atalho ? `${rotuloAcessivel ?? rotulo} (${atalho})` : (rotuloAcessivel ?? rotulo)}
      aria-label={rotuloAcessivel}
      aria-keyshortcuts={atalho}
      onClick={aoTocar}
    >
      <Icone aria-hidden="true" />
      <span className="mld-tile-label">{rotulo}</span>
    </button>
  )
}

function SeloDeGuardar({
  controlador,
  salvamento,
}: {
  controlador: ControladorDaOficina
  salvamento: ReturnType<ControladorDaOficina['getState']>['salvamento']
}): JSX.Element {
  if (salvamento === 'guardado')
    return (
      <span className="sz-tool-status sz-tool-status--ok" role="status">
        <Check aria-hidden="true" />
        {COPY.oficina.salvo.guardado}
      </span>
    )
  if (salvamento === 'guardando')
    return (
      <span className="sz-tool-status" role="status">
        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        {COPY.oficina.salvo.guardando}
      </span>
    )
  const erro = salvamento === 'erro',
    recusado = salvamento === 'recusado'
  return (
    <button
      type="button"
      className={`sz-tool-status ${erro || recusado ? 'sz-tool-status--danger' : 'sz-tool-status--warn'}`}
      title={
        erro
          ? COPY.oficina.erroTexto
          : recusado
            ? COPY.oficina.recusadoTexto
            : COPY.oficina.desatualizadoTexto
      }
      onClick={() => (erro ? controlador.tentarDeNovo() : void controlador.recarregar())}
    >
      {erro ? <CloudOff aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
      {erro ? COPY.oficina.tentar : recusado ? COPY.oficina.abrirGuardado : COPY.oficina.recarregar}
    </button>
  )
}

function OficinaAberta({
  host,
  aberto,
  mundo,
  bibliotecas,
  tema,
  aoVoltar,
  aoMudarBibliotecas,
  moldesDisponiveis,
  conjunto,
  aoEditarConjunto,
}: {
  host: CenariosHost
  aberto: CenarioAberto
  mundo: Mundo
  bibliotecas: readonly Biblioteca[]
  tema: 'light' | 'dark'
  aoVoltar(): void
  aoMudarBibliotecas(): void
  moldesDisponiveis: boolean
  conjunto: ConjuntoDeBiblioteca | null
  aoEditarConjunto?(id: string): Promise<void>
}): JSX.Element {
  const controlador = useMemo(() => criarControlador(host, aberto), [host, aberto])
  const estado = useSyncExternalStore(controlador.subscribe, controlador.getState)
  // As faixas do posto: a ferramenta trancada some do trilho e dos painéis.
  const ferramentas = useFerramentas()
  const tamanhoSoUniforme = useRef(false)
  const liberada = (aba: keyof typeof FAMILIA_DA_FERRAMENTA, ferramenta: string) => {
    const familia = FAMILIA_DA_FERRAMENTA[aba][ferramenta]
    return !familia || ferramentas.pode(familia)
  }
  // Fechar a aba ou recarregar com algo ainda não guardado pede confirmação; ao sair da tela por
  // outro caminho (menu, voltar do navegador), a fila que estava guardando termina de enviar.
  useEffect(() => {
    const aoSair = (evento: BeforeUnloadEvent) => {
      if (controlador.getState().salvamento === 'guardado') return
      evento.preventDefault()
      evento.returnValue = ''
    }
    globalThis.addEventListener('beforeunload', aoSair)
    return () => {
      globalThis.removeEventListener('beforeunload', aoSair)
      void controlador.terminar()
    }
  }, [controlador])
  const canvas = useRef<HTMLCanvasElement>(null)
  const previaDaArea = useRef<SVGPolygonElement>(null)
  const palco = useRef<Palco | null>(null)
  // O estado do teste (a cada 100 ms) mora numa loja: a oficina só guarda se está testando.
  const [lojaDoTeste] = useState(criarLojaDoTeste)
  const [testando, setTestando] = useState(false)
  const [escolhendoPersonagem, setEscolhendoPersonagem] = useState(false)
  const [personagemDaBiblioteca, setPersonagemDaBiblioteca] = useState<ModeloDoCenario | null>(null)
  const [janelaTeste, setJanelaTeste] = useState(false)
  const [exportacaoAberta, setExportacaoAberta] = useState(false)
  const [preparandoTeste, setPreparandoTeste] = useState(false)
  const [erroTeste, setErroTeste] = useState<string | null>(null)
  const [conjuntosCarregando, setConjuntosCarregando] = useState(0)
  const controleDoTeste = useRef<AbortController | null>(null)
  const emEnsaio = testando || preparandoTeste
  const ensaioAtivo = useRef(false)
  ensaioAtivo.current = emEnsaio || janelaTeste || escolhendoPersonagem
  // biome-ignore lint/correctness/useExhaustiveDependencies: outra conexão/controlador encerra a sessão transitória anterior
  useEffect(() => {
    lojaDoTeste.definir(null)
    setTestando(false)
    setJanelaTeste(false)
    setPreparandoTeste(false)
    setErroTeste(null)
    setEscolhendoPersonagem(false)
    setPersonagemDaBiblioteca(null)
    setConjuntosCarregando(0)
    return () => {
      controleDoTeste.current?.abort()
      controleDoTeste.current = null
    }
  }, [controlador])
  const arrastado = useRef<EscolhaDeModelo | null>(null)
  const troca = useRef<readonly string[] | null>(null)
  const [trocando, setTrocando] = useState(0)
  const importacaoDoMolde = useRef<AbortController | null>(null)
  const [preparandoMolde, setPreparandoMolde] = useState(false)
  const [erroDoMolde, setErroDoMolde] = useState<string | null>(null)
  const [revisaoDoMolde, setRevisaoDoMolde] = useState<{
    molde: MoldeDisponivel
    ponto: LocalDeColocacao
    token: string
    avisos: string[]
  } | null>(null)
  useEffect(
    () => () => {
      importacaoDoMolde.current?.abort()
      void encerrarPreparacao()
    },
    [],
  )
  const [aba, setAba] = useState<Aba>('objetos')
  const [modoDeSelecao, setModoDeSelecao] = useState<ModoDeSelecao>('ponto')
  const [configuracaoDoEncaixe, setConfiguracaoDoEncaixe] = useState<EncaixeDeComposicao>({
    grade: 0.5,
    angulo: 15,
    origem: { x: 0, y: 0, z: 0 },
    andar: null,
    superficie: false,
  })
  const [vista, setVista] = useState<Vista>('livre')
  // Em tela estreita o painel é uma folha por cima do palco: começa recolhido.
  const [painelAberto, setPainelAberto] = useState(
    () => !globalThis.matchMedia?.('(max-width: 899px)').matches,
  )
  const [modoPainel, setModoPainel] = useState<'escolha' | 'organizacao'>('escolha')
  const [medidas, setMedidas] = useState<Estatisticas | null>(null)
  const [gestoAtivo, setGestoAtivo] = useState(false)
  const [texturas, setTexturas] = useState<EstadoDasTexturas>({ carregando: 0, falhas: [] })
  const [aguas, setAguas] = useState<EstadoDasAguas>({ carregando: 0, falhas: [] })
  const [caminhosRender, setCaminhosRender] = useState<EstadoDosCaminhos>({
    carregando: 0,
    falhas: [],
    avisos: [],
  })
  const [ambienteRender, setAmbienteRender] = useState<EstadoDoAmbiente>({
    ceu: 'padrao',
    luzes: 0,
    sombrasLocais: 0,
    resolucaoDasSombrasLocais: 512,
    carregando: 0,
    falhas: [],
  })
  const [marcadoresRender, setMarcadoresRender] = useState<EstadoDosMarcadores>({
    carregando: 0,
    falhas: [],
  })
  const [colisoes, setColisoes] = useState<EstadoDasColisoesVisiveis>({
    fontes: 0,
    triangulos: 0,
    erro: null,
  })
  const [mostrarColisoes, setMostrarColisoes] = useState(false)
  const bloqueioDaTransferencia = useRef(false)
  const [relevo, setRelevo] = useState<{
    chave: string
    estado: 'carregando' | 'pronto' | 'erro'
    erro?: string
  } | null>(null)
  const [escolhendo, setEscolhendo] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [versoesAbertas, setVersoesAbertas] = useState(false)
  const [formasAbertas, setFormasAbertas] = useState(false)
  const [gavetaAberta, setGavetaAberta] = useState(true)
  const [transferenciaAberta, setTransferenciaAberta] = useState(false)
  const centroParaColar = useCallback(() => centroDaVista(canvas.current, palco.current), [])
  const transferencia = useAreaDeTransferencia({
    host,
    espaco: mundo.espacoId,
    controlador,
    palco,
    centro: centroParaColar,
    bloqueado: bloqueioDaTransferencia,
  })
  const { documento, selecao: escolha, ferramenta, encaixe } = estado
  const transformaveis = useMemo(
      () => new Set(entidadesTransformaveis(documento).map((o) => o.id)),
      [documento],
    ),
    escolhaMista = escolha.some((id) => !transformaveis.has(id)),
    selecao = useMemo(() => (escolhaMista ? [] : escolha), [escolha, escolhaMista])
  const conjuntos = useConjuntos({
    host,
    espaco: mundo.espacoId,
    controlador,
    palco,
    bibliotecas,
    conjunto,
  })
  const origemDaOficina = useMemo(() => ({ host, controlador, mundo }), [host, controlador, mundo])
  const contexto = useRef(origemDaOficina)
  contexto.current = origemDaOficina
  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])
  const porConjunto = async (escolha: ConjuntoDeBiblioteca) => {
    if (bloqueioDaTransferencia.current) {
      setErroDoMolde('Termine ou cancele a edição atual antes de colocar um conjunto.')
      return
    }
    const origem = contexto.current
    if (!origem.mundo.bibliotecas.includes(escolha.bibliotecaId))
      throw new Error('Este conjunto não pertence às bibliotecas do mundo')
    if (escolha.id === conjunto?.id)
      throw new Error('Um conjunto não pode conter uma cópia de si mesmo')
    setConjuntosCarregando((n) => n + 1)
    try {
      const versao = await host.versaoDoConjunto(escolha.id, escolha.revisao)
      if (!montado.current || contexto.current !== origem || bloqueioDaTransferencia.current) return
      const ponto = centroDaVista(canvas.current, palco.current)
      if (!ponto) throw new Error('Aproxime a câmera do chão para colocar o conjunto')
      const preparado = comandosParaPorConjunto(
        controlador.getState().documento,
        escolha,
        versao,
        ponto,
      )
      if (!controlador.executar(preparado.comandos))
        throw new Error(controlador.getState().recusa ?? 'Não consegui colocar o conjunto')
      controlador.selecionar([preparado.id])
      controlador.definirFerramenta('mover')
      setAba('objetos')
      setModoDeSelecao('ponto')
    } finally {
      if (montado.current && contexto.current === origem)
        setConjuntosCarregando((n) => Math.max(0, n - 1))
    }
  }
  const pincel = usePincelDeObjetos({
    controlador,
    documento,
    palco,
    ativo: ferramenta === 'espalhar' && !emEnsaio && !janelaTeste && !escolhendoPersonagem,
  })
  const aoAplicarPincel = pincel.aoAplicar,
    aoPreverPincel = pincel.aoPrever
  const abrirPincel = useCallback(() => {
    pincel.abrir()
    setAba('objetos')
    setModoDeSelecao('ponto')
    setModoPainel('escolha')
    setPainelAberto(true)
    troca.current = null
    setTrocando(0)
    if (!pincel.escolhas.length) setGavetaAberta(true)
  }, [pincel.abrir, pincel.escolhas.length])
  const modoAnteriorDoPincel = useRef(pincel.ativo)
  useEffect(() => {
    if (modoAnteriorDoPincel.current === pincel.ativo) return
    modoAnteriorDoPincel.current = pincel.ativo
    importacaoDoMolde.current?.abort()
    importacaoDoMolde.current = null
    setPreparandoMolde(false)
    setRevisaoDoMolde(null)
  }, [pincel.ativo])
  const relevoPronto =
    documento.base.tipo !== 'terreno' ||
    (relevo?.chave === chaveDaBase(documento.base) && relevo.estado === 'pronto')
  const terreno = useTerreno({ controlador, palco })
  const agua = useAgua({ controlador, palco, documento, ativo: aba === 'agua' && !emEnsaio })
  const caminhos = useCaminhos({
    controlador,
    palco,
    documento,
    ativo: aba === 'caminhos' && !emEnsaio,
  })
  const caminhosAtual = useRef(caminhos)
  caminhosAtual.current = caminhos
  const alturaNativa = useRef(1.16)
  const alturaDoAvatar = useCallback(() => alturaNativa.current, [])
  const centroParaMarcador = useCallback(() => {
    const ponto = centroDaVista(canvas.current, palco.current),
      doc = controlador.getState().documento
    return ponto
      ? {
          ...ponto,
          y: ponto.y ?? alturaDoChao(doc.base, ponto.x, ponto.z, palco.current?.fonteDeAlturas()),
        }
      : null
  }, [controlador])
  const jogo = useJogo({
    controlador,
    palco,
    documento,
    ativo: (aba === 'jogo' || aba === 'luz') && !emEnsaio,
    centro: centroParaMarcador,
    alturaDoAvatar,
  })
  const ambiente = useAmbiente({ controlador, palco, documento, ativo: aba === 'luz' && !emEnsaio })
  const jogoAtual = useRef(jogo),
    ambienteAtual = useRef(ambiente),
    abaAtual = useRef(aba)
  jogoAtual.current = jogo
  ambienteAtual.current = ambiente
  abaAtual.current = aba
  const edicaoAberta = agua.ocupado || caminhos.ocupado || jogo.ocupado || ambiente.ocupado
  bloqueioDaTransferencia.current =
    edicaoAberta || terreno.ocupado || emEnsaio || janelaTeste || escolhendoPersonagem
  const aoEditarPontosDeCaminho = useCallback(
    (gesto: Parameters<typeof caminhos.aoEditarPontos>[0], dono: DonoDosPontos) => {
      if (dono === 'jogo') jogoAtual.current.aoEditarPontos(gesto)
      else caminhosAtual.current.aoEditarPontos(gesto)
    },
    [],
  )
  const aoCancelarPontosDeCaminho = useCallback((dono: DonoDosPontos) => {
    if (dono === 'jogo') jogoAtual.current.cancelar()
    else caminhosAtual.current.cancelar()
  }, [])
  const aoErroDePontosDeCaminho = useCallback((erro: string, dono: DonoDosPontos) => {
    if (dono === 'jogo') jogoAtual.current.informarErro(erro)
    else caminhosAtual.current.informarErro(erro)
  }, [])
  const editarCaminho = caminhos.editar
  const aoSelecionarMarcador = useCallback(
    (id: string) => {
      if (jogoAtual.current.ocupado || ambienteAtual.current.ocupado) return
      if (controlador.getState().somarSelecao) {
        controlador.tocar(id, true)
        return
      }
      const m = controlador.getState().documento.marcadores.find((m) => m.id === id)
      setAba(m?.configuracao?.tipo === 'luz' ? 'luz' : 'jogo')
      setModoPainel('escolha')
      setPainelAberto(true)
      controlador.selecionar([id])
    },
    [controlador],
  )
  const aoSelecionarCaminho = useCallback(
    (id: string) => {
      if (controlador.getState().somarSelecao) {
        controlador.tocar(id, true)
        return
      }
      setAba('caminhos')
      setModoPainel('escolha')
      setPainelAberto(true)
      editarCaminho(id)
    },
    [editarCaminho, controlador],
  )
  const aguaAtual = useRef(agua)
  aguaAtual.current = agua
  const aoCapturarPontoDaAgua = agua.aoCapturarPonto
  const editarAgua = agua.editar
  const aoSelecionarAgua = useCallback(
    (id: string) => {
      if (controlador.getState().somarSelecao) {
        controlador.tocar(id, true)
        return
      }
      setAba('agua')
      setModoPainel('escolha')
      setPainelAberto(true)
      editarAgua(id)
    },
    [editarAgua, controlador],
  )
  const aoEsculpir = terreno.aoEsculpir,
    aoPreverTerreno = terreno.aoPrever
  const terrenoOcupado = useRef(false)
  terrenoOcupado.current = terreno.ocupado
  const fonte = relevoPronto ? palco.current?.fonteDeAlturas?.() : undefined
  const retratos = useRetratos({
    host,
    controlador,
    estado,
    palco,
    pronto:
      relevoPronto &&
      !medidas?.carregando &&
      !texturas.carregando &&
      !texturas.falhas.length &&
      !aguas.carregando &&
      !aguas.falhas.length &&
      !caminhosRender.carregando &&
      !caminhosRender.falhas.length &&
      !ambienteRender.carregando &&
      !ambienteRender.falhas.length &&
      !marcadoresRender.carregando &&
      !marcadoresRender.falhas.length,
    emGesto: gestoAtivo || emEnsaio || janelaTeste || terreno.ocupado || edicaoAberta,
  })

  // Edição ao vivo: a versão que um agente (ou outra aba) guardou abre sozinha, sem nada
  // local pendente e fora de gesto, ensaio, ferramenta aberta ou prévia de água e caminho.
  useEdicaoAoVivo({
    host,
    controlador,
    cenarioId: estado.documento.id,
    livre: () => !(gestoAtivo || emEnsaio || janelaTeste || terrenoOcupado.current || edicaoAberta),
  })

  const executar = useCallback(
    (comandos: ComandoDeCenario[]) => {
      if (
        aguaAtual.current.ocupado ||
        caminhosAtual.current.ocupado ||
        jogoAtual.current.ocupado ||
        ambienteAtual.current.ocupado
      )
        return false
      if (
        controlador.getState().documento.base.tipo === 'terreno' &&
        !palco.current?.fonteDeAlturas?.()
      )
        return false
      return controlador.executar(comandos)
    },
    [controlador],
  )

  // O palco vive enquanto o cenário estiver aberto.
  useEffect(() => {
    const tela = canvas.current
    if (!tela) return
    const novo = criarPalco(tela, {
      carregarModelo: (modelo, sinal) =>
        host.conteudoDoModelo(
          {
            biblioteca: modelo.biblioteca,
            digest: modelo.digest,
            espacoId: mundo.espacoId,
          },
          sinal,
        ),
      carregarTerreno: (digest, sinal) => host.conteudoDoTerreno(aberto.resumo.id, digest, sinal),
      carregarTextura: (ref, sinal) =>
        host.conteudoDaTextura({ ...ref, espacoId: mundo.espacoId }, sinal),
      aoTexturas: setTexturas,
      aoAguas: setAguas,
      aoCaminhos: setCaminhosRender,
      aoAmbiente: setAmbienteRender,
      aoMarcadores: setMarcadoresRender,
      aoColisoesVisiveis: setColisoes,
      aoSelecionarMarcador,
      aoSelecionarCaminho,
      aoEditarPontosDeCaminho,
      aoCancelarPontosDeCaminho,
      aoErroDePontosDeCaminho,
      aoCapturarPontoDaAgua,
      aoSelecionarAgua,
      aoTerreno: ({ estado, chave, erro }) =>
        setRelevo({
          chave,
          estado,
          ...(erro
            ? { erro: erro instanceof Error ? erro.message : 'Não consegui carregar o relevo' }
            : {}),
        }),
      aoSelecionar: (id, somar) => {
        setModoPainel('escolha')
        controlador.tocar(id, somar)
      },
      aoSelecionarArea: (ids, somar) => {
        setModoPainel('escolha')
        const atual = controlador.getState()
        controlador.selecionar(
          somar || atual.somarSelecao ? [...new Set([...atual.selecao, ...ids])] : ids,
        )
      },
      aoEspalhar: aoAplicarPincel,
      aoPreverEspalhamento: aoPreverPincel,
      aoEsculpir,
      aoPreverTerreno,
      aoGesto: setGestoAtivo,
      aoTeste: (estado) => {
        if (estado) alturaNativa.current = estado.altura
        lojaDoTeste.definir(estado)
        setTestando(estado !== null)
      },
      aoPreverSelecao: (pontos) =>
        previaDaArea.current?.setAttribute('points', pontos.map(([x, y]) => `${x},${y}`).join(' ')),
      aoTransformar: (mudancas) =>
        controlador.executar(
          comMedidasConferidas(
            controlador.getState().documento,
            [
              ...new Set(
                mudancas.flatMap((m) =>
                  m.apoio?.tipo === 'objeto' ? [m.id, m.apoio.objeto] : [m.id],
                ),
              ),
            ],
            (id) => palco.current?.volumeDoModelo(id) ?? null,
            (doc) => comandosDoGesto(doc, mudancas, palco.current?.fonteDeAlturas?.()),
          ),
        ),
      aoMedir: setMedidas,
      movimentoReduzido: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    })
    palco.current = novo
    novo.definirTamanhoSoUniforme(tamanhoSoUniforme.current)
    novo.definirDocumento(controlador.getState().documento)
    if (entidadesTransformaveis(controlador.getState().documento).length) novo.enquadrar()
    return () => {
      palco.current = null
      novo.destruir()
    }
  }, [
    host,
    controlador,
    lojaDoTeste,
    aberto.resumo.id,
    mundo.espacoId,
    aoAplicarPincel,
    aoPreverPincel,
    aoEsculpir,
    aoPreverTerreno,
    aoCapturarPontoDaAgua,
    aoSelecionarAgua,
    aoSelecionarCaminho,
    aoSelecionarMarcador,
    aoEditarPontosDeCaminho,
    aoCancelarPontosDeCaminho,
    aoErroDePontosDeCaminho,
  ])

  useEffect(() => palco.current?.definirDocumento(documento), [documento])
  useEffect(() => {
    if (!emEnsaio && !janelaTeste)
      palco.current?.definirGuiasDoJogo(aba === 'jogo' || aba === 'luz')
  }, [aba, emEnsaio, janelaTeste])
  useEffect(() => {
    if (!emEnsaio && !janelaTeste && !gestoAtivo)
      palco.current?.definirColisoesVisiveis(mostrarColisoes)
  }, [mostrarColisoes, emEnsaio, janelaTeste, gestoAtivo])
  useEffect(() => {
    palco.current?.definirEscultura(
      aba === 'terreno' &&
        documento.base.tipo === 'terreno' &&
        relevoPronto &&
        !emEnsaio &&
        !janelaTeste
        ? {
            ...terreno.parametros,
            ...(estado.ocupado || terreno.preparando || estado.salvamento !== 'guardado'
              ? { pausa: 'Aguarde o salvamento do cenário.' }
              : terreno.parametros.ferramenta === 'pintar' && !documento.base.solo
                ? { pausa: 'Adicione e guarde as camadas de chão no painel antes de pintar.' }
                : {}),
          }
        : null,
    )
  }, [
    aba,
    documento.base,
    relevoPronto,
    emEnsaio,
    janelaTeste,
    terreno.parametros,
    terreno.preparando,
    estado.ocupado,
    estado.salvamento,
  ])
  useEffect(
    () =>
      palco.current?.definirEspalhamento(
        aba === 'objetos' && relevoPronto && !estado.ocupado && !emEnsaio
          ? pincel.configuracao
          : null,
      ),
    [aba, relevoPronto, estado.ocupado, pincel.configuracao, emEnsaio],
  )
  useEffect(() => palco.current?.definirSelecao(escolha), [escolha])
  useEffect(() => {
    palco.current?.definirFerramenta(
      (aba === 'objetos' || aba === 'jogo' || aba === 'luz') &&
        !estado.ocupado &&
        !edicaoAberta &&
        !emEnsaio
        ? ferramenta
        : 'selecionar',
    )
  }, [ferramenta, aba, estado.ocupado, edicaoAberta, emEnsaio])
  useEffect(
    () =>
      palco.current?.definirModoDeSelecao(
        (aba === 'objetos' || aba === 'jogo' || aba === 'luz') &&
          relevoPronto &&
          !estado.ocupado &&
          !edicaoAberta &&
          !emEnsaio
          ? modoDeSelecao
          : 'ponto',
      ),
    [aba, relevoPronto, estado.ocupado, modoDeSelecao, emEnsaio, edicaoAberta],
  )
  useEffect(
    () =>
      palco.current?.definirEncaixe(
        encaixe ? configuracaoDoEncaixe : { grade: null, angulo: null },
      ),
    [encaixe, configuracaoDoEncaixe],
  )
  useEffect(() => palco.current?.definirTema(tema), [tema])
  // Sem a faixa do tamanho por eixo, o puxador de tamanho do palco escala por igual (também no
  // palco recriado: ele lê a referência ao nascer).
  const tamanhoPorEixo = ferramentas.pode('objetos.precisao')
  tamanhoSoUniforme.current = !tamanhoPorEixo
  useEffect(() => palco.current?.definirTamanhoSoUniforme(!tamanhoPorEixo), [tamanhoPorEixo])

  const por = useCallback(
    (modelo: ModeloDeBiblioteca, ponto: LocalDeColocacao | null) => {
      if (
        controlador.getState().documento.base.tipo === 'terreno' &&
        !palco.current?.fonteDeAlturas?.()
      )
        return
      const lugar: LocalDeColocacao = ponto ??
        centroDaVista(canvas.current, palco.current) ?? { x: 0, z: 0 }
      const id = novoIdAleatorio()
      const apoio = lugar.apoio
      const comandos = comMedidasConferidas(
        controlador.getState().documento,
        apoio?.tipo === 'objeto' ? [apoio.objeto] : [],
        (id) => palco.current?.volumeDoModelo(id) ?? null,
        (doc) => comandosParaPor(doc, modelo, lugar, () => id).comandos,
      )
      if (controlador.executar(comandos)) {
        setModoDeSelecao('ponto')
        controlador.selecionar([id])
        if (controlador.getState().ferramenta === 'selecionar')
          controlador.definirFerramenta('mover')
        setAba('objetos')
      }
    },
    [controlador],
  )
  const duplicarPasta = transferencia.duplicar
  const copiar = useCallback(() => {
    const atual = controlador.getState(),
      estruturais = new Set(
        [...atual.documento.aguas, ...atual.documento.caminhos, ...atual.documento.marcadores].map(
          (e) => e.id,
        ),
      )
    if (atual.selecao.some((id) => estruturais.has(id))) {
      duplicarPasta()
      return
    }
    if (
      atual.alvoDaArvore &&
      (atual.documento.grupos.some((g) => g.id === atual.alvoDaArvore) ||
        atual.documento.aguas.some((a) => a.id === atual.alvoDaArvore) ||
        atual.documento.caminhos.some((c) => c.id === atual.alvoDaArvore) ||
        atual.documento.marcadores.some((m) => m.id === atual.alvoDaArvore))
    ) {
      duplicarPasta()
      return
    }
    // Conserva o encaixe e os nomes da duplicação rápida já existente. Colar é outra intenção.
    const { comandos, ids } = comandosParaDuplicar(
      atual.documento,
      atual.selecao,
      undefined,
      palco.current?.fonteDeAlturas?.(),
    )
    if (comandos.length && controlador.executar(comandos)) controlador.selecionar(ids)
  }, [controlador, duplicarPasta])
  const escolherModelo = async (
    escolha: EscolhaDeModelo,
    ponto: LocalDeColocacao | null,
    aceite?: string,
  ) => {
    if (jogoAtual.current.ocupado || ambienteAtual.current.ocupado) {
      setErroDoMolde('Termine ou cancele o rascunho antes de colocar um modelo.')
      return
    }
    if (escolhendoPersonagem) {
      if ('origem' in escolha) return
      if (!mundo.bibliotecas.includes(escolha.bibliotecaId)) return
      const existente = documento.modelos.find(
        (m) => m.digest === escolha.digest && m.biblioteca === escolha.bibliotecaId,
      )
      setPersonagemDaBiblioteca(
        existente ?? {
          id: `ensaio/${escolha.id}`,
          biblioteca: escolha.bibliotecaId,
          modelo: escolha.id,
          digest: escolha.digest,
          nome: escolha.nome,
          volume: {
            min: { x: escolha.min[0], y: escolha.min[1], z: escolha.min[2] },
            max: { x: escolha.max[0], y: escolha.max[1], z: escolha.max[2] },
          },
        },
      )
      const altura = escolha.max[1] - escolha.min[1]
      if (Number.isFinite(altura) && altura > 0) alturaNativa.current = altura
      setEscolhendoPersonagem(false)
      setJanelaTeste(true)
      return
    }
    const paraCaminho = aba === 'caminhos',
      idDoCaminho = caminhosAtual.current.rascunho?.id
    const alvo = troca.current
    const paraPincel = controlador.getState().ferramenta === 'espalhar'
    const aplicarModelo = (modelo: ModeloDeBiblioteca, lugar: LocalDeColocacao | null) => {
      if (jogoAtual.current.ocupado || ambienteAtual.current.ocupado || ensaioAtivo.current) return
      if (paraCaminho) {
        const atual = caminhosAtual.current
        if (!idDoCaminho) {
          atual.informarErro('Escolha um tipo de caminho antes da peça.')
          return
        }
        if (atual.rascunho?.id !== idDoCaminho) return
        atual.usarModelo(modelo)
        setGavetaAberta(false)
        setPainelAberto(true)
        setModoPainel('escolha')
        return
      }
      if (paraPincel) {
        if (controlador.getState().ferramenta === 'espalhar') pincel.adicionar(modelo)
        return
      }
      if (controlador.getState().ferramenta === 'espalhar') return
      if (!alvo) {
        por(modelo, lugar)
        return
      }
      if (troca.current !== alvo) return
      try {
        const comandos = comMedidasConferidas(
          controlador.getState().documento,
          alvo,
          (id) => palco.current?.volumeDoModelo(id) ?? null,
          (doc) => comandosParaTrocar(doc, alvo, modelo, palco.current?.fonteDeAlturas?.()),
        )
        if (controlador.executar(comandos)) {
          troca.current = null
          setTrocando(0)
          setErroDoMolde(null)
        }
      } catch (e) {
        setErroDoMolde(e instanceof Error ? e.message : 'Não consegui trocar o modelo')
      }
    }
    if (!('origem' in escolha)) {
      aplicarModelo(escolha, ponto)
      return
    }
    if (!host.molda || !moldesDisponiveis || importacaoDoMolde.current) return
    const controle = new AbortController()
    const lugar = ponto ?? centroDaVista(canvas.current, palco.current) ?? { x: 0, z: 0 }
    importacaoDoMolde.current = controle
    setPreparandoMolde(true)
    setErroDoMolde(null)
    try {
      const resultado = await host.molda.preparar(mundo.espacoId, escolha, controle.signal, aceite)
      controle.signal.throwIfAborted()
      if (resultado.ok) {
        setRevisaoDoMolde(null)
        aplicarModelo(resultado.modelo, lugar)
      } else
        setRevisaoDoMolde({
          molde: escolha,
          ponto: lugar,
          token: resultado.token,
          avisos: resultado.avisos,
        })
    } catch (e) {
      if (!controle.signal.aborted)
        setErroDoMolde(e instanceof Error ? e.message : 'Não consegui preparar o molde')
    } finally {
      if (importacaoDoMolde.current === controle) {
        importacaoDoMolde.current = null
        if (!controle.signal.aborted) setPreparandoMolde(false)
      }
    }
  }
  const apagar = useCallback(() => {
    const atual = controlador.getState(),
      estruturais = new Set(
        [...atual.documento.aguas, ...atual.documento.caminhos].map((e) => e.id),
      )
    const alvo = atual.alvoDaArvore
    if (atual.selecao.some((id) => estruturais.has(id))) {
      try {
        const alvos = alvosDaTransferencia(atual),
          fonte = palco.current?.fonteDeAlturas(),
          fragmento = capturarFragmento(atual.documento, alvos, mundo.espacoId, fonte)
        controlador.executar(comandosParaRecortarEscolha(atual.documento, fragmento, alvos, fonte))
      } catch (e) {
        setErroDoMolde(e instanceof Error ? e.message : 'Não consegui remover a escolha.')
      }
      return
    }
    if (alvo && !atual.selecao.length && atual.documento.aguas.some((a) => a.id === alvo)) {
      try {
        controlador.executar(comandosParaRemoverAgua(atual.documento, alvo))
      } catch (e) {
        setAba('agua')
        setPainelAberto(true)
        aguaAtual.current.informarErro(
          e instanceof Error ? e.message : 'Não consegui remover esta água.',
        )
      }
      return
    }
    if (alvo && !atual.selecao.length && atual.documento.caminhos.some((c) => c.id === alvo)) {
      try {
        controlador.executar(
          comandosParaRemoverCaminho(atual.documento, alvo, palco.current?.fonteDeAlturas()),
        )
      } catch (e) {
        setAba('caminhos')
        setPainelAberto(true)
        caminhosAtual.current.informarErro(
          e instanceof Error ? e.message : 'Não consegui remover o caminho.',
        )
      }
      return
    }
    const pasta = alvo && atual.documento.grupos.some((g) => g.id === alvo)
    const comandos = comandosParaApagar(
      atual.documento,
      pasta || !atual.selecao.length ? (alvo ? [alvo] : []) : atual.selecao,
    )
    if (comandos.length) controlador.executar(comandos)
  }, [controlador, mundo.espacoId])

  // Atalhos do teclado, quando a pessoa não está escrevendo num campo.
  useEffect(() => {
    const aoApertar = (evento: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      if (ensaioAtivo.current) return
      if (
        aguaAtual.current.ocupado ||
        caminhosAtual.current.ocupado ||
        jogoAtual.current.ocupado ||
        ambienteAtual.current.ocupado
      ) {
        if (
          evento.key === 'Escape' &&
          !(evento.target as HTMLElement | null)?.closest?.('dialog[open]')
        ) {
          evento.preventDefault()
          if (jogoAtual.current.ocupado) jogoAtual.current.cancelar()
          else if (ambienteAtual.current.ocupado) ambienteAtual.current.cancelar()
          else if (caminhosAtual.current.ocupado) caminhosAtual.current.cancelar()
          else aguaAtual.current.cancelar()
        }
        return
      }
      if (terrenoOcupado.current) return
      if (evento.defaultPrevented || digitando(evento.target)) return
      const comando = evento.ctrlKey || evento.metaKey
      const tecla = evento.key.toLowerCase()
      if (comando && tecla === 'z') {
        evento.preventDefault()
        if (evento.shiftKey) controlador.refazer()
        else controlador.desfazer()
      } else if (comando && tecla === 'y') {
        evento.preventDefault()
        controlador.refazer()
      } else if (comando && tecla === 'd') {
        evento.preventDefault()
        copiar()
      } else if (comando && tecla === 'a') {
        evento.preventDefault()
        const doc = controlador.getState().documento,
          indice = indiceDaOrganizacao(doc)
        controlador.selecionar(
          entidadesSelecionaveis(doc)
            .filter((o) => !indice.flags.get(o.id)?.oculto)
            .map((o) => o.id),
        )
      } else if (comando || evento.altKey) return
      else if (tecla === 'delete' || tecla === 'backspace') {
        evento.preventDefault()
        apagar()
      } else if (tecla === 'escape') {
        if (controlador.getState().ferramenta === 'espalhar')
          controlador.definirFerramenta('selecionar')
        setModoDeSelecao('ponto')
        controlador.definirSomarSelecao(false)
        controlador.selecionar([])
      } else if (tecla === 'f') palco.current?.enquadrar(controlador.getState().selecao)
      else if (tecla === 'b' || tecla === 'l') {
        if (abaAtual.current !== 'jogo' && abaAtual.current !== 'luz') setAba('objetos')
        controlador.definirFerramenta('selecionar')
        setModoDeSelecao(tecla === 'b' ? 'retangulo' : 'laco')
      } else {
        const ferramentaDaTecla = FERRAMENTAS.find(
          ([, , , atalho]) => atalho.toLowerCase() === tecla,
        )
        if (!ferramentaDaTecla) return
        if (abaAtual.current !== 'jogo' && abaAtual.current !== 'luz') setAba('objetos')
        setModoDeSelecao('ponto')
        if (ferramentaDaTecla[0] === 'espalhar') abrirPincel()
        else controlador.definirFerramenta(ferramentaDaTecla[0])
      }
    }
    globalThis.addEventListener('keydown', aoApertar)
    return () => globalThis.removeEventListener('keydown', aoApertar)
  }, [controlador, copiar, apagar, abrirPincel])

  const sair = async () => {
    if (saindo) return
    setSaindo(true)
    await controlador.terminar()
    const salvamento = controlador.getState().salvamento
    if (salvamento !== 'guardado') {
      // Antes a seta não fazia nada; agora diz o que falta para poder sair.
      controlador.avisar(
        salvamento === 'erro' || salvamento === 'guardando'
          ? COPY.oficina.sairSemGuardar
          : COPY.oficina.sairRecusado,
      )
      setSaindo(false)
      return
    }
    try {
      await retratos.fotografar()
    } catch {
      // O retrato do cartão é um conforto: sem ele, a saída continua.
    }
    aoVoltar()
  }

  const encerrarTeste = () => {
    controleDoTeste.current?.abort()
    controleDoTeste.current = null
    palco.current?.encerrarTeste()
    lojaDoTeste.definir(null)
    setTestando(false)
    setJanelaTeste(false)
    setPreparandoTeste(false)
  }
  const iniciarTeste = async (config: ConfiguracaoDoTeste) => {
    const cena = palco.current
    if (!cena || controleDoTeste.current) return
    const controle = new AbortController()
    controleDoTeste.current = controle
    setPreparandoTeste(true)
    setErroTeste(null)
    try {
      await cena.iniciarTeste(config, controle.signal)
      if (montado.current && !controle.signal.aborted) setJanelaTeste(false)
    } catch (e) {
      if (montado.current && !controle.signal.aborted)
        setErroTeste(e instanceof Error ? e.message : 'Não consegui iniciar o teste')
    } finally {
      if (controleDoTeste.current === controle) {
        controleDoTeste.current = null
        if (montado.current) setPreparandoTeste(false)
      }
    }
  }

  const aoSoltarNoPalco = (evento: DragEvent) => {
    const modelo = arrastado.current
    if (!modelo || !evento.dataTransfer.types.includes(ARRASTO_DE_MODELO)) return
    evento.preventDefault()
    arrastado.current = null
    void escolherModelo(modelo, palco.current?.pontoNoChao(evento.clientX, evento.clientY) ?? null)
  }

  const semEscolha = escolha.length === 0 && !estado.alvoDaArvore
  const semObjetosEscolhidos = selecao.length === 0
  const dica =
    aba !== 'objetos'
      ? null
      : pincel.ativo
        ? pincel.erro
          ? 'Abra o painel do pincel para conferir a escolha.'
          : !pincel.escolhas.length
            ? 'Escolha modelos na biblioteca ou use peças do cenário.'
            : pincel.previa.ativa
              ? `${pincel.previa.quantidade} peças na prévia. Solte para criar; Escape cancela.`
              : 'Arraste no chão para espalhar. Solte para criar as peças.'
        : modoDeSelecao !== 'ponto'
          ? 'Arraste para escolher vários objetos.'
          : entidadesTransformaveis(documento).length === 0
            ? COPY.oficina.dicaVazio
            : ferramenta === 'mover' && !semObjetosEscolhidos
              ? COPY.oficina.dicaMover
              : ferramenta === 'girar' && !semObjetosEscolhidos
                ? COPY.oficina.dicaGirar
                : ferramenta === 'tamanho' && !semObjetosEscolhidos
                  ? COPY.oficina.dicaTamanho
                  : COPY.oficina.dicaEscolher

  return (
    <section
      data-molda-theme={tema}
      aria-label={documento.nome}
      className="mld-workshop mcn-oficina flex min-h-0 flex-1 flex-col overflow-hidden bg-mld-bg text-mld-text"
    >
      {conjuntos.janela}
      {exportacaoAberta ? (
        <Exportar
          host={host}
          id={documento.id}
          nome={documento.nome}
          revisao={estado.revisao}
          controlador={controlador}
          aoFechar={() => setExportacaoAberta(false)}
          aoReabrir={() => controlador.recarregar()}
        />
      ) : null}
      {janelaTeste ? (
        <PrepararTeste
          documento={documento}
          ocupado={preparandoTeste}
          erro={erroTeste}
          modeloDaBiblioteca={personagemDaBiblioteca}
          escolherNaBiblioteca={() => {
            setJanelaTeste(false)
            setEscolhendoPersonagem(true)
            setGavetaAberta(true)
          }}
          iniciar={(config) => void iniciarTeste(config)}
          fechar={encerrarTeste}
        />
      ) : null}
      {escolhendoPersonagem ? (
        <div className="mcn-andamento" role="status">
          <span>Escolha um personagem na biblioteca. Ele será usado só no teste.</span>
          <button
            type="button"
            className="sz-tool-pill"
            onClick={() => {
              setEscolhendoPersonagem(false)
              setJanelaTeste(true)
            }}
          >
            Voltar à preparação
          </button>
        </div>
      ) : null}
      {retratos.erro ? (
        <div className="mcn-andamento" role="alert">
          <span>Não guardei o retrato: {retratos.erro}</span>
          <button
            type="button"
            className="sz-tool-pill"
            disabled={retratos.ocupado}
            onClick={() => void retratos.fotografar()}
          >
            Tentar retrato da versão
          </button>
        </div>
      ) : null}
      {conjuntos.erro || conjuntos.mensagem ? (
        <div className="mcn-andamento" role={conjuntos.erro ? 'alert' : 'status'}>
          <span>{conjuntos.erro ?? conjuntos.mensagem}</span>
          {conjuntos.fotoPendente ? (
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={conjuntos.ocupado}
              onClick={() => void conjuntos.repetirFoto()}
            >
              Tentar retrato novamente
            </button>
          ) : null}
        </div>
      ) : null}
      {transferencia.mensagem ? (
        <div className="mcn-andamento" role={transferencia.erro ? 'alert' : 'status'}>
          <span>{transferencia.mensagem}</span>
          <button
            type="button"
            className="sz-tool-btn sz-tool-btn--sm"
            onClick={transferencia.limpar}
          >
            Fechar aviso
          </button>
        </div>
      ) : null}
      {transferenciaAberta ? (
        <Dialogo titulo="Copiar e colar" aoFechar={() => setTransferenciaAberta(false)}>
          <p>Leve sua escolha para outro lugar ou para outro cenário deste mesmo espaço.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="sz-tool-btn"
              disabled={semEscolha || estado.ocupado || !relevoPronto}
              onClick={() => {
                setTransferenciaAberta(false)
                void transferencia.copiar()
              }}
            >
              Copiar escolha
            </button>
            <button
              type="button"
              className="sz-tool-btn"
              disabled={semEscolha || estado.ocupado || !relevoPronto}
              onClick={() => {
                setTransferenciaAberta(false)
                void transferencia.copiar(true)
              }}
            >
              Recortar escolha
            </button>
            <button
              type="button"
              className="sz-tool-btn"
              disabled={estado.ocupado || !relevoPronto}
              onClick={() => {
                setTransferenciaAberta(false)
                void transferencia.colar()
              }}
            >
              Colar escolha
            </button>
          </div>
          <p className="mt-4 text-sm text-mld-text-muted">
            Ctrl+C copia, Ctrl+X recorta e Ctrl+V cola. Duplicar (Ctrl+D) cria outra cópia ao lado.
            Campos de texto mantêm seus próprios atalhos.
          </p>
          <button
            type="button"
            className="sz-tool-btn mt-4"
            onClick={() => setTransferenciaAberta(false)}
          >
            Voltar à oficina
          </button>
        </Dialogo>
      ) : null}
      {preparandoMolde ? (
        <div role="status" className="mcn-andamento">
          <span>Preparando a cópia do molde…</span>
          <button
            type="button"
            onClick={() => {
              importacaoDoMolde.current?.abort()
              importacaoDoMolde.current = null
              setPreparandoMolde(false)
            }}
          >
            Parar
          </button>
        </div>
      ) : null}
      {erroDoMolde ? (
        <p role="alert" className="mcn-andamento">
          {erroDoMolde}
        </p>
      ) : null}
      {revisaoDoMolde ? (
        <Dialogo titulo="Confira esta cópia do molde" aoFechar={() => setRevisaoDoMolde(null)}>
          <p>O original continua no Molda. Esta cópia precisa destas mudanças:</p>
          <ul>
            {revisaoDoMolde.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary"
            disabled={preparandoMolde}
            onClick={() =>
              void escolherModelo(revisaoDoMolde.molde, revisaoDoMolde.ponto, revisaoDoMolde.token)
            }
          >
            Usar esta cópia
          </button>
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--quiet"
            onClick={() => setRevisaoDoMolde(null)}
          >
            Cancelar
          </button>
        </Dialogo>
      ) : null}
      <header className="mld-workshop-header mld-bar" data-testando={emEnsaio || undefined}>
        <div className="mld-workshop-project" inert={emEnsaio}>
          <button
            type="button"
            className="sz-tool-icon-btn"
            onClick={sair}
            disabled={saindo || edicaoAberta}
            aria-label={COPY.oficina.voltar}
            title={COPY.oficina.voltar}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <h1 className="truncate font-extrabold text-base" title={documento.nome}>
            {documento.nome}
          </h1>
          <SeloDeGuardar controlador={controlador} salvamento={estado.salvamento} />
          {conjuntos.catalogo ? (
            <span className="sz-tool-status" role="status">
              Versão {conjuntos.catalogo.revisao} ·{' '}
              {estado.salvamento === 'guardado' &&
              estado.revisao === conjuntos.catalogo.revisaoPublicadaDoCenario
                ? 'publicada'
                : 'rascunho não publicado'}
            </span>
          ) : null}
        </div>
        <div
          className="mld-workshop-tabs"
          inert={emEnsaio}
          style={emEnsaio ? { display: 'none' } : undefined}
        >
          <fieldset aria-label={COPY.oficina.abasRotulo} className="mld-seg">
            {ABAS.filter(([valor]) => !conjunto || valor === 'objetos').map(([valor, Icone]) => (
              <button
                key={valor}
                type="button"
                aria-label={COPY.oficina.abas[valor]}
                aria-pressed={aba === valor}
                disabled={
                  agua.aplicando || caminhos.aplicando || jogo.aplicando || ambiente.aplicando
                }
                onClick={() => {
                  if (valor === aba) return
                  agua.cancelar()
                  caminhos.cancelar()
                  jogo.cancelar()
                  ambiente.cancelar()
                  if (valor !== 'objetos') pincel.fechar()
                  setAba(valor)
                  setModoPainel('escolha')
                }}
                className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
              >
                <Icone aria-hidden="true" />
                <span className="mcn-aba-rotulo">{COPY.oficina.abas[valor]}</span>
              </button>
            ))}
          </fieldset>
        </div>
        <div className="mld-workshop-file-actions">
          {!conjunto ? (
            <button
              type="button"
              className="sz-tool-icon-btn min-h-11 min-w-11"
              aria-label="Exportar cenário"
              title="Exportar cenário"
              disabled={
                emEnsaio ||
                estado.ocupado ||
                estado.salvamento !== 'guardado' ||
                edicaoAberta ||
                gestoAtivo ||
                terreno.ocupado ||
                terreno.preparando ||
                preparandoMolde ||
                conjuntos.ocupado ||
                conjuntosCarregando > 0
              }
              onClick={() => setExportacaoAberta(true)}
            >
              <Download aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary mcn-botao-testar"
            disabled={
              preparandoTeste ||
              estado.ocupado ||
              estado.salvamento !== 'guardado' ||
              !relevoPronto ||
              Boolean(medidas?.carregando) ||
              preparandoMolde ||
              conjuntos.ocupado ||
              conjuntosCarregando > 0 ||
              gestoAtivo ||
              terreno.ocupado ||
              edicaoAberta ||
              caminhosRender.carregando > 0 ||
              caminhosRender.falhas.length > 0 ||
              aguas.carregando > 0 ||
              aguas.falhas.length > 0 ||
              ambienteRender.carregando > 0 ||
              ambienteRender.falhas.length > 0 ||
              marcadoresRender.carregando > 0 ||
              marcadoresRender.falhas.length > 0 ||
              escolhendoPersonagem
            }
            onClick={() => {
              if (testando) encerrarTeste()
              else {
                setErroTeste(null)
                setJanelaTeste(true)
              }
            }}
          >
            <Play aria-hidden="true" />
            {testando ? 'Editar' : COPY.oficina.testar}
          </button>
          <div
            className="contents"
            inert={emEnsaio}
            style={emEnsaio ? { display: 'none' } : undefined}
          >
            {conjunto ? (
              <button
                type="button"
                className="sz-tool-pill"
                disabled={
                  conjuntos.ocupado ||
                  estado.ocupado ||
                  estado.revisao === conjuntos.catalogo?.revisaoPublicadaDoCenario
                }
                onClick={() => void conjuntos.publicar()}
              >
                Atualizar cópias
              </button>
            ) : null}
            <button
              type="button"
              className="sz-tool-icon-btn"
              aria-label="Guardar escolha como conjunto"
              title="Guardar escolha como conjunto"
              disabled={
                semEscolha ||
                escolhaMista ||
                estado.ocupado ||
                !relevoPronto ||
                conjuntos.ocupado ||
                edicaoAberta
              }
              onClick={conjuntos.abrir}
            >
              <Boxes aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sz-tool-icon-btn"
              aria-label="Copiar e colar"
              disabled={edicaoAberta}
              title="Copiar, recortar e colar"
              onClick={() => setTransferenciaAberta(true)}
            >
              <Clipboard aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sz-tool-icon-btn"
              aria-label="Versões do cenário"
              title="Versões do cenário"
              disabled={estado.ocupado || estado.salvamento !== 'guardado' || edicaoAberta}
              onClick={() => {
                setVersoesAbertas(true)
                void retratos.fotografar()
              }}
            >
              <History aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sz-tool-icon-btn"
              disabled={!estado.podeDesfazer || edicaoAberta}
              onClick={controlador.desfazer}
              aria-label={COPY.oficina.desfazer}
              title={`${COPY.oficina.desfazer} (Ctrl+Z)`}
            >
              <Undo2 aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sz-tool-icon-btn"
              disabled={!estado.podeRefazer || edicaoAberta}
              onClick={controlador.refazer}
              aria-label={COPY.oficina.refazer}
              title={`${COPY.oficina.refazer} (Ctrl+Y)`}
            >
              <Redo2 aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sz-tool-icon-btn"
              aria-pressed={painelAberto}
              onClick={() => setPainelAberto((p) => !p)}
              aria-label={painelAberto ? COPY.painel.fechar : COPY.painel.abrir}
              title={painelAberto ? COPY.painel.fechar : COPY.painel.abrir}
            >
              {painelAberto ? (
                <PanelRightClose aria-hidden="true" />
              ) : (
                <PanelRightOpen aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="sz-tool-icon-btn"
              aria-label="Objetos e camadas"
              title="Objetos e camadas"
              aria-pressed={painelAberto && modoPainel === 'organizacao'}
              onClick={() => {
                setModoPainel(
                  painelAberto && modoPainel === 'organizacao' ? 'escolha' : 'organizacao',
                )
                setPainelAberto(true)
              }}
            >
              <ListTree aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {estado.recusa ? (
        <p role="alert" className="mcn-recusa">
          <TriangleAlert aria-hidden="true" className="size-4" />
          {estado.recusa}
          <button type="button" onClick={controlador.limparRecusa}>
            OK
          </button>
        </p>
      ) : null}

      <div className="mld-workshop-body relative flex min-h-0 flex-1 overflow-hidden">
        <nav
          style={emEnsaio ? { display: 'none' } : undefined}
          inert={emEnsaio}
          className="mld-workshop-rail mld-bar"
          aria-label={COPY.oficina.ferramentas}
        >
          {aba === 'objetos' ? (
            <>
              {FERRAMENTAS.map(([valor, Icone, rotulo, atalho]) => (
                <Ladrilho
                  key={valor}
                  icone={Icone}
                  rotulo={rotulo}
                  atalho={atalho}
                  ligado={modoDeSelecao === 'ponto' && ferramenta === valor}
                  aoTocar={() => {
                    setModoDeSelecao('ponto')
                    if (valor === 'espalhar') abrirPincel()
                    else controlador.definirFerramenta(valor)
                  }}
                />
              ))}
              <Ladrilho
                icone={Scan}
                rotulo="Área"
                rotuloAcessivel="Retângulo"
                atalho="B"
                ligado={modoDeSelecao === 'retangulo'}
                aoTocar={() => {
                  controlador.definirFerramenta('selecionar')
                  setModoDeSelecao('retangulo')
                }}
              />
              <Ladrilho
                icone={Lasso}
                rotulo="Laço"
                atalho="L"
                ligado={modoDeSelecao === 'laco'}
                aoTocar={() => {
                  controlador.definirFerramenta('selecionar')
                  setModoDeSelecao('laco')
                }}
              />
              <Ladrilho
                icone={ListChecks}
                rotulo="Somar"
                rotuloAcessivel="Somar à escolha"
                ligado={estado.somarSelecao}
                alternavel
                aoTocar={() => controlador.definirSomarSelecao(!estado.somarSelecao)}
              />
              <hr className="mcn-fio" />
              <Ladrilho
                icone={Copy}
                rotulo="Duplicar"
                atalho="Ctrl+D"
                desligado={semEscolha || estado.ocupado || !relevoPronto}
                aoTocar={copiar}
              />
              <Ladrilho
                icone={Trash2}
                rotulo={COPY.oficina.apagar}
                atalho="Delete"
                desligado={semEscolha}
                aoTocar={apagar}
              />
              <hr className="mcn-fio" />
              {ferramentas.pode('objetos.formas') ? (
                <Ladrilho
                  icone={Blocks}
                  rotulo="Blocos"
                  desligado={!relevoPronto || estado.ocupado}
                  aoTocar={() => setFormasAbertas(true)}
                />
              ) : null}
              <Ladrilho
                icone={Magnet}
                rotulo={COPY.oficina.grade}
                ligado={encaixe}
                alternavel
                aoTocar={() => controlador.definirEncaixe(!encaixe)}
              />
            </>
          ) : aba === 'terreno' ? (
            FERRAMENTAS_TERRENO_RAIL.filter(([f]) => liberada('terreno', f)).map(([f, Icone]) => (
              <Ladrilho
                key={f}
                icone={Icone}
                rotulo={NOMES_TERRENO[f]}
                ligado={terreno.parametros.ferramenta === f}
                desligado={terreno.ocupado || !relevoPronto}
                aoTocar={() => {
                  terreno.mudar('ferramenta', f)
                  setModoPainel('escolha')
                  setPainelAberto(true)
                }}
              />
            ))
          ) : aba === 'agua' ? (
            FERRAMENTAS_AGUA.filter(([tipo]) => liberada('agua', tipo)).map(([tipo, Icone]) => (
              <Ladrilho
                key={tipo}
                icone={Icone}
                rotulo={NOMES_AGUA[tipo]}
                ligado={agua.aberto && agua.formulario.tipo === tipo}
                desligado={agua.aplicando || terreno.ocupado || !relevoPronto || estado.ocupado}
                aoTocar={() => {
                  agua.iniciar(tipo)
                  setModoPainel('escolha')
                  setPainelAberto(true)
                }}
              />
            ))
          ) : aba === 'caminhos' ? (
            FERRAMENTAS_CAMINHOS.filter(([tipo]) => liberada('caminhos', tipo)).map(
              ([tipo, Icone]) => (
                <Ladrilho
                  key={tipo}
                  icone={Icone}
                  rotulo={NOMES_CAMINHO[tipo]}
                  ligado={caminhos.rascunho?.tipo === tipo}
                  desligado={
                    caminhos.aplicando || terreno.ocupado || !relevoPronto || estado.ocupado
                  }
                  aoTocar={() => {
                    caminhos.iniciar(tipo)
                    setGavetaAberta(false)
                    setModoPainel('escolha')
                    setPainelAberto(true)
                  }}
                />
              ),
            )
          ) : aba === 'jogo' ? (
            <>
              {FERRAMENTAS_JOGO.filter(([tipo]) => liberada('jogo', tipo)).map(([tipo, Icone]) => (
                <Ladrilho
                  key={tipo}
                  icone={Icone}
                  rotulo={NOMES_JOGO[tipo]}
                  desligado={jogo.aplicando || terreno.ocupado || !relevoPronto || estado.ocupado}
                  aoTocar={() => {
                    jogo.iniciar(tipo)
                    setGavetaAberta(false)
                    setModoPainel('escolha')
                    setPainelAberto(true)
                  }}
                />
              ))}
              <hr className="mcn-fio" />
              {FERRAMENTAS.filter(([f]) => f !== 'espalhar').map(([f, Icone, rotulo, atalho]) => (
                <Ladrilho
                  key={f}
                  icone={Icone}
                  rotulo={rotulo}
                  atalho={atalho}
                  ligado={ferramenta === f}
                  desligado={edicaoAberta || estado.ocupado}
                  aoTocar={() => controlador.definirFerramenta(f)}
                />
              ))}
              <Ladrilho
                icone={Scan}
                rotulo="Colisões"
                ligado={mostrarColisoes}
                alternavel
                desligado={edicaoAberta || !relevoPronto || estado.ocupado}
                aoTocar={() => setMostrarColisoes((v) => !v)}
              />
              <Ladrilho
                icone={Copy}
                rotulo="Duplicar"
                atalho="Ctrl+D"
                desligado={edicaoAberta || semEscolha || estado.ocupado}
                aoTocar={copiar}
              />
              <Ladrilho
                icone={Trash2}
                rotulo="Apagar"
                atalho="Delete"
                desligado={edicaoAberta || semEscolha || estado.ocupado}
                aoTocar={apagar}
              />
            </>
          ) : aba === 'luz' ? (
            <>
              {HORAS.map(([hora, Icone, rotulo]) => (
                <Ladrilho
                  key={hora}
                  icone={Icone}
                  rotulo={rotulo}
                  ligado={(ambiente.rascunho?.iluminacao ?? documento.iluminacao).hora === hora}
                  desligado={
                    jogo.aplicando || ambiente.aplicando || estado.ocupado || !relevoPronto
                  }
                  aoTocar={() => {
                    jogo.cancelar()
                    ambiente.abrir('sol')
                    const atual = ambiente.lerRascunho()
                    if (atual) ambiente.mudar({ ...atual.iluminacao, hora })
                    setModoPainel('escolha')
                    setPainelAberto(true)
                  }}
                />
              ))}
              <hr className="mcn-fio" />
              {(
                [
                  ['sol', Sun, 'Sol'],
                  ['ambiente', Lightbulb, 'Ambiente'],
                  ['ceu', Cloud, 'Céu'],
                  ['nevoa', Haze, 'Névoa'],
                ] as const
              )
                // A hora mora na seção do sol: sem o sol liberado, o ladrilho dele some, mas as
                // horas do topo seguem abrindo só a hora.
                .filter(([secao]) =>
                  secao === 'sol' || secao === 'ambiente'
                    ? ferramentas.pode('luz.sol-e-ambiente')
                    : true,
                )
                .map(([secao, Icone, rotulo]) => (
                  <Ladrilho
                    key={secao}
                    icone={Icone}
                    rotulo={rotulo}
                    ligado={Boolean(ambiente.rascunho) && ambiente.secao === secao}
                    desligado={
                      jogo.aplicando || ambiente.aplicando || estado.ocupado || !relevoPronto
                    }
                    aoTocar={() => {
                      jogo.cancelar()
                      ambiente.abrir(secao)
                      setModoPainel('escolha')
                      setPainelAberto(true)
                    }}
                  />
                ))}
              {FERRAMENTAS_LUZ.filter(([tipo]) => liberada('luzes', tipo)).map(([tipo, Icone]) => (
                <Ladrilho
                  key={tipo}
                  icone={Icone}
                  rotulo={NOMES_JOGO[tipo]}
                  desligado={
                    jogo.aplicando || ambiente.aplicando || estado.ocupado || !relevoPronto
                  }
                  aoTocar={() => {
                    ambiente.cancelar()
                    jogo.iniciar(tipo)
                    setModoPainel('escolha')
                    setPainelAberto(true)
                  }}
                />
              ))}
              {FERRAMENTAS.filter(([f]) => f === 'mover' || f === 'girar').map(
                ([f, Icone, rotulo, atalho]) => (
                  <Ladrilho
                    key={f}
                    icone={Icone}
                    rotulo={rotulo}
                    atalho={atalho}
                    ligado={ferramenta === f}
                    desligado={edicaoAberta || estado.ocupado}
                    aoTocar={() => controlador.definirFerramenta(f)}
                  />
                ),
              )}
            </>
          ) : null}
        </nav>

        {/* biome-ignore lint/a11y/noStaticElementInteractions: área de soltar do arraste; pelo teclado, a gaveta põe o modelo com Enter */}
        <div
          className="mld-workshop-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          onDragOver={(evento) => {
            if (emEnsaio || agua.ocupado || jogo.ocupado || ambiente.ocupado) return
            if (!evento.dataTransfer.types.includes(ARRASTO_DE_MODELO)) return
            evento.preventDefault()
            evento.dataTransfer.dropEffect = 'copy'
          }}
          onDrop={(evento) => {
            if (!emEnsaio && !agua.ocupado && !jogo.ocupado && !ambiente.ocupado)
              aoSoltarNoPalco(evento)
          }}
        >
          <div className="mcn-palco">
            <canvas
              ref={canvas}
              tabIndex={0}
              className="mcn-palco-tela"
              aria-label={COPY.oficina.vistasRotulo}
            />
            <svg
              className="mcn-selecao-area"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polygon ref={previaDaArea} points="" vectorEffect="non-scaling-stroke" />
            </svg>
            {testando ? (
              <ControlesDoTesteAoVivo
                loja={lojaDoTeste}
                comandar={(c) => palco.current?.comandarTeste(c)}
                entrada={(e) => palco.current?.entradaDoTeste(e)}
                fechar={encerrarTeste}
              />
            ) : null}
            <div
              className="mld-stage-toolbar"
              style={emEnsaio ? { display: 'none' } : undefined}
              inert={emEnsaio}
            >
              {aguas.carregando > 0 ? (
                <p role="status" className="mld-float">
                  Carregando água e margens…
                </p>
              ) : null}
              {aguas.falhas.length ? (
                <div role="alert" className="mld-float mcn-andamento">
                  <span>
                    {aguas.falhas[0]!.nome}: {aguas.falhas[0]!.mensagem}
                  </span>
                  <button
                    type="button"
                    className="sz-tool-btn"
                    onClick={() => palco.current?.recarregarModelos()}
                  >
                    Tentar carregar de novo
                  </button>
                </div>
              ) : null}
              {texturas.carregando > 0 ? (
                <p className="mld-float" role="status">
                  Carregando {texturas.carregando}{' '}
                  {texturas.carregando === 1 ? 'textura' : 'texturas'}…
                </p>
              ) : null}
              {texturas.falhas.length ? (
                <div className="mld-float" role="alert">
                  <span>
                    Não consegui carregar{' '}
                    {texturas.falhas.length === 1
                      ? `a textura ${texturas.falhas[0]!.nome}`
                      : `${texturas.falhas.length} texturas`}
                    . {texturas.falhas[0]!.mensagem}
                  </span>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--outline"
                    onClick={() => palco.current?.recarregarTexturas()}
                  >
                    Tentar texturas novamente
                  </button>
                </div>
              ) : null}
              {!relevoPronto ? (
                <p className="mld-float" role={relevo?.estado === 'erro' ? 'alert' : 'status'}>
                  {relevo?.estado === 'erro' ? relevo.erro : 'Carregando o relevo…'}
                </p>
              ) : null}
              <fieldset className="mld-float" aria-label={COPY.oficina.vistasRotulo}>
                {VISTAS.map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    className="mcn-vista"
                    aria-pressed={vista === valor}
                    onClick={() => {
                      setVista(valor)
                      palco.current?.definirVista(valor)
                    }}
                  >
                    {COPY.oficina.vistas[valor]}
                  </button>
                ))}
              </fieldset>
              <div className="mld-float">
                <button
                  type="button"
                  className="mcn-vista"
                  onClick={() => palco.current?.enquadrar(escolha)}
                  title={`${!escolha.length ? COPY.oficina.enquadrar : COPY.oficina.enquadrarEscolha} (F)`}
                >
                  <Maximize aria-hidden="true" className="size-4" />
                  {!escolha.length ? COPY.oficina.enquadrar : COPY.oficina.enquadrarEscolha}
                </button>
              </div>
              {medidas ? (
                <p
                  className="mld-float mcn-orcamento"
                  role="status"
                  title={`${medidas.desenhos} chamadas de desenho · ${medidas.geometrias} geometrias · ${medidas.texturas} texturas na GPU`}
                >
                  {COPY.oficina.orcamento(medidas.objetos, medidas.triangulos)}
                  {medidas.carregando ? ` · ${COPY.oficina.carregando(medidas.carregando)}` : ''}
                </p>
              ) : null}
            </div>
            {dica && !emEnsaio ? (
              <div
                className="mcn-dica"
                data-molda-theme="dark"
                data-interativa={pincel.ativo && pincel.erro ? '' : undefined}
              >
                <span>{dica}</span>
                {pincel.ativo && pincel.erro ? (
                  <button
                    type="button"
                    className="sz-tool-btn sz-tool-btn--sm"
                    onClick={() => {
                      setModoPainel('escolha')
                      setPainelAberto(true)
                    }}
                  >
                    Ver pincel
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {trocando > 0 ? (
            <div className="mld-float" role="status">
              <span>
                Escolha na biblioteca o novo modelo para {trocando}{' '}
                {trocando === 1 ? 'objeto' : 'objetos'}.
              </span>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline"
                onClick={() => {
                  troca.current = null
                  setTrocando(0)
                  importacaoDoMolde.current?.abort()
                  importacaoDoMolde.current = null
                  setPreparandoMolde(false)
                  setRevisaoDoMolde(null)
                  setErroDoMolde(null)
                }}
              >
                Cancelar troca
              </button>
            </div>
          ) : null}
          <div style={emEnsaio ? { display: 'none' } : undefined} inert={emEnsaio}>
            <Gaveta
              atualizacaoDosConjuntos={conjuntos.atualizacao}
              // Montar conjunto é do intermediário: a biblioteca da família pode ter conjuntos
              // de um irmão que já chegou lá.
              {...(ferramentas.pode('objetos.conjuntos') ? { aoPorConjunto: porConjunto } : {})}
              conjuntoEmEdicao={conjunto?.id}
              modo={
                escolhendoPersonagem
                  ? 'personagem'
                  : aba === 'caminhos'
                    ? 'caminho'
                    : pincel.ativo
                      ? 'pincel'
                      : 'colocar'
              }
              aberta={gavetaAberta}
              aoMudarAbertura={setGavetaAberta}
              host={host}
              bibliotecas={bibliotecas}
              moldesDisponiveis={moldesDisponiveis && !escolhendoPersonagem}
              preparandoMolde={preparandoMolde}
              aoPor={(modelo) => void escolherModelo(modelo, null)}
              aoArrastar={(modelo) => {
                arrastado.current = modelo
              }}
              aoEscolherBibliotecas={() => setEscolhendo(true)}
            />
          </div>
        </div>

        {painelAberto ? (
          <aside
            style={emEnsaio ? { display: 'none' } : undefined}
            inert={emEnsaio}
            className="mld-workshop-inspector mld-bar mcn-painel"
            aria-label={COPY.painel.titulo}
          >
            {aba === 'terreno' && modoPainel !== 'organizacao' ? (
              <Terreno
                terreno={terreno}
                documento={documento}
                host={host}
                bibliotecas={bibliotecas}
                indisponivel={!relevoPronto || estado.ocupado || estado.salvamento !== 'guardado'}
                aoPintar={() => {
                  setGavetaAberta(false)
                  if (globalThis.matchMedia?.('(max-width: 899px)').matches) setPainelAberto(false)
                }}
              />
            ) : aba === 'agua' && modoPainel !== 'organizacao' ? (
              <Agua
                agua={agua}
                aoCopiar={() => void transferencia.copiar()}
                documento={documento}
                indisponivel={!relevoPronto || estado.ocupado || estado.salvamento !== 'guardado'}
                executar={executar}
                aoCapturar={() => {
                  if (globalThis.matchMedia?.('(max-width: 899px)').matches) setPainelAberto(false)
                }}
              />
            ) : aba === 'caminhos' && modoPainel !== 'organizacao' ? (
              <Caminhos
                caminhos={caminhos}
                documento={documento}
                host={host}
                bibliotecas={bibliotecas}
                estado={caminhosRender}
                {...(fonte ? { fonte } : {})}
                medir={(id) => palco.current?.volumeDoModelo(id) ?? null}
                indisponivel={!relevoPronto || estado.ocupado || estado.salvamento !== 'guardado'}
                executar={executar}
                aoCopiar={(id) => {
                  controlador.selecionar([], id)
                  void transferencia.copiar()
                }}
                aoCapturar={() => {
                  setGavetaAberta(false)
                  if (globalThis.matchMedia?.('(max-width: 899px)').matches) setPainelAberto(false)
                }}
                aoEscolherModelo={() => {
                  caminhos.setCapturando(false)
                  setGavetaAberta(true)
                  if (globalThis.matchMedia?.('(max-width: 899px)').matches) setPainelAberto(false)
                }}
              />
            ) : (aba === 'jogo' || aba === 'luz') && modoPainel !== 'organizacao' ? (
              <>
                {marcadoresRender.falhas.map((f) => (
                  <p key={f.id} role="alert" className="mcn-recusa">
                    {f.mensagem}
                  </p>
                ))}
                {aba === 'luz' && !jogo.rascunho ? (
                  <LuzECeu
                    ambiente={ambiente}
                    host={host}
                    bibliotecas={bibliotecas}
                    estado={ambienteRender}
                    indisponivel={
                      !relevoPronto ||
                      estado.ocupado ||
                      estado.salvamento !== 'guardado' ||
                      jogo.ocupado
                    }
                  />
                ) : null}
                {!ambiente.rascunho ? (
                  <Jogo
                    jogo={jogo}
                    documento={documento}
                    selecao={escolha}
                    fonte={fonte}
                    palco={palco.current}
                    apenasLuzes={aba === 'luz'}
                    alturaDoAvatar={alturaDoAvatar}
                    aoSelecionar={aoSelecionarMarcador}
                    indisponivel={
                      !relevoPronto ||
                      estado.ocupado ||
                      estado.salvamento !== 'guardado' ||
                      ambiente.ocupado
                    }
                    aoCapturar={() => {
                      setGavetaAberta(false)
                      if (globalThis.matchMedia?.('(max-width: 899px)').matches)
                        setPainelAberto(false)
                    }}
                  />
                ) : null}
                {mostrarColisoes ? (
                  <section className="mcn-painel-corpo" aria-label="Inspeção das colisões">
                    <h3>Colisões físicas</h3>
                    {colisoes.erro ? (
                      <p role="alert" className="mcn-recusa">
                        {colisoes.erro}
                      </p>
                    ) : (
                      <p className="text-sm text-mld-muted">
                        {colisoes.fontes} fontes · {colisoes.triangulos.toLocaleString('pt-BR')}{' '}
                        triângulos. São as mesmas fontes do Testar.
                      </p>
                    )}
                    <button
                      type="button"
                      className="sz-tool-btn"
                      onClick={() => setMostrarColisoes(false)}
                    >
                      Ocultar colisões
                    </button>
                  </section>
                ) : null}
                {!edicaoAberta && selecao.length > 0 ? (
                  <Painel
                    documento={documento}
                    selecao={selecao}
                    executar={executar}
                    fonte={fonte}
                  />
                ) : null}
              </>
            ) : modoPainel === 'organizacao' ? (
              <Organizacao
                documento={documento}
                selecao={escolha}
                selecionar={controlador.selecionar}
                executar={executar}
                aoDetalhes={() => {
                  const id = controlador.getState().alvoDaArvore
                  if (id && documento.caminhos.some((c) => c.id === id)) aoSelecionarCaminho(id)
                  else if (id && documento.aguas.some((a) => a.id === id)) aoSelecionarAgua(id)
                  else if (id && documento.marcadores.some((m) => m.id === id))
                    aoSelecionarMarcador(id)
                  else setModoPainel('escolha')
                }}
                somarSelecao={estado.somarSelecao}
                alvo={estado.alvoDaArvore}
              />
            ) : pincel.ativo && aba === 'objetos' ? (
              <Espalhar
                documento={documento}
                pincel={pincel}
                temSelecao={selecao.length > 0 && !medidas?.carregando}
                aoEscolherBiblioteca={() => {
                  setGavetaAberta(true)
                  if (globalThis.matchMedia?.('(max-width: 899px)').matches) setPainelAberto(false)
                }}
                aoPintar={() => {
                  setGavetaAberta(false)
                  if (globalThis.matchMedia?.('(max-width: 899px)').matches) setPainelAberto(false)
                }}
                aoTentar={() => {
                  palco.current?.recarregarModelos()
                  palco.current?.recarregarTexturas()
                }}
              />
            ) : (
              <>
                {escolhaMista ? (
                  <p className="mcn-painel-corpo text-sm text-mld-muted">
                    {escolha.length} elementos escolhidos. Você pode copiar, duplicar, apagar ou
                    organizar a escolha. Edite caminhos na aba Caminhos e marcadores na aba Jogo.
                  </p>
                ) : relevoPronto ? (
                  <Painel
                    documento={documento}
                    selecao={selecao}
                    executar={executar}
                    fonte={fonte}
                    aoEditarConjunto={
                      aoEditarConjunto && ferramentas.pode('objetos.conjuntos')
                        ? (id) => {
                            void controlador
                              .terminar()
                              .then(async () => {
                                if (controlador.getState().salvamento !== 'guardado')
                                  throw new Error('Guarde as alterações antes de editar o conjunto')
                                await aoEditarConjunto(id)
                              })
                              .catch((e) =>
                                setErroDoMolde(
                                  e instanceof Error ? e.message : 'Não consegui abrir o conjunto',
                                ),
                              )
                          }
                        : undefined
                    }
                  />
                ) : null}
                {relevoPronto && aba === 'objetos' && selecao.length > 0 ? (
                  <>
                    {!documento.montagens?.some((m) => selecao.includes(m.id)) &&
                    ferramentas.pode('objetos.aparencia') ? (
                      <Aparencia
                        documento={documento}
                        selecao={selecao}
                        executar={executar}
                        host={host}
                        bibliotecas={bibliotecas}
                      />
                    ) : null}
                    {ferramentas.pode('objetos.precisao') ? (
                      <Organizar
                        documento={documento}
                        selecao={selecao}
                        executar={executar}
                        medir={(id) => palco.current?.volumeDoModelo(id) ?? null}
                        fonte={fonte}
                        aoTrocar={() => {
                          if (!preparandoMolde) {
                            troca.current = [...selecao]
                            setTrocando(selecao.length)
                            setErroDoMolde(null)
                            if (globalThis.matchMedia?.('(max-width: 899px)').matches)
                              setPainelAberto(false)
                          }
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
                {relevoPronto && aba === 'objetos' && ferramentas.pode('objetos.precisao') ? (
                  <Encaixes
                    documento={documento}
                    selecao={selecao}
                    valor={configuracaoDoEncaixe}
                    aoMudar={setConfiguracaoDoEncaixe}
                    ligado={encaixe}
                    aoLigar={controlador.definirEncaixe}
                    executar={executar}
                    medir={(id) => palco.current?.volumeDoModelo(id) ?? null}
                    fonte={fonte}
                  />
                ) : null}
              </>
            )}
            {!edicaoAberta && escolha.length === 1 && ferramentas.pode('jogo.propriedades')
              ? (() => {
                  const entidade = entidadesSelecionaveis(documento).find(
                    (e) => e.id === escolha[0],
                  )
                  return entidade ? (
                    <div className="mcn-painel-corpo">
                      <Propriedades
                        key={entidade.id}
                        valor={entidade.propriedades}
                        desligado={
                          estado.ocupado ||
                          !relevoPronto ||
                          Boolean(indiceDaOrganizacao(documento).flags.get(entidade.id)?.bloqueado)
                        }
                        aoGuardar={(p) =>
                          executar(
                            comandosParaPropriedades(
                              controlador.getState().documento,
                              entidade.id,
                              p,
                            ),
                          )
                        }
                      />
                    </div>
                  ) : null
                })()
              : null}
            {modoPainel !== 'organizacao' ? <FerramentasPorVir aba={aba} /> : null}
          </aside>
        ) : null}
      </div>

      {escolhendo ? (
        <EscolherBibliotecas
          host={host}
          mundo={mundo}
          aoFechar={() => setEscolhendo(false)}
          aoGuardar={aoMudarBibliotecas}
        />
      ) : null}
      {formasAbertas ? (
        <Formas
          aoFechar={() => setFormasAbertas(false)}
          aoCriar={(forma) => {
            const lugar: LocalDeColocacao = centroDaVista(canvas.current, palco.current) ?? {
              x: 0,
              z: 0,
            }
            const id = novoIdAleatorio(),
              apoio = lugar.apoio
            const comandos = comMedidasConferidas(
              controlador.getState().documento,
              apoio?.tipo === 'objeto' ? [apoio.objeto] : [],
              (id) => palco.current?.volumeDoModelo(id) ?? null,
              (doc) => comandosParaForma(doc, forma, lugar, () => id).comandos,
            )
            if (!controlador.executar(comandos))
              throw new Error(controlador.getState().recusa ?? 'Não consegui colocar o bloco')
            controlador.selecionar([id])
            setModoDeSelecao('ponto')
            controlador.definirFerramenta('mover')
            return true
          }}
        />
      ) : null}
      {versoesAbertas ? (
        <Versoes
          host={host}
          cenarioId={aberto.resumo.id}
          revisaoAtual={estado.revisao}
          fotoRecente={retratos.ultima}
          controlador={controlador}
          aoFechar={() => setVersoesAbertas(false)}
        />
      ) : null}
    </section>
  )
}

function centroDaVista(
  tela: HTMLCanvasElement | null,
  palco: Palco | null,
): LocalDeColocacao | null {
  if (!tela || !palco) return null
  const caixa = tela.getBoundingClientRect()
  return palco.pontoNoChao(caixa.left + caixa.width / 2, caixa.top + caixa.height * 0.58)
}

/** A oficina de um cenário: abre o cenário e o mundo dele e monta o editor. */
export default function Oficina({
  host,
  espacoId,
  mundoId,
  cenarioId,
  tema,
  aoVoltar,
  moldesDisponiveis = false,
  conjuntoId,
  aoEditarConjunto,
}: {
  host: CenariosHost
  espacoId: string
  mundoId: string
  cenarioId: string
  tema: 'light' | 'dark'
  aoVoltar(): void
  moldesDisponiveis?: boolean
  conjuntoId?: string
  aoEditarConjunto?(id: string): Promise<void>
}): JSX.Element {
  const aberto = useCarga(() => host.abrirCenario(cenarioId), [host, cenarioId])
  const mundo = useCarga(async () => {
    const [doMundo, bibliotecas, conjunto] = await Promise.all([
      host.obterMundo(mundoId),
      host.listarBibliotecas(espacoId),
      conjuntoId ? host.obterConjunto(conjuntoId) : Promise.resolve(null),
    ])
    if (doMundo.espacoId !== espacoId) throw new Error('O mundo não pertence a este espaço')
    if (
      conjunto
        ? conjunto.cenarioDeEdicaoId !== cenarioId ||
          conjunto.bibliotecaId !== doMundo.bibliotecaConjuntosId
        : Boolean(doMundo.bibliotecaConjuntosId)
    )
      throw new Error('Abra a edição do conjunto pela biblioteca')
    return {
      mundo: doMundo,
      bibliotecas: bibliotecas.filter((b) => doMundo.bibliotecas.includes(b.id)),
      conjunto,
    }
  }, [host, espacoId, mundoId, cenarioId, conjuntoId])

  // Falha ao recarregar só o mundo (depois de trocar as bibliotecas) não desmonta o editor
  // aberto: ele continua com a lista de antes. Desmontar perdia o que não estava guardado.
  if (aberto.falhou || (mundo.falhou && !mundo.dados))
    return (
      <div className="mcn-centro" data-molda-theme={tema}>
        <Falhou
          texto={COPY.oficina.falhouAbrir}
          aoTentar={() => {
            aberto.recarregar()
            mundo.recarregar()
          }}
        />
      </div>
    )
  if (
    !aberto.dados ||
    !mundo.dados ||
    aberto.dados.resumo.id !== cenarioId ||
    mundo.dados.mundo.id !== mundoId ||
    (mundo.dados.conjunto?.id !== conjuntoId && (mundo.dados.conjunto || conjuntoId))
  )
    return (
      <div className="mcn-centro" data-molda-theme={tema}>
        <Chegando texto={COPY.oficina.abrindo} />
      </div>
    )
  return (
    <OficinaAberta
      key={cenarioId}
      host={host}
      aberto={aberto.dados}
      mundo={mundo.dados.mundo}
      bibliotecas={mundo.dados.bibliotecas}
      tema={tema}
      aoVoltar={aoVoltar}
      aoMudarBibliotecas={mundo.recarregar}
      moldesDisponiveis={moldesDisponiveis}
      conjunto={mundo.dados.conjunto}
      aoEditarConjunto={aoEditarConjunto}
    />
  )
}
