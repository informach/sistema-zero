import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  criarSalvamentoInicial,
  ObraDaCabanaSchema,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import type { Mesh, Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { criarLojaDaConstrucao } from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import {
  alturaDoLote,
  loteDoModelo,
  PERTO_DO_LOTE,
  pertoDoLote,
} from '../src/mundo/cabana-do-bosque'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { planta } from '../src/sistemas/construcao/comodos'
import { LOTE_DA_CASA, type Lote, OBRA_VAZIA } from '../src/sistemas/construcao/lote'
import { esticarParede, porAbertura } from '../src/sistemas/construcao/obra'
import { caminhoLargo } from './ajuda-caminho-largo'
import { arquivoDaIlha, carregarGlb, type Forma, gradeDeAndar, topoEm } from './ajuda-colisores'

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

/**
 * O lote do iglu no Pico (E04, pedido de arte de 30/10/2026, entregue em 31/10/2026): a clareira de
 * neve plana de 5 × 5 m no canto +x +z do `pico.glb`, com as âncoras `lote-cabana-a` e `-b` nos cantos
 * opostos, nada que colida em cima até 3 m e o caminho a pé da chegada com as folgas do pedido dos
 * portos (faixa de 1,5 m, degraus de até 0,30 m).
 */
describe('o lote do iglu no Pico', () => {
  let pico: Object3D
  let formas: Forma[]
  let terreno: Mesh
  let lotePico: Lote
  let piso: number

  beforeAll(async () => {
    pico = await carregarGlb(arquivoDaIlha('pico.glb'))
    pico.updateMatrixWorld(true)
    formas = lerColisores(pico).filter((c): c is Forma => c.forma !== 'malha')
    terreno = pico.getObjectByName('col-terreno') as Mesh
    const l = loteDoModelo(pico)
    if (!l) throw new Error('o pico.glb sem as âncoras do lote')
    lotePico = l
    piso = alturaDoLote(pico)
  })

  test('as âncoras ficam em cantos opostos, no metro, e o lote tem pelo menos 5 × 5 m', () => {
    const a = pico.getObjectByName('lote-cabana-a')?.position
    const b = pico.getObjectByName('lote-cabana-b')?.position
    if (!a || !b) throw new Error('sem âncoras')
    for (const v of [a.x, a.z, b.x, b.z]) expect(Math.abs(v - Math.round(v))).toBeLessThan(0.01)
    expect(a.y).toBeCloseTo(b.y, 3)
    const { x0, z0, x1, z1 } = lotePico.area
    expect(x1 - x0).toBeGreaterThanOrEqual(5)
    expect(z1 - z0).toBeGreaterThanOrEqual(5)
    expect(lotePico.ocupadas).toEqual([])
  })

  test('o chão do lote é plano (a âncora -a é o piso) e nada colide em cima dele até 3 m', () => {
    const { x0, z0, x1, z1 } = lotePico.area
    const grade = gradeDeAndar(terreno, [], 16)
    let menor = Infinity
    let maior = -Infinity
    const ocupam = new Set<string>()
    for (let x = x0; x <= x1 + 1e-9; x += 0.25)
      for (let z = z0; z <= z1 + 1e-9; z += 0.25) {
        const y = grade.chaoEm(x, z)
        if (y === undefined) throw new Error(`sem chão em ${x}, ${z}`)
        menor = Math.min(menor, y)
        maior = Math.max(maior, y)
        for (const c of formas) {
          const fundo = c.posicao[1] - (c.forma === 'caixa' ? c.meio[1] : c.meiaAltura)
          if (topoEm(c, x, z) !== undefined && fundo < y + 3) ocupam.add(c.nome)
        }
      }
    expect(maior - menor).toBeLessThan(0.02)
    expect(Math.abs(menor - piso)).toBeLessThan(0.02)
    expect([...ocupam]).toEqual([])
  })

  test('fica fora do corredor da ponte e longe da subida, do palco, da caverna e do iglu do Floco', () => {
    const { x0, z0, x1, z1 } = lotePico.area
    // O corredor da chegada (x > 5,5 e |z| < 2,5) não encosta no lote.
    expect(z0 >= 2.5 || z1 <= -2.5 || x1 <= 5.5).toBe(true)
    const longe = (nome: string, folga: number) => {
      const p = pico.getObjectByName(nome)?.position
      if (!p) throw new Error(`sem a âncora ${nome}`)
      const dx = Math.max(x0 - p.x, 0, p.x - x1)
      const dz = Math.max(z0 - p.z, 0, p.z - z1)
      return Math.hypot(dx, dz) >= folga
    }
    // O palco tem 2,4 m de raio; o iglu, 3 m com o anel de paredes e o vestíbulo virado para o outro lado.
    expect(longe('palco', 4)).toBe(true)
    expect(longe('iglu-dentro', 3.4)).toBe(true)
    expect(longe('iglu', 3)).toBe(true)
    for (const nome of [
      'trilha-inicio',
      'subida-largada',
      'caverna-entrada',
      'chegada',
      'cais',
      'morador',
    ])
      expect(longe(nome, 2)).toBe(true)
    for (let k = 1; k <= 4; k++) expect(longe(`subida-${k}`, 2)).toBe(true)
    for (let k = 1; k <= 5; k++) expect(longe(`floco-${k}`, 2)).toBe(true)
    for (let k = 1; k <= 4; k++) expect(longe(`lumi-${k}`, 1)).toBe(true)
  })

  test('da chegada se anda até o meio do lote numa faixa de 1,5 m, com degraus de até 0,30 m', () => {
    const chegada = pico.getObjectByName('chegada')?.position
    if (!chegada) throw new Error('sem chegada')
    const { x0, z0, x1, z1 } = lotePico.area
    const grade = gradeDeAndar(terreno, formas, 15)
    const faixa = caminhoLargo(grade)
    const andou = faixa.alcance(chegada.x, chegada.z)
    expect(andou.size).toBeGreaterThan(0)
    expect(faixa.chegaPerto(andou, (x0 + x1) / 2, (z0 + z1) / 2, 0.5)).toBe(true)
    // E o lote inteiro se anda (nenhum canto preso).
    for (const [x, z] of [
      [x0 + 0.6, z0 + 0.6],
      [x1 - 0.6, z0 + 0.6],
      [x0 + 0.6, z1 - 0.6],
      [x1 - 0.6, z1 - 0.6],
    ] as const)
      expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), x, z, 0.4)).toBe(true)
  }, 30_000)
})
