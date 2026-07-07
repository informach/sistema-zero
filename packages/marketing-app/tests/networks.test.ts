import { describe, expect, test } from 'bun:test'
import {
  byteLength,
  captionLimitFor,
  countHashtags,
  FORMAT_LABELS,
  FORMAT_NETWORK,
  hashtagLimitFor,
  isDescriptionOverLimit,
  isOverLimit,
  NETWORK_LABELS,
  NETWORK_LIMITS,
  PUBLICATION_FORMATS,
  titleHasForbiddenChars,
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

  test('tags do YouTube: 500 caracteres no TOTAL (vírgulas inclusas)', () => {
    expect(NETWORK_LIMITS.youtube.tags).toBe(500)
  })
})

describe('byteLength', () => {
  test('ASCII: 1 byte por caractere', () => {
    expect(byteLength('abc')).toBe(3)
    expect(byteLength('')).toBe(0)
  })

  test('acento conta 2 bytes e emoji conta 4', () => {
    expect(byteLength('ç')).toBe(2)
    expect(byteLength('programação')).toBe(13)
    expect(byteLength('🚀')).toBe(4)
  })
})

describe('isDescriptionOverLimit', () => {
  test('YouTube: reprova por BYTES, não por caracteres', () => {
    // 2501 cedilhas = 2501 caracteres (< 5000), mas 5002 bytes (> 5000).
    const accented = 'ç'.repeat(2501)
    expect(accented.length).toBeLessThan(5000)
    expect(isDescriptionOverLimit('yt_video', accented)).toBe(true)
    expect(isDescriptionOverLimit('yt_short', accented)).toBe(true)
  })

  test('exatamente 5000 bytes ainda passa', () => {
    expect(isDescriptionOverLimit('yt_video', 'a'.repeat(5000))).toBe(false)
    expect(isDescriptionOverLimit('yt_video', 'a'.repeat(5001))).toBe(true)
  })

  test('fora do YouTube é sempre false (limite lá é em caracteres)', () => {
    expect(isDescriptionOverLimit('ig_feed', 'ç'.repeat(9000))).toBe(false)
    expect(isDescriptionOverLimit('fb_post', 'ç'.repeat(90000))).toBe(false)
    expect(isDescriptionOverLimit('tt_video', 'ç'.repeat(9000))).toBe(false)
  })
})

describe('titleHasForbiddenChars', () => {
  test('YouTube recusa < e >', () => {
    expect(titleHasForbiddenChars('aula 1 <nova>')).toBe(true)
    expect(titleHasForbiddenChars('a > b')).toBe(true)
    expect(titleHasForbiddenChars('só o sinal <')).toBe(true)
  })

  test('título limpo passa', () => {
    expect(titleHasForbiddenChars('Como programar seu primeiro jogo')).toBe(false)
    expect(titleHasForbiddenChars('')).toBe(false)
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

  test('YouTube conta BYTES: acentos estouram antes de 5000 caracteres', () => {
    const accented = 'ç'.repeat(2501) // 5002 bytes
    expect(isOverLimit('yt_video', accented)).toBe(true)
    expect(isOverLimit('yt_short', accented)).toBe(true)
    // O mesmo texto passa onde a régua é de caracteres.
    expect(isOverLimit('fb_post', accented)).toBe(false)
    expect(isOverLimit('yt_video', 'a'.repeat(5000))).toBe(false)
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
