import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { ILHAS } from '@sistemazero/arquipelago-contracts'
import { type Mesh, type Object3D, Vector3 } from 'three'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE, NIVEL_DA_AGUA, RAIO_DO_RASO, raioMaximoDaIlha } from '../src/mundo/medidas'
import {
  percursoDaPraia,
  percursoDasPedrasDoVulcao,
  percursoDosCorais,
} from '../src/mundo/percursos-das-ilhas'
import { alcanceDoPulo, alturaDoPulo, CORPO } from '../src/sistemas/corpo'
import {
  type ConfigDoPercurso,
  type CorpoNaCorrida,
  criarCorrida,
  estrelasDaCorrida,
  PERCURSO_DA_PRAIA,
  PERCURSO_DAS_PEGADAS,
  PERCURSO_DOS_CORAIS,
  type PontosDoPercurso,
  passoDaCorrida,
} from '../src/sistemas/percurso'
import { arquivoDaIlha, bate, carregarGlb, type Forma, gradeDeAndar } from './ajuda-colisores'

const ilha = (id: string) => {
  const i = ILHAS.find((k) => k.id === id)
  if (!i) throw new Error(id)
  return i
}

async function colisoresDe(
  arquivo: string,
): Promise<{ raiz: Object3D; colisores: ColisorDaIlha[] }> {
  const raiz = await carregarGlb(arquivo)
  raiz.updateMatrixWorld(true)
  return { raiz, colisores: lerColisores(raiz) }
}

const formas = (c: readonly ColisorDaIlha[]) => c.filter((k): k is Forma => k.forma !== 'malha')

/** Percorre os pontos em ordem e confere que a corrida chega com as três estrelas. */
function correrPelosPontos(p: PontosDoPercurso, config: ConfigDoPercurso) {
  const c = criarCorrida(config.vagalumes)
  const corpo = (q: { x: number; y: number; z: number }): CorpoNaCorrida => ({
    x: q.x,
    y: q.y + CORPO.doCentroAoPe,
    z: q.z,
    pes: q.y,
    noChaoDaIlha: false,
  })
  const eventos: string[] = []
  const passar = (q: { x: number; y: number; z: number }) => {
    for (let k = 0; k < 4; k++) {
      const ev = passoDaCorrida(c, corpo(q), p, 100, config)
      if (ev) eventos.push(ev.tipo)
    }
  }
  passar(p.largada)
  // As coisas do caminho primeiro (no ar ou no chão, nada disso é queda), depois as paradas.
  for (const v of p.vagalumes) passar({ x: v.x, y: v.y - CORPO.doCentroAoPe, z: v.z })
  for (const d of p.deques) passar(d)
  passar(p.chegada)
  return { c, eventos }
}

