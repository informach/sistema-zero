import { ArrowLeft, Box, RefreshCw, Search } from 'lucide-react'
import { type JSX, useState } from 'react'
import { useMoldes } from '../moldes'
import { Capa, Chegando, Falhou } from '../pecas'
import type { FonteDeMoldes } from '../portas'

export function Moldes({
  fonte,
  aoVoltar,
  aoAbrirCopias,
}: {
  fonte: FonteDeMoldes
  aoVoltar(): void
  aoAbrirCopias(): Promise<void>
}): JSX.Element {
  const carga = useMoldes(fonte, true)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
  const lista = carga.dados?.filter((m) => normal(m.nome).includes(normal(busca))) ?? []
  return (
    <section className="min-h-0 flex-1 overflow-y-auto" aria-label="Meus moldes">
      <div className="sz-tool-bands">
        <header className="sz-tool-band sz-tool-band--creme">
          <div className="sz-tool-band__inner">
            <div className="sz-tool-header">
              <div className="sz-tool-header__lead">
                <button
                  type="button"
                  className="sz-tool-back"
                  aria-label="Voltar às bibliotecas"
                  onClick={aoVoltar}
                >
                  <ArrowLeft aria-hidden />
                </button>
                <div>
                  <h1 className="sz-tool-title">Meus moldes</h1>
                  <p className="sz-tool-subtitle">
                    Seus modelos guardados no Molda, prontos para escolher na gaveta do cenário.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--quiet"
                onClick={() =>
                  void aoAbrirCopias().catch((e) =>
                    setErro(e instanceof Error ? e.message : 'Não consegui abrir as cópias'),
                  )
                }
              >
                Cópias guardadas
              </button>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--quiet"
                onClick={carga.recarregar}
                disabled={carga.carregando}
              >
                <RefreshCw aria-hidden />
                Atualizar
              </button>
            </div>
            <div className="sz-tool-toolbar mt-7">
              <label className="sz-tool-search-wrap">
                <Search aria-hidden />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="sz-tool-search"
                  aria-label="Buscar nos meus moldes"
                  placeholder="Buscar nos meus moldes"
                />
              </label>
            </div>
          </div>
        </header>
        <div className="sz-tool-band sz-tool-band--ceu">
          <div className="sz-tool-band__inner">
            {erro ? <p role="alert">{erro}</p> : null}
            {carga.falhou ? (
              <Falhou aoTentar={carga.recarregar} />
            ) : carga.dados === null ? (
              <Chegando />
            ) : lista.length === 0 ? (
              <p>
                {busca
                  ? 'Nenhum molde com esse nome.'
                  : 'Guarde um modelo no Molda para ele aparecer aqui.'}
              </p>
            ) : (
              <ul className="mcn-modelos">
                {lista.map((m) => (
                  <li key={m.id} className="mcn-modelo">
                    <span className="mcn-modelo-foto">
                      <Capa endereco={m.miniatura} reserva={<Box />} />
                    </span>
                    <span className="mcn-modelo-nome" title={m.nome}>
                      {m.nome}
                    </span>
                    <span className="mcn-modelo-detalhe">
                      {new Date(m.atualizadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
