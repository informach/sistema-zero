import { expect, test } from 'bun:test'
import { type LessonFormBuffer, LessonFormBufferSlot } from '../src/lib/lesson-form-buffer'

type Form = { title: string; choices: string[] }
const initial = (): Form => ({ title: 'Working title', choices: ['A'] })

test('slot publishes stable opening snapshots after each real transition', () => {
  const slot = new LessonFormBufferSlot<Form>(() => true)
  const snapshots: (LessonFormBuffer<Form> | null)[] = []
  expect(slot.getCurrent()).toBeNull()
  const unsubscribe = slot.subscribe(() => snapshots.push(slot.getCurrent()))
  const first = slot.open('A', initial())
  expect(slot.getCurrent()).toBe(first)
  expect(slot.getCurrent()).toBe(first)
  const renewed = slot.renew(first)
  expect(slot.getCurrent()).toBe(renewed)
  expect(renewed.getSnapshot()).toBe(first.getSnapshot())
  expect(slot.close(first)).toBe(false)
  expect(snapshots).toEqual([first, renewed])
  expect(slot.close(renewed)).toBe(true)
  expect(snapshots).toEqual([first, renewed, null])
  unsubscribe()
  slot.open('B', initial())
  expect(snapshots).toEqual([first, renewed, null])
})

test('open notification may replace A with B without returning a live setter for A', () => {
  const slot = new LessonFormBufferSlot<Form>(() => true)
  const observed: (string | null)[] = []
  let switched = false
  slot.subscribe(() => {
    const current = slot.getCurrent()
    observed.push(current?.targetId ?? null)
    if (!switched && current?.targetId === 'A') {
      switched = true
      slot.close(current)
      slot.open('B', { title: 'B survives', choices: [] })
    }
  })
  const first = slot.open('A', initial())
  expect(observed).toEqual(['A', null, 'B'])
  expect(first.isCurrent()).toBe(false)
  expect(first.update((value) => ({ ...value, title: 'Retired callback' }))).toBe(false)
  expect(slot.getCurrent()?.getSnapshot().title).toBe('B survives')
})

test('close publishes null before a subscriber opens B and never closes that replacement', () => {
  const slot = new LessonFormBufferSlot<Form>(() => true)
  const a = slot.open('A', initial())
  let observedEmpty = false
  slot.subscribe(() => {
    if (!slot.getCurrent()) {
      observedEmpty = true
      slot.open('B', initial())
    }
  })
  expect(slot.close(a)).toBe(true)
  const b = slot.getCurrent()
  expect(observedEmpty).toBe(true)
  expect(b?.targetId).toBe('B')
  expect(slot.close(a)).toBe(false)
  expect(slot.getCurrent()).toBe(b)
})

test('renew subscriber may switch targets without reviving either capability for A', () => {
  const slot = new LessonFormBufferSlot<Form>(() => true)
  const a = slot.open('A', initial())
  const snapshot = a.getSnapshot()
  let switched = false
  slot.subscribe(() => {
    const current = slot.getCurrent()
    if (!switched && current && current !== a) {
      switched = true
      expect(current.getSnapshot()).toBe(snapshot)
      slot.close(current)
      slot.open('B', initial())
    }
  })
  const renewed = slot.renew(a)
  expect(slot.getCurrent()?.targetId).toBe('B')
  expect(a.isCurrent()).toBe(false)
  expect(renewed.isCurrent()).toBe(false)
  expect(renewed.set({ title: 'Stale resume', choices: [] })).toBe(false)
  expect(slot.close(renewed)).toBe(false)
})

test('same-target renewal during open notification preserves only the newest write capability', () => {
  const slot = new LessonFormBufferSlot<Form>(() => true)
  let renewed = false
  slot.subscribe(() => {
    const current = slot.getCurrent()
    if (!renewed && current) {
      renewed = true
      slot.renew(current)
    }
  })
  const returned = slot.open('A', initial())
  const current = slot.getCurrent()
  expect(current).not.toBe(returned)
  expect(current?.targetId).toBe(returned.targetId)
  expect(returned.update((value) => ({ ...value, title: 'Old' }))).toBe(false)
  expect(current?.update((value) => ({ ...value, title: 'Current' }))).toBe(true)
  expect(slot.getCurrent()?.getSnapshot().title).toBe('Current')
})

test('slot identity remains readable while write authority is suspended', () => {
  let editable = true
  const slot = new LessonFormBufferSlot<Form>(() => editable)
  const opening = slot.open('A', initial())
  let notifications = 0
  slot.subscribe(() => notifications++)
  editable = false
  expect(slot.getCurrent()).toBe(opening)
  expect(opening.isCurrent()).toBe(true)
  expect(opening.update((value) => ({ ...value, title: 'Not accepted' }))).toBe(false)
  expect(slot.getCurrent()?.getSnapshot().title).toBe('Working title')
  expect(notifications).toBe(0)
})
