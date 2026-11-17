import type { ComandoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  criarPalco,
  type Estatisticas,
  type Ferramenta,
  idsEscondidos,
  type Palco,
  type Vista,
} from '@sistemazero/molda-cenarios-motor'
import {
  ArrowLeft,
  Box,
  Check,
  CloudOff,
  Copy,
  Flag,
  History,
  Loader2,
  type LucideIcon,
  Magnet,
  Maximize,
  Moon,
  Mountain,
  MousePointer2,
  Move,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  RefreshCw,
  RotateCw,
  Route,
  Scaling,
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
  comandosParaPor,
} from '../acoes'
import { type ControladorDaOficina, criarControlador } from '../controlador'
import { COPY } from '../copy'
import { encerrarPreparacao } from '../importar'
import { Chegando, Dialogo, Falhou, useCarga } from '../pecas'
import type {
  Biblioteca,
  CenarioAberto,
  CenariosHost,
  EscolhaDeModelo,
  ModeloDeBiblioteca,
  MoldeDisponivel,
  Mundo,
} from '../portas'
import { ARRASTO_DE_MODELO, Gaveta } from './Gaveta'
import { EscolherBibliotecas } from './Mundo'
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
]
const HORAS: readonly [number, LucideIcon, string][] = [
  [8, Sunrise, COPY.painel.horas.manha],
  [12, Sun, COPY.painel.horas.meioDia],
  [17.5, Sunset, COPY.painel.horas.tarde],
  [22, Moon, COPY.painel.horas.noite],
]
const VISTAS: readonly Vista[] = ['livre', 'cima', 'frente', 'lado']
const ENCAIXE_LIGADO = { grade: 0.5, angulo: 15 }
const ENCAIXE_DESLIGADO = { grade: null, angulo: null }

function digitando(alvo: EventTarget | null): boolean {
  const elemento = alvo as HTMLElement | null
  return Boolean(
    elemento?.closest?.('input, textarea, select, [contenteditable="true"], dialog[open]'),
  )
}

