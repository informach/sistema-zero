import { useEstado } from '../estado/contexto'
import { fosseisDoAlbum } from '../sistemas/album'
import { colecaoDoVale } from '../sistemas/diario'
import { TEXTOS_DOS_FOSSEIS } from '../sistemas/fosseis'
import { ICONE_DO_VALE } from './diario'
import { MINIATURA_DO_FOSSIL } from './miniaturas-do-vale'

/** O que o museu dos fósseis mostra no painel do objeto: as descobertas do Vale dos Dinos. */
export function Museu() {
  const salvamento = useEstado((s) => s.salvamento)
  const colecao = colecaoDoVale(salvamento)
  const feitas = colecao.filter((i) => i.feito).length
  const fosseis = fosseisDoAlbum(salvamento)
  return (
    <section className="arq-museu" aria-label="As descobertas do Vale no museu">
      <p className="arq-quadro-sub">{`${feitas} de ${colecao.length} descobertas do Vale dos Dinos`}</p>
      <ul>
        {colecao.map((i) => (
          <li key={i.id} className={i.feito ? 'veio' : undefined}>
            <strong>
              <span aria-hidden="true">{i.feito ? (ICONE_DO_VALE[i.id] ?? '🥚') : '❔'}</span>
              {i.nome}
            </strong>
            {i.texto}
          </li>
        ))}
      </ul>
      <p className="arq-quadro-sub">{`${fosseis.conta.tem} de ${fosseis.conta.total} fósseis na vitrine`}</p>
      <ul>
        {fosseis.itens.map((f) => (
          <li key={f.id} className={f.encontrado ? 'veio' : undefined}>
            <strong>
              <img
                className={`arq-album-miniatura${f.encontrado ? '' : ' silhueta'}`}
                src={MINIATURA_DO_FOSSIL[f.id]}
                alt=""
                draggable={false}
              />
              {f.nome}
            </strong>
            {f.encontrado ? TEXTOS_DOS_FOSSEIS.noMuseu : f.dica}
          </li>
        ))}
      </ul>
    </section>
  )
}
