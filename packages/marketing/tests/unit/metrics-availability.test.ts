import { describe, expect, spyOn, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  followerValue,
  metricCount,
  metricSnapshotView,
} from '../../src/domain/metrics/availability'
import type { PublicationSnapshot } from '../../src/domain/ports/metrics-repository.port'
import { MetaClient } from '../../src/infrastructure/gateways/meta/meta-client'
import { TikTokClient } from '../../src/infrastructure/gateways/tiktok/tiktok-client'
import { YoutubeClient } from '../../src/infrastructure/gateways/youtube/youtube-client'

describe('disponibilidade das métricas', () => {
  test('seguidores antigos, ausentes e zero explícito têm significados distintos', () => {
    const old = {
      id: randomUUID(),
      socialAccountId: randomUUID(),
      capturedAt: new Date(),
      followers: 0,
      collectionVersion: 0,
      raw: {},
    }
    expect(followerValue(old)).toBeNull()
    expect(followerValue({ ...old, collectionVersion: 1 })).toBe(0)
    expect(followerValue({ ...old, followers: 45 })).toBe(45)
    expect(followerValue({ ...old, collectionVersion: 1, followers: null })).toBeNull()
  })
  test('contadores de conta usam ausência real, incluindo inscritos ocultos do YouTube', async () => {
    const fetch = spyOn(globalThis, 'fetch')
    try {
      const meta = new MetaClient({ graphVersion: 'v-test' }),
        youtube = new YoutubeClient(),
        tiktok = new TikTokClient()
      fetch.mockResolvedValueOnce(Response.json({}))
      expect(
        (await meta.getIgAccountStats({ accessToken: 'review-only', igUserId: 'review' }))
          .followers,
      ).toBeNull()
      fetch.mockResolvedValueOnce(Response.json({ followers_count: 0 }))
      expect(
        (await meta.getFbPageStats({ accessToken: 'review-only', pageId: 'review' })).followers,
      ).toBe(0)
      fetch.mockResolvedValueOnce(Response.json({ data: { user: {} }, error: { code: 'ok' } }))
      expect((await tiktok.getUserStats('review-only')).followers).toBeNull()
      fetch.mockResolvedValueOnce(
        Response.json({
          items: [
            { id: 'review', statistics: { subscriberCount: '0', hiddenSubscriberCount: true } },
          ],
        }),
      )
      expect((await youtube.getChannelStats('review-only'))?.subscriberCount).toBeNull()
      fetch.mockResolvedValueOnce(
        Response.json({
          items: [
            { id: 'review', statistics: { subscriberCount: '0', hiddenSubscriberCount: false } },
          ],
        }),
      )
      expect(await youtube.getChannelStats('review-only')).toMatchObject({
        subscriberCount: 0,
        viewCount: null,
        videoCount: null,
      })
      expect(fetch).toHaveBeenCalledTimes(5)
    } finally {
      fetch.mockRestore()
    }
  })
  test('separa zero observado, ausência e zero histórico ambíguo sem modificar o registro', () => {
    const raw: PublicationSnapshot = {
      id: randomUUID(),
      publicationId: randomUUID(),
      capturedAt: new Date(),
      collectionVersion: 0,
      views: 0,
      likes: 2,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: null,
      watchTimeSeconds: null,
      avgWatchRatio: null,
      raw: { source: 'historical' },
    }
    const old = metricSnapshotView(raw)
    expect(old.views).toBeNull()
    expect(old.availability.views).toBe('legacy-unknown')
    expect(old.likes).toBe(2)
    expect(old.availability.likes).toBe('observed')
    const current = metricSnapshotView({ ...raw, collectionVersion: 1, shares: null })
    expect(current.views).toBe(0)
    expect(current.availability.views).toBe('observed')
    expect(current.shares).toBeNull()
    expect(current.availability.shares).toBe('unavailable')
    expect(raw.views).toBe(0)
    expect(raw.collectionVersion).toBe(0)
    for (const value of [null, undefined, '', ' ', false, -1, NaN, Infinity, 'invalid', 1.5])
      expect(metricCount(value)).toBeNull()
    expect(metricCount('0')).toBe(0)
    expect(metricCount('128')).toBe(128)
  })
  test('parsers reais da Meta, YouTube e TikTok preservam campos ausentes e zeros fornecidos', async () => {
    const fetch = spyOn(globalThis, 'fetch')
    try {
      const meta = new MetaClient({ graphVersion: 'v-test' })
      fetch.mockResolvedValueOnce(
        Response.json({
          item: {
            like_count: 0,
            insights: {
              data: [
                { name: 'views', values: [{ value: 0 }] },
                { name: 'shares', values: [] },
              ],
            },
          },
        }),
      )
      const ig = (
        await meta.getIgMediaStats({ accessToken: 'test-no-token', mediaIds: ['item'] })
      ).get('item')
      expect(ig).toMatchObject({
        views: 0,
        likes: 0,
        comments: null,
        shares: null,
        saves: null,
        reach: null,
      })
      fetch.mockResolvedValueOnce(
        Response.json({ item: { reactions: { summary: { total_count: 0 } } } }),
      )
      expect(
        (await meta.getFbPostStats({ accessToken: 'test-no-token', postIds: ['item'] })).get(
          'item',
        ),
      ).toMatchObject({ likes: 0, comments: null, shares: null })
      fetch.mockResolvedValueOnce(
        Response.json({ items: [{ id: 'item', statistics: { viewCount: '0' } }] }),
      )
      expect(
        (await new YoutubeClient().getVideoStats('test-no-token', ['item'])).get('item'),
      ).toEqual({ views: 0, likes: null, comments: null })
      fetch.mockResolvedValueOnce(
        Response.json({ data: { videos: [{ id: 'item', like_count: 0 }] }, error: { code: 'ok' } }),
      )
      expect(
        (
          await new TikTokClient().queryVideoStats({
            accessToken: 'test-no-token',
            videoIds: ['item'],
          })
        ).get('item'),
      ).toMatchObject({ views: null, likes: 0, comments: null, shares: null })
      expect(fetch).toHaveBeenCalledTimes(4)
    } finally {
      fetch.mockRestore()
    }
  })
})
