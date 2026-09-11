import { describe, expect, test } from 'bun:test'
import { MOLDA_TOOL_BAND_LEVELS } from '../../core/src/career/journey'
import {
  MOLDA_TOOL_BANDS,
  MOLDA_TOOL_FAMILIES,
  moldaToolFamilyIds,
} from '../../molda/src/core/toolFamilies'
import { LEVEL_ORDER } from '../src/lib/level-info'
import { moldaLevelGain } from '../src/lib/molda-level-gain'
import {
  MOLDA_BEYOND_HORIZON,
  moldaPreviewLevel,
  moldaToolAccessFor,
} from '../src/lib/molda-tool-access'

/**
 * O portão do Molda por posto: a criança recebe as famílias das faixas que o posto dela já
 * abriu, e a oficina anuncia o que vem depois (e quando). A equipe e a Lenda recebem tudo.
 */

const basic = moldaToolFamilyIds(['basic'])
const intermediate = moldaToolFamilyIds(['intermediate'])
const professional = moldaToolFamilyIds(['professional'])

describe('moldaToolAccessFor', () => {
  test('as faixas do pacote são as do core, na mesma ordem', () => {
    expect(Object.keys(MOLDA_TOOL_BAND_LEVELS)).toEqual([...MOLDA_TOOL_BANDS])
    // Toda família do pacote cai em exatamente uma faixa.
    expect([...basic, ...intermediate, ...professional].sort()).toEqual(
      MOLDA_TOOL_FAMILIES.map((family) => family.id).sort(),
    )
  })

  test('os 8 postos, criança e equipe, com o catálogo inteiro', () => {
    const esperado: Record<(typeof LEVEL_ORDER)[number], readonly string[] | 'tudo'> = {
      noob: [],
      coder: [],
      hacker: [],
      explorer: basic,
      elite: basic,
      architect: [...basic, ...intermediate],
      champion: [...basic, ...intermediate],
      god: 'tudo',
    }
    for (const levelSlug of LEVEL_ORDER) {
      const child = moldaToolAccessFor({ levelSlug, role: 'student', horizon: 'god' })
      const want = esperado[levelSlug]
      if (want === 'tudo') expect(child, levelSlug).toBeUndefined()
      else expect(child?.allow, levelSlug).toEqual(want)
      for (const role of ['superadmin', 'admin', 'staff'])
        expect(
          moldaToolAccessFor({ levelSlug, role, horizon: 'god' }),
          `${role} ${levelSlug}`,
        ).toBeUndefined()
    }
  })

  test('o Explorador(a) vê o que abre no Arquiteto(a) e na Lenda, com o nome do posto', () => {
    const access = moldaToolAccessFor({ levelSlug: 'explorer', role: 'student', horizon: 'god' })
    expect(access?.upcoming).toEqual([
      { when: 'Abrem no nível Arquiteto(a) de Mundos', families: intermediate },
      { when: 'Abrem no nível Lenda', families: professional },
    ])
    const architect = moldaToolAccessFor({
      levelSlug: 'architect',
      role: 'student',
      horizon: 'god',
    })
    expect(architect?.upcoming).toEqual([{ when: 'Abrem no nível Lenda', families: professional }])
  })

  test('o que passa do horizonte do catálogo não promete posto: vira a frase do mapa', () => {
    const access = moldaToolAccessFor({
      levelSlug: 'explorer',
      role: 'student',
      horizon: 'explorer',
    })
    // As duas faixas além do horizonte viram um grupo só, sem nome de posto.
    expect(access?.upcoming).toEqual([
      { when: MOLDA_BEYOND_HORIZON, families: [...intermediate, ...professional] },
    ])
    const middle = moldaToolAccessFor({
      levelSlug: 'explorer',
      role: 'student',
      horizon: 'architect',
    })
    expect(middle?.upcoming).toEqual([
      { when: 'Abrem no nível Arquiteto(a) de Mundos', families: intermediate },
      { when: MOLDA_BEYOND_HORIZON, families: professional },
    ])
  })

  test('?nivel= só vale para a equipe, e só num posto em que o Molda abre', () => {
    expect(moldaPreviewLevel('explorer', 'superadmin')).toBe('explorer')
    expect(moldaPreviewLevel('architect', 'staff')).toBe('architect')
    expect(moldaPreviewLevel('explorer', 'student')).toBeNull()
    expect(moldaPreviewLevel('explorer', undefined)).toBeNull()
    expect(moldaPreviewLevel('coder', 'admin')).toBeNull()
    expect(moldaPreviewLevel('rei', 'admin')).toBeNull()
    expect(moldaPreviewLevel(['explorer'], 'admin')).toBeNull()
  })
})

describe('moldaLevelGain', () => {
  test('cada posto que abre uma faixa diz o que o Molda ganhou; os outros, nada', () => {
    expect(moldaLevelGain('explorer')).toContain('oficina 3D')
    expect(moldaLevelGain('architect')).toContain('editar a malha')
    expect(moldaLevelGain('god')).toContain('ossos')
    for (const slug of ['noob', 'coder', 'hacker', 'elite', 'champion', undefined, 'rei'])
      expect(moldaLevelGain(slug), String(slug)).toBeNull()
  })
})
