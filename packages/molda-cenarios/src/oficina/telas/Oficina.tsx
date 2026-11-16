import type { ComandoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  criarPalco,
  type Estatisticas,
  type Ferramenta,
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
import { Chegando, Falhou, useCarga } from '../pecas'
import type { Biblioteca, CenarioAberto, CenariosHost, Jogo, ModeloDeBiblioteca } from '../portas'
import { ARRASTO_DE_MODELO, Gaveta } from './Gaveta'
import { EscolherBibliotecas } from './Jogo'
import { Painel } from './Painel'

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
  jogo,
  bibliotecas,
  tema,
  aoVoltar,
  aoMudarBibliotecas,
}: {
  host: CenariosHost
  aberto: CenarioAberto
  jogo: Jogo
  bibliotecas: readonly Biblioteca[]
  tema: 'light' | 'dark'
  aoVoltar(): void
  aoMudarBibliotecas(): void
}): JSX.Element {
  const controlador = useMemo(() => criarControlador(host, aberto), [host, aberto])
  const estado = useSyncExternalStore(controlador.subscribe, controlador.getState)
  const canvas = useRef<HTMLCanvasElement>(null)
  const palco = useRef<Palco | null>(null)
  const arrastado = useRef<ModeloDeBiblioteca | null>(null)
  const [aba, setAba] = useState<Aba>('objetos')
  const [vista, setVista] = useState<Vista>('livre')
  // Em tela estreita o painel é uma folha por cima do palco: começa recolhido.
  const [painelAberto, setPainelAberto] = useState(
    () => !globalThis.matchMedia?.('(max-width: 899px)').matches,
  )
  const [medidas, setMedidas] = useState<Estatisticas | null>(null)
  const [escolhendo, setEscolhendo] = useState(false)
  const [saindo, setSaindo] = useState(false)
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
    palco.current?.definirFerramenta(aba === 'objetos' ? ferramenta : 'selecionar')
  }, [ferramenta, aba])
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
    try {
      await controlador.terminar()
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
    por(modelo, palco.current?.pontoNoChao(evento.clientX, evento.clientY) ?? null)
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
            aoPor={(modelo) => por(modelo, null)}
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
          </aside>
        ) : null}
      </div>

      {escolhendo ? (
        <EscolherBibliotecas
          host={host}
          jogo={jogo}
          aoFechar={() => setEscolhendo(false)}
          aoGuardar={aoMudarBibliotecas}
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

/** A oficina de um cenário: abre o cenário e o jogo dele e monta o editor. */
export default function Oficina({
  host,
  espacoId,
  jogoId,
  cenarioId,
  tema,
  aoVoltar,
}: {
  host: CenariosHost
  espacoId: string
  jogoId: string
  cenarioId: string
  tema: 'light' | 'dark'
  aoVoltar(): void
}): JSX.Element {
  const aberto = useCarga(() => host.abrirCenario(cenarioId), [host, cenarioId])
  const jogo = useCarga(async () => {
    const [jogos, bibliotecas] = await Promise.all([
      host.listarJogos(espacoId),
      host.listarBibliotecas(espacoId),
    ])
    const doJogo = jogos.find((j) => j.id === jogoId)
    if (!doJogo) throw new Error('O jogo não existe mais')
    return {
      jogo: doJogo,
      bibliotecas: bibliotecas.filter((b) => doJogo.bibliotecas.includes(b.id)),
    }
  }, [host, espacoId, jogoId])

  if (aberto.falhou || jogo.falhou)
    return (
      <div className="mcn-centro" data-molda-theme={tema}>
        <Falhou
          texto={COPY.oficina.falhouAbrir}
          aoTentar={() => {
            aberto.recarregar()
            jogo.recarregar()
          }}
        />
      </div>
    )
  if (!aberto.dados || !jogo.dados)
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
      jogo={jogo.dados.jogo}
      bibliotecas={jogo.dados.bibliotecas}
      tema={tema}
      aoVoltar={aoVoltar}
      aoMudarBibliotecas={jogo.recarregar}
    />
  )
}
