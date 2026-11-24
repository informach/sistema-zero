import { type JSX, useEffect, useRef, useState } from 'react'
import { Chegando, Dialogo } from '../pecas'
import type { Biblioteca, CenariosHost, PaginaDeTexturas, TexturaDeBiblioteca } from '../portas'
import { prepararChao } from '../texturas'
import { TexturasDoMolda } from './Chaos'

/** Consulta o mesmo acervo de chãos da biblioteca; não cria outra coleção de materiais. */
export function EscolherTextura({
  host,
  bibliotecas,
  aoEscolher,
  aoFechar,
  finalidade = 'solo',
}: {
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  aoEscolher(textura: TexturaDeBiblioteca): void
  aoFechar(): void
  finalidade?: 'solo' | 'panorama'
}): JSX.Element {
  const [ativa, setAtiva] = useState(bibliotecas[0]?.id ?? '')
  const [busca, setBusca] = useState('')
  const [aplicada, setAplicada] = useState('')
  const [volta, setVolta] = useState(0)
  const [molda, setMolda] = useState(false),
    [erroDeImportacao, setErroDeImportacao] = useState<string | null>(null),
    [importando, setImportando] = useState(false),
    trabalho = useRef<AbortController | null>(null),
    entrada = useRef<HTMLInputElement>(null)
  useEffect(() => () => trabalho.current?.abort(), [])
  useEffect(() => {
    const espera = setTimeout(() => setAplicada(busca.trim()), 200)
    return () => clearTimeout(espera)
  }, [busca])
  const biblioteca = bibliotecas.find((b) => b.id === ativa) ?? bibliotecas[0]
  const importar = async (arquivo: File) => {
    if (!biblioteca || trabalho.current) return
    const controle = new AbortController()
    trabalho.current = controle
    setImportando(true)
    setErroDeImportacao(null)
    try {
      const textura = await prepararChao(arquivo, controle.signal)
      if (finalidade === 'panorama' && textura.largura !== textura.altura * 2)
        throw Error('O panorama precisa de uma imagem equiretangular com proporção 2:1.')
      const [importada] = await host.importarTexturas(
        biblioteca.id,
        [textura],
        undefined,
        controle.signal,
      )
      controle.signal.throwIfAborted()
      if (!importada) throw Error('A biblioteca não devolveu a textura importada.')
      aoEscolher(importada)
    } catch (erro) {
      if (!controle.signal.aborted)
        setErroDeImportacao(
          erro instanceof Error ? erro.message : 'Não consegui importar a imagem.',
        )
    } finally {
      if (!controle.signal.aborted) setImportando(false)
      if (trabalho.current === controle) trabalho.current = null
    }
  }
  return (
    <Dialogo
      titulo={finalidade === 'panorama' ? 'Escolher panorama do céu' : 'Escolher textura'}
      aoFechar={aoFechar}
    >
      <div className="mcn-grupo">
        {!biblioteca ? (
          <p className="text-sm text-mld-muted">
            Conecte uma biblioteca ao mundo e importe imagens na aba Chãos.
          </p>
        ) : (
          <>
            <label className="mcn-campo">
              Biblioteca de texturas
              <select
                className="sz-tool-select"
                aria-label="Biblioteca de texturas"
                value={biblioteca.id}
                disabled={importando}
                onChange={(e) => setAtiva(e.target.value)}
              >
                {bibliotecas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </label>
            {finalidade === 'panorama' ? (
              <div className="mcn-caminho-acoes">
                <input
                  ref={entrada}
                  type="file"
                  className="sr-only"
                  accept="image/png,image/webp,image/jpeg"
                  aria-label="Arquivo de panorama"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0]
                    e.target.value = ''
                    if (arquivo) void importar(arquivo)
                  }}
                />
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={importando}
                  onClick={() => entrada.current?.click()}
                >
                  {importando ? 'Importando panorama…' : 'Importar panorama'}
                </button>
                {host.texturasMolda ? (
                  <button
                    type="button"
                    className="sz-tool-btn"
                    disabled={importando}
                    onClick={() => setMolda(true)}
                  >
                    Trazer panorama do Molda
                  </button>
                ) : null}
                {erroDeImportacao ? (
                  <p role="alert" className="mcn-recusa">
                    {erroDeImportacao}
                  </p>
                ) : null}
              </div>
            ) : null}
            <label className="mcn-campo">
              Buscar texturas
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoComplete="off"
              />
            </label>
            <ListaDeTexturas
              key={`${biblioteca.id}:${aplicada}:${volta}`}
              host={host}
              biblioteca={biblioteca.id}
              busca={aplicada}
              aoEscolher={aoEscolher}
              finalidade={finalidade}
            />
          </>
        )}
        <button type="button" className="sz-tool-pill sz-tool-pill--outline" onClick={aoFechar}>
          Cancelar escolha de textura
        </button>
      </div>
      {molda && biblioteca && host.texturasMolda ? (
        <TexturasDoMolda
          host={host}
          bibliotecaId={biblioteca.id}
          aoFechar={() => setMolda(false)}
          aoMudar={() => setVolta((v) => v + 1)}
          aoEscolher={aoEscolher}
        />
      ) : null}
    </Dialogo>
  )
}

