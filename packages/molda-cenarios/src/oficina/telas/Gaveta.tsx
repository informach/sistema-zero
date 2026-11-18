import { Box, Boxes, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { type JSX, useEffect, useState } from 'react'
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
  const [ativa, setAtiva] = useState<string | null>(
    bibliotecas[0]?.id ?? (moldesDisponiveis ? BIBLIOTECA_MOLDA_ID : null),
  )
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<'modelos' | 'conjuntos'>('modelos')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [modelos, setModelos] = useState<ModeloDeBiblioteca[]>([])
  const [proximo, setProximo] = useState<string | null>(null)
  const [estado, setEstado] = useState<'chegando' | 'pronto' | 'falhou'>('chegando')

  const noMolda = moldesDisponiveis && ativa === BIBLIOTECA_MOLDA_ID
  const biblioteca = noMolda
    ? null
    : (bibliotecas.find((b) => b.id === ativa) ?? bibliotecas[0] ?? null)
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

  useEffect(() => {
    if (!bibliotecaId || noMolda) return
    let vivo = true
    setEstado('chegando')
    host.listarModelos(bibliotecaId, { busca: buscaAplicada, limite: PAGINA }).then(
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
  }, [host, bibliotecaId, buscaAplicada, noMolda])

  const mostrarMais = async () => {
    if (!bibliotecaId || !proximo || noMolda) return
    const pagina = await host.listarModelos(bibliotecaId, {
      busca: buscaAplicada,
      limite: PAGINA,
      cursor: proximo,
    })
    setModelos((atuais) => [...atuais, ...pagina.itens])
    setProximo(pagina.proximo)
  }

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
          {bibliotecas.map((b) => (
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
              {buscaAplicada ? COPY.gaveta.semResultado : COPY.gaveta.vazia}
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
                    title={modelo.nome}
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
