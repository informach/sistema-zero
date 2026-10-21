import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { LessonCopyProvider } from '../src/components/lesson-copy-context'
import { LessonDraftStatus } from '../src/components/lesson-draft-status'
import { KIDS_LESSON_COPY } from '../src/lib/lesson-copy-kids'

/**
 * A pílula do rascunho da aula (11/10/2026): com a versão da conta mais nova que a página, ela
 * pede para atualizar e oferece o botão; nos outros estados, nenhum botão.
 */
function pilula(props: Parameters<typeof LessonDraftStatus>[0]) {
  return renderToStaticMarkup(
    <LessonCopyProvider value={KIDS_LESSON_COPY}>
      <LessonDraftStatus {...props} />
    </LessonCopyProvider>,
  )
}

describe('LessonDraftStatus', () => {
  test('página desatualizada: o recado da página e o botão Atualizar', () => {
    const markup = pilula({
      state: { status: 'error', message: 'recado da fila', outdated: true },
      onReload: () => {},
    })
    expect(markup).toContain('data-state="outdated"')
    expect(markup).toContain(KIDS_LESSON_COPY.rascunho.paginaDesatualizada)
    expect(markup).not.toContain('recado da fila')
    expect(markup).toContain('>Atualizar</button>')
    expect(markup).toContain('role="status"')
  })

  test('erro comum: o recado da fila, sem botão', () => {
    const markup = pilula({
      state: { status: 'error', message: 'Não deu para guardar.' },
      onReload: () => {},
    })
    expect(markup).toContain('Não deu para guardar.')
    expect(markup).not.toContain('<button')
  })

  test('sem quem recarregue, a página desatualizada só avisa', () => {
    const markup = pilula({ state: { status: 'error', message: null, outdated: true } })
    expect(markup).toContain(KIDS_LESSON_COPY.rascunho.paginaDesatualizada)
    expect(markup).not.toContain('<button')
  })

  test('guardado e antes da primeira subida', () => {
    expect(pilula({ state: { status: 'saved', message: null } })).toContain(
      KIDS_LESSON_COPY.rascunho.guardado,
    )
    expect(pilula({ state: { status: 'idle', message: null } })).toBe('')
  })
})
