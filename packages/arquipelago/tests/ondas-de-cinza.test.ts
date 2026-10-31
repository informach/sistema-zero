import { describe, expect, test } from 'bun:test'
import {
  caminhoDaOnda,
  comecarOndas,
  FALAS_DAS_ONDAS,
  fimDasOndas,
  luzProtegeONinho,
  ONDAS_DE_CINZA,
  passoDasOndas,
} from '../src/sistemas/ondas-de-cinza'

/** Roda as ondas até o fim; guarda onde cada onda estava quando se resolveu. */
function rodar(luz: (t: number) => boolean) {
  const o = comecarOndas()
  const ondeResolveu: number[] = []
  for (let i = 0; i < 2000 && fimDasOndas(o) === null; i++)
    for (const e of passoDasOndas(o, 1 / 60, luz(o.tempo)))
      ondeResolveu[e.onda] = caminhoDaOnda(o, e.onda)
  return Object.assign(o, { ondeResolveu })
}

describe('as ondas de cinza do vulcão (§6.28, A8)', () => {
  test('com a luz protegendo o tempo todo, as três são espantadas antes de chegar', () => {
    const o = rodar(() => true)
    expect(o.destinos).toEqual(['espantada', 'espantada', 'espantada'])
    expect(fimDasOndas(o)).toBe('protegido')
    for (const p of o.ondeResolveu) expect(p).toBeLessThan(1)
  })

  test('sem luz, as ondas passam pelo ninho e dá para tentar de novo', () => {
    const o = rodar(() => false)
    expect(o.destinos).toEqual(['passou', 'passou', 'passou'])
    expect(fimDasOndas(o)).toBe('de-novo')
  })

  test('acender a luz no meio espanta só as que ainda vêm', () => {
    const o = rodar((t) => t > ONDAS_DE_CINZA.viagem + 0.1)
    expect(o.destinos[0]).toBe('passou')
    expect(o.destinos.slice(1)).toEqual(['espantada', 'espantada'])
    expect(fimDasOndas(o)).toBe('de-novo')
  })

  test('a luz protege só de lanterna acesa e perto do ninho', () => {
    const ninho = { x: 0, z: 0 }
    expect(luzProtegeONinho(true, { x: 2, z: 0 }, ninho)).toBe(true)
    expect(luzProtegeONinho(true, { x: ONDAS_DE_CINZA.protegeA + 0.5, z: 0 }, ninho)).toBe(false)
    expect(luzProtegeONinho(false, { x: 1, z: 0 }, ninho)).toBe(false)
  })

  test('os textos seguem as regras da criança e não falam em perder nada', () => {
    const textos = [
      FALAS_DAS_ONDAS.comeco,
      FALAS_DAS_ONDAS.semLanterna,
      FALAS_DAS_ONDAS.deNovo,
      FALAS_DAS_ONDAS.protegido(2),
    ]
    for (const t of textos) {
      expect(t).not.toMatch(/[—!?]/)
      expect(t).not.toMatch(/perd|morr|quebr/i)
    }
    expect(FALAS_DAS_ONDAS.protegido(2)).toContain('2 de 3 ninhos cuidados')
  })
})
