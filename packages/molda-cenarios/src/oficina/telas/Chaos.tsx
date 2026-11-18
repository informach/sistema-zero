import { Image as ImageIcon, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { type DragEvent, type JSX, useEffect, useRef, useState } from 'react'
import { Capa, Chegando, Dialogo, DialogoDeApagar, Falhou, useCarga } from '../pecas'
import type { CenariosHost, TexturaDeBiblioteca, TexturaParaImportar } from '../portas'
import { prepararChao } from '../texturas'

export function Chaos({
  host,
  bibliotecaId,
  busca,
  pasta,
  volta,
  aoMudar,
}: {
  host: CenariosHost
  bibliotecaId: string
  busca: string
  pasta: string
  volta: number
  aoMudar(): void
}): JSX.Element {
  const entrada = useRef<HTMLInputElement>(null)
  const trabalho = useRef<AbortController | null>(null)
  const contexto = JSON.stringify([bibliotecaId, busca, pasta])
  const [pagina, setPagina] = useState<{ contexto: string; cursor: string | null }>({
    contexto,
    cursor: null,
  })
  const cursor = pagina.contexto === contexto ? pagina.cursor : null
  const setCursor = (cursor: string | null) => setPagina({ contexto, cursor })
  const [andamento, setAndamento] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [janela, setJanela] = useState<
    { tipo: 'editar' | 'apagar'; textura: TexturaDeBiblioteca } | { tipo: 'molda' } | null
  >(null)
  useEffect(
    () => () => {
      trabalho.current?.abort()
    },
    [],
  )
  const carga = useCarga(
    () =>
      host.listarTexturas(bibliotecaId, {
        busca,
        ...(pasta === '*' ? {} : { pasta }),
        cursor,
        limite: 60,
      }),
    [host, bibliotecaId, busca, pasta, cursor, volta],
  )
  const concluir = () => {
    aoMudar()
    carga.recarregar()
  }
  const trazer = async (arquivos: File[]) => {
    if (trabalho.current || !arquivos.length) return
    if (arquivos.length > 2000) {
      setErro('Traga até 2000 imagens por vez')
      return
    }
    const controle = new AbortController()
    trabalho.current = controle
    setErro(null)
    const recusados: string[] = []
    try {
      for (let inicio = 0; inicio < arquivos.length; inicio += 16) {
        const preparados: TexturaParaImportar[] = []
        for (const [i, arquivo] of arquivos.slice(inicio, inicio + 16).entries()) {
          controle.signal.throwIfAborted()
          setAndamento(`Preparando ${inicio + i + 1} de ${arquivos.length}`)
          try {
            const preparado = await prepararChao(arquivo, controle.signal)
            const caminho = arquivo.webkitRelativePath?.split('/').slice(0, -1).join('/')
            if (caminho) preparado.pasta = caminho.slice(0, 240)
            preparados.push(preparado)
          } catch (e) {
            controle.signal.throwIfAborted()
            recusados.push(
              `${arquivo.name}: ${e instanceof Error ? e.message : 'Não consegui trazer esta imagem'}`,
            )
          }
        }
        if (preparados.length) {
          setAndamento(
            `Guardando imagens de ${inicio + 1} a ${Math.min(inicio + 16, arquivos.length)}`,
          )
          await host.importarTexturas(bibliotecaId, preparados, undefined, controle.signal)
        }
      }
      setErro(recusados.length ? recusados.join('\n') : null)
    } catch (e) {
      if (!controle.signal.aborted)
        setErro(
          [...recusados, e instanceof Error ? e.message : 'Não consegui trazer as imagens'].join(
            '\n',
          ),
        )
    } finally {
      if (trabalho.current === controle) trabalho.current = null
      if (!controle.signal.aborted) {
        setAndamento(null)
        concluir()
      }
    }
  }
  const aoSoltar = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void trazer(Array.from(e.dataTransfer.files))
  }
  return (
    <section
      aria-label="Chãos da biblioteca"
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onDrop={aoSoltar}
    >
      <div className="sz-tool-toolbar mb-5">
        <p className="max-w-xl text-mld-muted">
          Imagens para o chão: grama, terra, areia e outros acabamentos. Solte PNG, JPG ou WebP
          aqui.
        </p>
        <div className="sz-tool-toolbar__end">
          {host.texturasMolda ? (
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--quiet"
              disabled={Boolean(andamento)}
              onClick={() => setJanela({ tipo: 'molda' })}
            >
              Trazer do Molda
            </button>
          ) : null}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary"
            disabled={Boolean(andamento)}
            onClick={() => entrada.current?.click()}
          >
            <Upload aria-hidden /> Trazer chãos
          </button>
          <input
            ref={entrada}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Imagens de chão"
            onChange={(e) => {
              void trazer(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {andamento ? (
        <div className="flex flex-wrap items-center gap-3">
          <Chegando texto={andamento} />
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--quiet"
            onClick={() => {
              trabalho.current?.abort()
              trabalho.current = null
              setAndamento(null)
              concluir()
            }}
          >
            Cancelar
          </button>
        </div>
      ) : null}
      {erro ? (
        <p role="alert" className="mb-4 whitespace-pre-line">
          {erro}
        </p>
      ) : null}
      {carga.falhou ? (
        <Falhou aoTentar={carga.recarregar} />
      ) : carga.carregando || !carga.dados ? (
        <Chegando />
      ) : !carga.dados.itens.length ? (
        <p>Nenhum chão encontrado. Traga uma imagem para começar.</p>
      ) : (
        <>
          <ul className="mcn-modelos">
            {carga.dados.itens.map((t) => (
              <li key={t.id} className="mcn-modelo">
                <span className="mcn-modelo-foto">
                  <Capa endereco={t.imagem} reserva={<ImageIcon />} />
                </span>
                <span className="mcn-modelo-nome" title={t.nome}>
                  {t.nome}
                </span>
                <span className="mcn-modelo-detalhe">
                  {t.largura} × {t.altura} px · {t.repeticaoMetros} m
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    aria-label={`Editar ${t.nome}`}
                    onClick={() => setJanela({ tipo: 'editar', textura: t })}
                  >
                    <Pencil aria-hidden /> Editar
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    aria-label={`Tirar ${t.nome}`}
                    onClick={() => setJanela({ tipo: 'apagar', textura: t })}
                  >
                    <Trash2 aria-hidden /> Tirar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            {cursor ? (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--quiet"
                onClick={() => setCursor(null)}
              >
                Voltar ao começo
              </button>
            ) : null}
            {carga.dados.proximo ? (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--quiet"
                onClick={() => setCursor(carga.dados!.proximo)}
              >
                Próxima página
              </button>
            ) : null}
          </div>
        </>
      )}
      {janela?.tipo === 'editar' ? (
        <EditarChao
          textura={janela.textura}
          aoFechar={() => setJanela(null)}
          aoGuardar={async (dados) => {
            await host.editarTextura(janela.textura.id, dados)
            concluir()
          }}
        />
      ) : null}
      {janela?.tipo === 'apagar' ? (
        <DialogoDeApagar
          titulo={`Tirar ${janela.textura.nome}?`}
          texto="A imagem sai desta biblioteca."
          aoFechar={() => setJanela(null)}
          aoConfirmar={async () => {
            await host.apagarTexturas(bibliotecaId, [janela.textura.id])
            concluir()
          }}
        />
      ) : null}
      {janela?.tipo === 'molda' && host.texturasMolda ? (
        <TexturasDoMolda
          host={host}
          bibliotecaId={bibliotecaId}
          aoFechar={() => setJanela(null)}
          aoMudar={concluir}
        />
      ) : null}
    </section>
  )
}

function EditarChao({
  textura,
  aoFechar,
  aoGuardar,
}: {
  textura: TexturaDeBiblioteca
  aoFechar(): void
  aoGuardar(dados: {
    nome: string
    pasta: string
    etiquetas: string[]
    repeticaoMetros: number
  }): Promise<void>
}) {
  const [nome, setNome] = useState(textura.nome),
    [pasta, setPasta] = useState(textura.pasta),
    [etiquetas, setEtiquetas] = useState(textura.etiquetas.join(', ')),
    [repeticao, setRepeticao] = useState(textura.repeticaoMetros)
  const [erro, setErro] = useState<string | null>(null),
    [ocupado, setOcupado] = useState(false)
  return (
    <Dialogo titulo={`Editar ${textura.nome}`} aoFechar={aoFechar}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setOcupado(true)
          void aoGuardar({
            nome: nome.trim(),
            pasta,
            etiquetas: etiquetas
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean)
              .slice(0, 16),
            repeticaoMetros: repeticao,
          }).then(aoFechar, (e) => {
            setErro(e instanceof Error ? e.message : 'Não consegui guardar')
            setOcupado(false)
          })
        }}
      >
        <label className="mcn-campo">
          Nome
          <input
            className="sz-tool-search"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className="mcn-campo">
          Pasta
          <input
            className="sz-tool-search"
            value={pasta}
            onChange={(e) => setPasta(e.target.value)}
            maxLength={240}
          />
        </label>
        <label className="mcn-campo">
          Etiquetas, separadas por vírgula
          <input
            className="sz-tool-search"
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
          />
        </label>
        <label className="mcn-campo">
          Repetição em metros
          <input
            className="sz-tool-search"
            type="number"
            min={0.05}
            max={1000}
            step={0.05}
            value={repeticao}
            onChange={(e) => setRepeticao(e.target.valueAsNumber)}
            required
          />
        </label>
        {erro ? <p role="alert">{erro}</p> : null}
        <button
          type="submit"
          className="sz-tool-pill sz-tool-pill--primary"
          disabled={ocupado || !nome.trim()}
        >
          {ocupado ? 'Guardando' : 'Guardar'}
        </button>
      </form>
    </Dialogo>
  )
}

export function TexturasDoMolda({
  host,
  bibliotecaId,
  aoFechar,
  aoMudar,
  aoEscolher,
}: {
  host: CenariosHost
  bibliotecaId: string
  aoFechar(): void
  aoMudar(): void
  aoEscolher?(textura: TexturaDeBiblioteca): void
}) {
  const carga = useCarga((sinal) => host.texturasMolda!.listar(sinal), [host])
  const trabalho = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      trabalho.current?.abort()
    },
    [],
  )
  const [ocupado, setOcupado] = useState<string | null>(null),
    [erro, setErro] = useState<string | null>(null)
  return (
    <Dialogo titulo="Texturas do Molda" aoFechar={aoFechar}>
      <button
        type="button"
        className="sz-tool-pill sz-tool-pill--quiet mb-4"
        disabled={Boolean(ocupado)}
        onClick={carga.recarregar}
      >
        <RefreshCw aria-hidden /> Atualizar
      </button>
      {erro ? <p role="alert">{erro}</p> : null}
      {carga.falhou ? (
        <Falhou aoTentar={carga.recarregar} />
      ) : carga.carregando || !carga.dados ? (
        <Chegando />
      ) : !carga.dados.length ? (
        <p>Guarde uma textura no Molda para ela aparecer aqui.</p>
      ) : (
        <ul className="mcn-modelos">
          {carga.dados.map((t) => (
            <li key={t.id} className="mcn-modelo">
              <span className="mcn-modelo-foto">
                <Capa endereco={t.miniatura} reserva={<ImageIcon />} />
              </span>
              <span className="mcn-modelo-nome">{t.nome}</span>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--primary"
                disabled={Boolean(ocupado)}
                aria-label={`Trazer ${t.nome}`}
                onClick={() => {
                  const controle = new AbortController()
                  trabalho.current = controle
                  setOcupado(t.id)
                  setErro(null)
                  void host
                    .texturasMolda!.preparar(bibliotecaId, t, controle.signal)
                    .then(
                      (textura) => {
                        if (!controle.signal.aborted) {
                          aoMudar()
                          aoEscolher?.(textura)
                          aoFechar()
                        }
                      },
                      (e) => {
                        if (!controle.signal.aborted)
                          setErro(e instanceof Error ? e.message : 'Não consegui trazer a textura')
                      },
                    )
                    .finally(() => {
                      if (!controle.signal.aborted) setOcupado(null)
                      if (trabalho.current === controle) trabalho.current = null
                    })
                }}
              >
                {ocupado === t.id ? 'Guardando' : 'Trazer'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialogo>
  )
}
