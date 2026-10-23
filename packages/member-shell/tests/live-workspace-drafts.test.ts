import { afterEach, expect, test } from 'bun:test'
import type { Project } from '@sistemazero/studio'
import { IDBFactory } from 'fake-indexeddb'
import { LiveDraftJournal, liveDraftScope } from '../src/lib/live/workspace-drafts'

const original = globalThis.indexedDB
afterEach(() => {
  globalThis.indexedDB = original
})
const project = (name: string) => ({ id: 'workspace', name }) as Project

test('a new document can recover durable drafts but another profile cannot read them', async () => {
  globalThis.indexedDB = new IDBFactory()
  const scope = liveDraftScope('workspace', 'child', 'child')
  const first = await LiveDraftJournal.open(scope, 'old-document')
  await first.stage(project('Edição sem rede'), 4, 2).saved
  first.close()
  const reopened = await LiveDraftJournal.open(scope, 'new-document')
  expect((await reopened.list())[0]?.project.name).toBe('Edição sem rede')
  const sibling = await LiveDraftJournal.open(
    liveDraftScope('workspace', 'child', 'sibling'),
    'other',
  )
  expect(await sibling.list()).toEqual([])
  reopened.close()
  sibling.close()
})

test('an old acknowledgement preserves a newer edit and advances its base revision atomically', async () => {
  globalThis.indexedDB = new IDBFactory()
  const journal = await LiveDraftJournal.open('scope', 'document')
  const old = journal.stage(project('Primeira'), 1, 4)
  const newer = journal.stage(project('Segunda'), 1, 4)
  await Promise.all([old.saved, newer.saved])
  await journal.confirm(old.draft, 2)
  const [retained] = await journal.list()
  expect(retained?.project.name).toBe('Segunda')
  expect(retained?.revision).toBe(2)
  await journal.confirm(newer.draft, 3)
  expect(await journal.list()).toEqual([])
  journal.close()
})

test('a previous writer acknowledgement cannot relabel or remove another epoch draft', async () => {
  globalThis.indexedDB = new IDBFactory()
  const journal = await LiveDraftJournal.open('scope', 'document')
  const old = journal.stage(project('Antes'), 1, 4)
  const newer = journal.stage(project('Depois'), 5, 6)
  await Promise.all([old.saved, newer.saved])
  await journal.confirm(old.draft, 7)
  const [retained] = await journal.list()
  expect(retained?.revision).toBe(5)
  expect(retained?.writerEpoch).toBe(6)
  journal.close()
})
