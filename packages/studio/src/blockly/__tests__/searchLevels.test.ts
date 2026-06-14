import { describe, expect, it } from 'bun:test'
import type { LearningProfile } from '#core'
import { blockedDynamicSearchTypes, dynamicCategoryBlockTypes } from '../paramsFlyout'

/**
 * 5º review #4: a busca de blocos não pode VAZAR Funções/Classes acima do nível
 * fixado pelo professor. `blockedDynamicSearchTypes` é o filtro de oferta da busca.
 */
describe('blockedDynamicSearchTypes — busca respeita o nível do aluno', () => {
  const all = dynamicCategoryBlockTypes()

  it('há tipos dinâmicos para gatear (Funções + Classes)', () => {
    expect(all.length).toBeGreaterThan(0)
    expect(all).toContain('sz_js_class')
  })

  it('iniciante: bloqueia TODOS os tipos dinâmicos (Funções=intermediario, Classes=avancado)', () => {
    const blocked = blockedDynamicSearchTypes({ level: 'iniciante' })
    for (const type of all) expect(blocked.has(type)).toBe(true)
    expect(blocked.size).toBe(new Set(all).size)
  })

  it('avancado: não bloqueia nada (oferta completa)', () => {
    expect(blockedDynamicSearchTypes({ level: 'avancado' }).size).toBe(0)
  })

  it('intermediario: libera Funções, ainda bloqueia Classes', () => {
    const blocked = blockedDynamicSearchTypes({ level: 'intermediario' })
    // Classes (avancado) seguem bloqueadas; Funções (intermediario) liberadas.
    expect(blocked.has('sz_js_class')).toBe(true)
    expect(blocked.size).toBeGreaterThan(0)
    expect(blocked.size).toBeLessThan(all.length)
  })

  it('allowCategories força a categoria na busca mesmo no iniciante', () => {
    const profile: LearningProfile = {
      level: 'iniciante',
      allowCategories: ['Funções', 'Classes'],
    }
    expect(blockedDynamicSearchTypes(profile).size).toBe(0)
  })
})
