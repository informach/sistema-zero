import { expect, test } from 'bun:test'
import { arquivoDaIlha, jsonDoGlb, TAMPO } from './ajuda-colisores'

/**
 * Âncoras das Nuvens pedidas pelas fases 4-07 e 4-09 (arte/ilhas-b/nuvens.py): o `mirante` no
 * `nuvens.glb`, no deque da luneta do `nuvens-constelacoes.glb`, e a `passageiro` no cesto do
 * `nuvens-balao.glb`, filha do nó animado `balao` (sobe e balança junto com o `flutuar`).
 */
type No = { name?: string; translation?: [number, number, number]; children?: number[] }
const no = (arquivo: string, nome: string) => {
  const nodes = jsonDoGlb(arquivoDaIlha(arquivo)).nodes as No[]
  const i = nodes.findIndex((n) => n.name === nome)
  return { nodes, i, n: nodes[i] }
}

test('o mirante do nuvens.glb fica no deque da luneta das constelações', () => {
  const mirante = no('nuvens.glb', 'mirante').n
  const tubo = no('nuvens-constelacoes.glb', 'luneta-tubo').n
  expect(mirante?.translation).toBeDefined()
  expect(tubo?.translation).toBeDefined()
  const [mx, my, mz] = mirante!.translation!
  const [tx, , tz] = tubo!.translation!
  expect(Math.hypot(mx - tx, mz - tz)).toBeLessThan(0.05)
  // Em cima do deque (0,35 acima do tampo), onde se fica de pé para olhar.
  expect(my).toBeCloseTo(TAMPO + 0.35, 3)
})

test('a âncora passageiro fica no piso do cesto, filha do nó animado do balão', () => {
  const { nodes, i, n } = no('nuvens-balao.glb', 'passageiro')
  expect(n).toBeDefined()
  const pai = nodes.find((p) => p.children?.includes(i))
  expect(pai?.name).toBe('balao')
  const [x, y, z] = n!.translation ?? [0, 0, 0]
  // No meio do cesto (meia largura 0,55) e no piso, 10 cm acima da base.
  expect(Math.hypot(x, z)).toBeLessThan(0.05)
  expect(y).toBeCloseTo(0.1, 3)
})
