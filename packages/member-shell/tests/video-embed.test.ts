import { describe, expect, it } from 'bun:test'
import { videoEmbedUrl } from '../src/lib/video-embed'

describe('videoEmbedUrl — o que pode virar iframe na página de uma criança', () => {
  it('Vimeo, nas três formas que a autora cola', () => {
    expect(videoEmbedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
    expect(videoEmbedUrl('https://vimeo.com/123456789/abc123')).toBe(
      'https://player.vimeo.com/video/123456789?h=abc123',
    )
    expect(videoEmbedUrl('https://player.vimeo.com/video/123456789?h=zzz')).toBe(
      'https://player.vimeo.com/video/123456789?h=zzz',
    )
  })

  it('YouTube sai sempre pelo nocookie, venha de onde vier', () => {
    for (const entrada of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://m.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ])
      expect(videoEmbedUrl(entrada)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('⚠️⚠️ host parecido NÃO entra — é o motivo de a régua não ser `includes`', () => {
    for (const falso of [
      'https://vimeo.com.rastreador.net/123456789',
      'https://naovimeo.com/123456789',
      'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
      'https://player.vimeo.com.evil.example/video/1',
    ])
      expect(videoEmbedUrl(falso)).toBeNull()
  })

  it('o que a CSP não libera vira LINK, nunca um iframe em branco', () => {
    for (const outro of [
      'https://drive.google.com/file/d/abc/view',
      'https://www.loom.com/share/abc',
      'https://exemplo.com/video.mp4',
    ])
      expect(videoEmbedUrl(outro)).toBeNull()
  })

  it('entrada torta não atravessa', () => {
    for (const torto of [
      'javascript:alert(1)',
      'http://vimeo.com/123456789',
      'https://vimeo.com/nao-e-numero',
      'https://vimeo.com/',
      'não é url',
      'https://www.youtube.com/watch?v=',
    ])
      expect(videoEmbedUrl(torto)).toBeNull()
  })
})
