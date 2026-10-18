import { describe, expect, test } from 'bun:test'
import { learnerIdentity } from '../src/lib/learner-identity'
import type { SessionUser } from '../src/lib/types'

const account: SessionUser = {
  id: 'adult-account',
  email: 'adult@example.test',
  firstName: 'Adult',
  lastName: '',
  role: 'customer',
  status: 'active',
}

describe('learner identity across communities', () => {
  test('an adult studies as the existing account, without a child profile', () => {
    expect(learnerIdentity(account, 'adult')).toEqual({
      learnerId: account.id,
      accountId: account.id,
      audience: 'adult',
    })
    expect(learnerIdentity(account, 'kids')).toBeNull()
  })
  test('child identity keeps the learner distinct from the responsible account', () => {
    const child: SessionUser = {
      ...account,
      id: 'child-profile',
      activeProfile: { accountId: account.id, name: 'Child' },
    }
    expect(learnerIdentity(child, 'kids')).toEqual({
      learnerId: child.id,
      accountId: account.id,
      audience: 'kids',
    })
    expect(learnerIdentity(child, 'adult')).toBeNull()
  })
  test('absent, inactive and parent sessions cannot become adult learners', () => {
    expect(learnerIdentity(null, 'adult')).toBeNull()
    expect(learnerIdentity({ ...account, status: 'blocked' }, 'adult')).toBeNull()
    expect(
      learnerIdentity(
        {
          ...account,
          kids: { kind: 'parent', authenticatedAt: 1, sessionId: crypto.randomUUID() },
        },
        'adult',
      ),
    ).toBeNull()
  })
})
