import { describe, expect, test } from 'bun:test'
// Import RELATIVO do módulo PURO do referrals (precedente do
// career-tier-conformance com o core): sem dependência de workspace nova.
import { CONVERSION_STATUSES } from '../../referrals/src/domain/ports/referral-repository.port'
import { CONVERSION_STATUS_LABEL } from '../src/app/admin/embaixadores/embaixadores-client'

/**
 * O union `ConversionStatus` do admin (lib/types.ts) é espelho MANUAL do
 * referrals. Sem esta trava, um status novo lá compilaria limpo aqui e a tela
 * de bônus mostraria rótulo/filtro errados sobre DINHEIRO. Os Records de
 * apresentação são tipados `Record<ConversionStatus, …>`, então casar as
 * chaves do rótulo com a fonte fecha o ciclo (drift → este teste ou o tsc
 * reprovam).
 */
describe('conformance: ConversionStatus admin × referrals', () => {
  test('as chaves do rótulo cobrem EXATAMENTE os status do serviço', () => {
    expect(Object.keys(CONVERSION_STATUS_LABEL).sort()).toEqual([...CONVERSION_STATUSES].sort())
  })
})
