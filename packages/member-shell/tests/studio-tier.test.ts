import { describe, expect, test } from 'bun:test'
import { resolveStudioTier } from '../src/lib/studio-tier'

describe('resolveStudioTier — gate do Estúdio Completo por rank', () => {
  test('noob/coder (Faísca/Construtor) → só Blocos + iniciante, SEM pro', () => {
    for (const slug of ['noob', 'coder']) {
      const t = resolveStudioTier(slug, undefined)
      expect(t.level).toBe('iniciante')
      expect(t.allowedModes).toEqual(['blocks'])
      expect(t.allowLevelReveal).toBe(false)
      expect(t.pro).toBe(false)
    }
  })

  test('hacker/elite (Inventor/Mestre) → Blocos + Ponte + intermediário, SEM pro', () => {
    for (const slug of ['hacker', 'elite']) {
      const t = resolveStudioTier(slug, undefined)
      expect(t.level).toBe('intermediario')
      expect(t.allowedModes).toEqual(['blocks', 'bridge'])
      expect(t.allowLevelReveal).toBe(false)
      expect(t.pro).toBe(false)
    }
  })

  test('god (Lenda) → Blocos + Ponte + avançado + PRO (modo Código)', () => {
    const t = resolveStudioTier('god', undefined)
    expect(t.level).toBe('avancado')
    expect(t.allowedModes).toEqual(['blocks', 'bridge'])
    expect(t.pro).toBe(true)
  })

  test('equipe (superadmin/admin/staff) = god (com pro), independentemente do rank', () => {
    for (const role of ['superadmin', 'admin', 'staff']) {
      const t = resolveStudioTier('noob', role)
      expect(t.level).toBe('avancado')
      expect(t.allowedModes).toEqual(['blocks', 'bridge'])
      expect(t.pro).toBe(true)
    }
  })

  test('slug desconhecido/ausente → iniciante sem pro (fallback noob)', () => {
    expect(resolveStudioTier(undefined, undefined).level).toBe('iniciante')
    expect(resolveStudioTier('xyz', undefined).allowedModes).toEqual(['blocks'])
    expect(resolveStudioTier('xyz', undefined).pro).toBe(false)
  })

  test('papel comum (customer) NÃO privilegia', () => {
    const t = resolveStudioTier('noob', 'customer')
    expect(t.level).toBe('iniciante')
    expect(t.pro).toBe(false)
  })
})
