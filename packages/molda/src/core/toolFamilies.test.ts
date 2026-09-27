import { describe, expect, test } from 'bun:test'
import {
  MOLDA_TOOL_BANDS,
  MOLDA_TOOL_FAMILIES,
  moldaToolFamilyIds,
  readMoldaToolAccess,
} from './toolFamilies'

describe('famílias de ferramentas', () => {
  test('ids únicos e estáveis, com a aba no prefixo', () => {
    const ids = MOLDA_TOOL_FAMILIES.map((family) => family.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const family of MOLDA_TOOL_FAMILIES) {
      expect(family.id).toMatch(/^(model|paint|animate|files)\.[a-z]+(-[a-z]+)*$/)
      expect(family.id.split('.')[0]).toBe(family.tab)
      expect(MOLDA_TOOL_BANDS).toContain(family.band)
    }
  })

  test('toda aba tem o que fazer já no básico: nenhuma nasce vazia para a criança', () => {
    for (const tab of ['model', 'paint', 'animate', 'files'] as const)
      expect(
        MOLDA_TOOL_FAMILIES.some((family) => family.tab === tab && family.band === 'basic'),
        tab,
      ).toBe(true)
  })

  test('os rótulos seguem a régua da copy: sem travessão, curtos', () => {
    for (const family of MOLDA_TOOL_FAMILIES) {
      expect(family.label).not.toContain('—')
      expect(family.label.length).toBeLessThanOrEqual(48)
    }
  })

  test('as famílias de uma faixa saem na ordem do catálogo, e juntar faixas só acrescenta', () => {
    const basic = moldaToolFamilyIds(['basic'])
    const upToIntermediate = moldaToolFamilyIds(['basic', 'intermediate'])
    expect(basic).toContain('paint.brush')
    expect(basic).not.toContain('model.mesh')
    expect(upToIntermediate).toEqual(expect.arrayContaining(basic))
    expect(upToIntermediate).toContain('model.mesh')
    expect(upToIntermediate).not.toContain('model.skin')
    expect(moldaToolFamilyIds([...MOLDA_TOOL_BANDS])).toHaveLength(MOLDA_TOOL_FAMILIES.length)
  })
})

describe('leitura do acesso', () => {
  test('sem o dado do host, tudo liberado e nada anunciado', () => {
    const access = readMoldaToolAccess(undefined)
    expect(access.restricted).toBe(false)
    for (const family of MOLDA_TOOL_FAMILIES) expect(access.can(family.id)).toBe(true)
    expect(access.upcoming('model')).toEqual([])
  })

  test('com o dado, a lista é fechada e id desconhecido é ignorado', () => {
    const access = readMoldaToolAccess({ allow: ['paint.brush', 'invented.tool'] })
    expect(access.restricted).toBe(true)
    expect(access.can('paint.brush')).toBe(true)
    expect(access.can('model.mesh')).toBe(false)
    expect(access.upcoming('paint')).toEqual([])
  })

  test('o que vem depois é filtrado pela aba, na ordem do host, sem grupos vazios nem liberados', () => {
    const access = readMoldaToolAccess({
      allow: moldaToolFamilyIds(['basic']),
      upcoming: [
        { when: 'Abrem no Arquiteto', families: ['model.mesh', 'paint.layers', 'paint.brush'] },
        { when: 'Abrem na Lenda', families: ['model.skin', 'invented.tool'] },
      ],
    })
    expect(access.upcoming('paint').map((group) => group.when)).toEqual(['Abrem no Arquiteto'])
    expect(access.upcoming('paint')[0]!.families.map((family) => family.id)).toEqual([
      'paint.layers',
    ])
    expect(
      access.upcoming('model').map((group) => group.families.map((family) => family.id)),
    ).toEqual([['model.mesh'], ['model.skin']])
    expect(access.upcoming('files')).toEqual([])
  })
})
