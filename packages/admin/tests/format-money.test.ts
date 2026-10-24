import { expect, test } from 'bun:test'
import { reaisToCents } from '../src/lib/format'

test('money from an unchanged offer form round-trips without multiplying its price', () => {
  for (const cents of [3700, 9700, 79700, 116400, 123456])
    expect(reaisToCents((cents / 100).toFixed(2))).toBe(cents)
})

test('accepts Brazilian grouping, decimal comma, decimal dot and numeric reais', () => {
  for (const value of ['1.234,56', '1234,56', '1234.56', 1234.56])
    expect(reaisToCents(value)).toBe(123456)
  expect(reaisToCents('1.234')).toBe(123400)
  for (const value of ['', '  ', '1,2,3', 'abc', '1.234.56'])
    expect(Number.isNaN(reaisToCents(value))).toBe(true)
})
