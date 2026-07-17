import { describe, expect, it } from 'bun:test'
import type { LearningProfile } from '#core'
import { blockedDynamicSearchTypes, dynamicCategoryBlockTypes } from '../paramsFlyout'

/**
 * 5º review #4: a busca de blocos não pode VAZAR Funções/Classes acima do nível
 * fixado pelo professor. `blockedDynamicSearchTypes` é o filtro de oferta da busca.
 * Reforma 2D/3D: Funções gateia em `intermediario-2d` e Classes em `avancado-2d`
 * (lockstep com o toolbox — ambas são categorias 2D).
 */
describe('blockedDynamicSearchTypes — busca respeita o degrau do aluno', () => {
  const all = dynamicCategoryBlockTypes()

  it('há tipos dinâmicos para gatear (Funções + Classes)', () => {
    expect(all.length).toBeGreaterThan(0)
    expect(all).toContain('sz_js_class')
  })

  it('iniciante-2d E iniciante-3d: bloqueiam TODOS os tipos dinâmicos', () => {
    for (const level of ['iniciante-2d', 'iniciante-3d'] as const) {
      const blocked = blockedDynamicSearchTypes({ level })
      for (const type of all) expect(blocked.has(type)).toBe(true)
      expect(blocked.size).toBe(new Set(all).size)
    }
  })

  it('intermediario-2d: libera Funções, ainda bloqueia Classes', () => {
    const blocked = blockedDynamicSearchTypes({ level: 'intermediario-2d' })
    expect(blocked.has('sz_js_class')).toBe(true)
    expect(blocked.size).toBeGreaterThan(0)
    expect(blocked.size).toBeLessThan(all.length)
  })

  it('avancado-2d: não bloqueia nada (Classes agora é um degrau 2D)', () => {
    expect(blockedDynamicSearchTypes({ level: 'avancado-2d' }).size).toBe(0)
  })

  it('avancado-3d (topo): não bloqueia nada (oferta completa)', () => {
    expect(blockedDynamicSearchTypes({ level: 'avancado-3d' }).size).toBe(0)
  })

  it('allowCategories força a categoria na busca mesmo no iniciante', () => {
    const profile: LearningProfile = {
      level: 'iniciante-2d',
      allowCategories: ['Funções', 'Classes'],
    }
    expect(blockedDynamicSearchTypes(profile).size).toBe(0)
  })
})
