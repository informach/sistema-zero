import { ArrowLeft, Box, Pencil, Search, Trash2, Upload, X } from 'lucide-react'
import { type DragEvent, type JSX, useEffect, useRef, useState } from 'react'
import { COPY } from '../copy'
import { prepararArquivos } from '../importar'
import { Capa, Chegando, DialogoDeApagar, DialogoDeNome, Falhou, useCarga } from '../pecas'
import type { CenariosHost, Licenca, ModeloDeBiblioteca } from '../portas'
import { SeletorDeLicenca } from './Inicio'

type Andamento =
  | { fase: 'conferindo' | 'trazendo'; feitos: number; total: number }
  | { fase: 'pronto'; novos: number; recusados: { arquivo: string; motivo: string }[] }
  | null

type Janela = { tipo: 'nome' } | { tipo: 'apagar' } | null

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
  const [modelos, setModelos] = useState<ModeloDeBiblioteca[]>([])
  const [proximo, setProximo] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [volta, setVolta] = useState(0)
  const [andamento, setAndamento] = useState<Andamento>(null)
  const [arrastando, setArrastando] = useState(false)
  const [janela, setJanela] = useState<Janela>(null)
  const [licenca, setLicenca] = useState<Licenca>('propria')
  const entrada = useRef<HTMLInputElement>(null)

  const cabecalho = useCarga(async () => {
    const lista = await host.listarBibliotecas(espacoId)
    const biblioteca = lista.find((b) => b.id === bibliotecaId)
    if (!biblioteca) throw new Error('A biblioteca não existe mais')
    return biblioteca
  }, [host, espacoId, bibliotecaId, volta])
  const biblioteca = cabecalho.dados

  // A busca espera a pessoa parar de digitar.
  useEffect(() => {
    const espera = setTimeout(() => setBuscaAplicada(busca.trim()), 220)
    return () => clearTimeout(espera)
  }, [busca])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `volta` recarrega depois de trazer ou apagar
  useEffect(() => {
    let vivo = true
    setFalhou(false)
    setTotal(null)
    host.listarModelos(bibliotecaId, { busca: buscaAplicada, limite: PAGINA }).then(
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
    }
  }, [host, bibliotecaId, buscaAplicada, volta])

  const mostrarMais = async () => {
    if (!proximo) return
    const pagina = await host.listarModelos(bibliotecaId, {
      busca: buscaAplicada,
      limite: PAGINA,
      cursor: proximo,
    })
    setModelos((atuais) => [...atuais, ...pagina.itens])
    setProximo(pagina.proximo)
  }

  const trazer = async (arquivos: File[]) => {
    if (!arquivos.length || (andamento && andamento.fase !== 'pronto')) return
    setAndamento({ fase: 'conferindo', feitos: 0, total: arquivos.length })
    try {
      const preparados = await prepararArquivos(arquivos, (feitos, quantos) =>
        setAndamento({ fase: 'conferindo', feitos, total: quantos }),
      )
      let novos = 0
      if (preparados.prontos.length) {
        setAndamento({ fase: 'trazendo', feitos: 0, total: preparados.prontos.length })
        const criados = await host.importarModelos(
          bibliotecaId,
          preparados.prontos,
          (feitos, quantos) => setAndamento({ fase: 'trazendo', feitos, total: quantos }),
        )
        novos = criados.length
      }
      setAndamento({ fase: 'pronto', novos, recusados: preparados.recusados })
    } catch (erro) {
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
    setVolta((v) => v + 1)
  }

  const aoSoltar = (evento: DragEvent) => {
    evento.preventDefault()
    setArrastando(false)
    void trazer(Array.from(evento.dataTransfer.files))
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
                  </div>
                </div>
                <div className="sz-tool-header__actions">
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={!biblioteca}
                    onClick={() => {
                      if (biblioteca) setLicenca(biblioteca.licenca)
                      setJanela({ tipo: 'nome' })
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    {COPY.jogo.renomear}
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={!biblioteca}
                    onClick={() => setJanela({ tipo: 'apagar' })}
                  >
                    <Trash2 aria-hidden="true" />
                    {COPY.jogo.apagar}
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    disabled={!biblioteca || (andamento !== null && andamento.fase !== 'pronto')}
                    onClick={() => entrada.current?.click()}
                  >
                    <Upload aria-hidden="true" />
                    {COPY.biblioteca.trazer}
                  </button>
                  <input
                    ref={entrada}
                    type="file"
                    accept=".glb,model/gltf-binary"
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
                <div className="sz-tool-toolbar__start">
                  {andamento ? (
                    <FaixaDeAndamento andamento={andamento} aoFechar={() => setAndamento(null)} />
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
                        <button
                          type="button"
                          className="mcn-modelo-tirar"
                          aria-label={COPY.biblioteca.apagarModelo(modelo.nome)}
                          title={COPY.biblioteca.apagarModelo(modelo.nome)}
                          onClick={async () => {
                            await host.apagarModelos([modelo.id])
                            setVolta((v) => v + 1)
                          }}
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

      {janela?.tipo === 'nome' && biblioteca ? (
        <DialogoDeNome
          titulo={COPY.jogo.renomear}
          inicial={biblioteca.nome}
          acao={COPY.nome.guardar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            await host.editarBiblioteca(biblioteca.id, { nome, licenca })
            setVolta((v) => v + 1)
          }}
        >
          <SeletorDeLicenca valor={licenca} aoMudar={setLicenca} />
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

function FaixaDeAndamento({
  andamento,
  aoFechar,
}: {
  andamento: NonNullable<Andamento>
  aoFechar(): void
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
