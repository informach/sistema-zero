import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  BIT_DO_COMODO,
  COMODOS_DA_IRIS,
  chavesUsadasNaObra,
  criarSalvamentoInicial,
  migrarDaV18,
  type Obra,
  type SalvamentoV18,
} from '@sistemazero/arquipelago-contracts'
import { Vector3 } from 'three'
import { criarLojaDaConstrucao } from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import {
  COLISORES_DO_FAROL,
  COLISORES_DO_PIER,
  colisoresDaCasa,
  colisoresDasArvores,
  deslocar,
  GRUPOS,
} from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  DISTANCIA_DOS_LUMIS_DA_PRAIA,
  LUGARES_DOS_LUMIS_DA_PRAIA,
} from '../src/mundo/lugares-da-praia'
import { alturaDaIlha, ilhasEmVolta, NIVEL_DA_AGUA } from '../src/mundo/medidas'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import {
  CHAVES_DA_CASA,
  chaveQueFaltaParaOComodo,
  comodosAbertos,
  falaDaChave,
  guardarChave,
  liberado,
  quantasChaves,
  recadoDaTranca,
  recadoDoComodoTrancado,
} from '../src/sistemas/chaves-da-casa'
import { CONCHAS_DA_PRAIA } from '../src/sistemas/colecoes-da-praia'
import { LOTE_DA_CASA_GRANDE, OBRA_VAZIA } from '../src/sistemas/construcao/lote'
import { bate, carregarGlb, type Forma } from './ajuda-colisores'

const AGORA = new Date('2026-10-30T12:00:00Z')

