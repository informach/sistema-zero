import { describe, expect, test } from 'bun:test'
import { friendlyFileType } from '../src/lib/format'

describe('friendlyFileType', () => {
  test('MIME conhecido vira sigla usual', () => {
    expect(friendlyFileType('application/pdf')).toBe('PDF')
    expect(friendlyFileType('application/zip')).toBe('ZIP')
    expect(
      friendlyFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBe('DOCX')
    expect(friendlyFileType('image/jpeg')).toBe('JPG')
    expect(friendlyFileType('text/plain')).toBe('TXT')
    expect(friendlyFileType('audio/mpeg')).toBe('MP3')
  })

  test('MIME desconhecido cai p/ o subtipo curto; texto livre passa como veio', () => {
    expect(friendlyFileType('application/x-foo')).toBe('FOO')
    expect(friendlyFileType('PDF')).toBe('PDF')
    expect(friendlyFileType('Apostila em PDF')).toBe('Apostila em PDF')
    expect(friendlyFileType('')).toBe(null)
    expect(friendlyFileType(null)).toBe(null)
  })
})
