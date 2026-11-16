import { Button, IconButton } from '@sistemazero/molda/ui'
import { ArrowLeft, Boxes, Copy, Map as Mapa, Pencil, Plus, Trash2 } from 'lucide-react'
import { type JSX, useState } from 'react'
import { COPY, plural } from '../copy'
import { bibliotecaVivaDoMolda } from '../moldes'
import {
  Capa,
  CartaoNovo,
  Chegando,
  Dialogo,
  DialogoDeApagar,
  DialogoDeNome,
  Falhou,
  useCarga,
} from '../pecas'
import type { Biblioteca, CenariosHost, Mundo as MundoDoHost, ResumoDeCenario } from '../portas'

type Janela =
  | { tipo: 'novo' }
  | { tipo: 'nome' }
  | { tipo: 'apagar'; cenario: ResumoDeCenario }
  | { tipo: 'bibliotecas' }
  | null

export function EscolherBibliotecas({
  host,
  mundo,
  aoFechar,
  aoGuardar,
}: {
  host: CenariosHost
  mundo: MundoDoHost
  aoFechar(): void
  aoGuardar(): void
}): JSX.Element {
  const bibliotecas = useCarga(() => host.listarBibliotecas(mundo.espacoId), [host, mundo.espacoId])
  const [escolhidas, setEscolhidas] = useState(() => new Set(mundo.bibliotecas))
  const [ocupado, setOcupado] = useState(false)
  const alternar = (id: string) =>
    setEscolhidas((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  return (
    <Dialogo titulo={COPY.mundo.escolherTitulo} aoFechar={aoFechar}>
      <p className="text-mld-muted text-sm">{COPY.mundo.bibliotecasDica}</p>
      <div className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto">
        {bibliotecas.falhou ? (
          <Falhou aoTentar={bibliotecas.recarregar} />
        ) : bibliotecas.dados === null ? (
          <Chegando />
        ) : bibliotecas.dados.length === 0 ? (
          <p className="font-semibold text-mld-muted text-sm">
            {COPY.mundo.semBibliotecasNoEspaco}
          </p>
        ) : (
          bibliotecas.dados.map((biblioteca) => (
            <label key={biblioteca.id} className="mcn-opcao">
              <input
                type="checkbox"
                checked={escolhidas.has(biblioteca.id)}
                onChange={() => alternar(biblioteca.id)}
              />
              <span>
                <strong>{biblioteca.nome}</strong>
                <small>{COPY.biblioteca.modelos(biblioteca.modelos)}</small>
              </span>
            </label>
          ))
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={aoFechar} disabled={ocupado}>
          {COPY.nome.cancelar}
        </Button>
        <Button
          variant="primary"
          disabled={ocupado || bibliotecas.dados === null}
          onClick={async () => {
            setOcupado(true)
            try {
              await host.editarMundo(mundo.id, { bibliotecas: [...escolhidas] })
              aoGuardar()
              aoFechar()
            } finally {
              setOcupado(false)
            }
          }}
        >
          {COPY.nome.guardar}
        </Button>
      </div>
    </Dialogo>
  )
}

export function Mundo({
  host,
  mundoId,
  espacoId,
  aoVoltar,
  aoAbrirCenario,
  aoAbrirBiblioteca,
  moldesDisponiveis = false,
}: {
  host: CenariosHost
  mundoId: string
  espacoId: string
  aoVoltar(): void
  aoAbrirCenario(id: string): void
  aoAbrirBiblioteca(id: string): void
  moldesDisponiveis?: boolean
}): JSX.Element {
  const [janela, setJanela] = useState<Janela>(null)
  const dados = useCarga(async () => {
    const [mundos, cenarios, bibliotecas] = await Promise.all([
      host.listarMundos(espacoId),
      host.listarCenarios(mundoId),
      host.listarBibliotecas(espacoId),
    ])
    const mundo = mundos.find((j) => j.id === mundoId)
    if (!mundo) throw new Error('O mundo não existe mais')
    return { mundo, cenarios, bibliotecas }
  }, [host, espacoId, mundoId])

  const mundo = dados.dados?.mundo
  const cenarios = [...(dados.dados?.cenarios ?? [])].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }),
  )
  const ligadas: Biblioteca[] = [
    ...(moldesDisponiveis ? [bibliotecaVivaDoMolda(espacoId)] : []),
    ...(dados.dados?.bibliotecas ?? []).filter((b) => mundo?.bibliotecas.includes(b.id)),
  ]
  const cartaoNovo = (
    <CartaoNovo
      titulo={COPY.mundo.novoCenarioTitulo}
      dica={COPY.mundo.novoCenarioDica}
      aoCriar={() => setJanela({ tipo: 'novo' })}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
                      aria-label={COPY.mundo.voltar}
                      title={COPY.mundo.voltar}
                    >
                      <ArrowLeft aria-hidden="true" />
                    </button>
                  </div>
                  <div className="sz-tool-header__title">
                    <h1 className="sz-tool-title">{mundo?.nome ?? ' '}</h1>
                    <p className="sz-tool-subtitle">
                      {mundo ? plural(cenarios.length, 'cenário', 'cenários') : ' '}
                    </p>
                  </div>
                </div>
                <div className="sz-tool-header__actions">
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={!mundo}
                    onClick={() => setJanela({ tipo: 'nome' })}
                  >
                    <Pencil aria-hidden="true" />
                    {COPY.mundo.renomear}
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    disabled={!mundo}
                    onClick={() => setJanela({ tipo: 'novo' })}
                  >
                    <Plus aria-hidden="true" />
                    {COPY.mundo.criarCenario}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="sz-tool-band sz-tool-band--ceu">
            <div className="sz-tool-band__inner">
              {dados.falhou ? (
                <Falhou aoTentar={dados.recarregar} />
              ) : !mundo ? (
                <Chegando />
              ) : (
                <>
                  <h2 className="sz-tool-section-title">{COPY.mundo.cenarios}</h2>
                  {cenarios.length === 0 ? (
                    <p className="mt-2 mb-5 font-semibold text-base text-mld-muted">
                      {COPY.mundo.semCenarios}
                    </p>
                  ) : null}
                  <ul className="sz-tool-grid mt-4">
                    <li className="flex">{cartaoNovo}</li>
                    {cenarios.map((cenario) => (
                      <li key={cenario.id} className="sz-tool-card gap-2.5 p-3">
                        <span className="sz-tool-card-title truncate" title={cenario.nome}>
                          {cenario.nome}
                        </span>
                        <button
                          type="button"
                          onClick={() => aoAbrirCenario(cenario.id)}
                          aria-label={`${COPY.mundo.abrir} ${cenario.nome}`}
                          className="sz-tool-cover aspect-[4/3] w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
                        >
                          <Capa endereco={cenario.capa} reserva={<Mapa />} />
                        </button>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            aria-label={`${COPY.mundo.duplicar}: ${cenario.nome}`}
                            onClick={async () => {
                              await host.duplicarCenario(cenario.id)
                              dados.recarregar()
                            }}
                          >
                            <Copy aria-hidden="true" className="size-4" />
                          </IconButton>
                          <IconButton
                            aria-label={`${COPY.mundo.apagar} ${cenario.nome}`}
                            onClick={() => setJanela({ tipo: 'apagar', cenario })}
                            className="hover:text-mld-danger"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </IconButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          {mundo ? (
            <div className="sz-tool-band sz-tool-band--lilas">
              <div className="sz-tool-band__inner">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="sz-tool-section-title">{COPY.mundo.bibliotecas}</h2>
                    <p className="sz-tool-section-text">{COPY.mundo.bibliotecasDica}</p>
                  </div>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--creme"
                    onClick={() => setJanela({ tipo: 'bibliotecas' })}
                  >
                    <Boxes aria-hidden="true" />
                    {COPY.mundo.escolherBibliotecas}
                  </button>
                </div>
                {ligadas.length === 0 ? (
                  <p className="mt-4 font-semibold text-base text-mld-muted">
                    {COPY.mundo.semBibliotecas}
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {ligadas.map((biblioteca) => (
                      <li key={biblioteca.id}>
                        <button
                          type="button"
                          className="sz-tool-pill sz-tool-pill--outline"
                          onClick={() => aoAbrirBiblioteca(biblioteca.id)}
                        >
                          <Boxes aria-hidden="true" />
                          {biblioteca.nome}
                          {biblioteca.fonte === 'molda' ? null : (
                            <span className="font-semibold text-mld-muted">
                              {biblioteca.modelos}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {janela?.tipo === 'novo' && mundo ? (
        <DialogoDeNome
          titulo={COPY.mundo.criarCenario}
          inicial={`Fase ${cenarios.length + 1}`}
          acao={COPY.nome.criar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            const cenario = await host.criarCenario(mundo.id, nome)
            aoAbrirCenario(cenario.id)
          }}
        />
      ) : null}
      {janela?.tipo === 'nome' && mundo ? (
        <DialogoDeNome
          titulo={COPY.mundo.renomear}
          inicial={mundo.nome}
          acao={COPY.nome.guardar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            await host.editarMundo(mundo.id, { nome })
            dados.recarregar()
          }}
        />
      ) : null}
      {janela?.tipo === 'apagar' ? (
        <DialogoDeApagar
          titulo={COPY.mundo.apagarCenarioTitulo}
          texto={COPY.mundo.apagarCenarioTexto(janela.cenario.nome)}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async () => {
            await host.apagarCenario(janela.cenario.id)
            dados.recarregar()
          }}
        />
      ) : null}
      {janela?.tipo === 'bibliotecas' && mundo ? (
        <EscolherBibliotecas
          host={host}
          mundo={mundo}
          aoFechar={() => setJanela(null)}
          aoGuardar={dados.recarregar}
        />
      ) : null}
    </div>
  )
}
