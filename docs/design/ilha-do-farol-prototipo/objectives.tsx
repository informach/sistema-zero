import { AlertCircle, Check, Circle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Note, SceneButton, Talk } from '../farol-antes-depois/shared'
import { World } from './stage'

const lessons = [
  {
    name: 'Uma ilha com profundidade',
    brief: 'Retomada de quadros e movimento; montagem completa dos blocos 3D.',
    goals: [
      'O personagem anda nas duas direções do chão.',
      'O personagem para quando as teclas são soltas.',
      'A chave aparece em um lugar que o personagem consegue alcançar.',
    ],
    hint: 'Confira a altura y da chave e o caminho no chão x/z. Depois rode o jogo de novo.',
  },
  {
    name: 'A chave está ao seu alcance',
    brief:
      'Retomada de coleta e memória; montagem completa, sem repetir a experiência de variável.',
    goals: [
      'A chave sai da cena quando o personagem a recolhe.',
      'A coleta guarda que o personagem tem a chave.',
      'A informação continua guardada depois de se afastar.',
    ],
    hint: 'No encontro com a chave, guarde verdadeiro em temChave. Sair de perto não deve colocar falso.',
  },
  {
    name: 'A luz volta ao farol',
    brief: 'Retomada de se/senão; montagem dos dois caminhos, personalização e entrega.',
    goals: [
      'Sem chave, o farol fica apagado e aparece um aviso.',
      'Com chave, o farol acende e a vitória acontece.',
      'Recomeçar devolve a chave e apaga o farol.',
      'Movimento e coleta continuam funcionando.',
    ],
    hint: 'Confira qual resposta está dentro de então e qual está dentro de senão. Teste primeiro sem a chave.',
  },
]
export function Objectives() {
  const [lesson, setLesson] = useState(0),
    [scenario, setScenario] = useState('correct'),
    [status, setStatus] = useState<'idle' | 'checking' | 'done'>('idle'),
    [sample, setSample] = useState(false),
    [sent, setSent] = useState(false)
  const l = lessons[lesson],
    failure = lesson === 0 ? 2 : lesson === 1 ? 1 : 0
  useEffect(() => {
    if (status !== 'checking') return
    const timer = setTimeout(() => setStatus('done'), 900)
    return () => clearTimeout(timer)
  }, [status])
  const change = (value: string) => {
    setScenario(value)
    setStatus('idle')
    setSent(false)
    setSample(false)
  }
  return (
    <section className="farol-card">
      <span className="ilha-tag">Estúdio · objetivos do projeto</span>
      <h2 className="sz-display ilha-title">Cada aula termina com algo funcionando.</h2>
      <fieldset className="ilha-buttons" aria-label="Aula dos objetivos">
        {lessons.map((item, i) => (
          <SceneButton
            key={item.name}
            tom={lesson === i ? 'ligado' : 'ferramenta'}
            aria-pressed={lesson === i}
            onClick={() => {
              setLesson(i)
              change('correct')
            }}
          >
            Aula {i + 1}
          </SceneButton>
        ))}
      </fieldset>
      <h3 className="ilha-question-title">{l.name}</h3>
      <p>{l.brief}</p>
      <div className="ilha-approval-note">
        <b>Controles de demonstração para aprovação</b>
        <p>
          Escolha um exemplo para visualizar os estados da conferência. Este protótipo não abre nem
          avalia um projeto real do Estúdio.
        </p>
        <label>
          Exemplo{' '}
          <select
            aria-label="Exemplo de projeto"
            value={scenario}
            onChange={(e) => change(e.target.value)}
          >
            <option value="correct">Projeto funcionando</option>
            <option value="error">
              {lesson === 0
                ? 'Chave alta demais'
                : lesson === 1
                  ? 'Coleta sem guardar a informação'
                  : 'Farol acende sem chave'}
            </option>
          </select>
        </label>
      </div>
      <div className="ilha-quiz-grid">
        <div>
          <World
            state={{
              mode: 'game',
              view: 'front',
              hero: {
                x: sample ? (lesson === 2 ? 5.2 : -2) : -6.5,
                z: sample ? (lesson === 2 ? 1 : -3) : 0.75,
              },
              key: { x: -2, y: scenario === 'error' && lesson === 0 ? 3 : 1, z: -3 },
              visible: !sample || lesson === 0,
              light: lesson === 2 && (sample || scenario === 'error'),
            }}
          />
          <div className="ilha-buttons">
            <SceneButton onClick={() => setSample((v) => !v)}>
              {sample ? 'Ver o começo da partida' : 'Ver o exemplo depois do teste'}
            </SceneButton>
          </div>
          <small>
            Vista ilustrativa do caso selecionado. A conferência de produção deverá observar a
            execução real.
          </small>
        </div>
        <div>
          <ul className="ilha-objectives">
            {l.goals.map((goal, i) => {
              const failed = scenario === 'error' && (i === failure || (lesson === 1 && i === 2)),
                checked = status === 'done'
              return (
                <li key={goal} data-status={checked ? (failed ? 'error' : 'ok') : 'pending'}>
                  <span>
                    {checked ? (
                      failed ? (
                        <AlertCircle size={20} />
                      ) : (
                        <Check size={20} />
                      )
                    ) : (
                      <Circle size={18} />
                    )}
                  </span>
                  <div>
                    <strong>{goal}</strong>
                    <small>
                      {checked
                        ? failed
                          ? 'Ainda precisa de ajuste'
                          : 'Cumprido'
                        : status === 'checking'
                          ? 'Conferindo o exemplo…'
                          : 'A conferir'}
                    </small>
                    {checked && failed && <p>{l.hint}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
          <SceneButton
            tom="gesto"
            disabled={status === 'checking'}
            onClick={() => setStatus('checking')}
          >
            {status === 'checking' ? 'Conferindo…' : 'Verificar projeto'}
          </SceneButton>
          {status === 'done' && scenario === 'correct' && (
            <div className="ilha-delivery">
              <Talk text="Os objetivos estão cumpridos. Envie a versão atual do seu jogo para concluir esta aula." />
              <SceneButton tom="gesto" onClick={() => setSent(true)}>
                Enviar meu projeto
              </SceneButton>
              {sent && (
                <Note label="Demonstração local" tone="green">
                  Projeto enviado!{' '}
                  {lesson === 2
                    ? 'Sua ilha está concluída.'
                    : 'Você pode seguir para a próxima aula.'}
                </Note>
              )}
            </div>
          )}
        </div>
      </div>
      <details className="ilha-details">
        <summary>O que estes objetivos devem conferir na implementação</summary>
        <p>
          Observar o jogo em execução, com os objetos e posições atuais. Aceitar outras cores,
          modelos, mensagens e soluções equivalentes. Revalidar depois de editar; conservar as
          regras das aulas anteriores. Um único envio por aula, depois da montagem e das escolhas.
        </p>
      </details>
    </section>
  )
}
