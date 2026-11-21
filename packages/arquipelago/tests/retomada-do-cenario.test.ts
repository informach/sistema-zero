import { expect, test } from 'bun:test'
import {
  chaveDaRetomada,
  codificarRetomadaDoCenario,
  lerRetomadaDoCenario,
} from '../src/sistemas/retomada-do-cenario'

test('retomada do protótipo conserva posição e só aceita a publicação e o manifesto correspondentes', () => {
  const p = {
      id: crypto.randomUUID(),
      versao: 1,
      manifesto: { digest: 'a'.repeat(64), bytes: 100 },
    },
    posicao = { x: 4, y: 3.5, z: 139 },
    bruto = codificarRetomadaDoCenario(p, posicao)
  expect(lerRetomadaDoCenario(bruto, p)).toEqual(posicao)
  expect(lerRetomadaDoCenario(null, p)).toBeNull()
  expect(chaveDaRetomada(p)).not.toBe(chaveDaRetomada({ ...p, versao: 2 }))
  for (const outra of [
    { ...p, id: crypto.randomUUID() },
    { ...p, versao: 2 },
    { ...p, manifesto: { ...p.manifesto, digest: 'b'.repeat(64) } },
  ])
    expect(() => lerRetomadaDoCenario(bruto, outra)).toThrow(/versão/)
  expect(() => lerRetomadaDoCenario('{', p)).toThrow(/versão/)
  expect(() => codificarRetomadaDoCenario(p, { ...posicao, y: NaN })).toThrow(/guardada/)
})
