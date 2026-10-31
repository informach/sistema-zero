import { useEffect, useRef } from 'react'
import { abrirAbertura } from '../estado/abertura'
import { useEstado, useJogo } from '../estado/contexto'
import { EMOJI_DO_BICHO } from '../sistemas/bichos'
import {
  colecaoDeReceitas,
  colecaoDoBosque,
  colecaoDoVale,
  type EstadoDaReceita,
  type EstadoDoBicho,
  paginasDoDiario,
} from '../sistemas/diario'
import { paginasExtras } from '../sistemas/segredos'
import { Pegada } from './pegadas'
import { PedidoDaIlha } from './primeiro-pedido'
import { ReverOsPrimeirosPassos } from './primeiros-passos'
import { ConviteDaSemana } from './tema-da-semana'

export const ICONE_DO_VALE: Record<string, string> = { pegadas: '🐾', fossil: '🦴', filhote: '🦕' }

/** O valor de `painelAberto` do diário. */
export const PAINEL_DO_DIARIO = 'diario'

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Um bicho da coleção do Bosque (o diário e o álbum mostram igual). */
export function Bicho({ b }: { b: EstadoDoBicho }) {
  if (b.estado === 'escondido')
    return (
      <li className="arq-diario-bicho escondido">
        <span className="arq-caderno-icone" aria-hidden="true">
          ❔
        </span>
        <div className="arq-quadro-corpo">
          <b>Ainda escondido</b>
          <span className="arq-quadro-estado">Siga as pegadas no chão do Bosque.</span>
        </div>
      </li>
    )
  return (
    <li className="arq-diario-bicho">
      <span className="arq-caderno-icone" aria-hidden="true">
        {EMOJI_DO_BICHO[b.bicho]}
      </span>
      <div className="arq-quadro-corpo">
        <b>{b.estado === 'adotado' ? `${b.apelido}, o ${b.nome}` : maiuscula(b.nome)}</b>
        <span className="arq-quadro-estado">
          {b.estado === 'adotado' ? 'Mora com você' : 'No cercadinho da Capi'}
        </span>
        <span className="arq-caderno-efeito">{b.pegada}</span>
      </div>
      <Pegada bicho={b.bicho} titulo={`A pegada do ${b.nome}`} />
    </li>
  )
}

/** Uma receita da coleção (o diário e o álbum mostram igual). */
export function Receita({ r }: { r: EstadoDaReceita }) {
  if (r.sabe)
    return (
      <li className="arq-diario-bicho">
        <span className="arq-caderno-icone" aria-hidden="true">
          {r.emoji}
        </span>
        <div className="arq-quadro-corpo">
          <b>{r.nome}</b>
          <span className="arq-quadro-estado">{r.onde}</span>
          <span className="arq-caderno-efeito">{`Precisa de ${r.precisa}.`}</span>
          <span className="arq-caderno-efeito">{r.fonte}</span>
        </div>
      </li>
    )
  return (
    <li className="arq-diario-bicho escondido">
      <span className="arq-caderno-icone" aria-hidden="true">
        ❔
      </span>
      <div className="arq-quadro-corpo">
        <b>{r.nome}</b>
        <span className="arq-quadro-estado">{r.dica}</span>
      </div>
    </li>
  )
}

/**
 * O diário: as páginas do diário da Íris (a do Bosque chega pela Capi, as outras com as ilhas) e
 * a coleção de bichos e pegadas do Bosque. Só lê o salvamento; nada aqui muda o jogo.
 */
