import { isInteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonSectionProvider } from '@sistemazero/member-shell/components/lesson-section-context'
import { SceneActivityView } from '@sistemazero/member-shell/components/scene-activity'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import { resolveLessonSplit } from '@sistemazero/member-shell/lib/lesson-split'
import { createRoot } from 'react-dom/client'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import farolDia1 from '../../../../docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json'
import farolDia2 from '../../../../docs/aulas-interativas/aulas/desafio-dia-2.manifesto.json'
import farolDia3 from '../../../../docs/aulas-interativas/aulas/desafio-dia-3.manifesto.json'
import naveDia1 from '../../../../docs/aulas-interativas/aulas/nave-contra-asteroides-dia-1.manifesto.json'
import navePrimeira from '../../../../docs/aulas-interativas/aulas/nave-contra-asteroides-primeira-nave.manifesto.json'

const params = new URLSearchParams(location.search)
// Desde a reestruturação da Nave (05/10/2026), as experiências do antigo Dia 1 ficaram em
// "primeira-nave"; a de camadas continua no Dia 1.
const blocks =
  params.get('course') === 'farol'
    ? [...farolDia1.blocks, ...farolDia2.blocks, ...farolDia3.blocks]
    : [...navePrimeira.blocks, ...naveDia1.blocks]
const source = blocks.find((block) => block.key === (params.get('block') ?? 'experiencia-areas'))
if (!source || !isInteractiveBlock(source.content)) throw new Error('Experiência não encontrada')
/**
 * Os testes de layout do palpite precisam de uma cena com palpite. Os cursos deixaram de usá-lo
 * nessas cenas (Diretrizes, 05/10/2026), mas o player continua oferecendo o recurso; por isso os
 * dois palpites de antes ficam aqui, como dado do teste, e não no manifesto.
 */
const PALPITES_DE_TESTE: Record<string, unknown> = {
  'experiencia-coordenadas': {
    context: {
      label: 'Os números x e y',
      explanation:
        'Nesta experiência, vamos usar os números x e y para escolher onde a nave aparece na tela do jogo.',
    },
    prompt: 'Se o y AUMENTAR, para onde a nave vai?',
    choices: [
      { id: 'cima', label: 'Para cima', shows: 'Aumentando o y, a nave desceu.' },
      { id: 'baixo', label: 'Para baixo' },
    ],
    correctChoiceId: 'baixo',
    revealOn: 'down',
  },
  'experiencia-criar-mostrar': {
    context: {
      label: 'Bastidores e tela do jogo',
      explanation:
        'Nesta experiência, vamos comparar o que existe nos bastidores com o que aparece na tela do jogo.',
    },
    prompt: 'Você cria a nave, mas ainda não manda desenhar. O que aparece na tela?',
    choices: [
      {
        id: 'aparece',
        label: 'A nave aparece',
        shows: 'A tela continuou vazia até a nave ser desenhada.',
      },
      { id: 'vazia', label: 'A tela fica vazia' },
    ],
    correctChoiceId: 'vazia',
    revealOn: 'hidden',
  },
}
const palpite = params.get('course') === 'farol' ? undefined : PALPITES_DE_TESTE[source.key]
const original = palpite
  ? ({ ...source.content, prediction: palpite } as typeof source.content)
  : source.content
const content = publicInteractiveBlock(original)
if (content.activity.type !== 'experimentation') throw new Error('Bloco não é experiência')
const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')

const experience = (
  <div className="sz-lesson-block">
    <LessonSectionProvider
      value={params.has('repeated-title') ? { titulo: content.title, temDialogo: false } : null}
    >
      <SceneActivityView
        block={{ id: source.key, kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={content.activity}
        previewContent={original}
      />
    </LessonSectionProvider>
  </div>
)
const { contentMinimum, toolMinimum } = resolveLessonSplit({
  contentWidth: document.documentElement.clientWidth - 32,
  handleWidth: 44,
  hasWorkspace: true,
})

// O vocabulário da criança, como o `KidsLessonCopy` em volta da área logada do app: sem ele o
// ensaio montaria a experiência com as palavras do adulto ("Voltar à aula").
createRoot(root).render(
  <LessonCopyProvider value={KIDS_LESSON_COPY}>
    <main className="sz-lesson-sections" style={{ padding: 16 }}>
      <button type="button">Antes da experiência</button>
      <div style={{ height: 64 }} />
      {params.has('split') ? (
        <PanelGroup direction="horizontal" className="h-auto! items-start overflow-visible!">
          <Panel
            id="lesson-content"
            defaultSize={50}
            minSize={contentMinimum}
            maxSize={100 - toolMinimum}
            className="min-w-0 overflow-visible!"
          >
            <div className="sz-lesson-block" style={{ aspectRatio: '16 / 9' }}>
              Vídeo da fase
            </div>
          </Panel>
          <PanelResizeHandle
            aria-label="Mudar o tamanho dos dois lados"
            hitAreaMargins={{ coarse: 20, fine: 6 }}
            className="sz-lesson-split-handle relative flex w-6 shrink-0 self-stretch items-center justify-center"
          >
            <span className="sz-lesson-split-grip absolute inset-y-0" />
          </PanelResizeHandle>
          <Panel
            id="lesson-tool"
            defaultSize={50}
            minSize={toolMinimum}
            maxSize={100 - contentMinimum}
            className="min-w-0 overflow-visible!"
          >
            {experience}
          </Panel>
        </PanelGroup>
      ) : (
        <div style={{ width: '100%', maxWidth: Number(params.get('width') ?? 620) }}>
          {experience}
        </div>
      )}
      <button type="button">Depois da experiência</button>
    </main>
  </LessonCopyProvider>,
)
