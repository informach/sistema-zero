import { readSynchronousExitJournal } from './synchronousExitJournalRead'
import { expect, test } from 'bun:test'
import {
  acknowledgeSynchronousExitJournal,
  captureExitJournalStorage,
  hasSynchronousExitJournal,
  stageSynchronousExitJournal,
} from './synchronousExitJournal'

function localStorageFixture() {
  const storage = globalThis.localStorage
  const scope = `sync-journal-test-${crypto.randomUUID()}`
  return {
    storage,
    scope,
    dispose() {
      for (const key of Object.keys(storage))
        if (
          key.startsWith('sz:studio-exit:') &&
          key.split('|')[1]?.startsWith(encodeURIComponent(scope))
        )
          storage.removeItem(key)
    },
  }
}

test('exit journal captures complete values under immutable scope/project/writer/token keys', () => {
  const fixture = localStorageFixture()
  try {
    const storage = fixture.storage
    const identity = { projectId: 'project|one', writer: 'writer', token: 'one' }
    const payload = { future: { keep: undefined }, value: 'latest' }
    stageSynchronousExitJournal(storage, `${fixture.scope}|one`, identity, payload)
    expect(readSynchronousExitJournal(storage, `${fixture.scope}|two`)).toEqual([])
    expect(readSynchronousExitJournal(storage, `${fixture.scope}|one`, 'other')).toEqual([])
    const [first] = readSynchronousExitJournal(storage, `${fixture.scope}|one`, identity.projectId)
    if (!first) throw new Error('Missing staged journal')
    expect(first.value).toEqual(payload)
    stageSynchronousExitJournal(
      storage,
      `${fixture.scope}|one`,
      { ...identity, token: 'two' },
      { value: 'newer' },
    )
    acknowledgeSynchronousExitJournal(storage, first)
    const remaining = readSynchronousExitJournal(storage, `${fixture.scope}|one`)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.token).toBe('two')
  } finally {
    fixture.dispose()
  }
})

test('another payload cannot overwrite a token; acknowledging an old copy cannot remove a replacement', () => {
  const fixture = localStorageFixture()
  try {
    const storage = fixture.storage
    const identity = { projectId: 'p', writer: 'w', token: 't' }
    const key = stageSynchronousExitJournal(storage, fixture.scope, identity, { value: 'original' })
    const [entry] = readSynchronousExitJournal(storage, fixture.scope)
    if (!entry) throw new Error('Missing staged journal')
    expect(() =>
      stageSynchronousExitJournal(storage, fixture.scope, identity, { value: 'replacement' }),
    ).toThrow()
    expect(readSynchronousExitJournal(storage, fixture.scope)[0]?.value).toEqual({
      value: 'original',
    })
    storage.setItem(key, 'future-or-corrupt-value')
    expect(() => acknowledgeSynchronousExitJournal(storage, entry)).toThrow()
    expect(storage.getItem(key)).toBe('future-or-corrupt-value')
  } finally {
    fixture.dispose()
  }
})

test('quota and unavailable storage never acknowledge a new journal or erase a previous one', () => {
  const fixture = localStorageFixture()
  try {
    const storage = fixture.storage
    stageSynchronousExitJournal(
      storage,
      fixture.scope,
      { projectId: 'p', writer: 'w', token: 'old' },
      { value: 'original' },
    )
    const blocked = new Proxy(storage, {
      get(target, property) {
        if (property === 'setItem')
          return () => {
            throw new DOMException('Full', 'QuotaExceededError')
          }
        const value = Reflect.get(target, property)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    expect(() =>
      stageSynchronousExitJournal(
        blocked,
        fixture.scope,
        { projectId: 'p', writer: 'w', token: 'new' },
        { value: 'draft' },
      ),
    ).toThrow()
    expect(() =>
      stageSynchronousExitJournal(
        undefined,
        fixture.scope,
        { projectId: 'p', writer: 'w', token: 'new' },
        {},
      ),
    ).toThrow()
    expect(readSynchronousExitJournal(storage, fixture.scope)).toHaveLength(1)
    expect(readSynchronousExitJournal(storage, fixture.scope)[0]?.value).toEqual({
      value: 'original',
    })
  } finally {
    fixture.dispose()
  }
})

test('future, malformed and over-budget records remain untouched', () => {
  const fixture = localStorageFixture()
  try {
    const storage = fixture.storage
    const key = `sz:studio-exit:2|${encodeURIComponent(fixture.scope)}|p|w|t`
    storage.setItem(key, 'future')
    expect(() => readSynchronousExitJournal(storage, fixture.scope, 'p')).toThrow()
    expect(storage.getItem(key)).toBe('future')
    expect(() =>
      stageSynchronousExitJournal(
        storage,
        fixture.scope,
        { projectId: 'p', writer: 'w', token: 'new' },
        { large: 'x'.repeat(2_000_001) },
      ),
    ).toThrow()
    expect(
      Object.keys(storage).filter((key) => key.includes(encodeURIComponent(fixture.scope))),
    ).toHaveLength(1)
  } finally {
    fixture.dispose()
  }
})

test('a browser policy denial is reported instead of treating inaccessible copies as absent', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Denied', 'SecurityError')
      },
    })
    const denied = captureExitJournalStorage()
    expect(denied).toBeDefined()
    expect(hasSynchronousExitJournal(denied, 'profile')).toBe(true)
    expect(() => readSynchronousExitJournal(denied, 'profile', 'project')).toThrow()
    expect(() =>
      stageSynchronousExitJournal(
        denied,
        'profile',
        {
          projectId: 'project',
          writer: 'writer',
          token: 'token',
        },
        { content: 'keep' },
      ),
    ).toThrow()
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
