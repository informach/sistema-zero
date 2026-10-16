import { useRef, useState } from 'react'
import { apiPost } from '../lib/api-fetch'

export default function ComunidadeQuizFeedback({
  revision,
  quizPath,
  sessionToken,
}: {
  revision: number
  /** O endereço do quiz com a manchete que a família viu (`quizPathWithHeadline`). */
  quizPath: string
  sessionToken: string
}) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  async function respond(value: string) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await apiPost('/api/leads/quiz-feedback', { feedback: value, revision, sessionToken })
      setFeedback(value)
    } catch {
      setError(
        'Não conseguimos registrar sua opinião. Tente novamente. Se você alterou respostas em outra aba, recarregue o resultado.',
      )
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  // A sessão da outra criança nasce no próprio quiz (`#outra-crianca`), com a definição do quiz
  // e a manchete; criada aqui, ela ficaria sem as duas e seria trocada por outra ao abrir o quiz.
  const restartHref = `${quizPath}#outra-crianca`
  return (
    <section className="cq-panel cq-reading cq-result-section" aria-labelledby="feedback-title">
      <h2 id="feedback-title" className="kof-display">
        Esse caminho faz sentido para vocês?
      </h2>
      <div className="cq-feedback-options" role="group" aria-labelledby="feedback-title">
        {[
          ['sim', 'Sim'],
          ['em_parte', 'Em parte'],
          ['nao_representa', 'Não'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            aria-pressed={feedback === value}
            onClick={() => void respond(value!)}
          >
            {label}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {feedback && <p>Obrigado por contar. Sua opinião ajuda a melhorar estas sugestões.</p>}
      </div>
      {error && (
        <p className="cq-error" role="alert">
          {error}
        </p>
      )}
      {feedback && feedback !== 'sim' && (
        <div className="cq-prose">
          <h3>Você pode conferir suas respostas</h3>
          <p>
            Se alguma resposta ficou diferente do que você queria dizer, ajuste abaixo. Sua opinião
            continua registrada.
          </p>
          <div className="cq-actions">
            <a className="cq-link" href={`${quizPath}#cena`}>
              A cena mais comum em casa
            </a>
            <a className="cq-link" href={`${quizPath}#sintese`}>
              A frase que mais parece com o que você quer
            </a>
            <a className="cq-link" href={`${quizPath}#garantia`}>
              O que precisa estar garantido
            </a>
          </div>
        </div>
      )}
      <div className="cq-actions">
        <a className="cq-link" href={`${quizPath}#rever`}>
          Rever minhas respostas
        </a>
        <a className="cq-link" href={restartHref}>
          Responder pensando em outra criança
        </a>
      </div>
    </section>
  )
}
