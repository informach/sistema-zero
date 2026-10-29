import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { criarSalvamentoInicial, ilha } from '@sistemazero/arquipelago-contracts'
import { type BufferGeometry, Group, Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { malhasDosOlhos } from '../src/mundo/animado'
import { buscarIlha, ilhasNaMemoria, reterIlha, soltarIlha } from '../src/mundo/carregar-ilha'
import { lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { ILHAS_COMPLETAS, prepararIlha, soltarExtras } from '../src/mundo/ilha-completa'
import {
  CAVERNA_DO_PICO,
  naDirecaoDaCavernaDoPico,
  RAIO_DA_ILHA_DO_ANEL,
  raioDaEsperaDaIlha,
  raioDoChaoDaIlha,
  rodaDaIlhaNoModelo,
} from '../src/mundo/medidas'
import { lugarDoFloco } from '../src/mundo/pico'
import { BOIAS_DA_ILHA_DO_ANEL } from '../src/sistemas/correnteza'
import {
  APRESENTACAO_DO_FLOCO,
  comecarConversaComOFloco,
  FLOCO_NO_PICO,
} from '../src/sistemas/floco'
import { arquivoDaIlha, carregarGlb, type Forma, topoDaForma } from './ajuda-colisores'

const pico = ilha('pico')

/**
 * O Pico Gelado ligado no jogo (fase3-06): o ciclo da ilha completa com o `pico.glb` (os colisores
 * vêm do Blender, conferidos em `colisores-do-pico.test.ts`) e o Floco no palco.
 */
describe('Pico completo', () => {
  test('carrega o GLB real, prepara os colisores e libera os recursos ao sair', async () => {
    const url = ILHAS_COMPLETAS.pico?.url
    expect(url).toBeDefined()
    if (!url) throw new Error('Pico sem modelo')
    const antes = ilhasNaMemoria()
    const cena = await buscarIlha(url, () => carregarGlb(arquivoDaIlha('pico.glb')))
    const preparada = prepararIlha(cena, pico)
    expect(preparada.colisores.length).toBe(151)
    expect(cena.getObjectByName('col-terreno')).toBeUndefined()
    expect(prepararIlha(cena, pico)).toBe(preparada)
    const geometrias = new Set<BufferGeometry>()
    cena.traverse((no) => {
      if (no instanceof Mesh) geometrias.add(no.geometry)
    })
    let soltas = 0
    for (const g of geometrias) g.addEventListener('dispose', () => soltas++)
    const retencao = reterIlha(url, cena, () => soltarExtras(preparada))
    soltarIlha(url)
    expect(soltas).toBe(0)
    retencao?.liberar()
    expect(soltas).toBe(geometrias.size)
    expect(ilhasNaMemoria()).toBe(antes)
  })

  test('tudo o que se pisa cabe na espera pelo chão: a de sempre e, para o lado da caverna, até ela', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('pico.glb'))
    const formas = lerColisores(modelo).filter((c): c is Forma => c.forma !== 'malha')
    for (const c of formas) {
      const r = Math.hypot(c.posicao[0], c.posicao[2])
      expect([c.nome, r < raioDaEsperaDaIlha(pico, c.posicao[0], c.posicao[2])]).toEqual([
        c.nome,
        true,
      ])
    }
    expect(raioDaEsperaDaIlha(pico, 1, 0)).toBe(raioDoChaoDaIlha(pico, 1, 0))
    // Do lado da caverna a espera alcança o fundo do morro; nos outros lados, a de sempre.
    expect(raioDaEsperaDaIlha(pico, -1, 0)).toBe(CAVERNA_DO_PICO.raio)
    expect(raioDaEsperaDaIlha(pico, 0, 1)).toBe(raioDoChaoDaIlha(pico, 0, 1))
    const cavernas = formas.filter((c) => c.nome.includes('caverna'))
    expect(cavernas.length).toBeGreaterThan(40)
    for (const c of cavernas)
      expect([c.nome, naDirecaoDaCavernaDoPico(c.posicao[0], c.posicao[2])]).toEqual([c.nome, true])
  })

  test('a roda de boias cobre a ilha e a caverna com folga de mar', () => {
    const roda = rodaDaIlhaNoModelo(pico, BOIAS_DA_ILHA_DO_ANEL)
    const folga = BOIAS_DA_ILHA_DO_ANEL - (RAIO_DA_ILHA_DO_ANEL + 1.4)
    // Do lado da ponte, a roda passa onde passava; do lado da caverna, depois do fundo do morro.
    expect(roda.x + roda.livre).toBeCloseTo(BOIAS_DA_ILHA_DO_ANEL)
    expect(roda.x - roda.livre).toBeCloseTo(-(CAVERNA_DO_PICO.fundo + folga))
  })
})

describe('o Floco no palco', () => {
  test('fica em cima do tablado e olha para a marca da frente, inclusive com a ilha girada', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('pico.glb'))
    const palco = modelo.getObjectByName('palco')?.position
    const frente = modelo.getObjectByName('morador')?.position
    if (!palco || !frente) throw new Error('Pico sem as âncoras do Floco')
    const p = lugarDoFloco(modelo, { x: 100, y: 2, z: 50 }, Math.PI / 2)
    expect(p?.x).toBeCloseTo(100 + palco.z)
    expect(p?.z).toBeCloseTo(50 - palco.x)
    expect(p?.y).toBeCloseTo(2 + palco.y)
    expect(p?.descanso).toBeCloseTo(
      Math.atan2(frente.x - palco.x, frente.z - palco.z) + Math.PI / 2,
    )
    // O pé no topo do tablado (o colisor do palco), e o corpo dentro dele.
    const formas = lerColisores(modelo).filter((c): c is Forma => c.forma !== 'malha')
    const tablado = formas.find((c) => c.nome.startsWith('col-cil-palco'))
    if (tablado?.forma !== 'cilindro') throw new Error('Pico sem o colisor do palco')
    expect(Math.abs(palco.y - topoDaForma(tablado))).toBeLessThan(0.05)
    expect(
      Math.hypot(palco.x - tablado.posicao[0], palco.z - tablado.posicao[2]) + FLOCO_NO_PICO.raio,
    ).toBeLessThan(tablado.raio)
    expect(soParaOCorpo('col-morador-floco')).toBe(true)
    expect(lugarDoFloco(new Group(), { x: 0, y: 0, z: 0 }, 0)).toBeNull()
  })

  test('o Floco tem os clipes e os olhos usados pelo morador genérico', async () => {
    const bytes = readFileSync(join(import.meta.dir, '../src/assets/personagens/floco.glb'))
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
    const clipes = new Set(gltf.animations.map((a) => a.name))
    for (const nome of ['parado', 'andar', 'falar', 'acenar', 'feliz'])
      expect([nome, clipes.has(nome)]).toEqual([nome, true])
    expect(malhasDosOlhos(gltf.scene).length).toBeGreaterThan(0)
  })

  test('a apresentação não muda o salvamento nem compartilha falas mutáveis', () => {
    const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
    const antes = JSON.stringify(s)
    const a = comecarConversaComOFloco(s)
    expect(a.salvamento).toBe(s)
    expect(a.falas).toEqual([...APRESENTACAO_DO_FLOCO])
    a.falas.pop()
    expect(comecarConversaComOFloco(s).falas).toHaveLength(2)
    expect(JSON.stringify(s)).toBe(antes)
    for (const fala of APRESENTACAO_DO_FLOCO) expect(fala).not.toMatch(/[—!?]/)
  })
})
