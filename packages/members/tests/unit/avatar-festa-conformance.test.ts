import { expect, test } from 'bun:test'
import { AVATAR_CATALOG as C } from '@sistemazero/core/avatar'

/**
 * As peças da faixa `festa` (só a festa do Arquipélago concede, não se compram) são exatamente os
 * prêmios das festas nas regras do pack. ⚠️ O contrato do jogo (`vestuario-festas.ts`) ainda cita
 * as peças do avatar antigo: ele passa para as do pack na etapa do jogo, e então este teste volta a
 * conferir também o contrato.
 */
test('a faixa festa do catálogo é o prêmio de cada festa, nem mais nem menos', () => {
  const premios = Object.values(C.rules.festas).map((f) => f.prize)
  expect(premios.length).toBeGreaterThan(0)
  const daFesta = Object.entries(C.parts)
    .filter(([, p]) => p.tier === 'festa')
    .map(([id]) => id)
  expect([...daFesta].sort()).toEqual([...premios].sort())
  for (const id of daFesta) expect(C.parts[id]?.price).toBe(0)
})
