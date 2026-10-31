import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AVATAR3D_PARTS } from '../../src/domain/avatar/avatar3d-catalog'

/**
 * B16 (31/10/2026): as roupas que só a festa do Arquipélago concede são exatamente a `conquista` de
 * cada festa no contrato do jogo. O contrato não é dependência do Members: o arquivo é lido pelo
 * caminho, como os outros testes de conformidade.
 */
const fonte = readFileSync(
  join(import.meta.dir, '../../../arquipelago-contracts/src/vestuario-festas.ts'),
  'utf8',
)
const conquistas = [...fonte.matchAll(/conquista: \[([^\]]*)\]/g)].flatMap((m) =>
  [...(m[1] ?? '').matchAll(/'([^']+)'/g)].map((id) => id[1] ?? ''),
)

test('a faixa festa do catálogo é a conquista das quatro festas, nem mais nem menos', () => {
  expect(conquistas).toHaveLength(8)
  const daFesta = AVATAR3D_PARTS.filter((p) => p.tier === 'festa').map((p) => p.id)
  expect([...daFesta].sort()).toEqual([...conquistas].sort())
  for (const p of AVATAR3D_PARTS.filter((x) => x.tier === 'festa')) expect(p.price).toBe(0)
})
