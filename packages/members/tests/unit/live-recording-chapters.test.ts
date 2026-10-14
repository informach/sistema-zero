import { describe, expect, test } from 'bun:test'
import { ValidationError } from '@sistemazero/core/errors'
import { liveProjectKey, liveVimeoRecording } from '../../src/domain/live/live-course-rules'
import { recordingChapters, recordingSegmentsOf } from '../../src/domain/live/recording-chapters'

const at = (minute: number, second = 0) =>
  new Date(Date.UTC(2026, 10, 7, 17, minute, second)).toISOString()
const segment = (from: number, to: number, durationMs = (to - from) * 60_000) => ({
  startsAt: at(from),
  endsAt: at(to),
  durationMs,
})

describe('capítulos da gravação', () => {
  test('marca no trecho, na pausa, antes do primeiro e depois do último', () => {
    // 17:00–17:10 recorded, 17:10–17:20 paused, 17:20–17:30 recorded, then stopped.
    const segments = [segment(0, 10), segment(20, 30)]
    expect(
      recordingChapters(
        [
          { sectionId: 'antes', at: at(0, 0) },
          { sectionId: 'trecho', at: at(5, 30) },
          { sectionId: 'pausa', at: at(15) },
          { sectionId: 'depois-da-pausa', at: at(25) },
          { sectionId: 'fora', at: at(45) },
        ],
        segments,
      ),
    ).toEqual([
      { sectionId: 'antes', seconds: 0 },
      { sectionId: 'trecho', seconds: 330 },
      { sectionId: 'pausa', seconds: 600 },
      { sectionId: 'depois-da-pausa', seconds: 900 },
    ])
  })

  test('a duração real do arquivo manda; capítulos nunca voltam; marcas fora de ordem são ordenadas', () => {
    // The wall clock says 10 minutes but the file has 9: a mark at the end of it is clamped.
    const segments = [segment(0, 10, 540_000), segment(10, 20)]
    expect(
      recordingChapters(
        [
          { sectionId: 'b', at: at(10) },
          { sectionId: 'a', at: at(9, 59) },
        ],
        segments,
      ),
    ).toEqual([
      { sectionId: 'a', seconds: 540 },
      { sectionId: 'b', seconds: 540 },
    ])
    expect(recordingChapters([{ sectionId: 'x', at: 'ontem' }], segments)).toEqual([])
    expect(recordingChapters([{ sectionId: 'x', at: at(1) }], [])).toEqual([])
  })

  test('linha do tempo do gravador é validada antes de virar capítulo', () => {
    const piece = { startsAt: at(0), endsAt: at(0, 20), durationMs: 20_000 }
    expect(recordingSegmentsOf([piece])).toEqual([piece])
    for (const raw of [
      null,
      'x',
      [{ startsAt: 'x', endsAt: at(1), durationMs: 1000 }],
      [{ startsAt: at(0), endsAt: at(1), durationMs: 0 }],
      [{ startsAt: at(0), endsAt: at(1), durationMs: 30_001 }],
      Array.from({ length: 1441 }, () => segment(0, 0, 1000)),
    ])
      expect(recordingSegmentsOf(raw)).toBeNull()
    // Extra fields of the manifest (key, checksum) never travel further.
    expect(recordingSegmentsOf([{ ...segment(0, 0, 1000), key: 'live/x', checksum: 'y' }])).toEqual(
      [segment(0, 0, 1000)],
    )
  })
})

describe('regras do curso ao vivo', () => {
  test('o endereço do Vimeo é o do player do MESMO vídeo, com no máximo o hash de privacidade', () => {
    expect(
      liveVimeoRecording({
        videoId: '123',
        embedUrl: 'https://player.vimeo.com/video/123?h=abc123',
        status: 'ready',
      }),
    ).toEqual({
      videoId: '123',
      embedUrl: 'https://player.vimeo.com/video/123?h=abc123',
      status: 'ready',
    })
    expect(
      liveVimeoRecording({
        videoId: '123',
        embedUrl: 'https://player.vimeo.com/video/123',
        status: 'failed',
      }).embedUrl,
    ).toBe('https://player.vimeo.com/video/123')
    for (const input of [
      { videoId: '12a', embedUrl: 'https://player.vimeo.com/video/12a', status: 'ready' },
      { videoId: '123', embedUrl: 'https://player.vimeo.com/video/123', status: 'pronto' },
      { videoId: '123', embedUrl: 'nada', status: 'ready' },
      { videoId: '123', embedUrl: 'http://player.vimeo.com/video/123', status: 'ready' },
      { videoId: '123', embedUrl: 'https://player.vimeo.com:8443/video/123', status: 'ready' },
      { videoId: '123', embedUrl: 'https://a:b@player.vimeo.com/video/123', status: 'ready' },
      { videoId: '123', embedUrl: 'https://player.vimeo.com.evil.io/video/123', status: 'ready' },
      { videoId: '123', embedUrl: 'https://player.vimeo.com/video/1234', status: 'ready' },
      { videoId: '123', embedUrl: 'https://player.vimeo.com/video/123/', status: 'ready' },
      {
        videoId: '123',
        embedUrl: 'https://player.vimeo.com/video/123?autoplay=1',
        status: 'ready',
      },
      { videoId: '123', embedUrl: 'https://player.vimeo.com/video/123?h=a&h=b', status: 'ready' },
      { videoId: '123', embedUrl: 'https://player.vimeo.com/video/123?h=<x>', status: 'ready' },
      { videoId: '123', embedUrl: 'https://player.vimeo.com/video/123#t=10', status: 'ready' },
      {
        videoId: '123',
        embedUrl: 'javascript:alert(1)//player.vimeo.com/video/123',
        status: 'ready',
      },
    ])
      expect(() => liveVimeoRecording(input)).toThrow(ValidationError)
  })

  test('chave do projeto: a cadeia une as aulas; sem cadeia, o projeto é do bloco', () => {
    expect(liveProjectKey('c1', { blockId: 'b1', chain: 'meu-jogo' })).toBe(
      'course:c1:chain:meu-jogo',
    )
    expect(liveProjectKey('c1', { blockId: 'b2', chain: 'meu-jogo' })).toBe(
      'course:c1:chain:meu-jogo',
    )
    expect(liveProjectKey('c1', { blockId: 'b1', chain: null })).toBe('course:c1:block:b1')
    expect(liveProjectKey('c2', { blockId: 'b1', chain: 'meu-jogo' })).not.toBe(
      liveProjectKey('c1', { blockId: 'b1', chain: 'meu-jogo' }),
    )
  })
})