describe('os corais do Recife', () => {
  let p: PontosDoPercurso
  let colisores: ColisorDaIlha[]
  let grade: ReturnType<typeof gradeDeAndar>
  beforeAll(async () => {
    const lido = await colisoresDe(arquivoDaIlha('recife.glb'))
    colisores = lido.colisores
    const r = percursoDosCorais(colisores, raioMaximoDaIlha(ilha('recife')))
    if (!r) throw new Error('faltam corais no recife.glb')
    p = r
    grade = gradeDeAndar(lido.raiz.getObjectByName('col-terreno') as Mesh, formas(colisores))
  }, 120_000)

  test('onze corais de parada e o último é a chegada', () => {
    expect(p.deques).toHaveLength(11)
    expect(p.vagalumes).toHaveLength(PERCURSO_DOS_CORAIS.vagalumes)
  })

  test('cada pulo cabe correndo sem ajuda e não sobe mais do que o pulo alcança', () => {
    const topos = [...p.deques, p.chegada]
    const raios = [...p.deques.map((d) => d.raio - 0.15), PERCURSO_DOS_CORAIS.raioDaChegada - 0.35]
    for (let i = 0; i + 1 < topos.length; i++) {
      const a = topos[i] as { x: number; y: number; z: number }
      const b = topos[i + 1] as { x: number; y: number; z: number }
      const vao = Math.hypot(b.x - a.x, b.z - a.z) - (raios[i] ?? 0) - (raios[i + 1] ?? 0)
      expect(vao).toBeLessThan(alcanceDoPulo(CORPO.correr, GRAVIDADE))
      expect(b.y - a.y).toBeLessThan(alturaDoPulo(GRAVIDADE) - 0.3)
    }
  })

  test('a largada fica no chão livre e o primeiro coral dá para alcançar pulando', () => {
    const chao = grade.chaoEm(p.largada.x, p.largada.z) ?? Number.NaN
    expect(Math.abs(chao - p.largada.y)).toBeLessThan(0.2)
    const centro = new Vector3(p.largada.x, chao + CORPO.doCentroAoPe, p.largada.z)
    for (const f of formas(colisores)) expect(bate(f, centro)).toBe(false)
    const primeiro = p.deques[0]
    if (!primeiro) throw new Error('sem corais')
    expect(primeiro.y - chao).toBeLessThan(alturaDoPulo(GRAVIDADE) - 0.3)
  })

  test('a corrida pelos topos chega com as três estrelas', () => {
    const { c } = correrPelosPontos(p, PERCURSO_DOS_CORAIS)
    expect(c.situacao).toBe('chegou')
    expect(estrelasDaCorrida(c, PERCURSO_DOS_CORAIS)).toEqual({
      chegada: true,
      tempo: true,
      vagalumes: true,
    })
  })

  test('o tempo-alvo deixa folga para quem anda e pula sem cair', () => {
    let caminho = Math.hypot(p.deques[0]!.x - p.largada.x, p.deques[0]!.z - p.largada.z)
    const topos = [...p.deques, p.chegada]
    for (let i = 0; i + 1 < topos.length; i++)
      caminho += Math.hypot(topos[i + 1]!.x - topos[i]!.x, topos[i + 1]!.z - topos[i]!.z)
    const andando = caminho / CORPO.andar + topos.length * 0.6
    expect(andando * 1000).toBeLessThan(PERCURSO_DOS_CORAIS.tempoAlvoMs)
  })
})

