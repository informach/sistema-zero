import { describe, expect, test } from 'bun:test'
import { deleteObjectKeysResilient, deleteObjectPrefixes } from './object-deletion'

describe('exclusão resiliente de objetos', () => {
  test('falha total ou parcial do lote cai para exclusões unitárias', async () => {
    const deleted: string[] = []
    await deleteObjectKeysResilient(['a', 'b'], {
      deleteMany: async () => {
        throw new Error('checksum incompatível')
      },
      deleteOne: async (key) => {
        deleted.push(key)
      },
    })
    expect(deleted).toEqual(['a', 'b'])

    deleted.length = 0
    await deleteObjectKeysResilient(['a', 'b'], {
      deleteMany: async () => ({ failedKeys: ['b'] }),
      deleteOne: async (key) => {
        deleted.push(key)
      },
    })
    expect(deleted).toEqual(['b'])
  })

  test('prefixo relê a primeira página até esvaziar e herda o fallback do lote', async () => {
    const pages = [['a', 'b'], ['b'], []] as string[][]
    const deleted: string[] = []
    await deleteObjectPrefixes(['creations/u/'], {
      listFirstPage: async () => pages.shift() ?? [],
      deleteMany: async (keys) => ({ failedKeys: keys.filter((key) => key === 'b') }),
      deleteOne: async (key) => {
        deleted.push(key)
      },
    })
    expect(deleted).toEqual(['b', 'b'])
    expect(pages).toHaveLength(0)
  })
})
