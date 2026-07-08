import { describe, expect, it } from 'bun:test'
import {
  buildFollowersChartRows,
  followersDelta,
  followersDeltaByNetwork,
  seriesColor,
  shortDaySp,
} from '../src/lib/metrics'
import type { FollowersSeriesView } from '../src/lib/types'

const view: FollowersSeriesView = {
  series: [
    {
      accountId: 'ig-1',
      network: 'instagram',
      displayName: 'IG',
      points: [
        { date: '2026-07-01', followers: 100 },
        { date: '2026-07-03', followers: 130 },
      ],
    },
    {
      accountId: 'yt-1',
      network: 'youtube',
      displayName: 'YT',
      points: [
        { date: '2026-07-02', followers: 500 },
        { date: '2026-07-03', followers: 490 },
      ],
    },
  ],
}

describe('buildFollowersChartRows', () => {
  it('faz a UNIÃO ordenada das datas; conta sem ponto no dia fica ausente', () => {
    const rows = buildFollowersChartRows(view)
    expect(rows.map((r) => r.date)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03'])
    expect(rows[0]).toEqual({ date: '2026-07-01', 'ig-1': 100 })
    expect(rows[1]).toEqual({ date: '2026-07-02', 'yt-1': 500 })
    expect(rows[2]).toEqual({ date: '2026-07-03', 'ig-1': 130, 'yt-1': 490 })
  })

  it('sem séries → sem linhas', () => {
    expect(buildFollowersChartRows({ series: [] })).toEqual([])
  })
})

describe('followersDelta / followersDeltaByNetwork', () => {
  it('delta = último − primeiro; queda vira negativo', () => {
    expect(followersDelta(view.series[0] as FollowersSeriesView['series'][number])).toBe(30)
    expect(followersDelta(view.series[1] as FollowersSeriesView['series'][number])).toBe(-10)
  })

  it('série com 1 ponto não tem delta (null, não 0)', () => {
    expect(
      followersDelta({
        accountId: 'a',
        network: 'facebook',
        displayName: 'FB',
        points: [{ date: '2026-07-01', followers: 10 }],
      }),
    ).toBeNull()
  })

  it('por rede: soma as contas; rede sem série → null', () => {
    expect(followersDeltaByNetwork(view, 'instagram')).toBe(30)
    expect(followersDeltaByNetwork(view, 'facebook')).toBeNull()
  })
})

describe('seriesColor / shortDaySp', () => {
  it('cores ciclam pelo índice e o rótulo encurta a data', () => {
    expect(seriesColor(0)).toBe(seriesColor(6))
    expect(shortDaySp('2026-07-05')).toBe('05/07')
  })
})