function lojaCom(chaves: number) {
  const loja = criarLoja({
    salvamento: { ...criarSalvamentoInicial(AGORA), casa: { portaNova: true }, chaves },
    jornada: 2,
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

describe('onde ficam as chaves (N11)', () => {
  let solidos: Forma[]
  beforeAll(async () => {
    const terreno = await carregarGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'terreno.glb'),
    )
    terreno.updateMatrixWorld(true)
    solidos = [
      ...deslocar(colisoresDaCasa(true), GRUPOS.casa),
      ...deslocar(COLISORES_DO_FAROL, GRUPOS.farol),
      ...deslocar(COLISORES_DO_PIER, GRUPOS.pier),
      ...colisoresDasArvores(),
      ...lerColisores(terreno).filter((k): k is Forma => k.forma !== 'malha'),
    ]
  }, 120_000)

  test('uma chave por cômodo, em terra e fora de qualquer colisor', () => {
    expect(CHAVES_DA_CASA.map((c) => c.comodo).sort()).toEqual([...COMODOS_DA_IRIS].sort())
    for (const c of CHAVES_DA_CASA) {
      const y = alturaDaIlha(c.x, c.z)
      expect([c.comodo, y > NIVEL_DA_AGUA + 0.3]).toEqual([c.comodo, true])
      const centro = new Vector3(c.x, y + 0.9, c.z)
      for (const f of solidos)
        expect([c.comodo, f.nome, bate(f, centro)]).toEqual([c.comodo, f.nome, false])
    }
  })

  test('fora do lote da casa, longe das pontes, das conchas e dos Lumis', () => {
    // Fora também do quintal grande do Vale (E04).
    const { x0, z0, x1, z1 } = LOTE_DA_CASA_GRANDE.area
    const lumis = LUGARES_DOS_LUMIS_DA_PRAIA.map(({ angulo }) => {
      const a = (angulo * Math.PI) / 180
      return {
        x: Math.cos(a) * DISTANCIA_DOS_LUMIS_DA_PRAIA,
        z: Math.sin(a) * DISTANCIA_DOS_LUMIS_DA_PRAIA,
      }
    })
    for (const c of CHAVES_DA_CASA) {
      expect(c.x >= x0 - 1 && c.x <= x1 + 1 && c.z >= z0 - 1 && c.z <= z1 + 1).toBe(false)
      for (const { centro } of ilhasEmVolta()) {
        const r = Math.hypot(centro.x, centro.z)
        const t = Math.max(0, (c.x * centro.x + c.z * centro.z) / (r * r))
        expect(Math.hypot(c.x - centro.x * t, c.z - centro.z * t)).toBeGreaterThan(4)
      }
      for (const o of [...CONCHAS_DA_PRAIA, ...lumis])
        expect(Math.hypot(c.x - o.x, c.z - o.z)).toBeGreaterThan(3)
    }
  })
})

describe('as regras das chaves', () => {
  test('sem dono é livre; com dono, só com a chave', () => {
    expect(liberado(0, null)).toBe(true)
    expect(liberado(0, 'cozinha')).toBe(false)
    expect(liberado(BIT_DO_COMODO.cozinha, 'cozinha')).toBe(true)
    expect(liberado(BIT_DO_COMODO.cozinha, 'sala')).toBe(false)
  })

  test('guardar a chave uma vez só, e a fala conta as que faltam', () => {
    const s = criarSalvamentoInicial(AGORA)
    const um = guardarChave(s, 'sala')
    expect(um.chaves).toBe(BIT_DO_COMODO.sala)
    expect(guardarChave(um, 'sala')).toBe(um)
    expect(quantasChaves(um.chaves)).toBe(1)
    expect(falaDaChave('sala', um.chaves)).toBe(
      'Você achou a chave da sala. No Construir, a casa já pode ganhar mais um cômodo. Ainda faltam 3 chaves pela ilha.',
    )
    expect(falaDaChave('quintal', BIT_DO_COMODO.quintal)).toContain(
      'a cerca, o caminho e o canteiro já podem ir para a casa',
    )
    expect(falaDaChave('quintal', 15)).toContain('Agora a casa da Íris tem todas as chaves.')
    expect(falaDaChave('cozinha', BIT_DO_COMODO.cozinha | 7)).toContain('Ainda falta uma chave')
    for (const c of COMODOS_DA_IRIS) {
      for (const t of [falaDaChave(c, 0), recadoDaTranca(c)]) {
        expect(t).not.toContain('—')
        expect(t).not.toContain('!')
      }
    }
  })
})

describe('a migração não tranca o que já foi construído', () => {
  const obra = (parte: Partial<Obra>): Obra => ({ ...OBRA_VAZIA, ...parte })

  test('cada acabamento já usado vira a chave do cômodo dele', () => {
    expect(chavesUsadasNaObra(null)).toBe(0)
    expect(chavesUsadasNaObra(OBRA_VAZIA)).toBe(0)
    expect(chavesUsadasNaObra(obra({ pisos: [{ x: 0, z: 0, tipo: 'ladrilho' }] }))).toBe(
      BIT_DO_COMODO.cozinha,
    )
    expect(chavesUsadasNaObra(obra({ pisos: [{ x: 0, z: 0, tipo: 'tabua' }] }))).toBe(0)
    expect(chavesUsadasNaObra(obra({ pisos: [{ x: 0, z: 0, tipo: 'azulejo' }] }))).toBe(
      BIT_DO_COMODO.banheiro,
    )
    expect(
      chavesUsadasNaObra(obra({ aberturas: [{ tipo: 'janela-arco', x: 0, z: 0, eixo: 'x' }] })),
    ).toBe(BIT_DO_COMODO.sala)
    expect(
      chavesUsadasNaObra(obra({ aberturas: [{ tipo: 'janela-redonda', x: 0, z: 0, eixo: 'x' }] })),
    ).toBe(0)
    expect(chavesUsadasNaObra(obra({ canteiros: [{ x: 1, z: 1 }] }))).toBe(BIT_DO_COMODO.quintal)
  })

  test('a V18 com casa e cabana chega à V19 com as chaves que já usava', () => {
    const base = criarSalvamentoInicial(AGORA) as unknown as Record<string, unknown>
    const { chaves: _c, segredos: _s, mapa: _m, companhia: _k, ...resto } = base
    const v18 = {
      ...resto,
      versao: 18,
      construcao: {
        casa: obra({ pisos: [{ x: 0, z: 0, tipo: 'azulejo' }] }),
        cabanas: { bosque: obra({ cercas: [{ x: 0, z: 0, eixo: 'x', n: 2 }] }) },
      },
    } as unknown as SalvamentoV18
    const v19 = migrarDaV18(v18)
    expect(v19.chaves).toBe(BIT_DO_COMODO.banheiro | BIT_DO_COMODO.quintal)
  })
})

describe('o Construir obedece às chaves', () => {
  test('pisos e janelas são livres; a cerca pede a chave do quintal', () => {
    const { loja, construcao } = lojaCom(0)
    const c = construcao.getState()
    c.escolherPiso('ladrilho')
    expect(construcao.getState().piso).toBe('ladrilho')
    c.escolherJanela('janela-grande')
    expect(construcao.getState().janela).toBe('janela-grande')
    c.escolher('cerca')
    expect(construcao.getState().ferramenta).not.toBe('cerca')
    expect(loja.getState().dica?.texto ?? '').toContain('chave do quintal')
    c.escolher('parede')
    expect(construcao.getState().ferramenta).toBe('parede')
  })

  test('a chave abre o cômodo: fechar um cômodo novo pede uma chave de cômodo', () => {
    expect(comodosAbertos(0)).toBe(0)
    expect(comodosAbertos(BIT_DO_COMODO.cozinha | BIT_DO_COMODO.quintal)).toBe(1)
    expect(chaveQueFaltaParaOComodo(0, 0, 1)).toBe('cozinha')
    expect(chaveQueFaltaParaOComodo(BIT_DO_COMODO.cozinha, 0, 1)).toBeNull()
    expect(chaveQueFaltaParaOComodo(BIT_DO_COMODO.cozinha, 1, 2)).toBe('sala')
    // Quem já tinha mais cômodos que chaves não perde nenhum, e pode mexer sem fechar um novo.
    expect(chaveQueFaltaParaOComodo(0, 3, 3)).toBeNull()
    expect(chaveQueFaltaParaOComodo(0, 3, 2)).toBeNull()
    expect(recadoDoComodoTrancado('sala')).toContain('chave da sala')
    expect(recadoDoComodoTrancado('sala')).not.toMatch(/[—–!?]/)
  })
})
