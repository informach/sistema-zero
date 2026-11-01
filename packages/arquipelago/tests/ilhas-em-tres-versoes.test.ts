import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { Group, Mesh, MeshStandardMaterial } from 'three'
import { ARQUIVO_GERADO, codigoDasIlhasMedias, ilhasComMedia } from '../scripts/gerar-ilhas-medias'
import { buscarIlha, ilhasNaMemoria, soltarIlha } from '../src/mundo/carregar-ilha'
import { prepararMedia } from '../src/mundo/ilha-media'
import {
  DISTANCIA_DA_COMPLETA,
  DISTANCIA_DA_TROCA,
  nivelDeDetalhe,
  RAIO_DA_ILHA_DO_ANEL,
} from '../src/mundo/medidas'
import { versoesPerto } from '../src/sistemas/ilhas-completas'

function cenaFalsa() {
  const g = new Group()
  const material = new MeshStandardMaterial()
  const mesh = new Mesh(undefined, material)
  g.add(mesh)
  let soltas = 0
  mesh.geometry.addEventListener('dispose', () => soltas++)
  material.addEventListener('dispose', () => soltas++)
  return { g, soltas: () => soltas }
}

describe('a memória das três versões', () => {
  test('uma média e uma completa convivem; outra média solta só a média anterior', async () => {
    const mediaA = cenaFalsa()
    const mediaB = cenaFalsa()
    const completa = cenaFalsa()
    await buscarIlha('a-media.glb', async () => mediaA.g, 'media')
    await buscarIlha('a.glb', async () => completa.g)
    expect(ilhasNaMemoria('media')).toBe(1)
    expect(ilhasNaMemoria('completa')).toBe(1)
    expect(ilhasNaMemoria()).toBe(2)
    await buscarIlha('b-media.glb', async () => mediaB.g, 'media')
    expect(mediaA.soltas()).toBe(2)
    expect(completa.soltas()).toBe(0)
    expect(ilhasNaMemoria('media')).toBe(1)
    soltarIlha('b-media.glb')
    soltarIlha('a.glb')
    expect(ilhasNaMemoria()).toBe(0)
  })

  test('outra completa não solta a média', async () => {
    const media = cenaFalsa()
    await buscarIlha('c-media.glb', async () => media.g, 'media')
    await buscarIlha('c.glb', async () => cenaFalsa().g)
    await buscarIlha('d.glb', async () => cenaFalsa().g)
    expect(media.soltas()).toBe(0)
    expect(ilhasNaMemoria('completa')).toBe(1)
    soltarIlha('c-media.glb')
    soltarIlha('d.glb')
    expect(ilhasNaMemoria()).toBe(0)
  })
})

describe('onde cada versão entra', () => {
  const em = (distancia: number, naPonte: boolean, temMedia: boolean) =>
    versoesPerto({
      temMedia,
      nivel: nivelDeDetalhe(distancia, naPonte),
      distancia,
      distanciaDaCompleta: DISTANCIA_DA_COMPLETA,
    })

  test('sem a média, a completa baixa já na ponte, como antes', () => {
    expect(em(RAIO_DA_ILHA_DO_ANEL + 40, true, false)).toEqual({ media: false, completa: true })
    expect(em(RAIO_DA_ILHA_DO_ANEL + 60, false, false)).toEqual({ media: false, completa: false })
  })

  test('com a média, ela baixa na ponte e a completa só no fim da ponte', () => {
    expect(em(RAIO_DA_ILHA_DO_ANEL + 40, true, true)).toEqual({ media: true, completa: false })
    expect(em(DISTANCIA_DA_COMPLETA - 1, true, true)).toEqual({ media: true, completa: true })
    expect(em(RAIO_DA_ILHA_DO_ANEL - 2, false, true)).toEqual({ media: true, completa: true })
    expect(em(RAIO_DA_ILHA_DO_ANEL + 60, false, true)).toEqual({ media: false, completa: false })
  })

  test('a completa começa a baixar antes da troca', () => {
    expect(DISTANCIA_DA_COMPLETA).toBeGreaterThan(DISTANCIA_DA_TROCA)
    expect(nivelDeDetalhe(DISTANCIA_DA_COMPLETA, false)).toBe('media')
  })
})

describe('a cena da média', () => {
  test('perde os nós de colisão e gira como a ilha', () => {
    const cena = new Group()
    const desenho = new Mesh(undefined, new MeshStandardMaterial())
    desenho.name = 'chao'
    const colisao = new Mesh(undefined, new MeshStandardMaterial())
    colisao.name = 'col-chao'
    cena.add(desenho, colisao)
    const media = prepararMedia(cena, ilha('bosque'))
    expect(cena.getObjectByName('col-chao')).toBeUndefined()
    expect(cena.getObjectByName('chao')).toBe(desenho)
    expect(media.materiais).toHaveLength(1)
  })
})

describe('a lista gerada das versões médias', () => {
  test('bate com os arquivos da pasta (o build regera)', () => {
    expect(readFileSync(ARQUIVO_GERADO, 'utf8')).toBe(codigoDasIlhasMedias(ilhasComMedia()))
  })

  test('só entra a ilha que tem o arquivo médio, com o endereço importado', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'ilhas-medias-'))
    try {
      writeFileSync(join(pasta, 'vila-doce-media.glb'), '')
      writeFileSync(join(pasta, 'pico.glb'), '')
      expect(ilhasComMedia(pasta)).toEqual(['vila-doce'])
      const codigo = codigoDasIlhasMedias(['vila-doce'])
      expect(codigo).toContain("import vilaDoceMedia from '../assets/ilhas/vila-doce-media.glb'")
      expect(codigo).toContain("'vila-doce': new URL(vilaDoceMedia, import.meta.url).href,")
    } finally {
      rmSync(pasta, { recursive: true, force: true })
    }
  })
})
