import { useRef, useState } from 'react'
import { apiPost } from '../lib/api-fetch'

export default function ComunidadeQuizFeedback({
  revision,
  basePath,
  funnel,
  sessionToken,
}: {
  revision: number
  basePath: string
  funnel: string
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
  async function restart() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await apiPost('/api/leads', { funnel, restartQuiz: true })
      window.location.assign(`${basePath}/quiz#q1`)
    } catch {
      setError('Não foi possível começar uma nova resposta. Tente novamente.')
      locked.current = false
      setBusy(false)
    }
  }
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
            <a className="cq-link" href={`${basePath}/quiz#q3`}>
              Os interesses do meu filho
            </a>
            <a className="cq-link" href={`${basePath}/quiz#q4`}>
              O que procuro para ele
            </a>
            <a className="cq-link" href={`${basePath}/quiz#q6`}>
              O apoio de que ele precisa
            </a>
          </div>
        </div>
      )}
      <div className="cq-actions">
        <a className="cq-link" href={`${basePath}/quiz#rever`}>
          Rever minhas respostas
        </a>
        <button className="cq-link" type="button" disabled={busy} onClick={() => void restart()}>
          Responder pensando em outro filho
        </button>
      </div>
    </section>
  )
}
