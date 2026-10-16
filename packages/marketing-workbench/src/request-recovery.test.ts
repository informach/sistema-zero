import { expect, test } from 'bun:test'
import { preserveInvalidRequest } from './request-recovery'

test('recuperação preserva bytes antes de iniciar outro pedido e falha sem descartar', () => {
  const data = new Map([['request', '{pedido interrompido']])
  const store = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
  expect(preserveInvalidRequest(store, 'request')).toBe('{pedido interrompido')
  expect([...data.values()]).toContain('{pedido interrompido')
  expect(JSON.parse(data.get('request') ?? '').request).toBeNull()
  data.set('request', 'original')
  expect(() =>
    preserveInvalidRequest(
      {
        ...store,
        setItem: () => {
          throw new Error('Quota')
        },
      },
      'request',
    ),
  ).toThrow('Quota')
  expect(data.get('request')).toBe('original')
})
