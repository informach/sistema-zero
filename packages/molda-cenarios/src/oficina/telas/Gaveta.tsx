import { Box, Boxes, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { type JSX, useEffect, useRef, useState } from 'react'
import { COPY } from '../copy'
import { BIBLIOTECA_MOLDA_ID, useMoldes } from '../moldes'
import { Capa } from '../pecas'
import type {
  Biblioteca,
  CenariosHost,
  ConjuntoDeBiblioteca,
  EscolhaDeModelo,
  ModeloDeBiblioteca,
} from '../portas'
import { Conjuntos } from './Conjuntos'

/** O tipo do dado arrastado da gaveta até o palco. */
export const ARRASTO_DE_MODELO = 'application/x-sz-modelo'

const PAGINA = 40

/** Os pacotes que vêm primeiro quando servem: a regra de preferência da montagem das ilhas. */
const PACOTES_PRIMEIRO = ['adventure land']

/** As bibliotecas na ordem da gaveta: as preferidas primeiro, as outras como o mundo guarda. */
export function ordenarBibliotecas(bibliotecas: readonly Biblioteca[]): Biblioteca[] {
  const posicao = (b: Biblioteca) => {
    const i = PACOTES_PRIMEIRO.indexOf(b.nome.trim().toLocaleLowerCase('pt-BR'))
    return i < 0 ? PACOTES_PRIMEIRO.length : i
  }
  return bibliotecas
    .map((b, i) => ({ b, i }))
    .sort((x, y) => posicao(x.b) - posicao(y.b) || x.i - y.i)
    .map((x) => x.b)
}

/**
 * A caixa de brinquedos: os modelos das bibliotecas do mundo, para tocar e pôr no cenário ou
 * arrastar até o lugar.
 */
export function Gaveta({
  host,
  bibliotecas,
  aoPor,
  aoArrastar,
  aoEscolherBibliotecas,
  moldesDisponiveis = false,
  preparandoMolde = false,
  aberta,
  aoMudarAbertura,
  modo = 'colocar',
  aoPorConjunto,
  conjuntoEmEdicao,
  atualizacaoDosConjuntos = 0,
}: {
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  aoPor(modelo: EscolhaDeModelo): void
  aoArrastar(modelo: EscolhaDeModelo | null): void
  aoEscolherBibliotecas(): void
  moldesDisponiveis?: boolean
  preparandoMolde?: boolean
  aberta: boolean
  aoMudarAbertura(aberta: boolean): void
  modo?: 'colocar' | 'pincel' | 'personagem' | 'caminho'
  aoPorConjunto?(conjunto: ConjuntoDeBiblioteca): Promise<void>
  conjuntoEmEdicao?: string
  atualizacaoDosConjuntos?: number
}): JSX.Element {
  const ordenadas = ordenarBibliotecas(bibliotecas)
  const [ativa, setAtiva] = useState<string | null>(
    ordenadas[0]?.id ?? (moldesDisponiveis ? BIBLIOTECA_MOLDA_ID : null),
  )
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [tipo, setTipo] = useState<'modelos' | 'conjuntos'>('modelos')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [modelos, setModelos] = useState<ModeloDeBiblioteca[]>([])
  const [proximo, setProximo] = useState<string | null>(null)
  const [estado, setEstado] = useState<'chegando' | 'pronto' | 'falhou'>('chegando')

  const noMolda = moldesDisponiveis && ativa === BIBLIOTECA_MOLDA_ID
  const biblioteca = noMolda
    ? null
    : (ordenadas.find((b) => b.id === ativa) ?? ordenadas[0] ?? null)
  const nomeDoPacote = noMolda ? 'Meus moldes' : (biblioteca?.nome ?? '')
  const bibliotecaId = noMolda ? BIBLIOTECA_MOLDA_ID : (biblioteca?.id ?? null)
  const moldes = useMoldes(host.molda, noMolda)
  const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
  const visiveis: EscolhaDeModelo[] = noMolda
    ? (moldes.dados ?? []).filter((m) => normal(m.nome).includes(normal(buscaAplicada)))
    : modelos
  const estadoAtual = noMolda
    ? moldes.falhou
      ? 'falhou'
      : moldes.dados === null
        ? 'chegando'
        : 'pronto'
    : estado

  useEffect(() => {
    const espera = setTimeout(() => setBuscaAplicada(busca.trim()), 200)
    return () => clearTimeout(espera)
  }, [busca])

  // As categorias são as pastas da biblioteca; trocar de biblioteca volta para todas.
  useEffect(() => {
    setCategoria('')
    setCategorias([])
    if (!bibliotecaId || noMolda) return
    let vivo = true
    host.organizacaoDaBiblioteca(bibliotecaId).then(
      (o) => vivo && setCategorias(o.pastas.filter((p) => p.trim())),
      () => {},
    )
    return () => {
      vivo = false
    }
  }, [host, bibliotecaId, noMolda])

  const filtro = { busca: buscaAplicada, ...(categoria ? { pasta: categoria } : {}) }
  useEffect(() => {
    if (!bibliotecaId || noMolda) return
    let vivo = true
    setEstado('chegando')
    host
      .listarModelos(bibliotecaId, {
        busca: buscaAplicada,
        ...(categoria ? { pasta: categoria } : {}),
        limite: PAGINA,
      })
      .then(
        (pagina) => {
          if (!vivo) return
          setModelos(pagina.itens)
          setProximo(pagina.proximo)
          setEstado('pronto')
        },
        () => vivo && setEstado('falhou'),
      )
    return () => {
      vivo = false
    }
  }, [host, bibliotecaId, buscaAplicada, categoria, noMolda])

  const pedindoMais = useRef<string | null>(null)
  const mostrarMais = async () => {
    if (!bibliotecaId || !proximo || noMolda) return
    // Um pedido de cada vez, e só vale para a mesma biblioteca, busca e categoria de quando saiu.
    const consulta = `${bibliotecaId}|${buscaAplicada}|${categoria}|${proximo}`
    if (pedindoMais.current) return
    pedindoMais.current = consulta
    try {
      const pagina = await host.listarModelos(bibliotecaId, {
        ...filtro,
        limite: PAGINA,
        cursor: proximo,
      })
      if (pedindoMais.current !== consulta) return
      setModelos((atuais) => {
        const vistos = new Set(atuais.map((m) => m.id))
        return [...atuais, ...pagina.itens.filter((m) => !vistos.has(m.id))]
      })
      setProximo(pagina.proximo)
    } catch {
      // Sem rede: o botão continua lá para tentar de novo.
    } finally {
      if (pedindoMais.current === consulta) pedindoMais.current = null
    }
  }
  // Trocar de biblioteca, de busca ou de categoria esquece o pedido que estava no caminho.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só a troca de consulta importa
  useEffect(() => {
    pedindoMais.current = null
  }, [bibliotecaId, buscaAplicada, categoria])

  return (
    <section className="mcn-gaveta mld-bar" aria-label={COPY.gaveta.titulo} data-aberta={aberta}>
      <div className="mcn-gaveta-topo">
        {aoPorConjunto && !noMolda && modo === 'colocar' ? (
          <fieldset className="sz-tool-chips">
            <legend className="sr-only">Conteúdo da biblioteca</legend>
            <button
              type="button"
              className="sz-tool-chip"
              aria-pressed={tipo === 'modelos'}
              onClick={() => {
                setTipo('modelos')
                aoMudarAbertura(true)
              }}
            >
              Modelos
            </button>
            <button
              type="button"
              className="sz-tool-chip"
              aria-pressed={tipo === 'conjuntos'}
              onClick={() => {
                setTipo('conjuntos')
                aoMudarAbertura(true)
              }}
            >
              Conjuntos
            </button>
          </fieldset>
        ) : null}
        <button
          type="button"
          className="sz-tool-icon-btn"
          aria-expanded={aberta}
          aria-label={aberta ? COPY.gaveta.recolher : COPY.gaveta.abrir}
          title={aberta ? COPY.gaveta.recolher : COPY.gaveta.abrir}
          onClick={() => aoMudarAbertura(!aberta)}
        >
          {aberta ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
        </button>
        <fieldset className="sz-tool-chips mcn-gaveta-chips">
          <legend className="sr-only">{COPY.inicio.abaBibliotecas}</legend>
          {ordenadas.map((b) => (
            <button
              key={b.id}
              type="button"
              className="sz-tool-chip"
              aria-pressed={b.id === bibliotecaId}
              onClick={() => {
                setAtiva(b.id)
                aoMudarAbertura(true)
              }}
            >
              <Boxes aria-hidden="true" />
              {b.nome}
            </button>
          ))}
          {moldesDisponiveis && host.molda ? (
            <button
              type="button"
              className="sz-tool-chip"
              aria-pressed={noMolda}
              onClick={() => {
                setAtiva(BIBLIOTECA_MOLDA_ID)
                aoMudarAbertura(true)
              }}
            >
              <Boxes aria-hidden />
              Meus moldes
            </button>
          ) : null}
          <button type="button" className="sz-tool-chip" onClick={aoEscolherBibliotecas}>
            {COPY.gaveta.escolher}
          </button>
        </fieldset>
        {bibliotecaId ? (
          <label className="sz-tool-search-wrap mcn-gaveta-busca">
            <Search aria-hidden="true" />
            <input
              type="search"
              autoComplete="off"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              onFocus={() => aoMudarAbertura(true)}
              aria-label={COPY.gaveta.buscar}
              placeholder={COPY.gaveta.buscar}
              className="sz-tool-search"
            />
          </label>
        ) : null}
        {bibliotecaId && !noMolda && categorias.length > 0 ? (
          <label className="mcn-gaveta-categoria">
            <span className="sr-only">{COPY.gaveta.categoria}</span>
            <select
              value={categoria}
              onChange={(evento) => {
                setCategoria(evento.target.value)
                aoMudarAbertura(true)
              }}
              aria-label={COPY.gaveta.categoria}
              className="mcn-select"
            >
              <option value="">{COPY.gaveta.todasAsCategorias}</option>
              {categorias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {aberta ? (
        <div className="mcn-gaveta-corpo">
          {!bibliotecaId ? (
            <p className="mcn-gaveta-aviso">{COPY.gaveta.semBibliotecas}</p>
          ) : tipo === 'conjuntos' && !noMolda && modo === 'colocar' ? (
            <Conjuntos
              key={`${bibliotecaId}:${atualizacaoDosConjuntos}`}
              host={host}
              bibliotecaId={bibliotecaId}
              busca={buscaAplicada}
              compacto
              aoPor={aoPorConjunto}
              excluido={conjuntoEmEdicao}
            />
          ) : estadoAtual === 'falhou' ? (
            <p className="mcn-gaveta-aviso">{COPY.inicio.falhou}</p>
          ) : estadoAtual === 'pronto' && visiveis.length === 0 ? (
            <p className="mcn-gaveta-aviso">
              {buscaAplicada
                ? COPY.gaveta.semResultado
                : categoria
                  ? COPY.gaveta.semNaCategoria
                  : COPY.gaveta.vazia}
            </p>
          ) : (
            <ul className="mcn-gaveta-lista" aria-busy={estadoAtual === 'chegando'}>
              {visiveis.map((modelo) => (
                <li key={modelo.id}>
                  <button
                    type="button"
                    className="mcn-brinquedo"
                    draggable
                    disabled={preparandoMolde}
                    aria-label={
                      modo === 'caminho'
                        ? `Usar ${modelo.nome} no caminho`
                        : modo === 'pincel'
                          ? `Usar ${modelo.nome} no pincel`
                          : modo === 'personagem'
                            ? `Usar ${modelo.nome} como personagem`
                            : COPY.gaveta.por(modelo.nome)
                    }
                    title={nomeDoPacote ? `${modelo.nome} · ${nomeDoPacote}` : modelo.nome}
                    onClick={() => aoPor(modelo)}
                    onDragStart={(evento) => {
                      evento.dataTransfer.setData(ARRASTO_DE_MODELO, modelo.id)
                      evento.dataTransfer.effectAllowed = 'copy'
                      aoArrastar(modelo)
                    }}
                    onDragEnd={() => aoArrastar(null)}
                  >
                    <span className="mcn-brinquedo-foto">
                      <Capa endereco={modelo.miniatura} reserva={<Box />} />
                    </span>
                    <span className="mcn-brinquedo-nome">{modelo.nome}</span>
                    {nomeDoPacote ? (
                      <span className="mcn-brinquedo-pacote">
                        <span className="sr-only">{COPY.gaveta.pacote(nomeDoPacote)}</span>
                        <span aria-hidden="true">{nomeDoPacote}</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              {!noMolda && proximo ? (
                <li>
                  <button
                    type="button"
                    className="mcn-brinquedo mcn-brinquedo--mais"
                    onClick={mostrarMais}
                  >
                    {COPY.gaveta.mais}
                  </button>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
