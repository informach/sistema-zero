import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, NINHOS_DO_VALE } from '@sistemazero/arquipelago-contracts'
import type { Mesh } from 'three'
import type { ModoDoCorpo } from '../src/estado/contexto'
import { chaoLivre } from '../src/mundo/chao-livre'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import type { Ponto } from '../src/sistemas/cipo'
import { CORPO } from '../src/sistemas/corpo'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type EstadoDoCorpo,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { desmontar, montar } from '../src/sistemas/modos/montar'
import {
  FALAS_DA_MONTARIA,
  longeParaVoltar,
  MONTARIA,
  MONTARIA_NO_VALE,
  type MontariaViva,
  podeMontar,
  RAIO_DA_MONTARIA,
} from '../src/sistemas/montaria'
import { cuidarDoNinho } from '../src/sistemas/vale'
import { arquivoDaIlha, carregarGlb, type Forma, gradeDeAndar, TAMPO } from './ajuda-colisores'

const dt = 1 / 60

function entrada(p: Ponto, extra: Partial<EntradaDoPasso> = {}): EntradaDoPasso {
  return {
    dt,
    agora: 10_000,
    parado: false,
    p: { ...p },
    ix: 0,
    iz: 0,
    pedidoX: 0,
    pedidoZ: 0,
    ladoX: 1,
    ladoZ: 0,
    pulou: false,
    usou: false,
    correr: false,
    ritmo: 1,
    patins: false,
    conversa: null,
    gravidade: 24,
    nivelDoMar: -50,
    ...extra,
  }
}

function mundo(montaria: MontariaViva | null, extra: Partial<MundoDoMovimento> = {}) {
  return {
    cipos: [],
    troncos: [],
    aguas: [],
    equilibrios: [],
    escadas: [],
    escorregadores: [],
    bordas: [],
    rodasDeNado: [],
    foco: { x: 0, y: 0, z: 0 },
    montaria,
    ...extra,
  } satisfies MundoDoMovimento
}

/** Um passo inteiro num chão plano a y 0, como o personagem faz (o controlador para no chão). */
function simular(
  c: EstadoDoCorpo,
  p: Ponto,
  m: MundoDoMovimento,
  extra: Partial<EntradaDoPasso> = {},
  avisos: ModoDoCorpo[] = [],
) {
  const e = entrada(p, extra)
  const modo = MODOS[c.modo]
  if (!modo.valendo(c, m)) {
    avisos.push('chao')
    return false
  }
  modo.passo(c, e, m)
  const mov = { ...c.desloc }
  const piso = CORPO.doCentroAoPe
  const pisou = p.y + mov.y <= piso + 1e-6 && mov.y <= 0
  if (pisou) mov.y = piso - p.y
  modo.depois(c, e, m, mov, pisou, (novo) => avisos.push(novo))
  p.x = c.prox.x
  p.y = c.prox.y
  p.z = c.prox.z
  return pisou
}

const dino = (): MontariaViva => ({
  x: 1,
  y: 0,
  z: 0,
  giro: Math.PI / 2,
  montada: false,
  limite: { x: 0, z: 0, raio: 20 },
})
const dePe = () => {
  const c = criarEstadoDoCorpo()
  c.noChao = true
  return c
}

