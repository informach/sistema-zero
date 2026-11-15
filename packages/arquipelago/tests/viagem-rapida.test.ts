import { describe, expect, test } from 'bun:test'
import { ILHAS, type Ilha } from '@sistemazero/arquipelago-contracts'
import { centroNoAnel, RAIO_DA_ILHA_DO_ANEL } from '../src/mundo/medidas'
import { chegadaDaViagem, recusaDaViagem } from '../src/sistemas/viagem-rapida'

const ilha = (id: string) => ILHAS.find((i) => i.id === id) as Ilha
const TODAS = 0xff

describe('a viagem rápida pelo mapa', () => {
  test('nas ilhas do anel chega no fim da ponte, perto da ilha, olhando para ela', () => {
    for (const i of ILHAS.filter((x) => x.angulo !== null)) {
      const c = chegadaDaViagem(i)
      if (!c) throw new Error(i.id)
      const centro = centroNoAnel(i)
      const longe = Math.hypot(c.x - centro.x, c.z - centro.z)
      // Fora da ilha (na ponte), mas a poucos metros da borda dela.
      expect(longe, i.id).toBeGreaterThan(RAIO_DA_ILHA_DO_ANEL - 1)
      expect(longe, i.id).toBeLessThan(RAIO_DA_ILHA_DO_ANEL + 10)
      // Olhando para a ilha: a frente dela aponta para o centro da ilha.
      const fx = Math.sin(c.olhar)
      const fz = Math.cos(c.olhar)
      const paraIlha = Math.hypot(centro.x - c.x, centro.z - c.z)
      expect(((centro.x - c.x) * fx + (centro.z - c.z) * fz) / paraIlha, i.id).toBeGreaterThan(0.95)
    }
  })

  test('na sua ilha chega à frente da casa; no Farol não há viagem', () => {
    expect(chegadaDaViagem(ilha('sua-ilha'))?.z).toBeGreaterThan(5)
    expect(chegadaDaViagem(ilha('farol'))).toBeNull()
  })

  test('só para ilha aberta e já visitada, fora da corrida, da visita e de onde ela está', () => {
    const base = { posicao: 8, visitas: TODAS, aqui: 'sua-ilha', correndo: false, visitando: false }
    expect(recusaDaViagem(ilha('bosque'), base)).toBeNull()
    expect(recusaDaViagem(ilha('bosque'), { ...base, visitas: 1 })).toBe('nao-visitada')
    expect(recusaDaViagem(ilha('nuvens'), { ...base, posicao: 1 })).toBe('fechada')
    expect(recusaDaViagem(ilha('bosque'), { ...base, aqui: 'bosque' })).toBe('aqui')
    expect(recusaDaViagem(ilha('bosque'), { ...base, correndo: true })).toBe('corrida')
    expect(recusaDaViagem(ilha('bosque'), { ...base, visitando: true })).toBe('visita')
    expect(recusaDaViagem(ilha('farol'), base)).not.toBeNull()
  })
})
