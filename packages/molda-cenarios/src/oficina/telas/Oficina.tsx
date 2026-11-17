import {
  type ComandoDeCenario,
  chaveDaBase,
  type EncaixeDeComposicao,
  entidadesTransformaveis,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  criarPalco,
  type EstadoDasTexturas,
  type Estatisticas,
  type Ferramenta,
  idsEscondidos,
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
  CloudOff,
  Copy,
  Flag,
  History,
  Lasso,
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
import { useAreaDeTransferencia } from '../area-de-transferencia'
import { type ControladorDaOficina, criarControlador } from '../controlador'
import { COPY } from '../copy'
import { encerrarPreparacao } from '../importar'
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
import { useConjuntos } from '../useConjuntos'
import { usePincelDeObjetos } from '../usePincelDeObjetos'
import { Aparencia } from './Aparencia'
import { Encaixes } from './Encaixes'
import { Espalhar } from './Espalhar'
import { Formas } from './Formas'
import { ARRASTO_DE_MODELO, Gaveta } from './Gaveta'
import { EscolherBibliotecas } from './Mundo'
import { Organizacao } from './Organizacao'
import { Organizar } from './Organizar'
import { Painel } from './Painel'
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
  const erro = salvamento === 'erro'
  return (
    <button
      type="button"
      className={`sz-tool-status ${erro ? 'sz-tool-status--danger' : 'sz-tool-status--warn'}`}
      title={erro ? COPY.oficina.erroTexto : COPY.oficina.desatualizadoTexto}
      onClick={() => (erro ? controlador.tentarDeNovo() : void controlador.recarregar())}
    >
      {erro ? <CloudOff aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
      {erro ? COPY.oficina.tentar : COPY.oficina.recarregar}
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
  const canvas = useRef<HTMLCanvasElement>(null)
  const previaDaArea = useRef<SVGPolygonElement>(null)
  const palco = useRef<Palco | null>(null)
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
  const [texturas, setTexturas] = useState<EstadoDasTexturas>({ carregando: 0, falhas: [] })
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
  })
  const { documento, selecao, ferramenta, encaixe } = estado
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
    const origem = contexto.current
    if (!origem.mundo.bibliotecas.includes(escolha.bibliotecaId))
      throw new Error('Este conjunto não pertence às bibliotecas do mundo')
    if (escolha.id === conjunto?.id)
      throw new Error('Um conjunto não pode conter uma cópia de si mesmo')
    const versao = await host.versaoDoConjunto(escolha.id, escolha.revisao)
    if (!montado.current || contexto.current !== origem) return
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
  }
  const pincel = usePincelDeObjetos({
    controlador,
    documento,
    palco,
    ativo: ferramenta === 'espalhar',
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
  const fonte = relevoPronto ? palco.current?.fonteDeAlturas?.() : undefined

  const executar = useCallback(
    (comandos: ComandoDeCenario[]) => {
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
      carregarModelo: (modelo) =>
        host.conteudoDoModelo({
          biblioteca: modelo.biblioteca,
          digest: modelo.digest,
          espacoId: mundo.espacoId,
        }),
      carregarTerreno: (digest, sinal) => host.conteudoDoTerreno(aberto.resumo.id, digest, sinal),
      carregarTextura: (ref, sinal) =>
        host.conteudoDaTextura({ ...ref, espacoId: mundo.espacoId }, sinal),
      aoTexturas: setTexturas,
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
    novo.definirDocumento(controlador.getState().documento)
    if (entidadesTransformaveis(controlador.getState().documento).length) novo.enquadrar()
    return () => {
      palco.current = null
      novo.destruir()
    }
  }, [host, controlador, aberto.resumo.id, mundo.espacoId, aoAplicarPincel, aoPreverPincel])

  useEffect(() => palco.current?.definirDocumento(documento), [documento])
  useEffect(
    () =>
      palco.current?.definirEspalhamento(
        aba === 'objetos' && relevoPronto && !estado.ocupado ? pincel.configuracao : null,
      ),
    [aba, relevoPronto, estado.ocupado, pincel.configuracao],
  )
  useEffect(() => palco.current?.definirSelecao(selecao), [selecao])
  useEffect(() => {
    palco.current?.definirFerramenta(
      aba === 'objetos' && !estado.ocupado ? ferramenta : 'selecionar',
    )
  }, [ferramenta, aba, estado.ocupado])
  useEffect(
    () =>
      palco.current?.definirModoDeSelecao(
        aba === 'objetos' && relevoPronto && !estado.ocupado ? modoDeSelecao : 'ponto',
      ),
    [aba, relevoPronto, estado.ocupado, modoDeSelecao],
  )
  useEffect(
    () =>
      palco.current?.definirEncaixe(
        encaixe ? configuracaoDoEncaixe : { grade: null, angulo: null },
      ),
    [encaixe, configuracaoDoEncaixe],
  )
  useEffect(() => palco.current?.definirTema(tema), [tema])

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
    const atual = controlador.getState()
    if (atual.alvoDaArvore && atual.documento.grupos.some((g) => g.id === atual.alvoDaArvore)) {
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
    const alvo = troca.current
    const paraPincel = controlador.getState().ferramenta === 'espalhar'
    const aplicarModelo = (modelo: ModeloDeBiblioteca, lugar: LocalDeColocacao | null) => {
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
    const atual = controlador.getState()
    const alvo = atual.alvoDaArvore
    const pasta = alvo && atual.documento.grupos.some((g) => g.id === alvo)
    const comandos = comandosParaApagar(
      atual.documento,
      pasta || !atual.selecao.length ? (alvo ? [alvo] : []) : atual.selecao,
    )
    if (comandos.length) controlador.executar(comandos)
  }, [controlador])

  // Atalhos do teclado, quando a pessoa não está escrevendo num campo.
  useEffect(() => {
    const aoApertar = (evento: KeyboardEvent) => {
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
          escondidos = idsEscondidos(doc)
        controlador.selecionar(
          entidadesTransformaveis(doc)
            .filter((o) => !escondidos.has(o.id))
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
        setAba('objetos')
        controlador.definirFerramenta('selecionar')
        setModoDeSelecao(tecla === 'b' ? 'retangulo' : 'laco')
      } else {
        const ferramentaDaTecla = FERRAMENTAS.find(
          ([, , , atalho]) => atalho.toLowerCase() === tecla,
        )
        if (!ferramentaDaTecla) return
        setAba('objetos')
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
    if (controlador.getState().salvamento !== 'guardado') {
      setSaindo(false)
      return
    }
    try {
      const retrato = await palco.current?.capturar(640)
      if (retrato) await host.guardarCapa(aberto.resumo.id, retrato)
    } catch {
      // O retrato do cartão é um conforto: sem ele, a saída continua.
    }
    aoVoltar()
  }

  const aoSoltarNoPalco = (evento: DragEvent) => {
    const modelo = arrastado.current
    if (!modelo || !evento.dataTransfer.types.includes(ARRASTO_DE_MODELO)) return
    evento.preventDefault()
    arrastado.current = null
    void escolherModelo(modelo, palco.current?.pontoNoChao(evento.clientX, evento.clientY) ?? null)
  }

  const semEscolha = selecao.length === 0 && !estado.alvoDaArvore
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
      <header className="mld-workshop-header mld-bar">
        <div className="mld-workshop-project">
          <button
            type="button"
            className="sz-tool-icon-btn"
            onClick={sair}
            disabled={saindo}
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
        <div className="mld-workshop-tabs">
          <fieldset aria-label={COPY.oficina.abasRotulo} className="mld-seg">
            {ABAS.filter(([valor]) => !conjunto || valor === 'objetos').map(([valor, Icone]) => (
              <button
                key={valor}
                type="button"
                aria-label={COPY.oficina.abas[valor]}
                aria-pressed={aba === valor}
                onClick={() => {
                  if (valor !== 'objetos') pincel.fechar()
                  setAba(valor)
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
            disabled={semEscolha || estado.ocupado || !relevoPronto || conjuntos.ocupado}
            onClick={conjuntos.abrir}
          >
            <Boxes aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sz-tool-icon-btn"
            aria-label="Copiar e colar"
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
            disabled={estado.ocupado || estado.salvamento !== 'guardado'}
            onClick={() => setVersoesAbertas(true)}
          >
            <History aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sz-tool-icon-btn"
            disabled={!estado.podeDesfazer}
            onClick={controlador.desfazer}
            aria-label={COPY.oficina.desfazer}
            title={`${COPY.oficina.desfazer} (Ctrl+Z)`}
          >
            <Undo2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sz-tool-icon-btn"
            disabled={!estado.podeRefazer}
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
        <nav className="mld-workshop-rail mld-bar" aria-label={COPY.oficina.ferramentas}>
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
              <Ladrilho
                icone={Blocks}
                rotulo="Blocos"
                desligado={!relevoPronto || estado.ocupado}
                aoTocar={() => setFormasAbertas(true)}
              />
              <Ladrilho
                icone={Magnet}
                rotulo={COPY.oficina.grade}
                ligado={encaixe}
                alternavel
                aoTocar={() => controlador.definirEncaixe(!encaixe)}
              />
            </>
          ) : aba === 'luz' ? (
            HORAS.map(([hora, Icone, rotulo]) => (
              <Ladrilho
                key={hora}
                icone={Icone}
                rotulo={rotulo}
                ligado={documento.iluminacao.hora === hora}
                aoTocar={() => executar([{ tipo: 'iluminacao.definir', iluminacao: { hora } }])}
              />
            ))
          ) : (
            <p className="mcn-chegando-aba">{COPY.oficina.chegando}</p>
          )}
        </nav>

        {/* biome-ignore lint/a11y/noStaticElementInteractions: área de soltar do arraste; pelo teclado, a gaveta põe o modelo com Enter */}
        <div
          className="mld-workshop-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          onDragOver={(evento) => {
            if (!evento.dataTransfer.types.includes(ARRASTO_DE_MODELO)) return
            evento.preventDefault()
            evento.dataTransfer.dropEffect = 'copy'
          }}
          onDrop={aoSoltarNoPalco}
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
            <div className="mld-stage-toolbar">
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
                  onClick={() => palco.current?.enquadrar(selecao)}
                  title={`${semObjetosEscolhidos ? COPY.oficina.enquadrar : COPY.oficina.enquadrarEscolha} (F)`}
                >
                  <Maximize aria-hidden="true" className="size-4" />
                  {semObjetosEscolhidos ? COPY.oficina.enquadrar : COPY.oficina.enquadrarEscolha}
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
            {dica ? (
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
          <Gaveta
            atualizacaoDosConjuntos={conjuntos.atualizacao}
            aoPorConjunto={porConjunto}
            conjuntoEmEdicao={conjunto?.id}
            modo={pincel.ativo ? 'pincel' : 'colocar'}
            aberta={gavetaAberta}
            aoMudarAbertura={setGavetaAberta}
            host={host}
            bibliotecas={bibliotecas}
            moldesDisponiveis={moldesDisponiveis}
            preparandoMolde={preparandoMolde}
            aoPor={(modelo) => void escolherModelo(modelo, null)}
            aoArrastar={(modelo) => {
              arrastado.current = modelo
            }}
            aoEscolherBibliotecas={() => setEscolhendo(true)}
          />
        </div>

        {painelAberto ? (
          <aside
            className="mld-workshop-inspector mld-bar mcn-painel"
            aria-label={COPY.painel.titulo}
          >
            {modoPainel === 'organizacao' ? (
              <Organizacao
                documento={documento}
                selecao={selecao}
                selecionar={controlador.selecionar}
                executar={executar}
                aoDetalhes={() => setModoPainel('escolha')}
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
                {relevoPronto ? (
                  <Painel
                    documento={documento}
                    selecao={selecao}
                    executar={executar}
                    fonte={fonte}
                    aoEditarConjunto={
                      aoEditarConjunto
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
                    {!documento.montagens?.some((m) => selecao.includes(m.id)) ? (
                      <Aparencia
                        documento={documento}
                        selecao={selecao}
                        executar={executar}
                        host={host}
                        bibliotecas={bibliotecas}
                      />
                    ) : null}
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
                  </>
                ) : null}
                {relevoPronto && aba === 'objetos' ? (
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

  if (aberto.falhou || mundo.falhou)
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
