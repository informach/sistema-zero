import { evaluateLearning, publicInteractiveBlock } from '@sistemazero/core/learning'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonPreviewProvider } from '@sistemazero/member-shell/components/lesson-preview-context'
import { SceneActivityView } from '@sistemazero/member-shell/components/scene-activity'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import { ArrowRight, Compass, Lightbulb, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { items, type Part, source } from './data'
import { ProposedGarden } from './experiences'
import { SceneButton } from './shared'

function Before({ part }: { part: Part }) {
  const privateContent = source(part),
    content = publicInteractiveBlock(privateContent)
  return (
    <SceneActivityView
      block={{ id: `before-${part}`, kind: 'interactive', sortOrder: 0, content } as any}
      content={content}
      activity={content.activity as any}
      previewContent={privateContent}
    />
  )
}
function After({ part }: { part: Part; active: boolean }) {
  return <ProposedGarden part={part} />
}
function App() {
  const [part, setPart] = useState<Part>('touch'),
    [after, setAfter] = useState(false),
    [reset, setReset] = useState(0)
  const item = items.find((i) => i.id === part)!
  const rehearsal = {
    answers: {},
    hintsUsed: {},
    results: {},
    workspaces: {},
    onWorkspaceChange: () => {},
    onProjectCheck: async () => '',
    onChange: () => {},
    onAttempt: async (_id: any, b: any, a: any) => evaluateLearning(b, a),
    onQuiz: async () => {},
  }
  return (
    <LessonCopyProvider value={KIDS_LESSON_COPY}>
      <LessonPreviewProvider value={rehearsal}>
        <main className="farol-page sz-lesson-sections">
          <header className="farol-hero">
            <div className="farol-brand">
              <Compass size={20} />
              <span>Ateliê de aulas</span>
              <span className="farol-prototype-label">Protótipo interativo</span>
            </div>
            <h1 className="sz-display">Cadê Todo Mundo?</h1>
            <p>As mesmas ideias, com liberdade para experimentar desde o começo.</p>
            <div className="farol-hero-bottom">
              <span>Compare, experimente e veja cada mudança.</span>
              <label>
                Tema{' '}
                <select
                  aria-label="Tema do protótipo"
                  defaultValue="blue"
                  onChange={(e) =>
                    document.documentElement.setAttribute('data-sz-palette', e.target.value)
                  }
                >
                  <option value="blue">Azul</option>
                  <option value="purple">Roxo</option>
                  <option value="green">Verde</option>
                </select>
              </label>
            </div>
          </header>
          <div className="farol-layout">
            <aside className="farol-sidebar">
              <p className="farol-eyebrow">Escolha o que comparar</p>
              <nav aria-label="Partes do protótipo">
                {items.map((i, n) => (
                  <button
                    type="button"
                    key={i.id}
                    aria-current={i.id === part ? 'page' : undefined}
                    onClick={() => {
                      setPart(i.id)
                      setReset(0)
                    }}
                  >
                    <span className="farol-nav-number">{String(n + 1).padStart(2, '0')}</span>
                    <span>
                      <small>{i.day}</small>
                      <strong>{i.short}</strong>
                    </span>
                    {i.id === part && <ArrowRight size={16} />}
                  </button>
                ))}
              </nav>
              <div className="farol-side-note">
                <Lightbulb size={18} />
                <p>
                  Troque entre Antes e Proposta para comparar. As duas versões conservam seu teste
                  enquanto você alterna.
                </p>
              </div>
            </aside>
            <div className="farol-main">
              <div className="farol-comparison-bar">
                <fieldset
                  className="farol-tabs"
                  aria-label="Versão"
                  style={{ margin: 0, minWidth: 0 }}
                >
                  <button type="button" aria-pressed={!after} onClick={() => setAfter(false)}>
                    Antes <small>Como está hoje</small>
                  </button>
                  <button type="button" aria-pressed={after} onClick={() => setAfter(true)}>
                    Proposta <small>Exploração livre</small>
                  </button>
                </fieldset>
                <SceneButton
                  onClick={() => setReset((v) => v + 1)}
                  aria-label="Reiniciar as duas versões"
                >
                  <RotateCcw size={16} />
                  <span className="farol-reset-label">Reiniciar</span>
                </SceneButton>
              </div>
              <div className="farol-context">
                <span>
                  {item.day} · {after ? 'Proposta' : 'Versão atual'}
                </span>
                <p>{after ? item.change : item.concept}</p>
              </div>
              <div key={`${part}-${reset}`} className="sz-lesson-block farol-comparison-content">
                <div hidden={after} data-version="before">
                  <Before part={part} />
                </div>
                <div hidden={!after} data-version="after">
                  <After part={part} active={after} />
                </div>
              </div>
              <details className="farol-details farol-script">
                <summary>Como ficaria a passagem do vídeo para a experiência</summary>
                <p>
                  <b>No vídeo:</b> explicar o conceito e apresentar uma situação concreta,
                  preservando as analogias e as instruções completas da montagem.
                </p>
                <blockquote>{item.invite}</blockquote>
                <p>
                  <b>Na atividade:</b> Zappy sugere comparações conforme o que a criança observou.
                  Os controles ficam livres; a cor principal sugere um próximo teste.
                </p>
              </details>
            </div>
          </div>
          <footer className="farol-footer">
            Prévia local para avaliação. Não altera aulas, projetos ou progresso. A voz de leitura,
            quando disponível, é a do navegador; não é a gravação final.
          </footer>
        </main>
      </LessonPreviewProvider>
    </LessonCopyProvider>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
