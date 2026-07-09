import { describe, expect, test } from 'bun:test'
import { resolveStudioTier } from '../src/lib/studio-tier'

describe('resolveStudioTier — gate do Estúdio Completo por rank', () => {
  test('noob/coder (Faísca/Construtor) → só Blocos + iniciante', () => {
    for (const slug of ['noob', 'coder']) {
      const t = resolveStudioTier(slug, undefined)
      expect(t.level).toBe('iniciante')
      expect(t.allowedModes).toEqual(['blocks'])
      expect(t.allowLevelReveal).toBe(false)
    }
  })

  test('hacker/elite (Inventor/Mestre) → Blocos + Ponte + intermediário', () => {
    for (const slug of ['hacker', 'elite']) {
      const t = resolveStudioTier(slug, undefined)
      expect(t.level).toBe('intermediario')
      expect(t.allowedModes).toEqual(['blocks', 'bridge'])
      expect(t.allowLevelReveal).toBe(false)
    }
  })

  test('god (Lenda) → Blocos + Ponte + avançado, SEM código (adiado)', () => {
    const t = resolveStudioTier('god', undefined)
    expect(t.level).toBe('avancado')
    expect(t.allowedModes).toEqual(['blocks', 'bridge'])
    expect(t.allowedModes).not.toContain('code')
  })

  test('equipe (superadmin/admin/staff) = god, independentemente do rank', () => {
    for (const role of ['superadmin', 'admin', 'staff']) {
      const t = resolveStudioTier('noob', role)
      expect(t.level).toBe('avancado')
      expect(t.allowedModes).toEqual(['blocks', 'bridge'])
    }
  })

  test('slug desconhecido/ausente → iniciante (fallback noob)', () => {
    expect(resolveStudioTier(undefined, undefined).level).toBe('iniciante')
    expect(resolveStudioTier('xyz', undefined).allowedModes).toEqual(['blocks'])
  })

  test('papel comum (customer) NÃO privilegia', () => {
    expect(resolveStudioTier('noob', 'customer').level).toBe('iniciante')
  })
})
