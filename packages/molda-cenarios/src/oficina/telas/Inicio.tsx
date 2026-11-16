import { IconButton } from '@sistemazero/molda/ui'
import {
  Boxes,
  ChevronDown,
  Globe,
  Map as Mapa,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { type JSX, type ReactNode, useMemo, useState } from 'react'
import { COPY, plural, tamanhoLegivel } from '../copy'
import { bibliotecaVivaDoMolda } from '../moldes'
import {
  Capa,
  CartaoNovo,
  Chegando,
  DialogoDeApagar,
  DialogoDeNome,
  Falhou,
  useCarga,
} from '../pecas'
import type { Biblioteca, CenariosHost, Espaco, Licenca, Mundo } from '../portas'

type Aba = 'mundos' | 'bibliotecas'
type Janela =
  | { tipo: 'novo-mundo' }
  | { tipo: 'nova-biblioteca' }
  | { tipo: 'nome-do-mundo'; mundo: Mundo }
  | { tipo: 'apagar-mundo'; mundo: Mundo }
  | null

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function SeletorDeLicenca({
  valor,
  aoMudar,
}: {
  valor: Licenca
  aoMudar(licenca: Licenca): void
}): JSX.Element {
  return (
    <fieldset className="mcn-opcoes">
      <legend>{COPY.biblioteca.licencaRotulo}</legend>
      {(['propria', 'livre', 'restrita'] as const).map((licenca) => (
        <label key={licenca} className="mcn-opcao">
          <input
            type="radio"
            name="licenca"
            checked={valor === licenca}
            onChange={() => aoMudar(licenca)}
          />
          <span>
            <strong>{COPY.biblioteca.licenca[licenca]}</strong>
            <small>{COPY.biblioteca.licencaDica[licenca]}</small>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

export function Inicio({
  host,
  espacos,
  espaco,
  aoTrocarEspaco,
  aba,
  aoTrocarAba,
  aoAbrirMundo,
  aoAbrirBiblioteca,
  cabecalho,
}: {
  host: CenariosHost
  espacos: readonly Espaco[]
  espaco: Espaco
  aoTrocarEspaco(id: string): void
  aba: Aba
  aoTrocarAba(aba: Aba): void
  aoAbrirMundo(id: string): void
  aoAbrirBiblioteca(id: string): void
  cabecalho?: ReactNode
}): JSX.Element {
  const [busca, setBusca] = useState('')
  const [janela, setJanela] = useState<Janela>(null)
  const [licenca, setLicenca] = useState<Licenca>('propria')
  const [descricao, setDescricao] = useState('')
  const mundos = useCarga(() => host.listarMundos(espaco.id), [host, espaco.id])
  const bibliotecas = useCarga(async () => {
    const lista = await host.listarBibliotecas(espaco.id)
    return espaco.tipo === 'conta' && host.molda
      ? [bibliotecaVivaDoMolda(espaco.id), ...lista]
      : lista
  }, [host, espaco.id, espaco.tipo])
  const carga = aba === 'mundos' ? mundos : bibliotecas
  const termo = semAcento(busca.trim())

  const mundosVisiveis = useMemo(
    () =>
      (mundos.dados ?? [])
        .filter((j) => !termo || semAcento(j.nome).includes(termo))
        .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [mundos.dados, termo],
  )
  const bibliotecasVisiveis = useMemo(
    () =>
      (bibliotecas.dados ?? [])
        .filter((b) => !termo || semAcento(b.nome).includes(termo))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [bibliotecas.dados, termo],
  )
  const vazio = aba === 'mundos' ? mundos.dados?.length === 0 : bibliotecas.dados?.length === 0

  const cartaoNovo =
    aba === 'mundos' ? (
      <CartaoNovo
        titulo={COPY.inicio.novoMundoTitulo}
        dica={COPY.inicio.novoMundoDica}
        aoCriar={() => setJanela({ tipo: 'novo-mundo' })}
      />
    ) : (
      <CartaoNovo
        titulo={COPY.inicio.novaBibliotecaTitulo}
        dica={COPY.inicio.novaBibliotecaDica}
        aoCriar={() => setJanela({ tipo: 'nova-biblioteca' })}
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
                  {cabecalho ? <div className="sz-tool-header__nav">{cabecalho}</div> : null}
                  <div className="sz-tool-header__title">
                    <h1 className="sz-tool-title">{COPY.inicio.titulo}</h1>
                    <p className="sz-tool-subtitle">{COPY.inicio.subtitulo}</p>
                  </div>
                </div>
                <div className="sz-tool-header__actions">
                  {espacos.length > 1 ? (
                    <span className="sz-tool-select-wrap">
                      <select
                        className="sz-tool-select"
                        aria-label={COPY.inicio.espacos}
                        value={espaco.id}
                        onChange={(evento) => aoTrocarEspaco(evento.target.value)}
                      >
                        {espacos.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nome}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" />
                    </span>
                  ) : null}
                  <span className="sz-tool-status" title={espaco.nome}>
                    {COPY.inicio.uso(
                      tamanhoLegivel(espaco.usadoBytes),
                      tamanhoLegivel(espaco.limiteBytes),
                    )}
                  </span>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    onClick={() =>
                      setJanela({ tipo: aba === 'mundos' ? 'novo-mundo' : 'nova-biblioteca' })
                    }
                  >
                    <Plus aria-hidden="true" />
                    {aba === 'mundos' ? COPY.inicio.criarMundo : COPY.inicio.criarBiblioteca}
                  </button>
                </div>
              </div>
              <div className="sz-tool-toolbar mt-7">
                <div className="sz-tool-toolbar__start">
                  <fieldset className="sz-tool-chips">
                    <legend className="sr-only">{COPY.inicio.titulo}</legend>
                    <button
                      type="button"
                      className="sz-tool-chip"
                      aria-pressed={aba === 'mundos'}
                      onClick={() => aoTrocarAba('mundos')}
                    >
                      <Globe aria-hidden="true" />
                      {COPY.inicio.abaMundos}
                    </button>
                    <button
                      type="button"
                      className="sz-tool-chip"
                      aria-pressed={aba === 'bibliotecas'}
                      onClick={() => aoTrocarAba('bibliotecas')}
                    >
                      <Boxes aria-hidden="true" />
                      {COPY.inicio.abaBibliotecas}
                    </button>
                  </fieldset>
                </div>
                <div className="sz-tool-toolbar__end">
                  <label className="sz-tool-search-wrap">
                    <Search aria-hidden="true" />
                    <input
                      type="search"
                      autoComplete="off"
                      value={busca}
                      onChange={(evento) => setBusca(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Escape' && busca) {
                          evento.preventDefault()
                          setBusca('')
                        }
                      }}
                      aria-label={COPY.inicio.buscar}
                      placeholder={COPY.inicio.buscar}
                      className="sz-tool-search pr-11"
                    />
                    {busca ? (
                      <button
                        type="button"
                        aria-label={COPY.inicio.limparBusca}
                        onClick={() => setBusca('')}
                        className="absolute right-0 inline-flex size-10 items-center justify-center rounded-full text-mld-muted hover:bg-mld-border/40 hover:text-mld-text"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    ) : null}
                  </label>
                </div>
              </div>
            </div>
          </header>

          <div className="sz-tool-band sz-tool-band--ceu">
            <div className="sz-tool-band__inner">
              {carga.falhou ? (
                <Falhou aoTentar={carga.recarregar} />
              ) : carga.dados === null ? (
                <Chegando />
              ) : vazio ? (
                <div className="flex flex-col gap-6">
                  <p className="font-semibold text-base text-mld-muted">
                    {aba === 'mundos' ? COPY.inicio.semMundos : COPY.inicio.semBibliotecas}
                  </p>
                  <div className="sz-tool-grid">{cartaoNovo}</div>
                </div>
              ) : aba === 'mundos' ? (
                mundosVisiveis.length === 0 ? (
                  <p className="font-semibold text-base text-mld-muted">
                    {COPY.inicio.semResultado}
                  </p>
                ) : (
                  <ul className="sz-tool-grid">
                    {termo ? null : <li className="flex">{cartaoNovo}</li>}
                    {mundosVisiveis.map((mundo) => (
                      <li key={mundo.id} className="sz-tool-card gap-2.5 p-3">
                        <span className="sz-tool-card-title truncate" title={mundo.nome}>
                          {mundo.nome}
                        </span>
                        <button
                          type="button"
                          onClick={() => aoAbrirMundo(mundo.id)}
                          aria-label={`${COPY.mundo.abrir} ${mundo.nome}`}
                          className="sz-tool-cover aspect-[4/3] w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
                        >
                          <Capa endereco={mundo.capa} reserva={<Mapa />} />
                        </button>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-mld-muted text-sm">
                            {plural(mundo.cenarios, 'cenário', 'cenários')}
                          </span>
                          <span className="flex">
                            <IconButton
                              aria-label={`${COPY.mundo.renomear}: ${mundo.nome}`}
                              onClick={() => setJanela({ tipo: 'nome-do-mundo', mundo })}
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                            </IconButton>
                            <IconButton
                              aria-label={`${COPY.mundo.apagar} ${mundo.nome}`}
                              onClick={() => setJanela({ tipo: 'apagar-mundo', mundo })}
                              className="hover:text-mld-danger"
                            >
                              <Trash2 aria-hidden="true" className="size-4" />
                            </IconButton>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : bibliotecasVisiveis.length === 0 ? (
                <p className="font-semibold text-base text-mld-muted">{COPY.inicio.semResultado}</p>
              ) : (
                <ul className="sz-tool-grid">
                  {termo ? null : <li className="flex">{cartaoNovo}</li>}
                  {bibliotecasVisiveis.map((biblioteca) => (
                    <CartaoDaBiblioteca
                      key={biblioteca.id}
                      biblioteca={biblioteca}
                      aoAbrir={() => aoAbrirBiblioteca(biblioteca.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {janela?.tipo === 'novo-mundo' ? (
        <DialogoDeNome
          titulo={COPY.inicio.criarMundo}
          inicial={COPY.nome.mundoPadrao}
          acao={COPY.nome.criar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            const mundo = await host.criarMundo(espaco.id, nome)
            aoAbrirMundo(mundo.id)
          }}
        />
      ) : null}
      {janela?.tipo === 'nova-biblioteca' ? (
        <DialogoDeNome
          titulo={COPY.inicio.criarBiblioteca}
          inicial={COPY.nome.bibliotecaPadrao}
          acao={COPY.nome.criar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            const biblioteca = await host.criarBiblioteca(espaco.id, { nome, licenca, descricao })
            aoAbrirBiblioteca(biblioteca.id)
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
              placeholder="O que você vai guardar nesta biblioteca?"
            />
          </label>
        </DialogoDeNome>
      ) : null}
      {janela?.tipo === 'nome-do-mundo' ? (
        <DialogoDeNome
          titulo={COPY.mundo.renomear}
          inicial={janela.mundo.nome}
          acao={COPY.nome.guardar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            await host.editarMundo(janela.mundo.id, { nome })
            mundos.recarregar()
          }}
        />
      ) : null}
      {janela?.tipo === 'apagar-mundo' ? (
        <DialogoDeApagar
          titulo={COPY.mundo.apagarMundoTitulo}
          texto={COPY.mundo.apagarMundoTexto(janela.mundo.nome, janela.mundo.cenarios)}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async () => {
            await host.apagarMundo(janela.mundo.id)
            mundos.recarregar()
          }}
        />
      ) : null}
    </div>
  )
}

export function CartaoDaBiblioteca({
  biblioteca,
  aoAbrir,
}: {
  biblioteca: Biblioteca
  aoAbrir(): void
}): JSX.Element {
  return (
    <li className="sz-tool-card gap-2.5 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="sz-tool-card-title min-w-0 flex-1 truncate" title={biblioteca.nome}>
          {biblioteca.nome}
        </span>
        <span className="mcn-selo" data-licenca={biblioteca.licenca}>
          {COPY.biblioteca.licenca[biblioteca.licenca]}
        </span>
      </div>
      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`${COPY.mundo.abrir} ${biblioteca.nome}`}
        className="sz-tool-cover aspect-[4/3] w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
      >
        <Capa endereco={biblioteca.capa} reserva={<Boxes />} />
      </button>
      <span className="font-semibold text-mld-muted text-sm">
        {biblioteca.fonte === 'molda'
          ? 'Sempre atualizado com o Molda'
          : COPY.biblioteca.modelos(biblioteca.modelos)}
      </span>
      {biblioteca.descricao ? (
        <p className="line-clamp-2 text-sm text-mld-muted" title={biblioteca.descricao}>
          {biblioteca.descricao}
        </p>
      ) : null}
    </li>
  )
}
