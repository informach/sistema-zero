import type { PercursoId } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { irParaAFrenteDaCasa } from '../estado/chegada-da-visita'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaFamilia, useFamilia } from '../estado/familia'
import { lojaDosFantasmas } from '../estado/fantasmas'
import {
  FALA_DA_VOLTA,
  faixaDaVisita,
  falaDaChegada,
  PAINEL_DAS_VISITAS,
  recordesDaFamilia,
  TEXTOS_DAS_VISITAS as T,
  visitaDaCasa,
  visitaDaCasaDeAmigo,
} from '../sistemas/visitas'
import { AvisoDoFantasma } from './fantasmas'
import { JanelaDoPainel, useFecharPainel, useNoMenu } from './janela-do-painel'

const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

/**
 * No resultado de um percurso: o melhor tempo e as estrelas de cada irmão ao lado dos dela
 * (fase3-12). Some sem irmão e com as visitas desligadas; sem a leitura, diz que não carregou.
 */
export function RecordesDaFamilia({ percurso }: { percurso: PercursoId }) {
  const { loja, plataforma, fila } = useJogo()
  const familia = lojaDaFamilia(loja, plataforma)
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  const leitura = useFamilia(familia, (s) => s.leitura)
  const carregando = useFamilia(familia, (s) => s.carregando)
  const meu = useEstado((s) => s.salvamento.percursos[percurso])
  // Cada resultado relê: os responsáveis podem ter desligado as visitas.
  useEffect(() => {
    void familia.getState().carregar()
  }, [familia])
  if (leitura === null || (carregando && leitura.tipo !== 'ok'))
    return (
      <p className="arq-recordes-recado" role="status">
        {T.recordesCarregando}
      </p>
    )
  if (leitura.tipo === 'fora-do-ar')
    return (
      <p className="arq-recordes-recado" role="status">
        {T.recordesForaDoAr}
      </p>
    )
  if (leitura.tipo === 'desligado' || leitura.irmaos.length === 0) return null
  const linhas = recordesDaFamilia(percurso, meu, leitura.irmaos)
  return (
    <section className="arq-recordes" aria-labelledby="arq-recordes-titulo">
      <h3 id="arq-recordes-titulo" className="arq-menu-titulo">
        {T.recordesTitulo}
      </h3>
      <ol>
        {linhas.map((l) => (
          <li key={l.id} className={l.ehVoce ? 'voce' : undefined}>
            <b>{l.nome}</b>
            <span className="arq-recordes-estrelas" aria-hidden="true">
              {estrelas(l.estrelas)}
            </span>
            <span className="arq-sr">{`${l.estrelas} de 3 estrelas`}</span>
            <span className="arq-recordes-tempo">{l.tempo ?? T.aindaNaoCorreu}</span>
            {!l.ehVoce && l.tempo && (
              <button
                type="button"
                className="arq-botao leve"
                onClick={() => {
                  const irmao = leitura.irmaos.find((i) => i.perfilId === l.id)
                  if (irmao) void fantasmas.escolher(irmao, percurso)
                }}
              >
                Seguir trajeto de {l.nome}
              </button>
            )}
          </li>
        ))}
      </ol>
      <AvisoDoFantasma />
    </section>
  )
}

