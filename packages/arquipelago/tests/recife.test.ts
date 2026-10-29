import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { criarSalvamentoInicial, ilha } from '@sistemazero/arquipelago-contracts'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { malhasDosOlhos } from '../src/mundo/animado'
import { buscarIlha, ilhasNaMemoria, reterIlha, soltarIlha } from '../src/mundo/carregar-ilha'
import { soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { ILHAS_COMPLETAS, prepararIlha, soltarExtras } from '../src/mundo/ilha-completa'
import {
  DISTANCIA_DA_TROCA,
  raioDaEsperaDaIlha,
  raioDoChaoDaIlha,
  rodaDaIlhaNoModelo,
} from '../src/mundo/medidas'
import { aguaDoRecife, lugarDaMare } from '../src/mundo/recife'
import { BOIAS_DA_ILHA_DO_ANEL } from '../src/sistemas/correnteza'
import { APRESENTACAO_DA_MARE, comecarConversaComAMare, MARE_NO_RECIFE } from '../src/sistemas/mare'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

const recife = ilha('recife')

describe('Recife completo', () => {
  test('carrega o GLB real, prepara os colisores e libera os recursos ao sair', async () => {
    const url = ILHAS_COMPLETAS.recife?.url
    expect(url).toBeDefined()
    if (!url) throw new Error('Recife sem modelo')
    const antes = ilhasNaMemoria()
    const cena = await buscarIlha(url, () => carregarGlb(arquivoDaIlha('recife.glb')))
    const preparada = prepararIlha(cena, recife)
    expect(preparada.colisores.length).toBe(71)
    expect(cena.getObjectByName('col-terreno')).toBeUndefined()
    expect(prepararIlha(cena, recife)).toBe(preparada)
    const geometrias = new Set<BoxGeometry>()
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

  test('a boca da caverna e sua aproximação cabem nas boias e esperam a completa', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('recife.glb'))
    const boca = modelo.getObjectByName('caverna-entrada')?.position
    if (!boca) throw new Error('Recife sem entrada da caverna')
    const fora = { x: boca.x - 2, z: boca.z }
    const distancia = Math.hypot(fora.x, fora.z)
    const roda = rodaDaIlhaNoModelo(recife, BOIAS_DA_ILHA_DO_ANEL)
    expect(distancia).toBeGreaterThan(raioDoChaoDaIlha(recife, fora.x, fora.z))
    expect(distancia).toBeLessThan(raioDaEsperaDaIlha(recife, fora.x, fora.z))
    expect(distancia).toBeLessThan(DISTANCIA_DA_TROCA)
    expect(distancia + MARE_NO_RECIFE.raio).toBeLessThan(roda.livre)
    expect(roda.livre).toBeCloseTo(52.6)
    expect(rodaDaIlhaNoModelo(ilha('vila-doce'), BOIAS_DA_ILHA_DO_ANEL).livre).toBe(
      BOIAS_DA_ILHA_DO_ANEL,
    )
  })

  test('a Maré usa a casa e olha para a frente, inclusive com a ilha girada', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('recife.glb'))
    const casa = modelo.getObjectByName('casa-mare')?.position
    const frente = modelo.getObjectByName('morador')?.position
    if (!casa || !frente) throw new Error('Recife sem âncoras da Maré')
    const p = lugarDaMare(modelo, { x: 100, y: 2, z: 50 }, Math.PI / 2)
    expect(p?.x).toBeCloseTo(100 + casa.z)
    expect(p?.z).toBeCloseTo(50 - casa.x)
    expect(p?.y).toBe(2 + casa.y)
    expect(p?.descanso).toBeCloseTo(Math.atan2(frente.x - casa.x, frente.z - casa.z) + Math.PI / 2)
    expect(soParaOCorpo('col-morador-mare')).toBe(true)
    expect(lugarDaMare(new Group(), { x: 0, y: 0, z: 0 }, 0)).toBeNull()
  })
})

describe('lagoa e conversa', () => {
  test('a Maré tem os clipes e os olhos usados pelo morador genérico', async () => {
    const bytes = readFileSync(join(import.meta.dir, '../src/assets/personagens/mare.glb'))
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
    const clipes = new Set(gltf.animations.map((a) => a.name))
    for (const nome of ['parado', 'andar', 'falar', 'acenar', 'feliz'])
      expect(clipes.has(nome)).toBe(true)
    expect(malhasDosOlhos(gltf.scene).length).toBeGreaterThan(0)
  })

  test('o GLB recebido registra a lagoa real acima do mar', async () => {
    const modelo = await carregarGlb(arquivoDaIlha('recife.glb'))
    const agua = aguaDoRecife(modelo, { x: 0, y: 0, z: 0 }, 0)
    expect(agua).not.toBeNull()
    expect(agua?.y).toBeGreaterThan(0)
    expect(agua?.raioX).toBeGreaterThan(3)
    expect(agua?.raioZ).toBeGreaterThan(3)
  })

  test('sem malha agua não transforma a lagoa desenhada em água sobre chão sólido', () => {
    const modelo = new Group()
    const desenho = new Mesh(new BoxGeometry(8, 0.1, 6), new MeshStandardMaterial())
    desenho.name = 'lagoa.001'
    modelo.add(desenho)
    expect(aguaDoRecife(modelo, { x: 0, y: 0, z: 0 }, 0)).toBeNull()
    desenho.geometry.dispose()
    desenho.material.dispose()
  })

  test('a futura malha agua define a superfície, a elipse e o giro da lagoa', () => {
    const agua = new Mesh(new BoxGeometry(8, 0, 6), new MeshStandardMaterial())
    agua.name = 'agua'
    agua.position.set(-0.6, 0.7, -0.6)
    const modelo = new Group().add(agua)
    const r = aguaDoRecife(modelo, { x: 10, y: 2, z: 20 }, Math.PI / 2)
    expect(r?.x).toBeCloseTo(9.4)
    expect(r?.z).toBeCloseTo(20.6)
    expect(r?.y).toBeCloseTo(2.7)
    expect(r?.raioX).toBe(4)
    expect(r?.raioZ).toBe(3)
    expect(r?.giro).toBe(Math.PI / 2)
    agua.geometry.dispose()
    agua.material.dispose()
  })

  test('reabrir a apresentação não muda salvamento nem compartilha falas mutáveis', () => {
    const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
    const antes = JSON.stringify(s)
    const a = comecarConversaComAMare(s)
    expect(a.salvamento).toBe(s)
    expect(a.falas).toEqual([...APRESENTACAO_DA_MARE])
    a.falas.pop()
    expect(comecarConversaComAMare(s).falas).toHaveLength(2)
    expect(JSON.stringify(s)).toBe(antes)
    for (const fala of APRESENTACAO_DA_MARE) expect(fala).not.toMatch(/[—!?]/)
  })
})