describe('as pedras do vulcão do Vale', () => {
  let p: PontosDoPercurso
  let colisores: ColisorDaIlha[]
  let grade: ReturnType<typeof gradeDeAndar>
  beforeAll(async () => {
    const lido = await colisoresDe(arquivoDaIlha('vale-dos-dinos.glb'))
    colisores = lido.colisores
    const r = percursoDasPedrasDoVulcao(colisores, raioMaximoDaIlha(ilha('vale-dos-dinos')))
    if (!r) throw new Error('faltam pedras do vulcão no vale-dos-dinos.glb')
    p = r
    grade = gradeDeAndar(lido.raiz.getObjectByName('col-terreno') as Mesh, formas(colisores))
  }, 120_000)

  test('seis pedras de parada no chão, a sétima é a chegada', () => {
    expect(p.deques).toHaveLength(6)
    for (const q of [...p.deques, p.chegada, p.largada]) {
      const chao = grade.chaoEm(q.x, q.z)
      expect(chao).toBeDefined()
    }
  })

  test('largada e fósseis ficam fora de qualquer colisor', () => {
    const pontos = [
      { ...p.largada, y: (grade.chaoEm(p.largada.x, p.largada.z) ?? 0) + CORPO.doCentroAoPe },
      ...p.vagalumes,
    ]
    for (const q of pontos) {
      const centro = new Vector3(q.x, q.y, q.z)
      for (const f of formas(colisores)) expect([f.nome, bate(f, centro)]).toEqual([f.nome, false])
    }
  })

  test('as pedras só contam na ordem: pular para a última não chega', () => {
    const c = criarCorrida(PERCURSO_DAS_PEGADAS.vagalumes)
    const ultima = p.deques.at(-1)!
    const corpo: CorpoNaCorrida = {
      x: ultima.x,
      y: ultima.y + CORPO.doCentroAoPe,
      z: ultima.z,
      pes: ultima.y,
      noChaoDaIlha: false,
    }
    expect(passoDaCorrida(c, corpo, p, 100, PERCURSO_DAS_PEGADAS)?.tipo).not.toBe('deque')
    expect(c.deque).toBe(-1)
    const longe: CorpoNaCorrida = { ...corpo, x: p.chegada.x, z: p.chegada.z }
    expect(passoDaCorrida(c, longe, p, 100, PERCURSO_DAS_PEGADAS)?.tipo).not.toBe('chegou')
  })

  test('na ordem, a trilha chega com as três estrelas', () => {
    const { c } = correrPelosPontos(p, PERCURSO_DAS_PEGADAS)
    expect(c.situacao).toBe('chegou')
    expect(estrelasDaCorrida(c, PERCURSO_DAS_PEGADAS).vagalumes).toBe(true)
  })

  test('correndo a pé sem parar dá para ganhar a estrela do tempo', () => {
    let caminho = 0
    const lista = [p.largada, ...p.deques, p.chegada]
    for (let i = 0; i + 1 < lista.length; i++)
      caminho += Math.hypot(lista[i + 1]!.x - lista[i]!.x, lista[i + 1]!.z - lista[i]!.z)
    expect((caminho / CORPO.correr) * 1000).toBeLessThan(PERCURSO_DAS_PEGADAS.tempoAlvoMs)
  })
})

describe('a volta pela praia da sua ilha', () => {
  let p: PontosDoPercurso
  let colisores: ColisorDaIlha[]
  let terreno: Mesh
  beforeAll(async () => {
    const lido = await colisoresDe(
      join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'terreno.glb'),
    )
    colisores = lido.colisores
    const r = percursoDaPraia(colisores, RAIO_DO_RASO)
    if (!r) throw new Error('faltam pedras da praia no terreno.glb')
    p = r
    terreno = lido.raiz.getObjectByName('chao') as Mesh
  }, 120_000)

  test('quatro paradas e a chegada, todas na areia seca e fora das pedras', () => {
    expect(p.deques).toHaveLength(4)
    for (const q of [...p.deques, p.chegada]) {
      const r = Math.hypot(q.x, q.z)
      expect(r).toBeLessThan(RAIO_DO_RASO)
      expect(q.y).toBeGreaterThan(NIVEL_DA_AGUA - 0.4)
      const centro = new Vector3(q.x, q.y + CORPO.doCentroAoPe + 0.3, q.z)
      for (const f of formas(colisores)) expect(bate(f, centro)).toBe(false)
    }
    expect(terreno).toBeDefined()
  })

  test('na ordem, a volta chega com as três estrelas', () => {
    const { c } = correrPelosPontos(p, PERCURSO_DA_PRAIA)
    expect(c.situacao).toBe('chegou')
    expect(estrelasDaCorrida(c, PERCURSO_DA_PRAIA).vagalumes).toBe(true)
  })

  test('o tempo-alvo dá para correndo e não andando', () => {
    let caminho = 0
    const lista = [p.largada, ...p.deques, p.chegada]
    for (let i = 0; i + 1 < lista.length; i++)
      caminho += Math.hypot(lista[i + 1]!.x - lista[i]!.x, lista[i + 1]!.z - lista[i]!.z)
    expect((caminho / CORPO.correr) * 1000).toBeLessThan(PERCURSO_DA_PRAIA.tempoAlvoMs)
    expect((caminho / CORPO.andar) * 1000).toBeGreaterThan(PERCURSO_DA_PRAIA.tempoAlvoMs)
  })
})
