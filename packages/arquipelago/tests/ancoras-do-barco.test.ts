import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { ALTURA_DO_PIER } from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { LUNETA } from '../src/mundo/luneta-medidas'
import { PIER } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { arquivoDaIlha, carregarGlb, jsonDoGlb } from './ajuda-colisores'

/**
 * As âncoras do barco entre as ilhas (fase3-04), feitas no Blender (`arte/mundo/pier.py` e
 * `arte/ilhas/recife.py`, `barco`): onde o barco atraca no píer central, onde a criança embarca e
 * onde ela fica dentro do barco.
 */
const PIER_GLB = join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'pier.glb')
/** O barco (5 × 2 m) com os pneus, que saem 1,26 do meio para cada lado. */
const MEIO_COMPRIMENTO_DO_BARCO = 2.5
const MEIA_LARGURA_DO_BARCO = 1.26

describe('o barco no píer central', async () => {
  const pier = await carregarGlb(PIER_GLB)
  const colisores = lerColisores(pier)
  const barco = pier.getObjectByName('barco')
  const embarque = pier.getObjectByName('embarque')

  test('o barquinho a remo é um nó à parte, com o casco dele no col-barco-1', () => {
    expect(pier.getObjectByName('pier')).toBeDefined()
    expect(pier.getObjectByName('barquinho-decorativo')).toBeDefined()
    expect(colisores.filter((c) => c.nome.startsWith('col-barco-')).map((c) => c.nome)).toEqual([
      'col-barco-1',
    ])
  })

  test('o barco atraca na linha d’água com a proa para o mar, sem bater nas estacas', () => {
    if (!barco) throw new Error('pier.glb sem a âncora barco')
    expect(barco.position.y).toBe(0)
    // O +x do barco (a proa) vira o +z do píer, o lado do mar.
    const proa = { x: Math.cos(barco.rotation.y), z: -Math.sin(barco.rotation.y) }
    expect(proa.x).toBeCloseTo(0)
    expect(proa.z).toBeCloseTo(1)
    for (const c of colisores) {
      if (c.forma !== 'cilindro' || !c.nome.startsWith('col-cil-estaca-')) continue
      const dx = Math.abs(c.posicao[0] - barco.position.x)
      const dz = Math.abs(c.posicao[2] - barco.position.z)
      const fora = dx > MEIA_LARGURA_DO_BARCO + c.raio || dz > MEIO_COMPRIMENTO_DO_BARCO + c.raio
      expect(fora).toBe(true)
    }
  })

  test('o embarque fica no tampo, livre das estacas, do lampião e da luneta', () => {
    if (!embarque || !barco) throw new Error('pier.glb sem as âncoras do barco')
    expect(embarque.position.y).toBeCloseTo(ALTURA_DO_PIER + 0.06)
    expect(Math.abs(embarque.position.x)).toBeLessThan(1 - CORPO.raio)
    // Em frente ao meio do barco.
    expect(embarque.position.z).toBeCloseTo(barco.position.z)
    for (const c of colisores) {
      if (c.forma !== 'cilindro') continue
      const d = Math.hypot(c.posicao[0] - embarque.position.x, c.posicao[2] - embarque.position.z)
      expect(d).toBeGreaterThan(c.raio + CORPO.raio)
    }
    const luneta = Math.hypot(
      LUNETA.x - PIER.x - embarque.position.x,
      LUNETA.z - PIER.z - embarque.position.z,
    )
    // Fora do alcance da luneta: perto do barco, o E é do embarque.
    expect(luneta).toBeGreaterThan(LUNETA.alcance)
  })
})

describe('a criança dentro do barco', () => {
  test('o passageiro é filho do nó animado barco, no convés, olhando para a proa', async () => {
    const cena = await carregarGlb(arquivoDaIlha('barco.glb'))
    const passageiro = cena.getObjectByName('passageiro')
    expect(passageiro?.parent?.name).toBe('barco')
    expect(passageiro?.position.y).toBeCloseTo(0.5)
    expect(passageiro?.position.x).toBeGreaterThan(0)
    expect(passageiro?.rotation.y).toBeCloseTo(0)
    const json = jsonDoGlb(arquivoDaIlha('barco.glb'))
    const noDoBarco = json.nodes.findIndex((n) => n.name === 'barco')
    const animado = json.animations?.flatMap((a) => a.channels.map((c) => c.target.node)) ?? []
    expect(animado).toContain(noDoBarco)
  })
})
