import { describe, expect, test } from 'bun:test'
import { familiasDasFaixas } from '@sistemazero/molda-cenarios-core/v2'
import {
  adultCenariosToolAccess,
  cenariosBasicToolAccess,
  cenariosToolAccessFromBands,
} from '../src/lib/cenarios-tool-access'

describe('faixas da oficina de cenários', () => {
  test('com as três faixas, nada a restringir; com algumas, a lista fechada e o que vem depois', () => {
    expect(
      cenariosToolAccessFromBands(['basic', 'intermediate', 'professional'], []),
    ).toBeUndefined()
    expect(
      cenariosToolAccessFromBands(
        ['basic'],
        [
          { when: 'Depois', bands: ['intermediate', 'basic'] },
          { when: 'Nunca', bands: [] },
        ],
      ),
    ).toEqual({
      allow: familiasDasFaixas(['basic']),
      upcoming: [{ when: 'Depois', families: familiasDasFaixas(['intermediate']) }],
    })
    expect(cenariosBasicToolAccess()).toEqual({ allow: familiasDasFaixas(['basic']), upcoming: [] })
  })

  test('no adulto, a política antiga dá todas com o molda e a de currículo é por faixa', () => {
    expect(adultCenariosToolAccess({ capabilities: ['molda'] })).toBeUndefined()
    const curriculo = adultCenariosToolAccess({
      capabilities: ['molda', 'molda-intermediate'],
      curriculum: {} as never,
    })
    expect(curriculo?.allow).toEqual(familiasDasFaixas(['basic', 'intermediate']))
    expect(curriculo?.upcoming).toEqual([
      {
        when: 'Veja na jornada como liberar estas ferramentas.',
        families: familiasDasFaixas(['professional']),
      },
    ])
  })
})
