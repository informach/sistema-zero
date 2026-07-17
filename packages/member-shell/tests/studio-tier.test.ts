import { describe, expect, test } from 'bun:test'
import { resolveStudioTier } from '../src/lib/studio-tier'

describe('resolveStudioTier — gate do Estúdio Completo por rank (escada de 8)', () => {
  test('noob/coder (Faísca/Construtor) → só Blocos + iniciante-2d, SEM pro', () => {
    for (const slug of ['noob', 'coder']) {
      const t = resolveStudioTier(slug, undefined)
      expect(t.level).toBe('iniciante-2d')
      expect(t.allowedModes).toEqual(['blocks'])
      expect(t.allowLevelReveal).toBe(false)
      expect(t.pro).toBe(false)
    }
  })

  test('hacker (Inventor) → só Blocos + iniciante-3d (a porta do 3D abre aqui)', () => {
    const t = resolveStudioTier('hacker', undefined)
    expect(t.level).toBe('iniciante-3d')
    expect(t.allowedModes).toEqual(['blocks'])
    expect(t.pro).toBe(false)
  })

  test('explorer (Explorador de Mundos) → só Blocos + intermediario-2d', () => {
    const t = resolveStudioTier('explorer', undefined)
    expect(t.level).toBe('intermediario-2d')
    expect(t.allowedModes).toEqual(['blocks'])
    expect(t.pro).toBe(false)
  })

  test('elite (Mestre dos Jogos) → a PONTE abre aqui + intermediario-3d, SEM pro', () => {
    const t = resolveStudioTier('elite', undefined)
    expect(t.level).toBe('intermediario-3d')
    expect(t.allowedModes).toEqual(['blocks', 'bridge'])
    expect(t.pro).toBe(false)
  })

  test('architect (Arquiteto de Mundos) → Blocos + Ponte + avancado-2d, SEM pro', () => {
    const t = resolveStudioTier('architect', undefined)
    expect(t.level).toBe('avancado-2d')
    expect(t.allowedModes).toEqual(['blocks', 'bridge'])
    expect(t.pro).toBe(false)
  })

  test('champion (Gênio da Criação) → topo da paleta + PRO (um degrau antes da Lenda)', () => {
    const t = resolveStudioTier('champion', undefined)
    expect(t.level).toBe('avancado-3d')
    expect(t.allowedModes).toEqual(['blocks', 'bridge'])
    expect(t.pro).toBe(true)
  })

  test('god (Lenda) → Blocos + Ponte + avancado-3d + PRO (modo Código)', () => {
    const t = resolveStudioTier('god', undefined)
    expect(t.level).toBe('avancado-3d')
    expect(t.allowedModes).toEqual(['blocks', 'bridge'])
    expect(t.pro).toBe(true)
  })

  test('equipe (superadmin/admin/staff) = god, qualquer que seja o rank', () => {
    for (const role of ['superadmin', 'admin', 'staff']) {
      const t = resolveStudioTier('noob', role)
      expect(t.level).toBe('avancado-3d')
      expect(t.allowedModes).toEqual(['blocks', 'bridge'])
      expect(t.pro).toBe(true)
    }
    // Papel de aluno comum NÃO vira god.
    expect(resolveStudioTier('noob', 'member').level).toBe('iniciante-2d')
  })

  test('slug desconhecido/ausente → noob (degrada seguro)', () => {
    for (const slug of [undefined, 'banana', '']) {
      const t = resolveStudioTier(slug, undefined)
      expect(t.level).toBe('iniciante-2d')
      expect(t.allowedModes).toEqual(['blocks'])
      expect(t.pro).toBe(false)
    }
  })

  test('allowLevelReveal é SEMPRE false (o rank é o portão estrito)', () => {
    for (const slug of [
      'noob',
      'coder',
      'hacker',
      'explorer',
      'elite',
      'architect',
      'champion',
      'god',
    ]) {
      expect(resolveStudioTier(slug, undefined).allowLevelReveal).toBe(false)
    }
  })
})
