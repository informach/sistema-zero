import { expect, test } from 'bun:test'
import { parseInstagramCalendar, parseInstagramCopy } from '../src/editorial-markdown'

test('calendário conserva semana e posição, sem datas inferidas', () => {
  const entries = parseInstagramCalendar(
    '| 20 | [P57 · Ajuda](post.md#p57)<br>Carrossel | [ST20 · Ideia](stories.md#st20) |',
  )
  expect(
    entries.map((entry) => [entry.sourceId, entry.week, entry.position, entry.format]),
  ).toEqual([
    ['P57', 20, 1, 'carousel'],
    ['ST20', 20, 2, 'story'],
  ])
  expect(() =>
    parseInstagramCalendar('| 1 | [P01 · Teste](p.md#p01)<br>Formato inventado |'),
  ).toThrow('Formato')
})
test('copy literal não incorpora descrição visual ou notas internas', () => {
  const section = parseInstagramCopy(
    '## P01 · Título\n\n### Slide 1\n> Texto público.\n>\n> Segunda linha.\n\n**Visual:** referência interna.\n\n### Legenda\n> Legenda literal.\n\n**Produção:** estado misto.\n\n## P02 · Próxima\n',
  )[0]
  expect(section?.components.map((component) => component.body)).toEqual([
    'Texto público.\n\nSegunda linha.',
    'Legenda literal.',
  ])
  expect(section?.raw).toContain('estado misto')
})
