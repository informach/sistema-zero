import { useEstado } from '../estado/contexto'
import { colecaoDoVale } from '../sistemas/diario'
import { ICONE_DO_VALE } from './diario'

/** O que o museu dos fósseis mostra no painel do objeto: as descobertas do Vale dos Dinos. */
export function Museu() {
  const salvamento = useEstado((s) => s.salvamento)
  const colecao = colecaoDoVale(salvamento)
  const feitas = colecao.filter((i) => i.feito).length
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
    </section>
  )
}
