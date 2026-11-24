import { expect, test } from 'bun:test'
import { COMPOSICAO_DA_FAISCA } from '../src/sistemas/composicao-faisca'
import { LUGAR_DA_FAISCA } from '../src/sistemas/faisca'

test('as seis setas reais apontam para o primeiro trecho do destino, sem multiplicar placas', () => {
  const placas = COMPOSICAO_DA_FAISCA.filter((p) => p.sinal)
  expect(placas).toHaveLength(6)
  expect(placas.some((p) => p.sinal!.texto === 'Costa')).toBe(true)
  for (const p of placas) {
    const d = p.sinal!,
      dx = d.via.x - p.x,
      dz = d.via.z - p.z,
      dist = Math.hypot(dx, dz)
    expect((Math.cos(p.giro) * dx - Math.sin(p.giro) * dz) / dist).toBeGreaterThan(0.99999)
    expect(LUGAR_DA_FAISCA[d.destino]).toBeDefined()
    expect(d.texto.length).toBeLessThanOrEqual(6)
  }
})
