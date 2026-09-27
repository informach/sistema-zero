import { isInteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { SceneActivityView } from '@sistemazero/member-shell/components/scene-activity'
import { resolveLessonSplit } from '@sistemazero/member-shell/lib/lesson-split'
import { createRoot } from 'react-dom/client'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import manifesto from '../../../../docs/aulas-interativas/aulas/nave-contra-asteroides-dia-1.manifesto.json'

const params = new URLSearchParams(location.search)
const source = manifesto.blocks.find(
  (block) => block.key === (params.get('block') ?? 'experiencia-areas'),
)
if (!source || !isInteractiveBlock(source.content)) throw new Error('Experiência não encontrada')
const original = source.content
const content = publicInteractiveBlock(original)
if (content.activity.type !== 'experimentation') throw new Error('Bloco não é experiência')
const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')

const experience = (
  <div className="sz-lesson-block">
    <SceneActivityView
      block={{ id: source.key, kind: 'interactive', sortOrder: 0, content }}
      content={content}
      activity={content.activity}
      previewContent={original}
    />
  </div>
)
const { contentMinimum, toolMinimum } = resolveLessonSplit({
  contentWidth: document.documentElement.clientWidth - 32,
  handleWidth: 44,
  hasWorkspace: true,
})

createRoot(root).render(
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
            Vídeo da aula
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
  </main>,
)
