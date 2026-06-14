import { describe, expect, it } from 'bun:test'
import type { LearningProfile } from '#core'
import { buildCoreToolbox } from '../toolbox'

function categoryNames(profile?: LearningProfile): string[] {
  const tb = buildCoreToolbox([], profile)
  return tb.contents
    .filter((c): c is Extract<(typeof tb.contents)[number], { name: string }> => 'name' in c)
    .filter((c) => c.kind === 'category')
    .map((c) => c.name)
}

describe('buildCoreToolbox — divulgação progressiva', () => {
  it('sem perfil mostra todas as categorias core', () => {
    const names = categoryNames()
    expect(names).toContain('HTML')
    expect(names).toContain('Canvas')
    expect(names).toContain('Funções')
    expect(names).toContain('Classes')
    expect(names).toContain('Objetos')
    expect(names).toContain('Avançado')
  })

  it('iniciante esconde Canvas/Funções/Classes/Objetos/Avançado', () => {
    const names = categoryNames({ level: 'iniciante' })
    expect(names).toContain('HTML')
    expect(names).toContain('CSS')
    expect(names).toContain('JavaScript')
    expect(names).not.toContain('Canvas')
    expect(names).not.toContain('Funções')
    expect(names).not.toContain('Classes')
    expect(names).not.toContain('Objetos')
    expect(names).not.toContain('Avançado')
  })

  it('DOM é categoria iniciante, posicionada entre CSS e JavaScript', () => {
    const names = categoryNames({ level: 'iniciante' })
    expect(names).toContain('DOM')
    expect(names.indexOf('CSS')).toBeLessThan(names.indexOf('DOM'))
    expect(names.indexOf('DOM')).toBeLessThan(names.indexOf('JavaScript'))
  })

  it('intermediario mostra Canvas/Funções/Objetos, mas não Classes/Avançado', () => {
    const names = categoryNames({ level: 'intermediario' })
    expect(names).toContain('Canvas')
    expect(names).toContain('Funções')
    expect(names).toContain('Objetos')
    expect(names).not.toContain('Classes')
    expect(names).not.toContain('Avançado')
  })

  it('revealed mostra tudo mesmo com nível iniciante', () => {
    const names = categoryNames({ level: 'iniciante', revealed: true })
    expect(names).toContain('Classes')
    expect(names).toContain('Avançado')
  })

  it('allowCategories força categoria além do nível', () => {
    const names = categoryNames({ level: 'iniciante', allowCategories: ['Classes'] })
    expect(names).toContain('Classes')
  })

  it('a busca está sempre presente', () => {
    const tb = buildCoreToolbox([], { level: 'iniciante' })
    expect(tb.contents.some((c) => c.kind === 'search')).toBe(true)
  })
})
