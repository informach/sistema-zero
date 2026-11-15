import { expect, test } from 'bun:test'
import { ARTE_DA_FAISCA } from '../src/mundo/faisca/arte.generated'
import { assentamentoDaPeca, pisoDaFaisca } from '../src/sistemas/assentamento-da-faisca'
import { COMPOSICAO_DA_FAISCA } from '../src/sistemas/composicao-faisca'
import { ilhaDoArquipelago } from '../src/sistemas/geografia-do-arquipelago'
import { alturaNaMalhaDoSetor, malhaDoSetor } from '../src/sistemas/setores-do-arquipelago'

test('implantação usa a interpolação dos triângulos físicos, não uma superfície paralela', () => {
  const ilha = ilhaDoArquipelago('sua-ilha'),
    malha = malhaDoSetor(ilha, 0, 1)
  for (let i = 0; i < malha.indices.length; i += 6)
    for (const deslocamento of [0, 3]) {
      const vertices = [0, 1, 2].map((j) => malha.indices[i + deslocamento + j]! * 3)
      const [a, b, c] = vertices as [number, number, number],
        v = malha.vertices
      const x = v[a]! * 0.2 + v[b]! * 0.3 + v[c]! * 0.5,
        z = v[a + 2]! * 0.2 + v[b + 2]! * 0.3 + v[c + 2]! * 0.5
      const y = v[a + 1]! * 0.2 + v[b + 1]! * 0.3 + v[c + 1]! * 0.5
      expect(alturaNaMalhaDoSetor(ilha, x, z)).toBeCloseTo(y, 5)
    }
})

test('fundações cobrem a diferença de solo sob as bases rígidas e compartilham o assentamento', () => {
  for (const p of COMPOSICAO_DA_FAISCA) {
    const a = assentamentoDaPeca(p),
      f = a.fundacao
    if (!f) continue
    const meta = ARTE_DA_FAISCA.pecas[p.peca as keyof typeof ARTE_DA_FAISCA.pecas]
    expect(a.y + meta.colisao[0].min[1] * p.escala).toBeCloseTo(f.topo, 8)
    expect(f.baixo).toBeLessThan(f.topo)
    expect(f.topo - f.baixo).toBeLessThan(0.4)
    for (const x of [meta.colisao[0].min[0], 0, meta.colisao[0].max[0]])
      for (const z of [meta.colisao[0].min[2], 0, meta.colisao[0].max[2]]) {
        const h = pisoDaFaisca(
          p.x + p.escala * (Math.cos(p.giro) * x + Math.sin(p.giro) * z),
          p.z + p.escala * (-Math.sin(p.giro) * x + Math.cos(p.giro) * z),
        )
        expect(h).toBeGreaterThanOrEqual(f.baixo)
        expect(h).toBeLessThanOrEqual(f.topo)
      }
  }
})
