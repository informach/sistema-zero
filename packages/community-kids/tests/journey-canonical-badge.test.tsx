import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LevelBadge } from '../src/components/kids/level-badge'
import { PublicProfileView } from '../src/components/kids/public-profile-view'
import { UserMenu } from '../src/components/kids/user-menu'
import { levelInfo } from '../src/lib/level-info'
import type { PublicProfileDTO, SessionUserWithAvatar } from '../src/lib/types'

afterEach(cleanup)
const child: SessionUserWithAvatar = {
  id: '11111111-1111-4111-8111-111111111111',
  email: '',
  firstName: 'Ana',
  lastName: '',
  role: 'customer',
  status: 'active',
  avatarUrl: null,
  activeProfile: { accountId: '22222222-2222-4222-8222-222222222222', name: 'Ana' },
  kids: { kind: 'student', sessionId: 'badge-session' } as SessionUserWithAvatar['kids'],
}
const profile: PublicProfileDTO = {
  profileId: child.id,
  name: 'Ana',
  xp: 42,
  ranking: null,
  badges: [],
  avatar: { style: 'default', slots: {} },
  avatarPhotoUrl: null,
  room: null,
  games: [],
}

test('canonical badge: missing or unknown identity is explicit and never becomes Faísca', () => {
  for (const levelSlug of [undefined, 'future-unknown-rank']) {
    expect(levelInfo(levelSlug).label).toBe('Posto indisponível')
    const view = render(<LevelBadge levelSlug={levelSlug} />)
    expect(screen.queryAllByText('Faísca').length).toBe(0)
    expect(screen.getByText('Posto indisponível')).toBeTruthy()
    view.unmount()
  }
})

test('canonical badge: a public profile without an available rank keeps its name and XP without a fabricated rank', () => {
  render(<PublicProfileView profile={profile} />)
  expect(screen.getByRole('heading', { name: 'Ana' })).toBeTruthy()
  expect(screen.getByText('42 XP')).toBeTruthy()
  expect(screen.queryAllByText('Faísca').length).toBe(0)
  expect(screen.getByText('Posto indisponível')).toBeTruthy()
})

test('canonical badge: the profile menu cannot replace an unavailable journey with a new first rank', () => {
  render(<UserMenu user={child} gamification={null} />)
  fireEvent.click(screen.getByRole('button', { name: 'Conta' }))
  expect(screen.queryAllByText('Faísca').length).toBe(0)
  expect(screen.getByText('Posto indisponível')).toBeTruthy()
})

test('canonical badge: all eight explicit rank identities are unchanged', () => {
  const identities = [
    ['noob', 'Faísca'],
    ['coder', 'Construtor(a)'],
    ['hacker', 'Inventor(a)'],
    ['explorer', 'Explorador(a) de Mundos'],
    ['elite', 'Mestre dos Jogos'],
    ['architect', 'Arquiteto(a) de Mundos'],
    ['champion', 'Gênio da Criação'],
    ['god', 'Lenda'],
  ] as const
  for (const [slug, label] of identities) {
    const view = render(<LevelBadge levelSlug={slug} />)
    expect(screen.getByText(label)).toBeTruthy()
    view.unmount()
  }
})

test('canonical badge: an own staff account without a child has no learner badge', () => {
  render(<UserMenu user={{ ...child, role: 'staff', activeProfile: undefined, kids: undefined }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Conta' }))
  expect(screen.queryAllByText('Faísca').length).toBe(0)
  expect(screen.queryByText('Posto indisponível') === null).toBe(true)
})
