import { describe, expect, test } from 'bun:test'
import {
  captionLimitFor,
  countHashtags,
  FORMAT_LABELS,
  FORMAT_NETWORK,
  hashtagLimitFor,
  isOverLimit,
  NETWORK_LABELS,
  NETWORK_LIMITS,
  PUBLICATION_FORMATS,
} from '../src/lib/networks'

describe('FORMAT_NETWORK', () => {
  test('todo formato tem rede derivada e rótulo', () => {
    for (const format of PUBLICATION_FORMATS) {
      const network = FORMAT_NETWORK[format]
      expect(NETWORK_LABELS[network]).toBeTruthy()
      expect(FORMAT_LABELS[format]).toBeTruthy()
    }
  })

  test('prefixo do formato bate com a rede', () => {
    expect(FORMAT_NETWORK.ig_reels).toBe('instagram')
    expect(FORMAT_NETWORK.fb_post).toBe('facebook')
    expect(FORMAT_NETWORK.yt_short).toBe('youtube')
    expect(FORMAT_NETWORK.tt_video).toBe('tiktok')
  })
})

describe('captionLimitFor', () => {
  test('Instagram e TikTok: 2200 caracteres', () => {
    expect(captionLimitFor('ig_feed')).toBe(2200)
    expect(captionLimitFor('ig_carousel')).toBe(2200)
    expect(captionLimitFor('ig_reels')).toBe(2200)
    expect(captionLimitFor('ig_story')).toBe(2200)
    expect(captionLimitFor('tt_video')).toBe(2200)
  })

  test('YouTube: a legenda vira a descrição (5000)', () => {
    expect(captionLimitFor('yt_video')).toBe(5000)
    expect(captionLimitFor('yt_short')).toBe(5000)
  })

  test('Facebook: 63206', () => {
    expect(captionLimitFor('fb_post')).toBe(63206)
    expect(captionLimitFor('fb_reels')).toBe(63206)
  })

  test('título do YouTube tem limite próprio (100)', () => {
    expect(NETWORK_LIMITS.youtube.title).toBe(100)
  })
})

describe('hashtagLimitFor', () => {
  test('só o Instagram impõe teto (30)', () => {
    expect(hashtagLimitFor('ig_feed')).toBe(30)
    expect(hashtagLimitFor('ig_reels')).toBe(30)
    expect(hashtagLimitFor('fb_post')).toBeNull()
    expect(hashtagLimitFor('yt_video')).toBeNull()
    expect(hashtagLimitFor('tt_video')).toBeNull()
  })
})

describe('countHashtags', () => {
  test('conta hashtags simples', () => {
    expect(countHashtags('lançamento #sistemazero #kids')).toBe(2)
  })

  test('acentos e dígitos fazem parte da hashtag', () => {
    expect(countHashtags('#programação #dia2 #foco_total')).toBe(3)
  })

  test('# solto e texto sem hashtag não contam', () => {
    expect(countHashtags('sem hashtag nenhuma')).toBe(0)
    expect(countHashtags('cerquilha solta # no meio')).toBe(0)
  })

  test('legenda vazia conta zero', () => {
    expect(countHashtags('')).toBe(0)
  })
})

describe('isOverLimit', () => {
  test('legenda dentro do limite passa', () => {
    expect(isOverLimit('ig_feed', 'legenda curta #ok')).toBe(false)
  })

  test('estourar o teto de caracteres do formato reprova', () => {
    expect(isOverLimit('ig_feed', 'a'.repeat(2201))).toBe(true)
    expect(isOverLimit('tt_video', 'a'.repeat(2201))).toBe(true)
    // O mesmo texto cabe no YouTube (descrição 5000) e no Facebook (63206).
    expect(isOverLimit('yt_video', 'a'.repeat(2201))).toBe(false)
    expect(isOverLimit('fb_post', 'a'.repeat(2201))).toBe(false)
  })

  test('exatamente no limite ainda passa', () => {
    expect(isOverLimit('ig_feed', 'a'.repeat(2200))).toBe(false)
  })

  test('mais de 30 hashtags reprova SÓ no Instagram', () => {
    const caption = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' ')
    expect(isOverLimit('ig_feed', caption)).toBe(true)
    expect(isOverLimit('fb_post', caption)).toBe(false)
    expect(isOverLimit('tt_video', caption)).toBe(false)
  })

  test('30 hashtags exatas passam no Instagram', () => {
    const caption = Array.from({ length: 30 }, (_, i) => `#tag${i}`).join(' ')
    expect(isOverLimit('ig_carousel', caption)).toBe(false)
  })
})
