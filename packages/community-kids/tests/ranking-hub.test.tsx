import { afterEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RankingHub } from '../src/app/(app)/ranking/ranking-hub'
import type { LeagueMeView, RankingLeaderboardView } from '../src/lib/types'

const originalFetch = globalThis.fetch

const ranking: RankingLeaderboardView = {
  items: [
    {
      position: 1,
      xp: 900,
      isMe: false,
      firstName: 'Bia',
      photoUrl: null,
      levelSlug: 'coder',
      profileId: '22222222-2222-2222-2222-222222222222',
    },
    {
      position: 2,
      xp: 700,
      isMe: false,
      firstName: 'Caio',
      photoUrl: null,
      levelSlug: 'noob',
    },
    {
      position: 3,
      xp: 600,
      isMe: false,
      firstName: 'Duda',
      photoUrl: null,
      levelSlug: 'hacker',
    },
    {
      position: 4,
      xp: 500,
      isMe: false,
      firstName: 'Eli',
      photoUrl: null,
      levelSlug: 'noob',
    },
  ],
  total: 5,
  limit: 20,
  nextCursor: 'cursor-1',
  me: {
    position: 5,
    xp: 400,
    isMe: true,
    firstName: 'Lia',
    photoUrl: null,
    levelSlug: 'coder',
  },
}

const league: LeagueMeView = {
  tier: 'bronze',
  weekKey: 'w:2026-08-31',
  promotionCount: 0,
  relegationCount: 0,
  myPosition: 1,
  entries: [{ position: 1, weeklyXp: 40, isMe: true, firstName: 'Lia' }],
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('central de ranking kids', () => {
  test('mostra pódio, respeita opt-in de link e fixa a posição do aluno fora da página', () => {
    render(<RankingHub initialRanking={ranking} league={league} />)

    expect(screen.getByText('Bia').closest('a')?.getAttribute('href')).toBe(
      '/crianca/22222222-2222-2222-2222-222222222222',
    )
    expect(screen.getByText('Caio').closest('a')).toBeNull()
    expect(screen.getByText('Sua posição')).toBeTruthy()
    expect(screen.getByText('Você')).toBeTruthy()
  })

  test('alterna para a liga e carrega a próxima página do geral', async () => {
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/api/members/gamification/ranking?limit=20&cursor=cursor-1')
      return Response.json({
        ...ranking,
        items: [ranking.me],
        nextCursor: null,
      })
    })
    globalThis.fetch = Object.assign(fetchMock, originalFetch)

    render(<RankingHub initialRanking={ranking} league={league} />)
    fireEvent.click(screen.getByRole('button', { name: 'Minha liga' }))
    expect(screen.getByText('Liga Bronze')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ranking geral' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais posições' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Sua posição')).toBeNull()
  })
})
