import { expect, test } from 'bun:test'
import {
  appendStudioProAssistanceEvent,
  createStudioProAssistanceJournal,
  isStudioProAssistanceRequest,
  parseStudioProAssistanceRequest,
  type StudioProAssistanceRequest,
} from './pro-assistance'

test('scope and context survive a strict canonical roundtrip; unsupported permissions and versions are refused', () => {
  const input = {
    version: 1,
    intent: 'change',
    scope: 'selection',
    criteria: ['Preservar o controle por teclado'],
    selection: { path: 'src/main.ts', startLine: 400, endLine: 410, sourceHash: 'a'.repeat(64) },
  } satisfies StudioProAssistanceRequest
  const parsed = parseStudioProAssistanceRequest(input)
  expect(parsed).toEqual(input)
  expect(parsed.criteria).not.toBe(input.criteria)
  expect(isStudioProAssistanceRequest({ ...input, version: 2 })).toBe(false)
  expect(isStudioProAssistanceRequest({ ...input, tools: ['write'] })).toBe(false)
  expect(
    isStudioProAssistanceRequest({ ...input, selection: { ...input.selection, endLine: 399 } }),
  ).toBe(false)
  expect(isStudioProAssistanceRequest({ ...input, selection: undefined })).toBe(false)
  expect(isStudioProAssistanceRequest({ ...input, criteria: ['x'.repeat(301)] })).toBe(false)
})

test('event retention is bounded without resetting sequence numbers or changing the request', () => {
  let journal = createStudioProAssistanceJournal(undefined, new Date(0).toISOString())
  for (let index = 1; index <= 150; index++)
    journal = appendStudioProAssistanceEvent(journal, 'queued', new Date(index).toISOString())
  expect(journal.events).toHaveLength(128)
  expect(journal.events[0]?.sequence).toBe(23)
  expect(journal.events.at(-1)?.sequence).toBe(150)
  expect(journal.request.scope).toBe('part')
  expect(journal.disposition).toBe('pending')
})

test('accepts the canonical tutor source hash for selection and observed baseline', () => {
  const sourceHash = `sha256-${Buffer.from('a'.repeat(64), 'hex').toString('base64')}`
  const input = {
    version: 1,
    intent: 'change',
    scope: 'selection',
    criteria: [],
    selection: { path: 'main.ts', startLine: 1, endLine: 2, sourceHash },
    baseline: {
      revisionHash: 'b'.repeat(64),
      source: 'typescript',
      diagnostics: [{ path: 'main.ts', line: 2, message: 'Tipo incompatível', sourceHash }],
    },
  } satisfies StudioProAssistanceRequest
  expect(parseStudioProAssistanceRequest(input)).toEqual(input)
})
