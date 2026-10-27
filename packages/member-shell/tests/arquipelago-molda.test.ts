import { expect, test } from 'bun:test'
import { concluirMolda } from '../src/lib/arquipelago-molda'

test('confirma no servidor a mesma versão da criação local antes de entregá-la', async () => {
  const order: string[] = []
  const result = await concluirMolda(
    {
      async flush() {
        order.push('local')
        return { id: 'modelo', json: '{"v":2}' }
      },
    },
    {
      async confirm(id) {
        expect(id).toBe('modelo')
        order.push('confirmar')
      },
      async download() {
        order.push('conferir')
        return { json: '{"v":2}' } as never
      },
    },
  )
  expect(result).toBe('modelo')
  expect(order).toEqual(['local', 'confirmar', 'conferir'])
})

test('não inventa criação na galeria e não entrega versão divergente', async () => {
  let checks = 0
  const cloud = {
    async confirm() {
      checks++
    },
    async download() {
      return { json: '{"v":1}' } as never
    },
  }
  expect(
    await concluirMolda(
      {
        async flush() {
          return null
        },
      },
      cloud,
    ),
  ).toBeNull()
  expect(checks).toBe(0)
  await expect(
    concluirMolda(
      {
        async flush() {
          return { id: 'modelo', json: '{"v":2}' }
        },
      },
      cloud,
    ),
  ).rejects.toThrow('não foi confirmada')
})
