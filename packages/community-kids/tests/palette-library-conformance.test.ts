import { describe, expect, test } from 'bun:test'
import {
  PALETTE_LIBRARY_ITEM_ID as MEMBERS_ITEM_ID,
  PALETTE_LIBRARY_KIND as MEMBERS_KIND,
} from '../../members/src/domain/creations/palette-library'
import { PALETTE_LIBRARY_ITEM_ID, PALETTE_LIBRARY_KIND } from '../src/lib/pinta-cloud-persistence'

/**
 * Conformância do item ESPECIAL "Minhas paletas" kids × members: o kids o SOBE
 * (`pinta-cloud-persistence.ts`) e o members o FILTRA no `creationsUsageByUsers`
 * do admin (senão a biblioteca conta como "+1 desenho"). Renomear de um lado
 * sem o outro não quebra nada visível — o upload segue funcionando e o filtro
 * simplesmente para de casar, EM SILÊNCIO (o tests/db do members testa o
 * literal dele mesmo). Este teste torna o lockstep executável, no molde do
 * `badge-conformance` (caminho relativo até o módulo PURO do members).
 */
describe('item especial da biblioteca de paletas — conformância com o members', () => {
  test('kind e itemId são os MESMOS nos dois lados', () => {
    expect(PALETTE_LIBRARY_KIND).toBe(MEMBERS_KIND)
    expect(PALETTE_LIBRARY_ITEM_ID).toBe(MEMBERS_ITEM_ID)
  })

  test('o itemId passa na validação da borda (members DTO + BFF usam este formato)', () => {
    // Espelho do `CreationItemParams.itemId` (members `dtos.ts`) e do `ItemId`
    // Zod do BFF (`member-shell/src/routes/creations.ts`) — charset e teto.
    expect(PALETTE_LIBRARY_ITEM_ID).toMatch(/^[A-Za-z0-9_-]{1,64}$/)
    // E os tetos de meta do upload (name ≤120, kind ≤40).
    expect('Minhas paletas'.length).toBeLessThanOrEqual(120)
    expect(PALETTE_LIBRARY_KIND.length).toBeLessThanOrEqual(40)
  })
})
