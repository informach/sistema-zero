import { describe, expect, test } from 'bun:test'
import { loadAllPages } from '../src/lib/load-all-pages'

describe('loadAllPages', () => {
  test('não limita a conferência aos primeiros cem registros', async () => {
    const source = Array.from({ length: 205 }, (_, index) => index + 1)
    const calls: number[] = []

    const result = await loadAllPages(async (offset, limit) => {
      calls.push(offset)
      return { items: source.slice(offset, offset + limit), total: source.length }
    })

    expect(result).toEqual(source)
    expect(calls).toEqual([0, 100, 200])
  })
})
