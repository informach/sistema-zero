import { afterEach, expect, test } from 'bun:test'
import { LessonGalleryDelivery } from '@sistemazero/member-shell/components/lesson-gallery-delivery'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const original = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = original
})

test('selecting Pinta drawings stays pending; failed confirmation preserves selection and retry identity', async () => {
  let refreshed = 0
  const submissions: unknown[] = []
  globalThis.fetch = Object.assign(
    async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'POST') {
        submissions.push(JSON.parse(String(init.body)))
        return Response.json(
          submissions.length === 1
            ? { error: { message: 'Não chegou. Tente novamente.' } }
            : { submittedAt: new Date().toISOString() },
          { status: submissions.length === 1 ? 503 : 200 },
        )
      }
      return Response.json({
        items: [
          { itemId: 'dino', name: 'Meu Dino', kind: 'pixel-sprite', revision: 2, thumb: null },
          { itemId: 'cacto', name: 'Meu cacto', kind: 'vector-sprite', revision: 4, thumb: null },
          { itemId: 'sz-pinta-palettes', name: 'Paletas', kind: 'palette-library', revision: 1 },
        ],
        nextCursor: null,
      })
    },
    { preconnect: original.preconnect },
  )
  render(
    <LessonPlayerProvider
      value={{
        lessonId: 'lesson',
        courseSlug: 'course',
        viewerId: 'child',
        viewerWatermark: null,
        initialPositionSeconds: null,
        refreshAfterLearning: () => {
          refreshed++
        },
      }}
    >
      <LessonGalleryDelivery
        block={{
          id: 'delivery',
          kind: 'pinta',
          sortOrder: 0,
          blockRevision: 'revision',
          content: {},
        }}
        tool="pinta"
        config={{ minItems: 2, maxItems: 3 }}
      />
    </LessonPlayerProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Escolher no Pinta' }))
  await screen.findByLabelText('Meu Dino')
  expect(screen.queryByText('Paletas')).toBeNull()
  fireEvent.click(screen.getByLabelText('Meu Dino'))
  fireEvent.click(screen.getByLabelText('Meu cacto'))
  expect(submissions).toHaveLength(0)
  expect(refreshed).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: 'Enviar ao professor (2)' }))
  await screen.findByRole('alert')
  expect(screen.getByLabelText<HTMLInputElement>('Meu Dino').checked).toBe(true)
  expect(refreshed).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: 'Enviar ao professor (2)' }))
  await waitFor(() => expect(refreshed).toBe(1))
  expect(submissions).toHaveLength(2)
  expect(submissions[1]).toEqual(submissions[0])
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText('Trabalho recebido pelo professor.')).toBeDefined()
})
