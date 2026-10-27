import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { ArrowRight, Check, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { quizSource } from './data'
import { Note, SceneButton, Stage, Talk } from './shared'
import { EdgeComparison } from './visuals'

/** Only imported by the offline bundle adapter. No learner or server state. */
export function gradePrototypeQuiz(answers: Record<string, string[]>) {
  const questions = quizSource.questions.map((q: any) => ({
    questionId: q.id,
    correct: q.correctChoiceIds[0] === answers[q.id]?.[0],
    correctChoiceIds: q.correctChoiceIds,
    explanation: q.explanation,
  }))
  const score = questions.filter((q: any) => q.correct).length * 25
  return {
    passed: score === 100,
    score,
    passingScore: 100,
    questions,
    attemptsRemaining: null,
    retryAvailableAt: null,
    gamification: null,
  }
}

function QuizScene({
  index,
  phase,
  choice,
}: {
  index: number
  phase: number
  choice: string | null
}) {
  const door = openScene({ scene: 'lighthouse-key' })
  const memory = openScene({ scene: 'collect-and-remember' })
  if (index === 0) {
    return (
      <>
        <EdgeComparison result={phase > 0} correct={choice === 'b'} />
        <Note
          label={phase ? 'Resultado do quadro' : 'Antes do próximo quadro'}
          tone={phase && choice !== 'b' ? 'gold' : 'blue'}
        >
          {phase
            ? choice === 'b'
              ? 'Moveu e depois conferiu o limite. Ficou dentro.'
              : choice === 'a'
                ? 'Conferiu o limite e moveu depois. Passou da borda.'
                : 'O limite só rodou no início. Agora o personagem passou da borda.'
            : 'O personagem está junto à borda da tela.'}
        </Note>
      </>
    )
  }
  if (index === 1) {
    if (phase < 2) {
      const s = phase
        ? stepScene({ scene: 'collect-and-remember' }, memory, { type: 'collect-key' })
        : memory
      return (
        <>
          <Stage kind="memoria" state={s} />
          <Note label="Três efeitos separados" tone="pink">
            {phase
              ? 'Chave retirada · aviso mudou · temChave continua falso'
              : 'A chave ainda está no chão.'}
          </Note>
        </>
      )
    }
    const s = stepScene({ scene: 'lighthouse-key' }, door, { type: 'try-lighthouse-door' })
    return (
      <>
        <Stage kind="porta" state={s} />
        <Note label="O que a porta consultou" tone="pink">
          temChave = falso → avisar que falta a chave
        </Note>
      </>
    )
  }
  if (index === 2) {
    const s = phase
      ? stepScene({ scene: 'lighthouse-key' }, door, { type: 'try-lighthouse-door' })
      : door
    return (
      <>
        <Stage kind="porta" state={s} />
        <Note label={phase ? 'Resposta escolhida' : 'Antes da tentativa'} tone="gold">
          {phase ? 'senão → manter apagado e avisar' : 'Personagem sem chave · temChave = falso'}
        </Note>
      </>
    )
  }
  const hasKey = phase === 0 || choice !== 'b'
  let s = stepScene({ scene: 'lighthouse-key' }, door, { type: 'key-state', hasKey })
  if (phase === 0 || phase >= 2)
    s = stepScene({ scene: 'lighthouse-key' }, s, { type: 'try-lighthouse-door' })
  return (
    <>
      <Stage kind="porta" state={s} />
      <Note
        label={phase ? 'Situação que você testou' : 'O que já foi testado'}
        tone={phase && choice === 'b' ? 'green' : 'gold'}
      >
        {phase
          ? hasKey
            ? 'Com chave novamente: o caso sem chave ainda falta.'
            : 'Partida nova, sem chave: agora o teste sem chave também foi feito.'
          : 'Com chave: o farol acendeu. Falta conferir outra situação.'}
      </Note>
    </>
  )
}

export function ProposedQuiz() {
  const [index, setIndex] = useState(0),
    [choice, setChoice] = useState<string | null>(null),
    [phase, setPhase] = useState(0),
    [running, setRunning] = useState(false),
    [finished, setFinished] = useState(false)
  const explanations = [
    'A cada quadro, o personagem se move primeiro. Depois, o bloco de limite corrige o passo que acabou de acontecer e o mantém dentro da tela.',
    'Fazer a chave sumir e mudar o aviso não guarda a coleta. A ação de guardar precisa colocar verdadeiro em temChave. É essa informação que a porta consulta.',
    'Sem chave, temChave é falso. O jogo segue o senão: mantém o farol apagado e avisa que falta a chave. Com a chave, seguiria o então.',
    'Você testou com a chave. Recomece a partida para testar sem ela. O farol deve continuar apagado e avisar que falta a chave. Assim você compara as duas respostas.',
  ]
  const question = { ...quizSource.questions[index], explanation: explanations[index] }
  const correct = question.correctChoiceIds.includes(choice)
  useEffect(() => {
    if (!running) return
    const a = setTimeout(() => setPhase(1), 100)
    const b = setTimeout(() => {
      setPhase(2)
      setRunning(false)
    }, 1300)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [running])
  const restart = () => {
    setIndex(0)
    setChoice(null)
    setPhase(0)
    setFinished(false)
    setRunning(false)
  }
  if (finished)
    return (
      <section className="farol-card farol-finish">
        <span className="farol-finish-icon">
          <Check size={38} />
        </span>
        <h3 className="sz-display">Você conferiu as quatro regras!</h3>
        <p>Movimento e limite, memória da coleta, decisão da porta e teste numa nova partida.</p>
        <SceneButton tom="gesto" onClick={restart}>
          <RotateCcw size={16} /> Rever o quiz
        </SceneButton>
        <p className="farol-small">Ensaio local: nenhuma nota ou conquista é gravada.</p>
      </section>
    )
  return (
    <section className="farol-card farol-quiz" aria-label="Quiz proposto">
      <div className="farol-quiz-top">
        <span>Pergunta {index + 1} de 4</span>
        <span>
          {Array.from({ length: 4 }, (_, i) => (
            <i key={i} data-done={i < index} />
          ))}
        </span>
      </div>
      <h3 className="sz-display">{question.prompt}</h3>
      <div className="farol-quiz-grid">
        <div className="farol-quiz-scene" aria-live="polite">
          <QuizScene index={index} phase={phase} choice={choice} />
        </div>
        <div>
          <Talk
            text={
              phase === 2
                ? correct
                  ? 'Sua resposta combina com o que aconteceu. Veja o porquê.'
                  : 'Compare sua escolha com a cena. Você pode tentar outra vez.'
                : 'Escolha sua resposta. Depois clique em Ver o que acontece para conferir na cena.'
            }
          />
          <div className="farol-options">
            {question.choices.map((c: any, i: number) => (
              <SceneButton
                key={c.id}
                tom={choice === c.id ? 'ligado' : 'ferramenta'}
                aria-pressed={choice === c.id}
                disabled={phase > 0 || running}
                onClick={() => setChoice(c.id)}
              >
                <span className="farol-letter">{String.fromCharCode(65 + i)}</span>
                {c.label}
              </SceneButton>
            ))}
          </div>
          {phase === 0 && (
            <SceneButton tom="gesto" disabled={!choice || running} onClick={() => setRunning(true)}>
              <Play size={16} />
              {running ? 'Acompanhe a cena…' : 'Ver o que acontece'}
            </SceneButton>
          )}
          {phase === 1 && <p role="status">Acompanhe a regra na cena…</p>}
          {phase === 2 && (
            <div className="farol-quiz-feedback">
              <Note
                label={correct ? 'Resposta conferida' : 'Vamos comparar'}
                tone={correct ? 'green' : 'gold'}
              >
                {question.explanation}
              </Note>
              <SceneButton
                tom="gesto"
                onClick={() => {
                  if (!correct) {
                    setChoice(null)
                    setPhase(0)
                  } else if (index === 3) setFinished(true)
                  else {
                    setIndex(index + 1)
                    setChoice(null)
                    setPhase(0)
                  }
                }}
              >
                {correct
                  ? index === 3
                    ? 'Concluir revisão'
                    : 'Próxima pergunta'
                  : 'Tentar outra resposta'}
                <ArrowRight size={16} />
              </SceneButton>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