interface PropsDaLista {
  finalidade: 'solo' | 'panorama'
  host: CenariosHost
  biblioteca: string
  busca: string
  aoEscolher(textura: TexturaDeBiblioteca): void
}

function ListaDeTexturas(props: PropsDaLista): JSX.Element {
  const [volta, setVolta] = useState(0)
  return <PaginasDeTexturas key={volta} {...props} aoRepetir={() => setVolta((v) => v + 1)} />
}

function PaginasDeTexturas({
  host,
  biblioteca,
  busca,
  aoEscolher,
  aoRepetir,
  finalidade,
}: PropsDaLista & { aoRepetir(): void }): JSX.Element {
  const [pagina, setPagina] = useState<PaginaDeTexturas | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const vivo = useRef(false),
    lendo = useRef(false)
  useEffect(() => {
    let valido = true
    vivo.current = true
    setErro(false)
    setPagina(null)
    host.listarTexturas(biblioteca, { busca, limite: 24 }).then(
      (p) => valido && setPagina(p),
      () => valido && setErro(true),
    )
    return () => {
      valido = false
      vivo.current = false
    }
  }, [host, biblioteca, busca])
  const mais = async () => {
    if (!pagina?.proximo || lendo.current) return
    lendo.current = true
    setCarregando(true)
    setErro(false)
    try {
      const p = await host.listarTexturas(biblioteca, { busca, limite: 24, cursor: pagina.proximo })
      if (vivo.current)
        setPagina((antes) => (antes ? { ...p, itens: [...antes.itens, ...p.itens] } : p))
    } catch {
      if (vivo.current) setErro(true)
    } finally {
      lendo.current = false
      if (vivo.current) setCarregando(false)
    }
  }
  return (
    <>
      {!pagina && !erro ? <Chegando texto="Carregando texturas" /> : null}
      {erro ? (
        <p role="alert" className="text-sm text-mld-muted">
          Não consegui carregar as texturas.{' '}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--outline"
            onClick={() => {
              if (pagina) void mais()
              else aoRepetir()
            }}
          >
            Tentar carregar texturas
          </button>
        </p>
      ) : null}
      {pagina?.itens.length === 0 ? (
        <p className="text-sm text-mld-muted">
          {busca
            ? 'Nenhuma textura encontrada.'
            : 'Ainda não há imagens nesta biblioteca. Importe-as na aba Chãos.'}
        </p>
      ) : null}
      {pagina ? (
        <ul
          className="grid grid-cols-2 gap-2"
          aria-label="Texturas disponíveis"
          aria-busy={carregando}
        >
          {pagina.itens.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="mcn-brinquedo w-full"
                aria-label={`Escolher textura ${t.nome}`}
                disabled={finalidade === 'panorama' && t.largura !== t.altura * 2}
                title={
                  finalidade === 'panorama' && t.largura !== t.altura * 2
                    ? 'O panorama precisa de proporção 2:1.'
                    : t.nome
                }
                onClick={() => aoEscolher(t)}
              >
                <span className="mcn-brinquedo-foto">
                  <img src={t.imagem} alt="" loading="lazy" />
                </span>
                <span className="mcn-brinquedo-nome">{t.nome}</span>
                {finalidade === 'panorama' ? (
                  <small>
                    {t.largura} × {t.altura}
                    {t.largura !== t.altura * 2 ? ' · incompatível: use 2:1' : ' · panorama 2:1'}
                  </small>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {pagina?.proximo ? (
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={carregando}
          onClick={() => void mais()}
        >
          {carregando ? 'Carregando mais texturas…' : 'Mais texturas'}
        </button>
      ) : null}
    </>
  )
}
