import { expect, test } from 'bun:test'
import { concluirStudio } from '../src/lib/arquipelago-studio'

test('confirma o projeto completo inclusive assets na conta antes de entregar', async () => {
  const order: string[] = []
  const project = { id: 'p', blocks: [{ id: 'b' }], assets: [{ id: 'a', data: 'imagem' }] }
  const id = await concluirStudio(
    {
      async flush() {
        order.push('local')
        return { id: 'p', snapshot: project }
      },
    },
    {
      async confirm(id) {
        expect(id).toBe('p')
        order.push('confirmar')
      },
      async downloadProject() {
        order.push('conferir')
        return { raw: { assets: [{ data: 'imagem', id: 'a' }], blocks: [{ id: 'b' }], id: 'p' } }
      },
    },
  )
  expect(id).toBe('p')
  expect(order).toEqual(['local', 'confirmar', 'conferir'])
})
test('não retorna projeto ausente nem dados diferentes', async () => {
  let called = false
  const cloud = {
    async confirm() {
      called = true
    },
    async downloadProject() {
      return { raw: { id: 'p', assets: [] } }
    },
  }
  expect(
    await concluirStudio(
      {
        async flush() {
          return null
        },
      },
      cloud,
    ),
  ).toBeNull()
  expect(called).toBe(false)
  await expect(
    concluirStudio(
      {
        async flush() {
          return { id: 'p', snapshot: { id: 'p', assets: ['image'] } }
        },
      },
      cloud,
    ),
  ).rejects.toThrow('não foi confirmada')
})
