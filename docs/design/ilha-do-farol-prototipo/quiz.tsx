import { useEffect, useState } from 'react'
import { Note, SceneButton, Talk } from '../farol-antes-depois/shared'
import { World, type WorldState } from './stage'

const questions = [
  {
    title: 'A chave estava atrás da pedra. Você olhou de lado. O que mudou?',
    choices: ['A chave andou sozinha.', 'Mudou o ponto de vista.', 'A pedra saiu da ilha.'],
    answer: 1,
    why: 'A chave e a pedra ficaram no mesmo lugar. Olhar de lado revelou o que estava encoberto.',
    before: { mode: 'view', view: 'front', key: { x: -2, y: 1, z: -3 } },
    after: { mode: 'view', view: 'side', key: { x: -2, y: 1, z: -3 } },
  },
  {
    title: 'Você quer mudar o lugar da chave no chão, mantendo a altura. Qual teste faz isso?',
    choices: ['Mudar o x e manter o y.', 'Mudar apenas o y.', 'Trocar o ponto de vista.'],
    answer: 0,
    why: 'O x muda uma direção do chão. A altura continuou igual porque o y não mudou.',
    before: { mode: 'position', view: 'side', key: { x: -2, y: 1, z: -3 }, axes: true },
    after: { mode: 'position', view: 'side', key: { x: 3, y: 1, z: -3 }, axes: true },
  },
  {
    title: 'Vista de cima, a chave parece estar sobre o personagem. Eles já estão encostando?',
    choices: [
      'Sim: basta aparecerem no mesmo lugar da imagem.',
      'Ainda não sabemos: precisamos conferir a altura.',
      'Sim: toda chave é recolhida automaticamente.',
    ],
    answer: 1,
    why: 'De lado, aparece a separação na altura. A chave está acima do alcance do personagem.',
    before: { mode: 'contact', view: 'top', key: { x: 0, y: 3, z: 1 }, hero: { x: 0, z: 1 } },
    after: {
      mode: 'contact',
      view: 'side',
      key: { x: 0, y: 3, z: 1 },
      hero: { x: 0, z: 1 },
      bounds: true,
    },
  },
  {
    title: 'Você mudou a chave de lugar. Qual teste ajuda a saber se a nova posição funciona?',
    choices: [
      'Conferir só se a chave está bonita.',
      'Só trocar a cor do personagem.',
      'Ir até ela e conferir o encontro.',
    ],
    answer: 2,
    why: 'A nova posição precisa ser alcançável. Aqui o personagem chega à chave e as áreas se encontram. Depois, no seu jogo, teste também o farol sem e com a chave.',
    before: { mode: 'contact', view: 'side', key: { x: 2, y: 1, z: 1 }, hero: { x: -2, z: 1 } },
    after: {
      mode: 'contact',
      view: 'side',
      key: { x: 2, y: 1, z: 1 },
      hero: { x: 2, z: 1 },
      bounds: true,
    },
  },
] satisfies {
  title: string
  choices: string[]
  answer: number
  why: string
  before: WorldState
  after: WorldState
}[]
export function Quiz() {
  const [index, setIndex] = useState(0),
    [choice, choose] = useState<number | null>(null),
    [phase, setPhase] = useState(0),
    [finished, finish] = useState(false)
  const q = questions[index],
    correct = choice === q.answer
  useEffect(() => {
    if (phase !== 1) return
    const timer = setTimeout(() => setPhase(2), 1400)
    return () => clearTimeout(timer)
  }, [phase])
  const restart = () => {
    setIndex(0)
    choose(null)
    setPhase(0)
    finish(false)
  }
  if (finished)
    return (
      <section className="farol-card ilha-finish">
        <span className="ilha-tag">Revisão concluída</span>
        <h2 className="sz-display">Agora você enxerga a ilha de outro jeito.</h2>
        <p>Você comparou pontos de vista, posição no chão, altura e contato entre objetos.</p>
        <Talk text="Leve essas descobertas para o seu jogo. Confira os objetivos e envie a versão que você construiu." />
        <SceneButton tom="gesto" onClick={restart}>
          Explorar o quiz novamente
        </SceneButton>
        <p className="ilha-free">O curso termina com o jogo concluído e entregue.</p>
      </section>
    )
  return (
    <section className="farol-card">
      <div className="ilha-row">
        <span className="ilha-tag">
          Revisão · pergunta {index + 1} de {questions.length}
        </span>
        <button type="button" className="ilha-text-button" onClick={restart}>
          Recomeçar quiz
        </button>
      </div>
      <h2 className="sz-display ilha-title">O que acontece nesta ilha?</h2>
      <Talk text="Observe a cena, escolha uma resposta e veja o teste. Se precisar, tente outra vez." />
      <div className="ilha-quiz-grid">
        <div>
          <World state={phase ? q.after : q.before} />
          <Note label={phase ? 'O teste acontecendo' : 'Antes do teste'}>
            {phase ? q.why : 'Observe o lugar dos objetos antes de responder.'}
          </Note>
          <small>Prévia de autoria: correção local, sem registrar nota ou progresso.</small>
        </div>
        <div>
          <h3 className="ilha-question-title">{q.title}</h3>
          <div role="radiogroup" aria-label="Respostas" className="ilha-answers">
            {q.choices.map((answer, i) => (
              <label key={answer} data-selected={choice === i}>
                <input
                  type="radio"
                  name="answer"
                  checked={choice === i}
                  disabled={phase > 0}
                  onChange={() => choose(i)}
                />
                <span>{answer}</span>
              </label>
            ))}
          </div>
          {phase === 0 ? (
            <SceneButton tom="gesto" disabled={choice === null} onClick={() => setPhase(1)}>
              Ver o que acontece
            </SceneButton>
          ) : (
            <>
              <div role="status" className="ilha-feedback" data-correct={correct}>
                {phase === 1
                  ? 'Observe a mudança na cena…'
                  : correct
                    ? 'Isso mesmo! Você acertou.'
                    : 'Veja o resultado e compare com a sua resposta.'}
              </div>
              <p>{q.why}</p>
              <div className="ilha-buttons">
                <SceneButton
                  tom="gesto"
                  disabled={phase === 1}
                  onClick={() => {
                    if (!correct) {
                      choose(null)
                      setPhase(0)
                    } else if (index === questions.length - 1) finish(true)
                    else {
                      setIndex(index + 1)
                      choose(null)
                      setPhase(0)
                    }
                  }}
                >
                  {correct
                    ? index === questions.length - 1
                      ? 'Concluir revisão'
                      : 'Próxima pergunta'
                    : 'Tentar outra resposta'}
                </SceneButton>
                <SceneButton
                  disabled={phase === 1}
                  onClick={() => {
                    setPhase(0)
                    choose(null)
                  }}
                >
                  Ver a cena inicial
                </SceneButton>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
