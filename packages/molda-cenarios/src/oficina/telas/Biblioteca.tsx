import type { EntradaDeImportacao } from '@sistemazero/molda-cenarios-motor'
import { ArrowLeft, Box, FolderOpen, Pencil, Search, Trash2, Upload, X } from 'lucide-react'
import { type DragEvent, type JSX, useEffect, useRef, useState } from 'react'
import { arquivosDoDrop } from '../arquivos-do-drop'
import { COPY, tamanhoLegivel } from '../copy'
import { encerrarPreparacao, prepararArquivos } from '../importar'
import { Capa, Chegando, Dialogo, DialogoDeApagar, DialogoDeNome, Falhou, useCarga } from '../pecas'
import type { CenariosHost, Licenca, ModeloDeBiblioteca } from '../portas'
import { SeletorDeLicenca } from './Inicio'

type Andamento =
  | { fase: 'conferindo' | 'trazendo'; feitos: number; total: number }
  | { fase: 'pronto'; novos: number; recusados: { arquivo: string; motivo: string }[] }
  | null

type Janela =
  | { tipo: 'nome' }
  | { tipo: 'apagar' }
  | { tipo: 'trazer' }
  | { tipo: 'modelo'; modelo: ModeloDeBiblioteca }
  | { tipo: 'tirar-modelo'; modelo: ModeloDeBiblioteca }
  | null

const PAGINA = 60

