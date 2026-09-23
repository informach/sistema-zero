import { isInteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { SceneActivityView } from '@sistemazero/member-shell/components/scene-activity'
import { createRoot } from 'react-dom/client'
import manifesto from '../../../../docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json'

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

createRoot(root).render(
  <main className="sz-lesson-sections" style={{ padding: 16 }}>
    <button type="button">Antes da experiência</button>
    <div style={{ height: 64 }} />
    <div
      className="sz-lesson-block"
      style={{ width: '100%', maxWidth: Number(params.get('width') ?? 620) }}
    >
      <SceneActivityView
        block={{ id: source.key, kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={content.activity}
        previewContent={original}
      />
    </div>
    <button type="button">Depois da experiência</button>
  </main>,
)
