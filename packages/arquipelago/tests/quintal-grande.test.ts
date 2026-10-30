import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { criarSalvamentoInicial, type Obra } from '@sistemazero/arquipelago-contracts'
import { Vector3 } from 'three'
import { criarLojaDaConstrucao } from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import {
  COLISORES_DO_FAROL,
  COLISORES_DO_PIER,
  colisoresDasArvores,
  deslocar,
  GRUPOS,
} from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { peDoSegredo } from '../src/mundo/lugares-dos-segredos'
import { alturaDaIlha } from '../src/mundo/medidas'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { CHAVES_DA_CASA } from '../src/sistemas/chaves-da-casa'
import {
  LOTE_DA_CASA,
  LOTE_DA_CASA_GRANDE,
  loteDaCasa,
  naArea,
  POSICAO_DO_QUINTAL_GRANDE,
} from '../src/sistemas/construcao/lote'
import { esticarParede } from '../src/sistemas/construcao/obra'
import { SEGREDOS } from '../src/sistemas/segredos'
import { bate, carregarGlb, type Forma } from './ajuda-colisores'

const AGORA = new Date('2026-10-30T12:00:00Z')

describe('o quintal grande do Vale (E04)', () => {
  test('antes do Vale o lote de sempre; do Vale em diante, o grande, que contém o pequeno', () => {
    expect(loteDaCasa(POSICAO_DO_QUINTAL_GRANDE - 1)).toBe(LOTE_DA_CASA)
    expect(loteDaCasa(POSICAO_DO_QUINTAL_GRANDE)).toBe(LOTE_DA_CASA_GRANDE)
    const p = LOTE_DA_CASA.area
    const g = LOTE_DA_CASA_GRANDE.area
    expect(g.x0 <= p.x0 && g.z0 <= p.z0 && g.x1 >= p.x1 && g.z1 >= p.z1).toBe(true)
    for (const o of LOTE_DA_CASA.ocupadas) expect(LOTE_DA_CASA_GRANDE.ocupadas).toContainEqual(o)
  })

  test('o chão do anel novo fica na faixa de altura do lote de antes', () => {
    const faixa = (a: { x0: number; z0: number; x1: number; z1: number }) => {
      let min = 9
      let max = -9
      for (let x = a.x0; x <= a.x1; x += 0.5)
        for (let z = a.z0; z <= a.z1; z += 0.5) {
          const y = alturaDaIlha(x, z)
          min = Math.min(min, y)
          max = Math.max(max, y)
        }
      return { min, max }
    }
    const antes = faixa(LOTE_DA_CASA.area)
    const agora = faixa(LOTE_DA_CASA_GRANDE.area)
    expect(antes.max - antes.min).toBeLessThan(0.2)
    expect(agora.max - agora.min).toBeLessThan(0.4)
    expect(Math.abs(agora.min - 1)).toBeLessThan(0.2)
    expect(Math.abs(agora.max - 1)).toBeLessThan(0.2)
  })

  test('todo colisor do anel novo está numa área ocupada', async () => {
    const terreno = await carregarGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'terreno.glb'),
    )
    terreno.updateMatrixWorld(true)
    const solidos: Forma[] = [
      ...lerColisores(terreno).filter((k): k is Forma => k.forma !== 'malha'),
      ...colisoresDasArvores(),
      ...deslocar(COLISORES_DO_FAROL, GRUPOS.farol),
      ...deslocar(COLISORES_DO_PIER, GRUPOS.pier),
    ]
    const g = LOTE_DA_CASA_GRANDE
    const livres: string[] = []
    for (let x = g.area.x0; x < g.area.x1; x++)
      for (let z = g.area.z0; z < g.area.z1; z++) {
        if (naArea(LOTE_DA_CASA.area, { x, z })) continue
        if (g.ocupadas.some((o) => naArea(o.ret, { x, z }))) continue
        for (const [dx, dz] of [
          [0.1, 0.1],
          [0.5, 0.5],
          [0.9, 0.9],
          [0.1, 0.9],
          [0.9, 0.1],
        ] as const) {
          const y = alturaDaIlha(x + dx, z + dz)
          for (const h of [0.2, 0.8, 1.6, 2.4])
            for (const f of solidos)
              if (bate(f, new Vector3(x + dx, y + h, z + dz))) livres.push(`${f.nome} ${x},${z}`)
        }
      }
    expect(livres).toEqual([])
  }, 120_000)

  test('as chaves e os segredos ficam fora do quintal grande', () => {
    const g = LOTE_DA_CASA_GRANDE.area
    const dentro = (p: { x: number; z: number }) =>
      p.x >= g.x0 - 1 && p.x <= g.x1 + 1 && p.z >= g.z0 - 1 && p.z <= g.z1 + 1
    for (const c of CHAVES_DA_CASA) expect([c.comodo, dentro(c)]).toEqual([c.comodo, false])
    const vento = peDoSegredo(SEGREDOS[0]!)
    expect(dentro(vento)).toBe(false)
  })

  test('a parede no anel novo só entra do Vale em diante', () => {
    const montar = (jornada: number) => {
      const loja = criarLoja({
        salvamento: { ...criarSalvamentoInicial(AGORA), casa: { portaNova: true } },
        jornada,
        quarto: QUARTO_DE_EXEMPLO,
        avatar: {} as never,
        acesso: {
          liberado: true,
          motivo: null,
          limiteDiarioMinutos: null,
          usadoHojeSegundos: 0,
          contabilizaTempo: false,
        },
        aoMudar: () => {},
      })
      const construcao = criarLojaDaConstrucao(loja)
      construcao.getState().abrir()
      return { loja, construcao }
    }
    const tentar = (jornada: number) => {
      const { loja } = montar(jornada)
      const obra = loja.getState().salvamento.construcao.casa as Obra
      // Uma parede no anel novo, ao sul do lote de antes (z -14 a -12), longe do farol.
      return esticarParede(obra, loteDaCasa(jornada), { x: 2, z: -13 }, { x: 6, z: -13 }).ok
    }
    expect(tentar(POSICAO_DO_QUINTAL_GRANDE - 1)).toBe(false)
    expect(tentar(POSICAO_DO_QUINTAL_GRANDE)).toBe(true)
  })
})