function Ladrilho({
  icone: Icone,
  rotulo,
  atalho,
  ligado,
  alternavel,
  desligado,
  aoTocar,
}: {
  icone: LucideIcon
  rotulo: string
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
      title={atalho ? `${rotulo} (${atalho})` : rotulo}
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
}: {
  host: CenariosHost
  aberto: CenarioAberto
  mundo: Mundo
  bibliotecas: readonly Biblioteca[]
  tema: 'light' | 'dark'
  aoVoltar(): void
  aoMudarBibliotecas(): void
  moldesDisponiveis: boolean
}): JSX.Element {
  const controlador = useMemo(() => criarControlador(host, aberto), [host, aberto])
  const estado = useSyncExternalStore(controlador.subscribe, controlador.getState)
  const canvas = useRef<HTMLCanvasElement>(null)
  const palco = useRef<Palco | null>(null)
  const arrastado = useRef<EscolhaDeModelo | null>(null)
  const importacaoDoMolde = useRef<AbortController | null>(null)
  const [preparandoMolde, setPreparandoMolde] = useState(false)
  const [erroDoMolde, setErroDoMolde] = useState<string | null>(null)
  const [revisaoDoMolde, setRevisaoDoMolde] = useState<{
    molde: MoldeDisponivel
    ponto: { x: number; z: number }
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
  const [vista, setVista] = useState<Vista>('livre')
  // Em tela estreita o painel é uma folha por cima do palco: começa recolhido.
  const [painelAberto, setPainelAberto] = useState(
    () => !globalThis.matchMedia?.('(max-width: 899px)').matches,
  )
  const [medidas, setMedidas] = useState<Estatisticas | null>(null)
  const [escolhendo, setEscolhendo] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [versoesAbertas, setVersoesAbertas] = useState(false)
  const { documento, selecao, ferramenta, encaixe } = estado

  const executar = useCallback(
    (comandos: ComandoDeCenario[]) => {
      controlador.executar(comandos)
    },
    [controlador],
  )

  // O palco vive enquanto o cenário estiver aberto.
  useEffect(() => {
    const tela = canvas.current
    if (!tela) return
    const novo = criarPalco(tela, {
      carregarModelo: (modelo) =>
        host.conteudoDoModelo({ biblioteca: modelo.biblioteca, digest: modelo.digest }),
      aoSelecionar: (id, somar) => controlador.tocar(id, somar),
      aoTransformar: (mudancas) =>
        controlador.executar(comandosDoGesto(controlador.getState().documento, mudancas)),
      aoMedir: setMedidas,
      movimentoReduzido: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    })
    palco.current = novo
    novo.definirDocumento(controlador.getState().documento)
    if (controlador.getState().documento.instancias.length) novo.enquadrar()
    return () => {
      palco.current = null
      novo.destruir()
    }
  }, [host, controlador])

  useEffect(() => palco.current?.definirDocumento(documento), [documento])
  useEffect(() => palco.current?.definirSelecao(selecao), [selecao])
  useEffect(() => {
    palco.current?.definirFerramenta(
      aba === 'objetos' && !estado.ocupado ? ferramenta : 'selecionar',
    )
  }, [ferramenta, aba, estado.ocupado])
  useEffect(
    () => palco.current?.definirEncaixe(encaixe ? ENCAIXE_LIGADO : ENCAIXE_DESLIGADO),
    [encaixe],
  )
  useEffect(() => palco.current?.definirTema(tema), [tema])

  const por = useCallback(
    (modelo: ModeloDeBiblioteca, ponto: { x: number; z: number } | null) => {
      const lugar = ponto ?? centroDaVista(canvas.current, palco.current) ?? { x: 0, z: 0 }
      const { comandos, id } = comandosParaPor(controlador.getState().documento, modelo, lugar)
      if (controlador.executar(comandos)) {
        controlador.selecionar([id])
        if (controlador.getState().ferramenta === 'selecionar')
          controlador.definirFerramenta('mover')
        setAba('objetos')
      }
    },
    [controlador],
  )
  const copiar = useCallback(() => {
    const atual = controlador.getState()
    const { comandos, ids } = comandosParaDuplicar(atual.documento, atual.selecao)
    if (comandos.length && controlador.executar(comandos)) controlador.selecionar(ids)
  }, [controlador])
  const escolherModelo = async (
    escolha: EscolhaDeModelo,
    ponto: { x: number; z: number } | null,
    aceite?: string,
  ) => {
    if (!('origem' in escolha)) {
      por(escolha, ponto)
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
        por(resultado.modelo, lugar)
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
    const comandos = comandosParaApagar(atual.documento, atual.selecao)
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
        controlador.selecionar(doc.instancias.filter((o) => !escondidos.has(o.id)).map((o) => o.id))
      } else if (comando || evento.altKey) return
      else if (tecla === 'delete' || tecla === 'backspace') {
        evento.preventDefault()
        apagar()
      } else if (tecla === 'escape') controlador.selecionar([])
      else if (tecla === 'f') palco.current?.enquadrar(controlador.getState().selecao)
      else {
        const ferramentaDaTecla = FERRAMENTAS.find(
          ([, , , atalho]) => atalho.toLowerCase() === tecla,
        )
        if (!ferramentaDaTecla) return
        setAba('objetos')
        controlador.definirFerramenta(ferramentaDaTecla[0])
      }
    }
    globalThis.addEventListener('keydown', aoApertar)
    return () => globalThis.removeEventListener('keydown', aoApertar)
  }, [controlador, copiar, apagar])

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

  const semEscolha = selecao.length === 0
  const dica =
    aba !== 'objetos'
      ? null
      : documento.instancias.length === 0
        ? COPY.oficina.dicaVazio
        : ferramenta === 'mover' && !semEscolha
          ? COPY.oficina.dicaMover
          : ferramenta === 'girar' && !semEscolha
            ? COPY.oficina.dicaGirar
            : ferramenta === 'tamanho' && !semEscolha
              ? COPY.oficina.dicaTamanho
              : COPY.oficina.dicaEscolher

  return (
    <section
      data-molda-theme={tema}
      aria-label={documento.nome}
      className="mld-workshop mcn-oficina flex min-h-0 flex-1 flex-col overflow-hidden bg-mld-bg text-mld-text"
    >
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
        </div>
        <div className="mld-workshop-tabs">
          <fieldset aria-label={COPY.oficina.abasRotulo} className="mld-seg">
            {ABAS.map(([valor, Icone]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={aba === valor}
                onClick={() => setAba(valor)}
                className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
              >
                <Icone aria-hidden="true" />
                <span className="mcn-aba-rotulo">{COPY.oficina.abas[valor]}</span>
              </button>
            ))}
          </fieldset>
        </div>
        <div className="mld-workshop-file-actions">
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
                  ligado={ferramenta === valor}
                  aoTocar={() => controlador.definirFerramenta(valor)}
                />
              ))}
              <hr className="mcn-fio" />
              <Ladrilho
                icone={Copy}
                rotulo={COPY.oficina.copiar}
                atalho="Ctrl+D"
                desligado={semEscolha}
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
              className="mcn-palco-tela"
              aria-label={COPY.oficina.vistasRotulo}
            />
            <div className="mld-stage-toolbar">
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
                  title={`${semEscolha ? COPY.oficina.enquadrar : COPY.oficina.enquadrarEscolha} (F)`}
                >
                  <Maximize aria-hidden="true" className="size-4" />
                  {semEscolha ? COPY.oficina.enquadrar : COPY.oficina.enquadrarEscolha}
                </button>
              </div>
              {medidas ? (
                <p className="mld-float mcn-orcamento" role="status">
                  {COPY.oficina.orcamento(medidas.objetos, medidas.triangulos)}
                  {medidas.carregando ? ` · ${COPY.oficina.carregando(medidas.carregando)}` : ''}
                </p>
              ) : null}
            </div>
            {dica ? (
              <p className="mcn-dica" data-molda-theme="dark">
                {dica}
              </p>
            ) : null}
          </div>
          <Gaveta
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
            <Painel documento={documento} selecao={selecao} executar={executar} />
            {aba === 'objetos' && selecao.length > 0 ? (
              <Organizar
                documento={documento}
                selecao={selecao}
                executar={executar}
                medir={(id) => palco.current?.volumeDoModelo(id) ?? null}
              />
            ) : null}
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
): { x: number; z: number } | null {
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
}: {
  host: CenariosHost
  espacoId: string
  mundoId: string
  cenarioId: string
  tema: 'light' | 'dark'
  aoVoltar(): void
  moldesDisponiveis?: boolean
}): JSX.Element {
  const aberto = useCarga(() => host.abrirCenario(cenarioId), [host, cenarioId])
  const mundo = useCarga(async () => {
    const [mundos, bibliotecas] = await Promise.all([
      host.listarMundos(espacoId),
      host.listarBibliotecas(espacoId),
    ])
    const doMundo = mundos.find((j) => j.id === mundoId)
    if (!doMundo) throw new Error('O mundo não existe mais')
    return {
      mundo: doMundo,
      bibliotecas: bibliotecas.filter((b) => doMundo.bibliotecas.includes(b.id)),
    }
  }, [host, espacoId, mundoId])

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
  if (!aberto.dados || !mundo.dados)
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
    />
  )
}
