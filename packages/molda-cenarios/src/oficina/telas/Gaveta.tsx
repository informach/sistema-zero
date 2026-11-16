import { Box, Boxes, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { type JSX, useEffect, useState } from 'react'
import { COPY } from '../copy'
import { Capa } from '../pecas'
import type { Biblioteca, CenariosHost, ModeloDeBiblioteca } from '../portas'

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
}: {
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  aoPor(modelo: ModeloDeBiblioteca): void
  aoArrastar(modelo: ModeloDeBiblioteca | null): void
  aoEscolherBibliotecas(): void
}): JSX.Element {
  const [aberta, setAberta] = useState(true)
  const [ativa, setAtiva] = useState<string | null>(bibliotecas[0]?.id ?? null)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [modelos, setModelos] = useState<ModeloDeBiblioteca[]>([])
  const [proximo, setProximo] = useState<string | null>(null)
  const [estado, setEstado] = useState<'chegando' | 'pronto' | 'falhou'>('chegando')

  const biblioteca = bibliotecas.find((b) => b.id === ativa) ?? bibliotecas[0] ?? null
  const bibliotecaId = biblioteca?.id ?? null

  useEffect(() => {
    const espera = setTimeout(() => setBuscaAplicada(busca.trim()), 200)
    return () => clearTimeout(espera)
  }, [busca])

  useEffect(() => {
    if (!bibliotecaId) return
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
  }, [host, bibliotecaId, buscaAplicada])

  const mostrarMais = async () => {
    if (!bibliotecaId || !proximo) return
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
        <button
          type="button"
          className="sz-tool-icon-btn"
          aria-expanded={aberta}
          aria-label={aberta ? COPY.gaveta.recolher : COPY.gaveta.abrir}
          title={aberta ? COPY.gaveta.recolher : COPY.gaveta.abrir}
          onClick={() => setAberta((a) => !a)}
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
                setAberta(true)
              }}
            >
              <Boxes aria-hidden="true" />
              {b.nome}
            </button>
          ))}
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
              onFocus={() => setAberta(true)}
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
          ) : estado === 'falhou' ? (
            <p className="mcn-gaveta-aviso">{COPY.inicio.falhou}</p>
          ) : estado === 'pronto' && modelos.length === 0 ? (
            <p className="mcn-gaveta-aviso">
              {buscaAplicada ? COPY.gaveta.semResultado : COPY.gaveta.vazia}
            </p>
          ) : (
            <ul className="mcn-gaveta-lista" aria-busy={estado === 'chegando'}>
              {modelos.map((modelo) => (
                <li key={modelo.id}>
                  <button
                    type="button"
                    className="mcn-brinquedo"
                    draggable
                    aria-label={COPY.gaveta.por(modelo.nome)}
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
              {proximo ? (
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
