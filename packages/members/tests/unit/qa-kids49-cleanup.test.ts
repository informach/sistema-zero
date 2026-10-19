import { expect, test } from 'bun:test'
import { withQaConnections } from '../e2e/qa-public-chain/seed-kids-49.mjs'

test('QA49 returns only after every owned connection closes', async () => {
  const closed: string[] = []
  const value = await withQaConnections(
    async () => 49,
    [
      async () => {
        await Promise.resolve()
        closed.push('first')
      },
      async () => {
        closed.push('second')
      },
    ],
  )
  expect(value).toBe(49)
  expect(closed.toSorted()).toEqual(['first', 'second'])
})

test('QA49 preserves the primary error when cleanup succeeds', async () => {
  const primary = new Error('operation failed')
  let closed = 0
  const result = await withQaConnections(async () => {
    throw primary
  }, [
    async () => {
      closed++
    },
    async () => {
      closed++
    },
  ]).then(
    () => ({ ok: true }),
    (error: unknown) => ({ ok: false, error }),
  )
  expect(result).toEqual({ ok: false, error: primary })
  expect(closed).toBe(2)
})

test('QA49 aggregates primary first and all cleanup failures in connection order', async () => {
  const primary = new Error('operation failed')
  const first = new Error('first close failed')
  const second = new Error('second close failed')
  const result = await withQaConnections(async () => {
    throw primary
  }, [
    async () => {
      await Promise.resolve()
      throw first
    },
    async () => {
      throw second
    },
  ]).catch((error: unknown) => error)
  expect(result).toBeInstanceOf(AggregateError)
  expect((result as AggregateError).errors).toEqual([primary, first, second])
})

test('QA49 rejects cleanup alone and still closes the other owned connection', async () => {
  const cleanup = new Error('close failed')
  let otherClosed = false
  const result = await withQaConnections(
    async () => 49,
    [
      () => {
        throw cleanup
      },
      async () => {
        otherClosed = true
      },
    ],
  ).catch((error: unknown) => error)
  expect(result).toBeInstanceOf(AggregateError)
  expect((result as AggregateError).errors).toEqual([cleanup])
  expect(otherClosed).toBe(true)
})

test('QA49 preserves falsy primary rejections with and without cleanup failure', async () => {
  for (const primary of [undefined, null, false, 0, '']) {
    const result = await withQaConnections(async () => {
      throw primary
    }, [async () => {}]).then(
      () => ({ ok: true }),
      (error: unknown) => ({ ok: false, error }),
    )
    expect(result).toEqual({ ok: false, error: primary })
    const aggregate = await withQaConnections(async () => {
      throw primary
    }, [
      async () => {
        throw 0
      },
    ]).catch((error: unknown) => error)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect((aggregate as AggregateError).errors).toEqual([primary, 0])
  }
})
