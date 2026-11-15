import { expect, test } from 'bun:test'
import { ARTE_DA_FAISCA } from '../src/mundo/faisca/arte.generated'
import { comprimentoDaRota } from '../src/sistemas/faisca'
import { PECAS_DO_CAMINHO, ROTA_DA_PROVA } from '../src/sistemas/prova-curadoria-faisca'

test('módulos reais se ligam pelos encaixes catalogados, sem esticar ou sobrepor a curva', () => {
  const mundo = (i: number, nome: string) => {
    const p = PECAS_DO_CAMINHO[i]!,
      meta = ARTE_DA_FAISCA.pecas[p.peca as keyof typeof ARTE_DA_FAISCA.pecas]
    const q =
      meta.encaixe && 'pontos' in meta.encaixe
        ? meta.encaixe.pontos.find((q) => q.nome === nome)?.posicao
        : undefined
    if (!q) throw Error(`Encaixe ausente: ${p.peca}/${nome}`)
    expect(p.escala).toBe(1)
    return {
      x: p.x + Math.cos(p.giro) * q[0]! + Math.sin(p.giro) * q[2]!,
      z: p.z - Math.sin(p.giro) * q[0]! + Math.cos(p.giro) * q[2]!,
      y: p.altura! + q[1]!,
    }
  }
  for (const [i, a, j, b] of [
    [0, 'ponta_dir', 1, 'ponta_esq'],
    [1, 'ponta_dir', 2, 'ponta_b'],
    [2, 'ponta_a', 3, 'ponta_esq'],
  ] as const) {
    const x = mundo(i, a),
      y = mundo(j, b)
    expect(Math.hypot(x.x - y.x, x.y - y.y, x.z - y.z)).toBeLessThan(1e-6)
  }
  const comprimento = comprimentoDaRota(ROTA_DA_PROVA, () => 4)
  expect(comprimento).toBeGreaterThan(26.4)
  expect(comprimento).toBeLessThan(26.6)
})
