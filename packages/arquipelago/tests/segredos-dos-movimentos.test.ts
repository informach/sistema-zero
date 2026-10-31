import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { ehDaSubidaDoFarol } from '../src/mundo/farol'
import { areaDaCinzaQuente } from '../src/mundo/segredos-dos-movimentos'
import { segredosDoAlbum } from '../src/sistemas/album'
import { CINZA_QUENTE, empurraoDasAreas } from '../src/sistemas/cinza-quente'
import { CORPO } from '../src/sistemas/corpo'
import {
  abrirSegredo,
  PAGINA_EXTRA,
  paginasExtras,
  SEGREDOS_DOS_MOVIMENTOS,
  segredoAchado,
  TODOS_OS_SEGREDOS,
} from '../src/sistemas/segredos'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

/**
 * Os segredos dos outros movimentos (B11, arte de 31/10/2026): cipó e mergulho na sua ilha,
 * patins no Bosque, montaria no Vale (com a cinza quente que empurra a pé) e balão nas Nuvens.
 */
describe('os nove segredos', () => {
  test('cada um com um bit próprio, que nunca se repete, e uma página extra', () => {
    const bits = TODOS_OS_SEGREDOS.map((s) => s.bit)
    expect(new Set(bits).size).toBe(9)
    expect(bits.every((b) => b > 0 && (b & (b - 1)) === 0)).toBe(true)
    for (const s of TODOS_OS_SEGREDOS) {
      const texto = PAGINA_EXTRA[s.id]
      expect(texto.length).toBeGreaterThan(20)
      expect(texto).not.toMatch(/[—–!]/)
    }
    for (const s of SEGREDOS_DOS_MOVIMENTOS) expect(s.dica).not.toMatch(/[—–!]/)
  })

  test('abrir um baú dos movimentos guarda o bit, conta no álbum e abre a página no diário', () => {
    const inicial = criarSalvamentoInicial(new Date())
    const balao = SEGREDOS_DOS_MOVIMENTOS.find((s) => s.id === 'balao')
    if (!balao) throw new Error('sem o balão')
    const s = abrirSegredo(inicial, balao)
    expect(segredoAchado(s.segredos, balao)).toBe(true)
    expect(abrirSegredo(s, balao)).toBe(s)
    expect(segredosDoAlbum(s).conta).toEqual({ tem: 1, total: 9, faltam: 8 })
    expect(paginasExtras(s.segredos).find((p) => p.id === 'balao')?.texto).toBe(PAGINA_EXTRA.balao)
    expect(paginasExtras(inicial.segredos).every((p) => p.texto === null)).toBe(true)
  })

  test('as âncoras dos baús estão nos modelos', async () => {
    const em = {
      'sua-ilha': [
        join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'segredos-da-ilha.glb'),
        join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'pier.glb'),
      ],
      bosque: [arquivoDaIlha('bosque.glb')],
      'vale-dos-dinos': [arquivoDaIlha('vale-dos-dinos.glb')],
      nuvens: [arquivoDaIlha('nuvens.glb')],
    } as Record<string, string[]>
    for (const s of SEGREDOS_DOS_MOVIMENTOS) {
      let achou = false
      for (const arquivo of em[s.ilha] ?? [])
        if ((await carregarGlb(arquivo)).getObjectByName(s.ancora)) achou = true
      expect([s.id, achou]).toEqual([s.id, true])
    }
  })
})

describe('a cinza quente do Vale', () => {
  test('empurra para longe do terraço quem pisa nela a pé, mais rápido que o patins', async () => {
    const vale = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
    const meio = { x: 30, y: 0, z: -12 }
    const giro = 0.7
    const area = areaDaCinzaQuente(vale, meio, giro)
    if (!area) throw new Error('sem a área')
    const no = vale.getObjectByName('cinza-quente-area')
    const terraco = vale.getObjectByName('segredo-montaria')
    if (!no || !terraco) throw new Error('sem as âncoras')
    // O meio da área, no mundo, com os pés nele: empurra.
    const c = new Vector3()
      .copy(no.position)
      .applyAxisAngle(new Vector3(0, 1, 0), giro)
      .add(new Vector3(meio.x, meio.y, meio.z))
    const saida = { x: 0, z: 0 }
    expect(empurraoDasAreas([area], c.x, c.y + CORPO.doCentroAoPe, c.z, saida)).toBe(true)
    expect(Math.hypot(saida.x, saida.z)).toBeCloseTo(CINZA_QUENTE.forca, 5)
    expect(CINZA_QUENTE.forca).toBeGreaterThan(6)
    // Para longe do terraço: o empurrão aponta do terraço para fora.
    const t = new Vector3()
      .copy(terraco.position)
      .applyAxisAngle(new Vector3(0, 1, 0), giro)
      .add(new Vector3(meio.x, meio.y, meio.z))
    expect(saida.x * (c.x - t.x) + saida.z * (c.z - t.z)).toBeGreaterThan(0)
    // Longe dela, nada.
    expect(empurraoDasAreas([area], meio.x, 1 + CORPO.doCentroAoPe, meio.z, saida)).toBe(false)
    expect(saida).toEqual({ x: 0, z: 0 })
  })
})

describe('a subida do Farol fica guardada até a Lenda', () => {
  test('os colisores da subida saem; os de antes (pedras, degraus) continuam', async () => {
    const farol = await carregarGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'farol.glb'),
    )
    const nomes = lerColisores(farol).map((c) => c.nome)
    const daSubida = nomes.filter(ehDaSubidaDoFarol)
    expect(daSubida.length).toBeGreaterThanOrEqual(13)
    expect(
      nomes.filter((n) => /^col-(cil-pedra|degrau)-farol-/.test(n)).some(ehDaSubidaDoFarol),
    ).toBe(false)
    expect(farol.getObjectByName('farol')?.getObjectByName('subida')).toBeDefined()
  })
})
