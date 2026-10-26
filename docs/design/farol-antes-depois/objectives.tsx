import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { Check, FlaskConical, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { currentObjectives } from './data'
import { Note, SceneButton, Stage, Talk } from './shared'
export function Objectives({ after }: { after: boolean }) {
  const [step, setStep] = useState(0),
    [checked, setChecked] = useState(false)
  const start = { scene: 'collect-and-remember' as const }
  const [state, setState] = useState(() => openScene(start))
  const next = () => {
    const actions =
      step === 0
        ? [{ type: 'remember-collection', enabled: true }, { type: 'collect-key' }]
        : step === 1
          ? [{ type: 'leave-key' }]
          : [{ type: 'restart-collection' }]
    setState((s) => actions.reduce((r, a) => stepScene(start, r, a as any), s))
    setStep(step + 1)
  }
  const labels = [
    'Faça o personagem andar e permanecer na tela.',
    'Retire a chave quando o personagem a encontrar.',
    'Guarde a coleta até a partida recomeçar.',
    'Sem chave, avise e mantenha o farol apagado.',
    'Com chave, acenda o farol e chame o barco.',
  ]
  return (
    <section className="farol-card">
      <h3 className="sz-display text-2xl font-bold">Objetivos do projeto</h3>
      <p className="farol-muted">
        {after
          ? 'Exemplo de agrupamento das conquistas da montagem final.'
          : 'Lista atual na parte “Acenda o farol com a chave”.'}
      </p>
      <ul className="farol-objectives">
        {(after ? labels : currentObjectives.map((c) => c.label)).map((label, i) => (
          <li key={label}>
            <span>{after && i === 2 && checked ? <Check size={17} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ul>
      {after && (
        <>
          <details className="farol-details">
            <summary>Como a conferência deve funcionar</summary>
            <p>
              Executar os casos no projeto atual: sem seta, quatro direções, bordas, coleta,
              afastamento, reinício e as duas respostas da porta. Os detalhes dos blocos permanecem
              nas dicas. Textos, imagens e posições continuam livres.
            </p>
          </details>
          <div className="farol-observer">
            <span className="farol-eyebrow">Simulação da proposta · observador de memória</span>
            <p className="farol-small">
              Este exemplo usa a cena preparada. Uma implementação no Estúdio deverá ler o valor da
              execução do projeto da pessoa.
            </p>
            <div className="farol-quiz-grid">
              <div>
                <Stage kind="memoria" state={state} />
                <Note label="Valor observado" tone="pink">
                  temChave = {state.collection.hasKey ? 'verdadeiro' : 'falso'}
                </Note>
              </div>
              <div>
                <Talk
                  text={
                    [
                      'Teste a coleta e acompanhe o valor que a regra guarda.',
                      'A coleta guardou verdadeiro. Agora afaste o personagem.',
                      'O valor continuou verdadeiro. Recomece a partida.',
                      'O valor voltou para falso. Agora confira a sequência observada.',
                    ][Math.min(step, 3)]
                  }
                />
                <div className="farol-controls">
                  {step < 3 ? (
                    <SceneButton tom="gesto" onClick={next}>
                      {['Recolher a chave', 'Afastar o personagem', 'Recomeçar a partida'][step]}
                    </SceneButton>
                  ) : (
                    <SceneButton tom="gesto" onClick={() => setChecked(true)}>
                      <FlaskConical size={16} /> Conferir esta simulação
                    </SceneButton>
                  )}
                  <SceneButton
                    onClick={() => {
                      setStep(0)
                      setChecked(false)
                      setState(openScene(start))
                    }}
                  >
                    <RotateCcw size={15} /> Reiniciar teste
                  </SceneButton>
                </div>
                {checked && (
                  <Note label="Sequência conferida na simulação" tone="green">
                    falso → coleta: verdadeiro → afastamento: verdadeiro → reinício: falso
                  </Note>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