/** O painel das visitas (pelo menu): os irmãos e "Ver a casa". */
export function PainelDasVisitas() {
  const { loja, plataforma, pedidos } = useJogo()
  const fecharPainel = useFecharPainel()
  const familia = lojaDaFamilia(loja, plataforma)
  const noMenu = useNoMenu()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DAS_VISITAS) || noMenu
  const leitura = useFamilia(familia, (s) => s.leitura)
  const carregando = useFamilia(familia, (s) => s.carregando)
  const abrindo = useFamilia(familia, (s) => s.abrindo)
  const [recado, setRecado] = useState<string | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)

  const amigos = useFamilia(familia, (s) => s.amigos)
  useEffect(() => {
    if (!aberto) return
    setRecado(null)
    fechar.current?.focus({ preventScroll: true })
    void familia.getState().carregar()
    void familia.getState().carregarAmigos()
  }, [aberto, familia])

  if (!aberto) return null
  return (
    <JanelaDoPainel classes="arq-quadro arq-caderno arq-visitas" rotulo="arq-visitas-titulo">
      <h2 id="arq-visitas-titulo">{T.titulo}</h2>
      <p className="arq-quadro-sub">{T.explica}</p>
      {leitura === null || (carregando && leitura.tipo !== 'ok') ? (
        <p role="status" className="arq-quadro-sub">
          {T.carregando}
        </p>
      ) : leitura.tipo === 'fora-do-ar' ? (
        <div className="arq-quadro-erro">
          <p className="arq-aviso atencao">{T.foraDoAr}</p>
          <button
            type="button"
            className="arq-botao leve"
            disabled={carregando}
            onClick={() => void familia.getState().carregar()}
          >
            {T.tentarDeNovo}
          </button>
        </div>
      ) : leitura.tipo === 'desligado' ? (
        <p className="arq-aviso atencao">{T.desligadas}</p>
      ) : leitura.irmaos.length === 0 ? (
        <p className="arq-quadro-sub">{T.ninguem}</p>
      ) : (
        <ul className="arq-quadro-lista arq-visitas-lista">
          {leitura.irmaos.map((i) => (
            <li key={i.perfilId} className="arq-quadro-cartao">
              <span className="arq-quadro-numero" aria-hidden="true">
                🏡
              </span>
              <div className="arq-quadro-corpo">
                <b>{i.nome}</b>
                <span className="arq-quadro-estado">{i.temCasa ? T.comCasa : T.semCasaAinda}</span>
              </div>
              <button
                type="button"
                className="arq-botao"
                disabled={abrindo !== null}
                aria-label={`${T.verCasa} de ${i.nome}`}
                onClick={async () => {
                  setRecado(null)
                  const r = await familia.getState().abrirCasa(i)
                  if (r.tipo !== 'ok') {
                    setRecado(r.tipo === 'desligado' ? T.desligadas : T.casaNaoAbriu)
                    return
                  }
                  const s = loja.getState()
                  const visita = visitaDaCasa(i, r.casa)
                  s.visitar(visita)
                  s.abrirPainel(null)
                  irParaAFrenteDaCasa(pedidos)
                  s.dizer(falaDaChegada(visita))
                }}
              >
                {abrindo === i.perfilId ? T.abrindo : T.verCasa}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="arq-visitas-subtitulo">{T.amigosTitulo}</h3>
      {amigos === null ? (
        <p role="status" className="arq-quadro-sub">
          {T.carregando}
        </p>
      ) : amigos.tipo === 'fora-do-ar' ? (
        <p className="arq-aviso atencao">{T.amigosForaDoAr}</p>
      ) : amigos.tipo === 'desligado' ? (
        <p className="arq-quadro-sub">{T.amigosDesligadas}</p>
      ) : amigos.casas.length === 0 ? (
        <p className="arq-quadro-sub">{T.amigosNenhuma}</p>
      ) : (
        <>
          <p className="arq-quadro-sub">{T.amigosExplica}</p>
          <ul className="arq-quadro-lista arq-visitas-lista">
            {amigos.casas.map((c) => (
              <li key={c.id} className="arq-quadro-cartao">
                <span className="arq-quadro-numero" aria-hidden="true">
                  🏠
                </span>
                <div className="arq-quadro-corpo">
                  <b>{c.apelido}</b>
                </div>
                <button
                  type="button"
                  className="arq-botao"
                  disabled={abrindo !== null}
                  aria-label={`${T.verCasa}: ${c.apelido}`}
                  onClick={async () => {
                    setRecado(null)
                    const r = await familia.getState().abrirCasaDeAmigo(c.id)
                    if (r.tipo !== 'ok') {
                      setRecado(r.tipo === 'desligado' ? T.amigosDesligadas : T.casaNaoAbriu)
                      return
                    }
                    const s = loja.getState()
                    const visita = visitaDaCasaDeAmigo(r.casa)
                    s.visitar(visita)
                    s.abrirPainel(null)
                    irParaAFrenteDaCasa(pedidos)
                    s.dizer(falaDaChegada(visita))
                  }}
                >
                  {abrindo === c.id ? T.abrindo : T.verCasa}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {recado ? (
        <p role="status" className="arq-aviso atencao">
          {recado}
        </p>
      ) : null}
      <div className="arq-menu-acoes">
        <button ref={fechar} type="button" className="arq-botao leve" onClick={fecharPainel}>
          Voltar ao jogo
        </button>
      </div>
    </JanelaDoPainel>
  )
}

/** Volta da visita para a casa dela (a faixa e o menu usam). */
export function voltarDaVisita(
  loja: ReturnType<typeof useJogo>['loja'],
  pedidos: ReturnType<typeof useJogo>['pedidos'],
) {
  const s = loja.getState()
  if (!s.visita) return
  s.visitar(null)
  irParaAFrenteDaCasa(pedidos)
  s.dizer(FALA_DA_VOLTA)
}

/** No alto, durante a visita: de quem é a casa e "Voltar para a minha casa". */
export function FaixaDaVisita() {
  const { loja, pedidos } = useJogo()
  const visita = useEstado((s) => s.visita)
  if (!visita) return null
  return (
    <div className="arq-visita-faixa" role="status">
      <span className="arq-pilula">🏡 {faixaDaVisita(visita.nome, visita.origem)}</span>
      <button type="button" className="arq-botao" onClick={() => voltarDaVisita(loja, pedidos)}>
        {T.voltar}
      </button>
    </div>
  )
}
