import { expect, test } from 'bun:test'
import { calendarSourceKey, parseStructuredCalendar } from '../src/structured-calendar'

test('calendário preserva posição e resolve a origem exata sem executar links ou ler exemplos de código', () => {
  const result = parseStructuredCalendar(
    '```md\n| 2 | [P02 · Exemplo](a.md#p02)<br>Carrossel |\n```\n| 1 | [P01 · Literal](postagens/copy.md#p01)<br>Carrossel | [ST01 · História](../stories.md#st01) |',
    'sistema-zero',
    'docs/instagram/calendario.md',
  )
  expect(
    result.map((entry) => [entry.sourceId, entry.week, entry.position, entry.sourceKey]),
  ).toEqual([
    ['P01', 1, 1, 'sistema-zero:docs/instagram/postagens/copy.md#P01'],
    ['ST01', 1, 2, 'sistema-zero:docs/stories.md#ST01'],
  ])
  expect(parseStructuredCalendar('| 1 | Outra tabela |', 'sistema-zero', 'a.md')).toEqual([])
  for (const link of [
    'https://example.com/copy.md#p01',
    '/root/copy.md#p01',
    '%2e%2e/%2e%2e/copy.md#p01',
    'copy.md#p02',
    'C:%5cfile.md#p01',
    '//example.com/x#p01',
  ])
    expect(() => calendarSourceKey('sistema-zero', 'docs/calendar.md', link, 'P01')).toThrow()
  expect(() =>
    parseStructuredCalendar(
      '| 1 | [P01 · Um](a.md#p01)<br>Carrossel |\n| 1 | [P02 · Dois](a.md#p02)<br>Carrossel |',
      'sistema-zero',
      'a.md',
    ),
  ).toThrow('Posição repetida')
})