export function Biblioteca({
  host,
  bibliotecaId,
  espacoId,
  aoVoltar,
}: {
  host: CenariosHost
  bibliotecaId: string
  espacoId: string
  aoVoltar(): void
}): JSX.Element {
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pastaEscolhida, setPastaEscolhida] = useState('*')
  const [erroDaAcao, setErroDaAcao] = useState<string | null>(null)
  const [modelos, setModelos] = useState<ModeloDeBiblioteca[]>([])
  const [proximo, setProximo] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [volta, setVolta] = useState(0)
  const [andamento, setAndamento] = useState<Andamento>(null)
  const [arrastando, setArrastando] = useState(false)
  const [janela, setJanela] = useState<Janela>(null)
  const [licenca, setLicenca] = useState<Licenca>('propria')
  const [descricao, setDescricao] = useState('')
  const [capaAutomatica, setCapaAutomatica] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const pasta = useRef<HTMLInputElement>(null)
  const trabalho = useRef<AbortController | null>(null)
  const requisicao = useRef(0)
  const paginando = useRef(false)

  // Uma troca de biblioteca ou perfil encerra a conversão e os envios da tela anterior.
  // biome-ignore lint/correctness/useExhaustiveDependencies: bibliotecaId delimita a vida do trabalho
  useEffect(
    () => () => {
      trabalho.current?.abort()
      trabalho.current = null
      void encerrarPreparacao()
    },
    [host, bibliotecaId],
  )

  const cabecalho = useCarga(async () => {
    const lista = await host.listarBibliotecas(espacoId)
    const biblioteca = lista.find((b) => b.id === bibliotecaId)
    if (!biblioteca) throw new Error('A biblioteca não existe mais')
    return biblioteca
  }, [host, espacoId, bibliotecaId, volta])
  const biblioteca = cabecalho.dados
  const organizacao = useCarga(
    () => host.organizacaoDaBiblioteca(bibliotecaId),
    [host, bibliotecaId, volta],
  )
  const cota = useCarga(
    async () => (await host.espacos()).find((e) => e.id === espacoId),
    [host, espacoId, volta],
  )

  // A busca espera a pessoa parar de digitar.
  useEffect(() => {
    const espera = setTimeout(() => setBuscaAplicada(busca.trim()), 220)
    return () => clearTimeout(espera)
  }, [busca])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `volta` recarrega depois de trazer ou apagar
  useEffect(() => {
    const versao = ++requisicao.current
    paginando.current = false
    let vivo = true
    setFalhou(false)
    setTotal(null)
    host
      .listarModelos(bibliotecaId, {
        busca: buscaAplicada,
        limite: PAGINA,
        ...(pastaEscolhida === '*' ? {} : { pasta: pastaEscolhida }),
      })
      .then(
        (pagina) => {
          if (!vivo) return
          setModelos(pagina.itens)
          setProximo(pagina.proximo)
          setTotal(pagina.total)
        },
        () => vivo && setFalhou(true),
      )
    return () => {
      vivo = false
      if (requisicao.current === versao) requisicao.current++
    }
  }, [host, bibliotecaId, buscaAplicada, pastaEscolhida, volta])

  const mostrarMais = async () => {
    if (!proximo || paginando.current) return
    paginando.current = true
    const versao = requisicao.current
    try {
      const pagina = await host.listarModelos(bibliotecaId, {
        busca: buscaAplicada,
        limite: PAGINA,
        cursor: proximo,
        ...(pastaEscolhida === '*' ? {} : { pasta: pastaEscolhida }),
      })
      if (requisicao.current !== versao) return
      setModelos((atuais) => [...atuais, ...pagina.itens])
      setProximo(pagina.proximo)
    } catch (e) {
      if (requisicao.current === versao)
        setErroDaAcao(e instanceof Error ? e.message : COPY.inicio.falhou)
    } finally {
      if (requisicao.current === versao) paginando.current = false
    }
  }

  const trazer = async (arquivos: EntradaDeImportacao[]) => {
    if (!arquivos.length || trabalho.current) return
    const controle = new AbortController()
    trabalho.current = controle
    setAndamento({ fase: 'conferindo', feitos: 0, total: arquivos.length })
    try {
      const preparados = await prepararArquivos(
        arquivos,
        (feitos, quantos) => {
          if (!controle.signal.aborted) setAndamento({ fase: 'conferindo', feitos, total: quantos })
        },
        controle.signal,
      )
      let novos = 0
      if (preparados.prontos.length) {
        setAndamento({ fase: 'trazendo', feitos: 0, total: preparados.prontos.length })
        const criados = await host.importarModelos(
          bibliotecaId,
          preparados.prontos,
          (feitos, quantos) => {
            if (!controle.signal.aborted) setAndamento({ fase: 'trazendo', feitos, total: quantos })
          },
          controle.signal,
        )
        novos = criados.length
      }
      if (!controle.signal.aborted)
        setAndamento({ fase: 'pronto', novos, recusados: preparados.recusados })
    } catch (erro) {
      if (!controle.signal.aborted)
        setAndamento({
          fase: 'pronto',
          novos: 0,
          recusados: [
            {
              arquivo: '',
              motivo: erro instanceof Error ? erro.message : COPY.inicio.falhou,
            },
          ],
        })
    }
    if (trabalho.current === controle) {
      trabalho.current = null
      setVolta((v) => v + 1)
    }
  }

  const aoSoltar = (evento: DragEvent) => {
    evento.preventDefault()
    setArrastando(false)
    void arquivosDoDrop(evento.dataTransfer).then(trazer, (e) =>
      setAndamento({
        fase: 'pronto',
        novos: 0,
        recusados: [
          { arquivo: '', motivo: e instanceof Error ? e.message : 'Não consegui ler esta pasta' },
        ],
      }),
    )
  }

  return (
    <section
      aria-label={biblioteca?.nome ?? COPY.inicio.abaBibliotecas}
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(evento) => {
        if (!evento.dataTransfer.types.includes('Files')) return
        evento.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={(evento) => {
        if (evento.currentTarget === evento.target) setArrastando(false)
      }}
      onDrop={aoSoltar}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sz-tool-bands">
          <header className="sz-tool-band sz-tool-band--creme">
            <div className="sz-tool-band__inner lg:pt-12 lg:pb-9">
              <div className="sz-tool-header">
                <div className="sz-tool-header__lead">
                  <div className="sz-tool-header__nav">
                    <button
                      type="button"
                      className="sz-tool-back"
                      onClick={aoVoltar}
                      aria-label={COPY.biblioteca.voltar}
                      title={COPY.biblioteca.voltar}
                    >
                      <ArrowLeft aria-hidden="true" />
                    </button>
                  </div>
                  <div className="sz-tool-header__title">
                    <h1 className="sz-tool-title">{biblioteca?.nome ?? ' '}</h1>
                    <p className="sz-tool-subtitle">
                      {biblioteca
                        ? `${COPY.biblioteca.modelos(biblioteca.modelos)} · ${COPY.biblioteca.licenca[biblioteca.licenca]}`
                        : ' '}
                    </p>
                    {biblioteca?.descricao ? (
                      <p
                        className="sz-tool-subtitle line-clamp-2 max-w-xl"
                        title={biblioteca.descricao}
                      >
                        {biblioteca.descricao}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="sz-tool-header__actions">
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={!biblioteca}
                    onClick={() => {
                      if (biblioteca) {
                        setLicenca(biblioteca.licenca)
                        setDescricao(biblioteca.descricao ?? '')
                        setCapaAutomatica(false)
                      }
                      setJanela({ tipo: 'nome' })
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    {COPY.biblioteca.editar}
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={!biblioteca}
                    onClick={() => setJanela({ tipo: 'apagar' })}
                  >
                    <Trash2 aria-hidden="true" />
                    {COPY.mundo.apagar}
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    disabled={!biblioteca || (andamento !== null && andamento.fase !== 'pronto')}
                    onClick={() => setJanela({ tipo: 'trazer' })}
                  >
                    <Upload aria-hidden="true" />
                    {COPY.biblioteca.trazer}
                  </button>
                  <input
                    ref={entrada}
                    type="file"
                    accept=".glb,.gltf,.obj,.mtl,.fbx,.bin,.png,.jpg,.jpeg,.webp,.bmp,.zip"
                    multiple
                    className="hidden"
                    onChange={(evento) => {
                      void trazer(Array.from(evento.target.files ?? []))
                      evento.target.value = ''
                    }}
                  />
                </div>
              </div>
              <div className="sz-tool-toolbar mt-7">
                <input
                  ref={(el) => {
                    pasta.current = el
                    el?.setAttribute('webkitdirectory', '')
                  }}
                  type="file"
                  multiple
                  className="hidden"
                  aria-label="Pasta de modelos"
                  onChange={(e) => {
                    void trazer(Array.from(e.target.files ?? []))
                    e.target.value = ''
                  }}
                />
                <div className="sz-tool-toolbar__start">
                  <select
                    className="sz-tool-select"
                    aria-label="Pasta da biblioteca"
                    value={pastaEscolhida}
                    onChange={(e) => setPastaEscolhida(e.target.value)}
                  >
                    <option value="*">Todas as pastas</option>
                    {(organizacao.dados?.pastas ?? []).map((p) => (
                      <option key={p} value={p}>
                        {p || 'Sem pasta'}
                      </option>
                    ))}
                  </select>
                  {andamento ? (
                    <FaixaDeAndamento
                      andamento={andamento}
                      aoFechar={() => setAndamento(null)}
                      aoCancelar={() => {
                        trabalho.current?.abort()
                        trabalho.current = null
                        setAndamento(null)
                        setVolta((v) => v + 1)
                      }}
                    />
                  ) : null}
                </div>
                <div className="sz-tool-toolbar__end">
                  <label className="sz-tool-search-wrap">
                    <Search aria-hidden="true" />
                    <input
                      type="search"
                      autoComplete="off"
                      value={busca}
                      onChange={(evento) => setBusca(evento.target.value)}
                      aria-label={COPY.biblioteca.buscar}
                      placeholder={COPY.biblioteca.buscar}
                      className="sz-tool-search"
                    />
                  </label>
                </div>
              </div>
            </div>
          </header>

          <div className="sz-tool-band sz-tool-band--ceu">
            <div className="sz-tool-band__inner">
              {cota.dados ? (
                <section className="mcn-cota" aria-label="Uso do espaço">
                  <span>
                    {tamanhoLegivel(cota.dados.usadoBytes)} de{' '}
                    {tamanhoLegivel(cota.dados.limiteBytes)}
                  </span>
                  <progress
                    value={cota.dados.usadoBytes}
                    max={cota.dados.limiteBytes}
                    aria-label="Armazenamento usado"
                  />
                </section>
              ) : null}
              {erroDaAcao ? <p role="alert">{erroDaAcao}</p> : null}
              {organizacao.dados?.etiquetas.length ? (
                <section className="mcn-etiquetas" aria-label="Etiquetas da biblioteca">
                  {organizacao.dados.etiquetas.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="sz-tool-pill sz-tool-pill--quiet"
                      onClick={() => setBusca(e)}
                    >
                      {e}
                    </button>
                  ))}
                </section>
              ) : null}
              {falhou || cabecalho.falhou ? (
                <Falhou aoTentar={() => setVolta((v) => v + 1)} />
              ) : total === null ? (
                <Chegando />
              ) : total === 0 ? (
                <p className="font-semibold text-base text-mld-muted">
                  {buscaAplicada ? COPY.gaveta.semResultado : COPY.biblioteca.vazia}
                </p>
              ) : (
                <>
                  <ul className="mcn-modelos">
                    {modelos.map((modelo) => (
                      <li key={modelo.id} className="mcn-modelo">
                        <span className="mcn-modelo-foto">
                          <Capa endereco={modelo.miniatura} reserva={<Box />} />
                        </span>
                        <span className="mcn-modelo-nome" title={modelo.nome}>
                          {modelo.nome}
                        </span>
                        <span className="mcn-modelo-detalhe">
                          {COPY.biblioteca.triangulos(modelo.triangulos)}
                        </span>
                        {modelo.pasta ? (
                          <small className="mcn-modelo-detalhe" title={modelo.pasta}>
                            {modelo.pasta}
                          </small>
                        ) : null}
                        <button
                          type="button"
                          className="mcn-modelo-tirar mcn-modelo-editar"
                          aria-label={`Editar ${modelo.nome}`}
                          onClick={() => setJanela({ tipo: 'modelo', modelo })}
                        >
                          <Pencil aria-hidden className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="mcn-modelo-tirar"
                          aria-label={COPY.biblioteca.apagarModelo(modelo.nome)}
                          title={COPY.biblioteca.apagarModelo(modelo.nome)}
                          onClick={() => setJanela({ tipo: 'tirar-modelo', modelo })}
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {proximo ? (
                    <div className="flex justify-center pt-6">
                      <button
                        type="button"
                        className="sz-tool-pill sz-tool-pill--quiet"
                        onClick={mostrarMais}
                      >
                        {COPY.gaveta.mais}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {arrastando ? (
        <div className="mcn-soltar" aria-hidden="true">
          <Upload />
          <strong>{COPY.biblioteca.soltar}</strong>
          <span>{COPY.biblioteca.soltarDica}</span>
        </div>
      ) : null}

      {janela?.tipo === 'modelo' && (
        <EditarModelo
          modelo={janela.modelo}
          capaAtual={biblioteca?.capaModelo === janela.modelo.id}
          aoFechar={() => setJanela(null)}
          aoGuardar={async (dados, capa) => {
            await host.editarModelo(janela.modelo.id, dados)
            if (capa || biblioteca?.capaModelo === janela.modelo.id)
              await host.editarBiblioteca(bibliotecaId, {
                capaModelo: capa ? janela.modelo.id : null,
              })
            setVolta((v) => v + 1)
          }}
        />
      )}
      {janela?.tipo === 'tirar-modelo' && (
        <DialogoDeApagar
          titulo={`Tirar ${janela.modelo.nome}?`}
          texto="As cópias já usadas nos cenários continuam lá."
          aoFechar={() => setJanela(null)}
          aoConfirmar={async () => {
            await host.apagarModelos(bibliotecaId, [janela.modelo.id])
            setVolta((v) => v + 1)
          }}
        />
      )}
      {janela?.tipo === 'trazer' && (
        <Dialogo titulo={COPY.biblioteca.trazer} aoFechar={() => setJanela(null)}>
          <div className="flex flex-col gap-3">
            <p>
              Traga modelos GLB, GLTF, OBJ ou FBX. Para manter as texturas, escolha a pasta completa
              ou o pacote ZIP.
            </p>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--primary"
              onClick={() => {
                setJanela(null)
                entrada.current?.click()
              }}
            >
              <Upload aria-hidden />
              Arquivos ou pacote ZIP
            </button>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--quiet"
              onClick={() => {
                setJanela(null)
                pasta.current?.click()
              }}
            >
              <FolderOpen aria-hidden />
              Pasta com modelos
            </button>
          </div>
        </Dialogo>
      )}
      {janela?.tipo === 'nome' && biblioteca ? (
        <DialogoDeNome
          titulo={COPY.biblioteca.editar}
          inicial={biblioteca.nome}
          acao={COPY.nome.guardar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            await host.editarBiblioteca(biblioteca.id, {
              nome,
              licenca,
              descricao,
              ...(capaAutomatica ? { capaModelo: null } : {}),
            })
            setVolta((v) => v + 1)
          }}
        >
          <SeletorDeLicenca valor={licenca} aoMudar={setLicenca} />
          <label className="mcn-campo">
            Descrição
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </label>
          {biblioteca.capaModelo ? (
            <label className="mcn-opcao">
              <input
                type="checkbox"
                checked={capaAutomatica}
                onChange={(e) => setCapaAutomatica(e.target.checked)}
              />
              Voltar à capa automática
            </label>
          ) : null}
        </DialogoDeNome>
      ) : null}
      {janela?.tipo === 'apagar' && biblioteca ? (
        <DialogoDeApagar
          titulo={COPY.biblioteca.apagarTitulo}
          texto={COPY.biblioteca.apagarTexto(biblioteca.nome, biblioteca.modelos)}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async () => {
            await host.apagarBiblioteca(biblioteca.id)
            aoVoltar()
          }}
        />
      ) : null}
    </section>
  )
}

function EditarModelo({
  modelo,
  aoGuardar,
  aoFechar,
  capaAtual,
}: {
  modelo: ModeloDeBiblioteca
  aoGuardar(
    dados: { nome: string; pasta: string; etiquetas: string[] },
    capa: boolean,
  ): Promise<void>
  aoFechar(): void
  capaAtual: boolean
}): JSX.Element {
  const [pasta, setPasta] = useState(modelo.pasta)
  const [etiquetas, setEtiquetas] = useState(modelo.etiquetas.join(', '))
  const [capa, setCapa] = useState(capaAtual)
  return (
    <DialogoDeNome
      titulo="Editar modelo"
      inicial={modelo.nome}
      acao={COPY.nome.guardar}
      aoFechar={aoFechar}
      aoConfirmar={async (nome) => {
        const lista = [
          ...new Set(
            etiquetas
              .split(',')
              .map((e) => e.trim())
              .filter(Boolean),
          ),
        ]
        if (lista.length > 16 || lista.some((e) => e.length > 40))
          throw Error('Use até 16 etiquetas de até 40 letras')
        const caminho = pasta.trim().replaceAll('\\', '/')
        if (
          caminho.length > 240 ||
          caminho.split('/').some((p) => p === '..' || p === '.') ||
          caminho.startsWith('/')
        )
          throw Error('Escolha uma pasta dentro da biblioteca')
        await aoGuardar({ nome, pasta: caminho, etiquetas: lista }, capa)
      }}
    >
      <label className="mcn-campo">
        Pasta
        <input
          value={pasta}
          onChange={(e) => setPasta(e.target.value)}
          maxLength={240}
          placeholder="Ex.: Natureza/Árvores"
        />
      </label>
      <label className="mcn-campo">
        Etiquetas, separadas por vírgulas
        <input
          value={etiquetas}
          onChange={(e) => setEtiquetas(e.target.value)}
          maxLength={670}
          placeholder="Ex.: árvore, floresta"
        />
      </label>
      <label className="mcn-opcao">
        <input
          type="checkbox"
          checked={capa}
          disabled={!modelo.miniatura}
          onChange={(e) => setCapa(e.target.checked)}
        />
        Usar esta miniatura como capa da biblioteca
      </label>
      <p className="text-sm text-mld-muted">
        {modelo.max
          .map((v, i) => (v - modelo.min[i]!).toLocaleString('pt-BR', { maximumFractionDigits: 2 }))
          .join(' × ')}{' '}
        m · {tamanhoLegivel(modelo.bytes)}
      </p>
    </DialogoDeNome>
  )
}

function FaixaDeAndamento({
  andamento,
  aoFechar,
  aoCancelar,
}: {
  andamento: NonNullable<Andamento>
  aoFechar(): void
  aoCancelar(): void
}): JSX.Element {
  if (andamento.fase !== 'pronto') {
    const texto =
      andamento.fase === 'conferindo'
        ? COPY.biblioteca.preparando(andamento.feitos, andamento.total)
        : COPY.biblioteca.trazendo(andamento.feitos, andamento.total)
    return (
      <div className="mcn-andamento" role="status">
        <span>{texto}</span>
        <progress value={andamento.feitos} max={Math.max(1, andamento.total)} />
        <button type="button" onClick={aoCancelar}>
          Parar importação
        </button>
      </div>
    )
  }
  return (
    <div className="mcn-andamento" role="status">
      <span>
        {andamento.novos > 0
          ? COPY.biblioteca.trouxe(andamento.novos)
          : andamento.recusados.length === 0
            ? COPY.biblioteca.nadaNovo
            : null}
        {andamento.recusados.length > 0 ? (
          <details className="mcn-recusados">
            <summary>{COPY.biblioteca.recusados(andamento.recusados.length)}</summary>
            <ul>
              {andamento.recusados.map((recusado) => (
                <li key={`${recusado.arquivo}:${recusado.motivo}`}>
                  {recusado.arquivo ? <strong>{recusado.arquivo}: </strong> : null}
                  {recusado.motivo}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </span>
      <button type="button" aria-label={COPY.painel.fechar} onClick={aoFechar}>
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
