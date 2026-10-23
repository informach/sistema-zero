import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'

const now = new Date('2026-10-18T12:00:00Z')
function profile() {
  return ProfileAggregate.create({
    birthDate: '2016-05-10',
    id: randomUUID(),
    accountUserId: randomUUID(),
    name: 'Sofia',
    now,
  })
}

test('new profiles remain pending and cannot be selected before Members admission', () => {
  const pending = profile()
  expect(pending.admissionState).toBe('pending')
  expect(pending.isSelectable).toBe(false)
  expect(pending.isArchived).toBe(false)
})

test('an existing ready profile preserves admission when its details change', () => {
  const ready = ProfileAggregate.restore({ ...profile().toSnapshot(), admissionState: 'ready' })
  ready.updateDetails({ name: 'Sofia Silva' }, now)
  expect(ready.isSelectable).toBe(true)
  expect(ready.toSnapshot().admissionState).toBe('ready')
})

test('archiving revokes selection independently of the durable admission receipt', () => {
  const ready = ProfileAggregate.restore({ ...profile().toSnapshot(), admissionState: 'ready' })
  ready.archive(now)
  expect(ready.isSelectable).toBe(false)
  expect(ready.admissionState).toBe('ready')
  expect(ready.isArchived).toBe(true)
})
