import { describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Guarda obrigatória: outro arquivo de teste pode ter registrado o happy-dom
// antes (a ordem de arquivos do bun varia por plataforma) e o register()
// repetido LANÇA "already been globally registered" como unhandled error.
if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { CourseFormDialog } = await import('../src/app/admin/membros/cursos/course-form-dialog')

describe('cadastro de curso', () => {
  test.each([
    ['kids', 'kids'],
    ['adult', 'adult'],
  ])('novo curso respeita a audiência %s do contexto', async (_label, audience) => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <CourseFormDialog
          open
          editing={null}
          prefill={{ audience }}
          careerCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
    })

    expect((document.querySelector('#caudience') as HTMLSelectElement | null)?.value).toBe(audience)

    await act(async () => root.unmount())
    container.remove()
  })
})
