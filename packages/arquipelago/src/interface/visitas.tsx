import type { PercursoId } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaFamilia, useFamilia } from '../estado/familia'
import { alturaDaIlha } from '../mundo/medidas'
import {
  CHEGADA_DA_VISITA,
  FALA_DA_VOLTA,
  faixaDaVisita,
  PAINEL_DAS_VISITAS,
  recordesDaFamilia,
  TEXTOS_DAS_VISITAS as T,
  visitaDaCasa,
} from '../sistemas/visitas'

/** Leva o personagem à frente da casa, olhando para ela (na ida e na volta da visita). */
function irParaAFrenteDaCasa(pedidos: ReturnType<typeof useJogo>['pedidos']) {
  const { x, z, olhar } = CHEGADA_DA_VISITA
  pedidos.teleporte = { x, y: alturaDaIlha(x, z) + 1.2, z }
  pedidos.olharPara = olhar
}

const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

/**
 * No resultado de um percurso: o melhor tempo e as estrelas de cada irmão ao lado dos dela
 * (fase3-12). Some sem irmão e com as visitas desligadas; sem a leitura, diz que não carregou.
 */
export function RecordesDaFamilia({ percurso }: { percurso: PercursoId }) {
  const { loja, plataforma } = useJogo()
  const familia = lojaDaFamilia(loja, plataforma)
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
          </li>
        ))}
      </ol>
    </section>
  )
}

/** O painel das visitas (pelo menu): os irmãos e "Ver a casa". */
export function PainelDasVisitas() {
  const { loja, plataforma, pedidos } = useJogo()
  const familia = lojaDaFamilia(loja, plataforma)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DAS_VISITAS)
  const leitura = useFamilia(familia, (s) => s.leitura)
  const carregando = useFamilia(familia, (s) => s.carregando)
  const abrindo = useFamilia(familia, (s) => s.abrindo)
  const [recado, setRecado] = useState<string | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    setRecado(null)
    fechar.current?.focus({ preventScroll: true })
    void familia.getState().carregar()
  }, [aberto, familia])

  if (!aberto) return null
  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-caderno arq-visitas"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-visitas-titulo"
      >
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
                  <span className="arq-quadro-estado">
                    {i.temCasa ? T.comCasa : T.semCasaAinda}
                  </span>
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
                    s.visitar(visitaDaCasa(i, r.casa))
                    s.abrirPainel(null)
                    irParaAFrenteDaCasa(pedidos)
                    s.dizer(faixaDaVisita(i.nome))
                  }}
                >
                  {abrindo === i.perfilId ? T.abrindo : T.verCasa}
                </button>
              </li>
            ))}
          </ul>
        )}
        {recado ? (
          <p role="status" className="arq-aviso atencao">
            {recado}
          </p>
        ) : null}
        <div className="arq-menu-acoes">
          <button
            ref={fechar}
            type="button"
            className="arq-botao leve"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
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
      <span className="arq-pilula">🏡 {faixaDaVisita(visita.nome)}</span>
      <button type="button" className="arq-botao" onClick={() => voltarDaVisita(loja, pedidos)}>
        {T.voltar}
      </button>
    </div>
  )
}
