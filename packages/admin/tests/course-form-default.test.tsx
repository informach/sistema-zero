import { describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { CourseFormDialog } = await import('../src/app/admin/membros/cursos/course-form-dialog')

describe('cadastro de curso', () => {
  test('novo curso começa na audiência Kids', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <CourseFormDialog
          open
          editing={null}
          careerCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
    })

    expect((document.querySelector('#caudience') as HTMLSelectElement | null)?.value).toBe('kids')

    await act(async () => root.unmount())
    container.remove()
  })
})
