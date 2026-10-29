import { useEstado } from '../estado/contexto'
import { aquarioNoPainel } from '../sistemas/corais-do-recife'

/** O que o aquário mostra no painel do objeto: um peixe por coral replantado no Recife. */
export function Aquario() {
  const corais = useEstado((s) => s.salvamento.recife.corais)
  const { titulo, linhas } = aquarioNoPainel(corais)
  return (
    <section className="arq-aquario" aria-label="Os peixes do aquário">
      <p className="arq-quadro-sub">{titulo}</p>
      <ul>
        {linhas.map((l) => (
          <li key={l.texto} className={l.peixe ? 'veio' : undefined}>
            <span aria-hidden="true">{l.peixe ? '🐠' : '🪸'}</span>
            {l.texto}
          </li>
        ))}
      </ul>
    </section>
  )
}
