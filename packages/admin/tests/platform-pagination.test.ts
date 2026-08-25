import { describe, expect, test } from 'bun:test'
import { offsetForPlatform, pageForPlatform } from '../src/lib/platform-pagination'

describe('paginação escopada por plataforma', () => {
  test('mantém a página na mesma plataforma e volta ao início ao trocar', () => {
    const page = { platform: 'kids' as const, offset: 40 }

    expect(offsetForPlatform(page, 'kids')).toBe(40)
    expect(offsetForPlatform(page, 'adult')).toBe(0)
  })

  test('não restaura a página antiga ao voltar para a plataforma anterior', () => {
    const kidsPage = { platform: 'kids' as const, offset: 40 }
    const adultPage = pageForPlatform(kidsPage, 'adult')
    const returnedKidsPage = pageForPlatform(adultPage, 'kids')

    expect(adultPage).toEqual({ platform: 'adult', offset: 0 })
    expect(returnedKidsPage).toEqual({ platform: 'kids', offset: 0 })
  })
})
