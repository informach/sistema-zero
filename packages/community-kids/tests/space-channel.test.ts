import { describe, expect, test } from 'bun:test'
import { pickInitialChannel, WALL_CHANNEL_SLUG } from '../src/components/kids/space-channel'

describe('pickInitialChannel', () => {
  test('forum usa o primeiro canal da ordenacao', () => {
    const channels = [{ slug: 'geral' }, { slug: WALL_CHANNEL_SLUG }]
    expect(pickInitialChannel(channels, 'forum')).toEqual({ slug: 'geral' })
  })

  test('mural usa o canal parede mesmo quando outro vem antes', () => {
    const channels = [{ slug: 'avisos' }, { slug: WALL_CHANNEL_SLUG }]
    expect(pickInitialChannel(channels, 'wall')).toEqual({ slug: WALL_CHANNEL_SLUG })
  })

  test('mural sem parede nao cai em canal errado', () => {
    expect(pickInitialChannel([{ slug: 'avisos' }], 'wall')).toBeNull()
  })
})
