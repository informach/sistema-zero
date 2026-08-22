import { describe, expect, test } from 'bun:test'
import {
  classifyMime,
  extForMime,
  formatBytes,
  HUB_ATTACHMENT_LIMITS,
  HUB_UPLOAD_ACCEPT,
  isAllowedMime,
  isHubAttachmentKind,
  isInlineKind,
  isUgcImageInput,
  sanitizeFilename,
  UGC_ANIMATED_IMAGE_MIME,
  UGC_IMAGE_INPUT_MIME,
} from '../src/lib/hub-attachments'

const MB = 1024 * 1024

describe('isHubAttachmentKind', () => {
  test('aceita os 5 tipos válidos', () => {
    for (const k of ['image', 'pdf', 'document', 'audio', 'video']) {
      expect(isHubAttachmentKind(k)).toBe(true)
    }
  })
  test('rejeita desconhecido / não-string', () => {
    expect(isHubAttachmentKind('exe')).toBe(false)
    expect(isHubAttachmentKind('')).toBe(false)
    expect(isHubAttachmentKind(null)).toBe(false)
    expect(isHubAttachmentKind(42)).toBe(false)
  })
})

describe('isAllowedMime (servidor NÃO confia no cliente)', () => {
  test('MIME dentro do allowlist do tipo', () => {
    expect(isAllowedMime('image', 'image/png')).toBe(true)
    expect(isAllowedMime('pdf', 'application/pdf')).toBe(true)
    expect(
      isAllowedMime(
        'document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe(true)
    expect(isAllowedMime('audio', 'audio/mpeg')).toBe(true)
    expect(isAllowedMime('video', 'video/mp4')).toBe(true)
  })
  test('MIME fora do allowlist → false (ex.: SVG = vetor de XSS)', () => {
    expect(isAllowedMime('image', 'image/svg+xml')).toBe(false)
    expect(isAllowedMime('pdf', 'application/x-pdf')).toBe(false)
  })
  test('MIME de OUTRO tipo não vale (cross-kind)', () => {
    expect(isAllowedMime('pdf', 'image/png')).toBe(false)
    expect(isAllowedMime('image', 'application/pdf')).toBe(false)
  })
})

describe('classifyMime', () => {
  test('mapeia MIME → tipo', () => {
    expect(classifyMime('image/jpeg')).toBe('image')
    expect(classifyMime('application/pdf')).toBe('pdf')
    expect(classifyMime('text/csv')).toBe('document')
    expect(classifyMime('audio/wav')).toBe('audio')
    expect(classifyMime('video/webm')).toBe('video')
  })
  test('MIME não suportado → null', () => {
    expect(classifyMime('application/x-msdownload')).toBeNull()
    expect(classifyMime('image/svg+xml')).toBeNull()
  })
})

describe('extForMime', () => {
  test('MIME conhecido → extensão', () => {
    expect(extForMime('application/pdf')).toBe('pdf')
    expect(extForMime('image/jpeg')).toBe('jpg')
    expect(extForMime('video/quicktime')).toBe('mov')
  })
  test('MIME desconhecido → fallback bin', () => {
    expect(extForMime('application/x-foo')).toBe('bin')
  })
})

describe('isInlineKind', () => {
  test('documento NUNCA inline (Office/zip não-executável no browser)', () => {
    expect(isInlineKind('document')).toBe(false)
  })
  test('mídia e PDF abrem inline', () => {
    expect(isInlineKind('image')).toBe(true)
    expect(isInlineKind('pdf')).toBe(true)
    expect(isInlineKind('audio')).toBe(true)
    expect(isInlineKind('video')).toBe(true)
  })
})

describe('sanitizeFilename', () => {
  test('remove diacríticos e troca caracteres inseguros por hífen', () => {
    expect(sanitizeFilename('Lição de Casa.pdf')).toBe('Licao-de-Casa.pdf')
  })
  test('colapsa runs de inseguros num único hífen', () => {
    expect(sanitizeFilename('a   b @@@ c')).toBe('a-b-c')
  })
  test('vazio → "anexo"', () => {
    expect(sanitizeFilename('')).toBe('anexo')
  })
  test('limita o comprimento a 120', () => {
    expect(sanitizeFilename('x'.repeat(300)).length).toBeLessThanOrEqual(120)
  })
})

describe('formatBytes', () => {
  test('B / KB / MB', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * MB)).toBe('5.0 MB')
  })
})

describe('HUB_ATTACHMENT_LIMITS', () => {
  test('espelham os defaults do @sistemazero/hub', () => {
    expect(HUB_ATTACHMENT_LIMITS.maxPerPost).toBe(10)
    expect(HUB_ATTACHMENT_LIMITS.maxBytesByKind.image).toBe(10 * MB)
    expect(HUB_ATTACHMENT_LIMITS.maxBytesByKind.video).toBe(200 * MB)
  })
})

describe('UGC_IMAGE_INPUT_MIME (entrada do re-encode p/ WebP)', () => {
  test('aceita png/jpeg/webp; NÃO leva gif (o WebP daqui pegaria só o 1º quadro)', () => {
    expect(UGC_IMAGE_INPUT_MIME.has('image/png')).toBe(true)
    expect(UGC_IMAGE_INPUT_MIME.has('image/jpeg')).toBe(true)
    expect(UGC_IMAGE_INPUT_MIME.has('image/webp')).toBe(true)
    expect(UGC_IMAGE_INPUT_MIME.has('image/gif')).toBe(false)
  })

  test('gif entra pelo conjunto ANIMADO, que tem caminho próprio', () => {
    expect(UGC_ANIMATED_IMAGE_MIME.has('image/gif')).toBe(true)
    expect(UGC_ANIMATED_IMAGE_MIME.has('image/png')).toBe(false)
  })
})

describe('isUgcImageInput (o que o upload de imagem aceita)', () => {
  test('aceita as paradas E o gif animado', () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(isUgcImageInput(mime)).toBe(true)
    }
  })

  test('recusa o que não é imagem', () => {
    expect(isUgcImageInput('application/pdf')).toBe(false)
    expect(isUgcImageInput('image/svg+xml')).toBe(false)
    expect(isUgcImageInput('')).toBe(false)
  })

  test('o seletor de arquivo OFERECE gif (senão a criança nem consegue escolher)', () => {
    expect(HUB_UPLOAD_ACCEPT.split(',')).toContain('image/gif')
  })
})
