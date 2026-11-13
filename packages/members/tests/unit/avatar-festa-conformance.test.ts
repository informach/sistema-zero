import { expect, test } from 'bun:test'
import { AVATAR_CATALOG as C } from '@sistemazero/core/avatar'
// Pelo caminho: o contrato do jogo não é dependência do Members.
import { VESTUARIO_DAS_FESTAS } from '../../../arquipelago-contracts/src/vestuario-festas'

/**
 * As peças da faixa `festa` (só a festa do Arquipélago concede, não se compram) são exatamente as
 * roupas que as festas do jogo dão (`conquista` do contrato, B16), e o prêmio de cada festa das
 * regras do pack está entre elas.
 */
test('a faixa festa do catálogo é a conquista das festas do jogo, nem mais nem menos', () => {
  const doJogo = Object.values(VESTUARIO_DAS_FESTAS).flatMap((f) => [...f.conquista])
  const daFesta = Object.entries(C.parts)
    .filter(([, p]) => p.tier === 'festa')
    .map(([id]) => id)
  expect([...daFesta].sort()).toEqual([...doJogo].sort())
  for (const id of daFesta) expect(C.parts[id]?.price).toBe(0)
  for (const festa of Object.values(C.rules.festas)) expect(daFesta).toContain(festa.prize)
})
