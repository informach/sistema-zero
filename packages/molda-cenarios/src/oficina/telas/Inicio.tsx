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
import {
  Capa,
  CartaoNovo,
  Chegando,
  DialogoDeApagar,
  DialogoDeNome,
  Falhou,
  useCarga,
} from '../pecas'
import type { Biblioteca, CenariosHost, Espaco, Jogo, Licenca } from '../portas'

type Aba = 'jogos' | 'bibliotecas'
type Janela =
  | { tipo: 'novo-jogo' }
  | { tipo: 'nova-biblioteca' }
  | { tipo: 'nome-do-jogo'; jogo: Jogo }
  | { tipo: 'apagar-jogo'; jogo: Jogo }
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
  aoAbrirJogo,
  aoAbrirBiblioteca,
  cabecalho,
}: {
  host: CenariosHost
  espacos: readonly Espaco[]
  espaco: Espaco
  aoTrocarEspaco(id: string): void
  aba: Aba
  aoTrocarAba(aba: Aba): void
  aoAbrirJogo(id: string): void
  aoAbrirBiblioteca(id: string): void
  cabecalho?: ReactNode
}): JSX.Element {
  const [busca, setBusca] = useState('')
  const [janela, setJanela] = useState<Janela>(null)
  const [licenca, setLicenca] = useState<Licenca>('propria')
  const jogos = useCarga(() => host.listarJogos(espaco.id), [host, espaco.id])
  const bibliotecas = useCarga(() => host.listarBibliotecas(espaco.id), [host, espaco.id])
  const carga = aba === 'jogos' ? jogos : bibliotecas
  const termo = semAcento(busca.trim())

  const jogosVisiveis = useMemo(
    () =>
      (jogos.dados ?? [])
        .filter((j) => !termo || semAcento(j.nome).includes(termo))
        .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [jogos.dados, termo],
  )
  const bibliotecasVisiveis = useMemo(
    () =>
      (bibliotecas.dados ?? [])
        .filter((b) => !termo || semAcento(b.nome).includes(termo))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [bibliotecas.dados, termo],
  )
  const vazio = aba === 'jogos' ? jogos.dados?.length === 0 : bibliotecas.dados?.length === 0

  const cartaoNovo =
    aba === 'jogos' ? (
      <CartaoNovo
        titulo={COPY.inicio.novoJogoTitulo}
        dica={COPY.inicio.novoJogoDica}
        aoCriar={() => setJanela({ tipo: 'novo-jogo' })}
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
                      setJanela({ tipo: aba === 'jogos' ? 'novo-jogo' : 'nova-biblioteca' })
                    }
                  >
                    <Plus aria-hidden="true" />
                    {aba === 'jogos' ? COPY.inicio.criarJogo : COPY.inicio.criarBiblioteca}
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
                      aria-pressed={aba === 'jogos'}
                      onClick={() => aoTrocarAba('jogos')}
                    >
                      <Globe aria-hidden="true" />
                      {COPY.inicio.abaJogos}
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
                    {aba === 'jogos' ? COPY.inicio.semJogos : COPY.inicio.semBibliotecas}
                  </p>
                  <div className="sz-tool-grid">{cartaoNovo}</div>
                </div>
              ) : aba === 'jogos' ? (
                jogosVisiveis.length === 0 ? (
                  <p className="font-semibold text-base text-mld-muted">
                    {COPY.inicio.semResultado}
                  </p>
                ) : (
                  <ul className="sz-tool-grid">
                    {termo ? null : <li className="flex">{cartaoNovo}</li>}
                    {jogosVisiveis.map((jogo) => (
                      <li key={jogo.id} className="sz-tool-card gap-2.5 p-3">
                        <span className="sz-tool-card-title truncate" title={jogo.nome}>
                          {jogo.nome}
                        </span>
                        <button
                          type="button"
                          onClick={() => aoAbrirJogo(jogo.id)}
                          aria-label={`${COPY.jogo.abrir} ${jogo.nome}`}
                          className="sz-tool-cover aspect-[4/3] w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
                        >
                          <Capa endereco={jogo.capa} reserva={<Mapa />} />
                        </button>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-mld-muted text-sm">
                            {plural(jogo.cenarios, 'cenário', 'cenários')}
                          </span>
                          <span className="flex">
                            <IconButton
                              aria-label={`${COPY.jogo.renomear}: ${jogo.nome}`}
                              onClick={() => setJanela({ tipo: 'nome-do-jogo', jogo })}
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                            </IconButton>
                            <IconButton
                              aria-label={`${COPY.jogo.apagar} ${jogo.nome}`}
                              onClick={() => setJanela({ tipo: 'apagar-jogo', jogo })}
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

      {janela?.tipo === 'novo-jogo' ? (
        <DialogoDeNome
          titulo={COPY.inicio.criarJogo}
          inicial={COPY.nome.jogoPadrao}
          acao={COPY.nome.criar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            const jogo = await host.criarJogo(espaco.id, nome)
            aoAbrirJogo(jogo.id)
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
            const biblioteca = await host.criarBiblioteca(espaco.id, { nome, licenca })
            aoAbrirBiblioteca(biblioteca.id)
          }}
        >
          <SeletorDeLicenca valor={licenca} aoMudar={setLicenca} />
        </DialogoDeNome>
      ) : null}
      {janela?.tipo === 'nome-do-jogo' ? (
        <DialogoDeNome
          titulo={COPY.jogo.renomear}
          inicial={janela.jogo.nome}
          acao={COPY.nome.guardar}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async (nome) => {
            await host.editarJogo(janela.jogo.id, { nome })
            jogos.recarregar()
          }}
        />
      ) : null}
      {janela?.tipo === 'apagar-jogo' ? (
        <DialogoDeApagar
          titulo={COPY.jogo.apagarJogoTitulo}
          texto={COPY.jogo.apagarJogoTexto(janela.jogo.nome, janela.jogo.cenarios)}
          aoFechar={() => setJanela(null)}
          aoConfirmar={async () => {
            await host.apagarJogo(janela.jogo.id)
            jogos.recarregar()
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
        aria-label={`${COPY.jogo.abrir} ${biblioteca.nome}`}
        className="sz-tool-cover aspect-[4/3] w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
      >
        <Capa endereco={biblioteca.capa} reserva={<Boxes />} />
      </button>
      <span className="font-semibold text-mld-muted text-sm">
        {COPY.biblioteca.modelos(biblioteca.modelos)}
      </span>
    </li>
  )
}
