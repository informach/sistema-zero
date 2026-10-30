import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  criarSalvamentoInicial,
  ObraDaCabanaSchema,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { criarLojaDaConstrucao } from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import { loteDoModelo, PERTO_DO_LOTE, pertoDoLote } from '../src/mundo/cabana-do-bosque'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { planta } from '../src/sistemas/construcao/comodos'
import { LOTE_DA_CASA, type Lote, OBRA_VAZIA } from '../src/sistemas/construcao/lote'
import { esticarParede, porAbertura } from '../src/sistemas/construcao/obra'

/**
 * A cabana no Bosque (fase1-11): o lote vem das âncoras do `bosque.glb`, as regras da construção
 * valem nele como na casa, e o Construir aberto perto do lote grava em `construcao.cabanas.bosque`
 * sem mexer na casa.
 */
let modelo: Object3D
let lote: Lote

beforeAll(async () => {
  const buf = readFileSync(join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb'))
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  modelo = (await new GLTFLoader().parseAsync(ab, '')).scene
  const l = loteDoModelo(modelo)
  if (!l) throw new Error('sem as âncoras do lote da cabana')
  lote = l
})

function montar() {
  const salvamento = {
    ...criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z')),
    casa: { portaNova: true },
  }
  const loja = criarLoja({
    salvamento,
    jornada: 2,
    quarto: QUARTO_DE_EXEMPLO,
    avatar: { modelo: null } as never,
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      contabilizaTempo: false,
    },
    aoMudar: () => {},
  })
  return { loja, construcao: criarLojaDaConstrucao(loja) }
}

/** Um cômodo de 4 × 4 com porta, no meio do lote. */
function cabanaDeQuatro(l: Lote) {
  const x = l.area.x0 + 1
  const z = l.area.z0 + 2
  let o = structuredClone(OBRA_VAZIA)
  for (const [a, b] of [
    [
      { x, z },
      { x: x + 4, z },
    ],
    [
      { x: x + 4, z },
      { x: x + 4, z: z + 4 },
    ],
    [
      { x: x + 4, z: z + 4 },
      { x, z: z + 4 },
    ],
    [
      { x, z: z + 4 },
      { x, z },
    ],
  ] as const) {
    const r = esticarParede(o, l, a, b)
    if (!r.ok) throw new Error(`parede recusada: ${r.motivo}`)
    o = r.obra
  }
  const porta = porAbertura(o, l, 'porta', { eixo: 'x', x: x + 1, z })
  if (!porta.ok) throw new Error(`porta recusada: ${porta.motivo}`)
  return porta.obra
}

describe('a cabana no Bosque', () => {
  test('o lote sai das âncoras: 6 × 8 células na ponta de campo, sem quarto e começando vazio', () => {
    expect(lote.id).toBe('bosque')
    expect(lote.area).toEqual({ x0: -18, z0: -4, x1: -12, z1: 4 })
    expect(lote.fixo).toBeNull()
    expect(lote.ocupadas).toEqual([])
    expect(lote.obraInicial).toEqual(OBRA_VAZIA)
  })

  test('as regras valem no lote: quatro paredes fecham um cômodo, e a porta entra numa delas', () => {
    const obra = cabanaDeQuatro(lote)
    expect(ObraDaCabanaSchema.safeParse(obra).success).toBe(true)
    const p = planta(obra, lote)
    expect(p.comodos).toHaveLength(1)
    expect(p.dentro.size).toBe(16)
    expect(obra.aberturas).toHaveLength(1)
    expect(obra.aberturas[0]).toMatchObject({ tipo: 'porta', eixo: 'x', z: lote.area.z0 + 2 })
  })

  test('fora do lote não se constrói', () => {
    const r = esticarParede(OBRA_VAZIA, lote, { x: -11, z: 0 }, { x: -9, z: 0 })
    expect(r).toEqual({ ok: false, motivo: 'fora-do-lote' })
  })

  test('perto do lote é estar nele ou a até 3 m (no referencial do modelo)', () => {
    expect(PERTO_DO_LOTE).toBe(3)
    expect(pertoDoLote(lote, { x: -15, z: 0 })).toBe(true)
    expect(pertoDoLote(lote, { x: -10.5, z: 0 })).toBe(true)
    expect(pertoDoLote(lote, { x: -8.5, z: 0 })).toBe(false)
    expect(pertoDoLote(lote, { x: 0, z: 0 })).toBe(false)
  })

  test('o Construir aberto perto do lote grava na cabana e não mexe na casa', () => {
    const { loja, construcao } = montar()
    construcao.getState().registrarCabana({ lote, perto: true })
    construcao.getState().abrir()
    expect(construcao.getState().onde).toBe('bosque')
    // Abriu com a cabana vazia, e a câmera olha para o meio do lote.
    expect(loja.getState().salvamento.construcao.cabanas.bosque).toEqual(OBRA_VAZIA)
    expect(construcao.getState().camera.alvo).toEqual({ x: -15, z: 0 })
    expect(loja.getState().salvamento.construcao.casa).toBeNull()
    const obra = cabanaDeQuatro(lote)
    expect(construcao.getState().aplicar({ ok: true, obra })).toBe(true)
    expect(loja.getState().salvamento.construcao.cabanas.bosque).toEqual(obra)
    expect(loja.getState().salvamento.construcao.casa).toBeNull()
    expect(SalvamentoSchema.safeParse(loja.getState().salvamento).success).toBe(true)
    // Desfazer volta a cabana vazia.
    construcao.getState().desfazer()
    expect(loja.getState().salvamento.construcao.cabanas.bosque).toEqual(OBRA_VAZIA)
  })

  test('longe do lote o Construir abre a casa, como antes', () => {
    const { loja, construcao } = montar()
    construcao.getState().registrarCabana({ lote, perto: false })
    construcao.getState().abrir()
    expect(construcao.getState().onde).toBe('casa')
    expect(loja.getState().salvamento.construcao.casa).toEqual(LOTE_DA_CASA.obraInicial)
    expect(loja.getState().salvamento.construcao.cabanas.bosque).toBeUndefined()
  })
})
