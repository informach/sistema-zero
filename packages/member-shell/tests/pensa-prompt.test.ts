import { expect, test } from 'bun:test'
import { partitionPensaWork, pensaBytes, pensaPrompt } from '../src/server/pensa/prompt'

test('rejects an oversized canonical decision instead of clipping it', () => {
  const decision = { rules: ['O dragão só vence depois de pegar três chaves.'] }
  const size = pensaBytes('system') + pensaBytes(decision)
  expect(() => pensaPrompt('system', decision, size - 1)).toThrow('ideia está guardada')
  expect(JSON.parse(pensaPrompt('system', decision, size))).toEqual(decision)
})

test('uses UTF-8 bytes when allocating the complete request', () => {
  expect(pensaBytes('🎮')).toBe(4)
  expect(() => pensaPrompt('', { title: '🎮' }, 13)).toThrow('partes menores')
})

test('partitions by output capacity as well as mission count', () => {
  const groups = partitionPensaWork(
    [1, 2, 3, 4, 5],
    '',
    (items) => ({ items }),
    (items) => items.length * 600,
    { maxItems: 8, contextBytes: 1000, outputTokens: 1200 },
  )
  expect(groups).toEqual([[1, 2], [3, 4], [5]])
})

test('includes pinned context in partition admission and refuses an impossible unit', () => {
  expect(() =>
    partitionPensaWork(
      [1],
      'system',
      (items) => ({ originalIntent: 'jogo'.repeat(30), items }),
      () => 100,
      { maxItems: 8, contextBytes: 100, outputTokens: 1200 },
    ),
  ).toThrow('resultados menores')
})
