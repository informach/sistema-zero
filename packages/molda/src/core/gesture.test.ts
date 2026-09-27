import { describe, expect, test } from 'bun:test'
import { createGestureCoordinator, type GestureToken } from './gesture'

function fixture() {
  let current = { value: 0 }
  let revision = 0
  const commits: Array<[number, number]> = []
  const preview = (next: typeof current) => {
    current = next
    revision += 1
  }
  const coordinator = createGestureCoordinator({
    current: () => current,
    revision: () => revision,
    preview,
    commit: (before, after) => {
      commits.push([before.value, after.value])
      preview(after)
    },
  })
  return { coordinator, current: () => current, preview, commits }
}

describe('gesture coordinator', () => {
  test('many previews yield one commit and duplicate end events do nothing', () => {
    const f = fixture()
    const token = f.coordinator.begin()
    for (let value = 1; value <= 20; value += 1) f.coordinator.preview(token, { value })
    expect(f.coordinator.commit(token)).toBe(true)
    expect(f.coordinator.commit(token)).toBe(false)
    expect(f.commits).toEqual([[0, 20]])
  })
  test('cancel restores the exact original without recording history', () => {
    const f = fixture()
    const token = f.coordinator.begin()
    f.coordinator.preview(token, { value: 5 })
    expect(f.coordinator.cancel(token)).toBe(true)
    expect(f.current()).toBe(token.before)
    expect(f.commits).toEqual([])
  })
  test('an unrelated revision invalidates preview, commit and cancellation', () => {
    for (const operation of ['preview', 'commit', 'cancel'] as const) {
      const f = fixture()
      const token = f.coordinator.begin()
      f.preview({ value: 90 })
      expect(f.coordinator[operation](token, { value: 10 })).toBe(false)
      expect(f.current().value).toBe(90)
      expect(f.commits).toEqual([])
    }
  })
  test('beginning another gesture closes the first once and invalidates its token', () => {
    const f = fixture()
    const first = f.coordinator.begin()
    f.coordinator.preview(first, { value: 1 })
    const second = f.coordinator.begin()
    expect(f.coordinator.commit(first, { value: 99 })).toBe(false)
    f.coordinator.commit(second, { value: 2 })
    expect(f.commits).toEqual([
      [0, 1],
      [1, 2],
    ])
  })
  test('publication ownership is visible to subscribers and a nested external write cannot resurrect it', () => {
    let current = { value: 0 },
      revision = 0
    let onPublish: (() => void) | null = null
    const commits: number[] = []
    const coordinator = createGestureCoordinator({
      current: () => current,
      revision: () => revision,
      preview(next) {
        current = next
        revision++
        const callback = onPublish
        onPublish = null
        callback?.()
      },
      commit(_before, after) {
        commits.push(after.value)
      },
    })
    const token = coordinator.begin()
    onPublish = () => {
      expect(coordinator.isCurrent(token)).toBe(true)
      current = { value: 99 }
      revision++
      expect(coordinator.isCurrent(token)).toBe(false)
      expect(coordinator.cancel(token)).toBe(false)
    }
    expect(coordinator.preview(token, { value: 1 })).toBe(false)
    expect(current.value).toBe(99)
    expect(coordinator.commit(token)).toBe(false)
    const fresh = coordinator.begin()
    expect(commits).toEqual([])
    expect(coordinator.cancel(fresh)).toBe(true)
    expect(current.value).toBe(99)
  })
  test('a subscriber can cancel or start another gesture while a preview is being published', () => {
    for (const operation of ['cancel', 'begin'] as const) {
      let current = { value: 0 },
        revision = 0
      let onPublish: (() => void) | null = null
      const commits: Array<[number, number]> = [],
        next: { token: GestureToken<typeof current> | null } = { token: null }
      const coordinator = createGestureCoordinator({
        current: () => current,
        revision: () => revision,
        preview(value) {
          current = value
          revision++
          const callback = onPublish
          onPublish = null
          callback?.()
        },
        commit(before, after) {
          commits.push([before.value, after.value])
          current = after
          revision++
        },
      })
      const first = coordinator.begin()
      onPublish = () => {
        if (operation === 'cancel') expect(coordinator.cancel(first)).toBe(true)
        else next.token = coordinator.begin()
      }
      expect(coordinator.preview(first, { value: 1 })).toBe(false)
      expect(coordinator.commit(first)).toBe(false)
      expect(coordinator.cancel(first)).toBe(false)
      if (operation === 'cancel') {
        expect(current.value).toBe(0)
        expect(commits).toEqual([])
      } else {
        if (!next.token) throw new Error('Expected a replacement owner')
        expect(coordinator.isCurrent(next.token)).toBe(true)
        expect(coordinator.preview(next.token, { value: 2 })).toBe(true)
        expect(coordinator.commit(next.token)).toBe(true)
        expect(commits).toEqual([
          [0, 1],
          [1, 2],
        ])
      }
    }
  })
  test('unobserved external publication and thrown ports cannot leave a committable old gesture', () => {
    for (const fails of [false, true]) {
      let current = { value: 0 },
        revision = 0
      const commits: number[] = []
      const coordinator = createGestureCoordinator({
        current: () => current,
        revision: () => revision,
        preview() {
          current = { value: 99 }
          revision++
          if (fails) throw new Error('External subscriber failed')
        },
        commit(_before, after) {
          commits.push(after.value)
        },
      })
      const token = coordinator.begin()
      if (fails)
        expect(() => coordinator.preview(token, { value: 1 })).toThrow('External subscriber failed')
      else expect(coordinator.preview(token, { value: 1 })).toBe(false)
      expect(coordinator.isCurrent(token)).toBe(false)
      expect(coordinator.cancel(token)).toBe(false)
      coordinator.begin()
      expect(current.value).toBe(99)
      expect(commits).toEqual([])
    }
  })
})
