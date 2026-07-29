import { describe, expect, test } from 'bun:test'
import { courseSaveError } from '../src/lib/course-errors'

describe('courseSaveError — mensagens específicas dos 409 do salvar curso', () => {
  test('cada código conhecido tem mensagem própria + hint de ação', () => {
    expect(courseSaveError('CAREER_SLOT_CONFLICT', 'x').hint).toBe('occupancy')
    expect(courseSaveError('CONCURRENCY_CONFLICT', 'x').hint).toBe('reload')
    expect(courseSaveError('DUPLICATE_SLUG', 'x').hint).toBe('slug')
    expect(courseSaveError('NO_SHOWCASE_BLOCK', 'x').hint).toBe('showcase')
    // Mensagens não vazam o fallback (são as amigáveis).
    expect(courseSaveError('CAREER_SLOT_CONFLICT', 'x').message).toContain('posição')
    expect(courseSaveError('CONCURRENCY_CONFLICT', 'x').message).toContain('outra aba')
    expect(courseSaveError('NO_SHOWCASE_BLOCK', 'x').message).toContain('vitrine')
  })

  test('código desconhecido → mensagem do servidor, sem hint', () => {
    const mapped = courseSaveError('QUALQUER_COISA', 'Mensagem do members')
    expect(mapped).toEqual({ message: 'Mensagem do members' })
  })
})
