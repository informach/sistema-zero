import { useRef, useState } from 'react'
import { apiPost } from '../lib/api-fetch'

const OPCOES = [
  ['sim', 'Sim'],
  ['em_parte', 'Em parte'],
  ['nao_representa', 'Não'],
] as const

/**
 * O fim do resultado em conversa: "Esse resultado parece com você?" (Sim, Em parte, Não) e o link
 * para rever as respostas. A opinião vai para `/api/leads/quiz-feedback`, uma por revisão.
 */
export default function QuizResultadoFeedback({
  revision,
  quizPath,
  sessionToken,
  restartLabel,
}: {
  revision: number
  /** O endereço do quiz com a manchete que a pessoa viu. */
  quizPath: string
  sessionToken: string
  /** Kids: "Responder pensando em outra criança" (abre uma sessão nova no quiz). */
  restartLabel?: string
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
        'Não conseguimos registrar sua opinião. Tente de novo. Se você mudou alguma resposta em outra aba, recarregue o resultado.',
      )
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <section className="rc-opiniao" aria-labelledby="rc-opiniao-titulo">
      <div className="rc-opiniao-linha">
        <h2 id="rc-opiniao-titulo" className="rc-opiniao-titulo">
          Esse resultado parece com você?
        </h2>
        <div className="rc-opiniao-opcoes" role="group" aria-labelledby="rc-opiniao-titulo">
          {OPCOES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="rc-opiniao-botao"
              disabled={busy}
              aria-pressed={feedback === value}
              onClick={() => void respond(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <a className="rc-opiniao-link" href={`${quizPath}#rever`}>
          Rever as respostas
        </a>
      </div>
      <div aria-live="polite">
        {feedback && (
          <p className="rc-opiniao-obrigado">
            Obrigado por contar. Sua opinião ajuda a melhorar estas orientações.
            {feedback !== 'sim' &&
              ' Se alguma resposta ficou diferente do que você quis dizer, dá para ajustar em Rever as respostas.'}
          </p>
        )}
      </div>
      {error && (
        <p className="rc-opiniao-erro" role="alert">
          {error}
        </p>
      )}
      {restartLabel && (
        <a className="rc-opiniao-link" href={`${quizPath}#outra-crianca`}>
          {restartLabel}
        </a>
      )}
    </section>
  )
}
