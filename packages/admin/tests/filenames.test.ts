import { describe, expect, test } from 'bun:test'
import { safeExtension, sanitizeFilename } from '../src/lib/filenames'

describe('safeExtension', () => {
  test('normaliza p/ minúsculo', () => {
    expect(safeExtension('video.MP4')).toBe('mp4')
    expect(safeExtension('doc.PDF')).toBe('pdf')
  })

  test('usa só o último segmento', () => {
    expect(safeExtension('backup.tar.gz')).toBe('gz')
  })

  test('extensão fora do padrão (caracteres/da tamanho) → bin', () => {
    expect(safeExtension('file.<script>')).toBe('bin')
    expect(safeExtension('x.extensaolonga1')).toBe('bin') // >8 chars
    expect(safeExtension('x.')).toBe('bin')
    expect(safeExtension('x.path/trav')).toBe('bin')
  })
})

describe('sanitizeFilename', () => {
  test('remove diacríticos e troca separadores por hífen', () => {
    expect(sanitizeFilename('Relatório Mensal.pdf')).toBe('Relatorio-Mensal.pdf')
  })

  test('colapsa hífens repetidos', () => {
    expect(sanitizeFilename('a  ***  b.txt')).toBe('a-b.txt')
  })

  test('corta em 120 chars', () => {
    expect(sanitizeFilename(`${'a'.repeat(300)}.pdf`)).toHaveLength(120)
  })

  test('vazio cai no fallback', () => {
    expect(sanitizeFilename('')).toBe('arquivo')
  })
})