describe('a montaria do Vale (fase4-04)', () => {
  test('o dino confia depois dos três ninhos', () => {
    let s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
    expect(podeMontar(s)).toBe(false)
    for (const id of NINHOS_DO_VALE) s = cuidarDoNinho(s, id, true)
    expect(podeMontar(s)).toBe(true)
    for (const fala of Object.values(FALAS_DA_MONTARIA)) expect(fala).not.toMatch(/[—!?]/)
  })

  test('monta de pé, perto e fora da água; o dino passa a seguir o corpo', () => {
    const avisos: ModoDoCorpo[] = []
    const d = dino()
    const longe = dePe()
    expect(
      montar(longe, d, { x: 1 + MONTARIA.alcance + 0.1, z: 0 }, 0, (m) => avisos.push(m)),
    ).toBe(false)
    const nadando = dePe()
    nadando.nadando = true
    expect(montar(nadando, d, { x: 0, z: 0 }, 0, () => {})).toBe(false)
    const noAr = criarEstadoDoCorpo()
    expect(montar(noAr, d, { x: 0, z: 0 }, 0, () => {})).toBe(false)
    const c = dePe()
    expect(montar(c, d, { x: 0, z: 0 }, 0, (m) => avisos.push(m))).toBe(true)
    expect(c.modo).toBe('montar')
    expect(c.montaria).toBe(d)
    expect(d.montada).toBe(true)
    expect(avisos).toEqual(['montar'])
    // Montado por alguém, não monta de novo.
    expect(montar(dePe(), d, { x: 0, z: 0 }, 0, () => {})).toBe(false)
  })

  test('anda e corre mais rápido que a criança, pula mais alto e desce pelo mesmo botão', () => {
    const d = dino()
    const m = mundo(d)
    const c = dePe()
    const p: Ponto = { x: 0, y: CORPO.doCentroAoPe, z: 0 }
    montar(c, d, p, 0, () => {})
    for (let i = 0; i < 120; i++) simular(c, p, m, { pedidoZ: 1 })
    expect(Math.hypot(c.vel.x, c.vel.z)).toBeCloseTo(MONTARIA.velocidade, 1)
    for (let i = 0; i < 120; i++) simular(c, p, m, { pedidoZ: 1, correr: true })
    expect(Math.hypot(c.vel.x, c.vel.z)).toBeCloseTo(MONTARIA.correndo, 1)
    expect(MONTARIA.correndo).toBeGreaterThan(CORPO.correr)
    expect(c.direcao).toBeCloseTo(0)
    // Parar tem peso: não para num passo só.
    simular(c, p, m)
    expect(Math.hypot(c.vel.x, c.vel.z)).toBeGreaterThan(0)
    for (let i = 0; i < 120; i++) simular(c, p, m)
    // O pulo do dino vai mais alto que o da criança.
    simular(c, p, m, { pulou: true })
    let alto = p.y
    for (let i = 0; i < 120 && !c.noChao; i++) {
      simular(c, p, m)
      alto = Math.max(alto, p.y)
    }
    const doDino = (MONTARIA.pulo * MONTARIA.pulo) / (2 * 24)
    // O passo fixo soma meio passo de subida a mais que a conta contínua.
    expect(alto - CORPO.doCentroAoPe).toBeGreaterThan(doDino)
    expect(alto - CORPO.doCentroAoPe).toBeLessThan(doDino + (MONTARIA.pulo * dt) / 2 + 0.01)
    expect(MONTARIA.pulo).toBeGreaterThan(CORPO.pulo)
    // Descer: o dino fica onde está, olhando para onde ia; a criança volta ao chão.
    const avisos: ModoDoCorpo[] = []
    simular(c, p, m, { usou: true }, avisos)
    expect(c.modo).toBe('chao')
    expect(avisos).toEqual(['chao'])
    expect(d.montada).toBe(false)
    expect(d.x).toBeCloseTo(p.x)
    expect(d.z).toBeCloseTo(p.z)
    expect(d.y).toBeCloseTo(p.y - CORPO.doCentroAoPe - CORPO.folga)
    expect(d.giro).toBeCloseTo(c.direcao)
    // Desce com um pulinho para a esquerda dele e cai fora do corpo do dino.
    expect(c.velY).toBe(MONTARIA.descida.subida)
    expect(Math.hypot(c.embalo.x, c.embalo.z)).toBeCloseTo(MONTARIA.descida.lado)
    for (let i = 0; i < 60 && !c.noChao; i++) simular(c, p, m)
    simular(c, p, m)
    expect(Math.hypot(p.x - d.x, p.z - d.z)).toBeGreaterThan(MONTARIA.raio + CORPO.raio)
  })

  test('no ar não desce; a água para o passo; a ilha que sai de cena devolve ao chão', () => {
    const d = dino()
    const c = dePe()
    const p: Ponto = { x: 0, y: CORPO.doCentroAoPe, z: 0 }
    montar(c, d, p, 0, () => {})
    const seco = mundo(d)
    simular(c, p, seco, { pulou: true })
    simular(c, p, seco, { usou: true })
    expect(c.modo).toBe('montar')
    for (let i = 0; i < 120 && !c.noChao; i++) simular(c, p, seco)
    // Um lago com a borda em x = 1: o passo para antes dela.
    const lago = mundo(d, {
      aguas: [{ id: 'lago', x: 4, z: 0, raioX: 3, raioZ: 3, giro: 0, y: 0.9 }],
    })
    for (let i = 0; i < 240; i++) simular(c, p, lago, { pedidoX: 1 })
    expect(p.x).toBeLessThan(1.2)
    expect(c.beira).toBe('agua')
    // O limite do Vale também para o passo (a ponte fica fora dele).
    d.limite.raio = 0.5
    p.x = 0
    p.z = 0
    for (let i = 0; i < 240; i++) simular(c, p, seco, { pedidoZ: -1 })
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(0.5)
    expect(c.beira).toBe('limite')
    simular(c, p, seco, { pedidoZ: 1 })
    expect(c.beira).toBeNull()
    // Sem a montaria do Vale (a ilha soltou), o modo não vale mais.
    expect(MODOS.montar.valendo(c, mundo(null))).toBe(false)
    expect(MODOS.montar.valendo(c, mundo(d))).toBe(true)
    desmontar(c, 0, () => {})
    expect(c.montaria).toBeNull()
  })

  test('o colisor do dino parado só volta quando a criança sai de cima dele', () => {
    expect(longeParaVoltar(CORPO.raio)).toBeGreaterThan(MONTARIA.raio + CORPO.raio)
  })

  test('o lugar do dino no Vale é chão plano e largo, longe dos lugares da ilha', async () => {
    const raiz = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
    raiz.updateMatrixWorld(true)
    const colisores = lerColisores(raiz)
    const formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
    const grade = gradeDeAndar(raiz.getObjectByName('col-terreno') as Mesh, formas)
    // Metade do comprimento dele (3,65 m) mais a folga: o corpo inteiro cabe, de qualquer lado.
    const cabe = chaoLivre(colisores, { chao: TAMPO, raio: 1.9, altura: 2, raioDaIlha: 13 })
    const { x, z } = MONTARIA_NO_VALE
    expect(cabe(x, z)).toBe(true)
    for (let a = 0; a < 8; a++)
      expect(
        Math.abs((grade.chaoEm(x + 1.5 * Math.cos(a), z + 1.5 * Math.sin(a)) ?? 0) - TAMPO),
      ).toBeLessThan(0.12)
    const chegada = raiz.getObjectByName('chegada')!.position
    const andou = grade.alcance(chegada.x, chegada.z)
    expect(grade.chegaPerto(andou, x, z, MONTARIA.alcance)).toBe(true)
    // Dentro do limite dele, e a chegada da ponte fora (montado não se sai pela ponte).
    expect(Math.hypot(x, z)).toBeLessThan(RAIO_DA_MONTARIA - 2)
    expect(Math.hypot(chegada.x, chegada.z)).toBeGreaterThan(RAIO_DA_MONTARIA)
    for (const nome of ['chegada', 'morador', 'pe-do-vulcao', 'escavacao', ...NINHOS_DO_VALE]) {
      const a = raiz.getObjectByName(nome)!.position
      expect([nome, Math.hypot(a.x - x, a.z - z) > 3]).toEqual([nome, true])
    }
  }, 120_000)
})
