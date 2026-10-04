import { describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Guarda obrigatória: outro arquivo de teste pode ter registrado o happy-dom
// antes (a ordem de arquivos do bun varia por plataforma) e o register()
// repetido LANÇA "already been globally registered" como unhandled error.
if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// `mock.module` vale para o processo inteiro do Bun, inclusive outros arquivos
// que estejam rodando em paralelo. Preserve o contrato completo de
// `next/navigation` e substitua somente o roteador usado por este componente.
const nextNavigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...nextNavigation,
  useRouter: () => ({
    back: () => {},
    forward: () => {},
    prefetch: () => {},
    push: () => {},
    refresh: () => {},
    replace: () => {},
  }),
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
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
    })

    expect((document.querySelector('#caudience') as HTMLSelectElement | null)?.value).toBe(audience)
    if (audience === 'kids') {
      const role = document.querySelector('#journey-slot') as HTMLSelectElement | null
      expect(role?.value).toBe('reward')
      expect([...role!.options].map((option) => option.value)).toContain('extra')
    } else {
      const role = document.querySelector('#journey-slot') as HTMLSelectElement | null
      expect([...role!.options].map((option) => option.value)).not.toContain('extra')
    }

    await act(async () => root.unmount())
    container.remove()
  })

  test('"Assistir ao vídeo antes da atividade": nasce desmarcada, carrega a do curso e vai no PATCH', async () => {
    const enviados: Record<string, unknown>[] = []
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') enviados.push(JSON.parse(String(init.body)))
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch
    const caixa = () => document.querySelector('#cvideobeforeactivity') as HTMLInputElement
    try {
      const container = document.createElement('div')
      document.body.append(container)
      const root = createRoot(container)
      await act(async () => {
        root.render(
          <CourseFormDialog
            open
            editing={null}
            prefill={{ audience: 'kids' }}
            journeyCourses={[]}
            onClose={() => {}}
            onSaved={() => {}}
          />,
        )
      })
      // Padrão DESLIGADO: é só para os cursos de quem está começando.
      expect(caixa().checked).toBe(false)
      await act(async () => root.unmount())

      const curso = {
        id: '11111111-1111-1111-1111-111111111111',
        version: 3,
        slug: 'cade-todo-mundo',
        title: 'Cadê Todo Mundo?',
        subtitle: null,
        description: null,
        coverImageUrl: null,
        salesPageUrl: null,
        status: 'draft',
        audience: 'kids',
        level: 'iniciante',
        track: '2d',
        careerSlot: null,
        journeyRole: 'reward',
        sequentialLock: true,
        videoBeforeActivity: true,
        studioUnlockBlocks: [],
      } as unknown as Parameters<typeof CourseFormDialog>[0]['editing']
      const root2 = createRoot(container)
      await act(async () => {
        root2.render(
          <CourseFormDialog
            open
            editing={curso}
            journeyCourses={[]}
            onClose={() => {}}
            onSaved={() => {}}
          />,
        )
      })
      expect(caixa().checked).toBe(true)
      await act(async () => caixa().click())
      const salvar = [...document.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'Salvar',
      )
      await act(async () => salvar?.click())
      await act(async () => new Promise((r) => setTimeout(r, 0)))
      expect(enviados).toHaveLength(1)
      expect(enviados[0]?.videoBeforeActivity).toBe(false)
      expect(enviados[0]?.version).toBe(3)
      await act(async () => root2.unmount())
      container.remove()
    } finally {
      globalThis.fetch = fetchOriginal
    }
  })
})
