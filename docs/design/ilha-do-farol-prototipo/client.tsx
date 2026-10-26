import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import { ArrowRight, Compass, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Experience } from './experiences'
import { Objectives } from './objectives'
import { Quiz } from './quiz'

const items = [
  {
    id: 'view',
    short: 'Ponto de vista',
    day: 'Aula 1 · experiência',
    description: 'O mundo continua no lugar. O nosso olhar muda.',
  },
  {
    id: 'position',
    short: 'Posição em 3D',
    day: 'Aula 1 · experiência',
    description: 'Explore x e z no chão; descubra a altura no y.',
  },
  {
    id: 'contact',
    short: 'Contato em 3D',
    day: 'Aula 2 · experiência',
    description: 'Parecer junto na imagem não é o mesmo que encostar.',
  },
  {
    id: 'quiz',
    short: 'Quiz visual',
    day: 'Aula 3 · revisão',
    description: 'Preveja, veja o teste e compare a resposta.',
  },
  {
    id: 'objectives',
    short: 'Objetivos do Estúdio',
    day: 'As três aulas',
    description: 'Montagem completa, conferência e entrega do jogo.',
  },
] as const
function App() {
  const [part, setPart] = useState<(typeof items)[number]['id']>('view')
  const item = items.find((i) => i.id === part)!
  return (
    <LessonCopyProvider value={KIDS_LESSON_COPY}>
      <main className="farol-page sz-lesson-sections ilha-page">
        <header className="farol-hero">
          <div className="farol-brand">
            <Compass size={21} />
            <span>Faísca · Jogo 3D</span>
            <span className="farol-prototype-label">Protótipo para aprovação</span>
          </div>
          <h1 className="sz-display">A Ilha do Farol</h1>
          <p>A aventura que você já conhece, com uma nova dimensão para descobrir.</p>
          <div className="farol-hero-bottom">
            <span>3 experiências novas · quiz visual · objetivos das 3 aulas</span>
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
            <p className="farol-eyebrow">Explore a proposta</p>
            <nav aria-label="Partes do protótipo">
              {items.map((i, n) => (
                <button
                  type="button"
                  key={i.id}
                  aria-current={i.id === part ? 'page' : undefined}
                  onClick={() => setPart(i.id)}
                >
                  <span className="farol-nav-number">{n + 1}</span>
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
                Movimento, memória e decisão têm retomada breve e montagem completa. As experiências
                apresentam as novidades do 3D.
              </p>
            </div>
            <p className="ilha-free">
              Curso sem certificado. Conclusão com jogo construído e entregue.
            </p>
          </aside>
          <div className="farol-main">
            <div className="farol-context">
              <span>{item.day}</span>
              <p>{item.description}</p>
            </div>
            {items.map((i) => (
              <div key={i.id} hidden={i.id !== part}>
                {i.id === part &&
                  (i.id === 'quiz' ? (
                    <Quiz />
                  ) : i.id === 'objectives' ? (
                    <Objectives />
                  ) : (
                    <Experience mode={i.id} />
                  ))}
              </div>
            ))}
          </div>
        </div>
        <footer className="ilha-footer">
          Prévia local para aprovação. Ao trocar de parte, o ensaio começa novamente. Nada é enviado
          à plataforma. As artes 3D são ilustrativas; a identidade da interface usa os componentes
          reais.
        </footer>
      </main>
    </LessonCopyProvider>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