export function Diario() {
  const { loja } = useJogo()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_DIARIO)
  const salvamento = useEstado((s) => s.salvamento)
  const fechar = useRef<HTMLButtonElement>(null)

  // O foco vai para o "Voltar ao jogo" (Enter fecha), mas o diário abre mostrando o começo.
  useEffect(() => {
    if (aberto) fechar.current?.focus({ preventScroll: true })
  }, [aberto])

  if (!aberto) return null
  const paginas = paginasDoDiario(salvamento)
  const colecao = colecaoDoBosque(salvamento)
  const abertas = paginas.filter((p) => p.aberta).length
  const conhecidos = colecao.filter((b) => b.estado !== 'escondido').length
  const receitas = colecaoDeReceitas(salvamento)
  const sabidas = receitas.filter((r) => r.sabe).length

  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-caderno arq-diario"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-diario-titulo"
      >
        <h2 id="arq-diario-titulo">Diário</h2>
        <PedidoDaIlha />
        <ConviteDaSemana />
        <section className="arq-caderno-secao" aria-labelledby="arq-diario-paginas">
          <h3 id="arq-diario-paginas" className="arq-menu-titulo">
            {`Páginas do diário da Íris: ${abertas} de ${paginas.length}`}
          </h3>
          <p className="arq-caderno-explica">
            A Íris deixou uma página em cada ilha. Juntas, elas contam por que ela foi embora.
          </p>
          <button
            type="button"
            className="arq-botao leve arq-diario-abertura"
            onClick={() => abrirAbertura(loja, 'rever')}
          >
            Rever a abertura: O Cinza
          </button>
          <ReverOsPrimeirosPassos />
          <ol className="arq-diario-paginas">
            {paginas.map((p) =>
              p.aberta ? (
                <li key={p.ilha} className="arq-diario-pagina aberta">
                  <b>{p.nome}</b>
                  <p>{p.texto}</p>
                  {/* A assinatura da Íris, como nas cartas dela (o título da seção já diz de quem é). */}
                  <span className="arq-diario-assinatura" aria-hidden="true">
                    Í.
                  </span>
                </li>
              ) : (
                <li key={p.ilha} className="arq-diario-pagina">
                  <b>{p.nome}</b>
                  <span>{p.dica}</span>
                </li>
              ),
            )}
          </ol>
          <PaginasExtras segredos={salvamento.segredos} />
        </section>
        <section className="arq-caderno-secao" aria-labelledby="arq-diario-bichos">
          <h3 id="arq-diario-bichos" className="arq-menu-titulo">
            {`Bichos e pegadas do Bosque: ${conhecidos} de ${colecao.length}`}
          </h3>
          <p className="arq-caderno-explica">
            Cada bicho que você acha entra aqui, com o jeito da pegada dele.
          </p>
          <ul className="arq-quadro-lista arq-diario-bichos">
            {colecao.map((b) => (
              <Bicho key={b.bicho} b={b} />
            ))}
          </ul>
        </section>
        <section className="arq-caderno-secao" aria-labelledby="arq-diario-receitas">
          <h3 id="arq-diario-receitas" className="arq-menu-titulo">
            {`Receitas: ${sabidas} de ${receitas.length}`}
          </h3>
          <p className="arq-caderno-explica">
            As receitas que você já sabe fazer. Novas receitas chegam com amizades, coleções e
            festas. Cada pista mostra onde aprender.
          </p>
          <ul className="arq-quadro-lista arq-diario-bichos">
            {receitas.map((r) => (
              <Receita key={r.id} r={r} />
            ))}
          </ul>
        </section>
        <section className="arq-caderno-secao" aria-labelledby="arq-diario-vale">
          <h3 id="arq-diario-vale" className="arq-menu-titulo">
            Descobertas do Vale dos Dinos
          </h3>
          <ul className="arq-quadro-lista arq-diario-bichos">
            {colecaoDoVale(salvamento).map((item) => (
              <li key={item.id} className="arq-diario-bicho">
                <span className="arq-caderno-icone" aria-hidden="true">
                  {ICONE_DO_VALE[item.id] ?? '🥚'}
                </span>
                <div className="arq-quadro-corpo">
                  <b>{item.nome}</b>
                  <span className="arq-quadro-estado">
                    {item.feito ? 'Registrado no diário' : 'Para descobrir'}
                  </span>
                  <span className="arq-caderno-efeito">{item.texto}</span>
                </div>
                {item.id === 'pegadas' && <Pegada bicho="dino" titulo="Pegada de três dedos" />}
              </li>
            ))}
          </ul>
        </section>
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

/** As páginas extras dos baús no alto do vento (§6.28 A39): só as achadas mostram o texto. */
function PaginasExtras({ segredos }: { segredos: number }) {
  const extras = paginasExtras(segredos)
  const achadas = extras.filter((p) => p.achada)
  return (
    <>
      <h4 className="arq-menu-titulo">{`Páginas extras: ${achadas.length} de ${extras.length}`}</h4>
      {achadas.length < extras.length && (
        <p className="arq-caderno-explica">
          A Íris escondeu outras páginas em baús, no alto do vento das ilhas.
        </p>
      )}
      {achadas.length > 0 && (
        <ol className="arq-diario-paginas">
          {achadas.map((p) => (
            <li key={p.id} className="arq-diario-pagina aberta">
              <b>{p.nome}</b>
              <p>{p.texto}</p>
              <span className="arq-diario-assinatura" aria-hidden="true">
                Í.
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
