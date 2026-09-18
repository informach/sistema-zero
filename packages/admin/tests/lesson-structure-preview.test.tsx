import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import type { LessonBlockContent, LessonContentView } from '../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register()
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  writable: true,
  configurable: true,
})
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonStructureEditor } = await import('../src/components/editor/lesson-structure-editor')

/**
 * ⚠️ O `LessonStructureEditor` não tinha teste NENHUM, e é ele que converte a
 * `audience` do curso no `kids` que as duas conferências repassam ao player. Sem isto,
 * apagar a conversão (ou o `kids` do "Conferir livremente") não reprovaria nada — e o
 * professor voltaria a conferir a aula infantil na tela do adulto sem ninguém ver.
 */
const documentValue: LessonDraftDocument<LessonBlockContent> = {
  title: 'Ensaio',
  slug: 'ensaio',
  estimatedMinutes: null,
  attachments: [],
  plannedVideos: [],
  supportBlockIds: [],
  blocks: [],
  sections: [
    { ...defaultLessonSection('a', 'Preparar', []), completion: { version: 1, blockIds: [] } },
    { ...defaultLessonSection('b', 'Observar', []), completion: { version: 1, blockIds: [] } },
  ],
}
const lesson: LessonContentView = {
  id: 'lesson',
  moduleId: 'm',
  courseId: 'c',
  slug: 'ensaio',
  title: 'Ensaio',
  sortOrder: 0,
  estimatedMinutes: null,
  isPublished: false,
  blocks: [],
  attachments: [],
}

async function montarPrevia(audience: 'adult' | 'kids' | undefined) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <LessonStructureEditor
        lesson={lesson}
        document={documentValue}
        audience={audience}
        preview
        onPreviewChange={() => {}}
        canWrite
        authorId="autor"
        issues={[]}
        area="sections"
        onChange={() => {}}
        onAddBlock={() => {}}
        onEditBlock={() => {}}
        onRemoveBlock={() => {}}
        onCreateStructure={() => {}}
      />,
    ),
  )
  const indice = [...container.querySelectorAll('summary')].find((s) =>
    s.textContent?.includes('Índice da aula'),
  )
  return {
    container,
    root,
    temBarra: container.querySelector('.sz-lesson-toolbar') !== null,
    // ⚠️ Sinal que DISCRIMINA: o gancho de tema do kids. O `indiceNoCabecalho`
    // deixou de separar os dois em 18/09/2026 (o índice mora no cabeçalho nos
    // dois), e sem um substituto o ensaio poderia montar a criança na tela do
    // adulto — o bug que este arquivo existe para impedir — sem nada acusar.
    temTemaKids: container.querySelector('.sz-lesson-sections') !== null,
    indiceNoCabecalho:
      indice?.closest('header')?.classList.contains('sz-lesson-section-head') ?? false,
  }
}

test('"Conferir livremente" monta a aula no layout da plataforma do curso', async () => {
  const kids = await montarPrevia('kids')
  try {
    expect(kids.temBarra).toBe(false)
    expect(kids.indiceNoCabecalho).toBe(true)
    expect(kids.temTemaKids).toBe(true)
  } finally {
    await act(async () => kids.root.unmount())
    kids.container.remove()
  }
  const adulto = await montarPrevia('adult')
  try {
    expect(adulto.temBarra).toBe(true)
    // O índice mora no cabeçalho nos dois desde 18/09/2026; quem separa kids de
    // adulto aqui é a barra do topo e o gancho de tema.
    expect(adulto.indiceNoCabecalho).toBe(true)
    expect(adulto.temTemaKids).toBe(false)
  } finally {
    await act(async () => adulto.root.unmount())
    adulto.container.remove()
  }
})

test('sem audiência conhecida a prévia fica no layout ADULTO, que é o de sempre', async () => {
  // A árvore do curso é best-effort no editor: quando ela falha, `courseInfo` fica null.
  // O pior caso então tem que ser o comportamento ANTERIOR a esta mudança, e não montar
  // um curso adulto na tela da criança — o mesmo bug ao contrário.
  const semAudiencia = await montarPrevia(undefined)
  try {
    expect(semAudiencia.temBarra).toBe(true)
    expect(semAudiencia.indiceNoCabecalho).toBe(true)
    expect(semAudiencia.temTemaKids).toBe(false)
  } finally {
    await act(async () => semAudiencia.root.unmount())
    semAudiencia.container.remove()
  }
})
