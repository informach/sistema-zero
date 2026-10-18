import { expect, test } from 'bun:test'
import { StudioPythonActivitySchema } from '@sistemazero/core/studio/python-activity'
import { createPythonActivityConsoleMatcher } from './activityConsole'

test('stdout matcher handles UTF8/chunk boundaries and remembers matches without retaining the output', () => {
  const activity = StudioPythonActivitySchema.parse({
    version: 1,
    programmingLanguage: 'python',
    profileId: 'python-browser',
    instructions: '',
    checks: [
      {
        id: 'unicode',
        label: 'Olá',
        kind: 'behavior',
        rule: { type: 'consoleContains', text: 'Olá 🐢!' },
      },
      {
        id: 'one',
        label: 'Uma letra',
        kind: 'behavior',
        rule: { type: 'consoleContains', text: 'Z' },
      },
      {
        id: 'missing',
        label: 'Ausente',
        kind: 'behavior',
        rule: { type: 'consoleContains', text: 'not-printed' },
      },
    ],
  })
  const matcher = createPythonActivityConsoleMatcher(activity)
  const bytes = new TextEncoder().encode('Olá 🐢! Z')
  for (const byte of bytes) matcher.write(new Uint8Array([byte]))
  expect(matcher.matches('unicode')).toBe(true)
  expect(matcher.matches('one')).toBe(true)
  for (let index = 0; index < 1000; index++)
    matcher.write(new TextEncoder().encode('x'.repeat(4096)))
  expect(matcher.matches('unicode')).toBe(true)
  expect(matcher.matches('missing')).toBe(false)
  expect(matcher.matches('foreign')).toBe(false)
})
