import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, Matrix4, type Mesh, type Object3D, Quaternion, Ray, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  type AncorasDoPercurso,
  CIPOS_DO_BOSQUE,
  NOMES_DAS_ANCORAS_DO_PERCURSO,
  PLACA_DA_LARGADA,
  percursoNoModelo,
  RAIOS_DOS_DEQUES,
  TOPO_DO_BOSQUE,
  TRONCO_DOS_CIPOS,
} from '../src/mundo/bosque'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  type Balanco,
  CIPO,
  comprimentoDaPegada,
  corpoNoBalanco,
  criarBalanco,
  distanciaDaCorda,
  GRAVIDADE_DO_CIPO,
  passoDoBalanco,
  velocidadeAoSoltar,
} from '../src/sistemas/cipo'
import { CORPO } from '../src/sistemas/corpo'
import {
  alturaMaxima,
  alturaMinima,
  corpoNaEscalada,
  meioNaAltura,
  raioNaAltura,
  saltoDaEscalada,
} from '../src/sistemas/escalada'
import { PERCURSO_DAS_COPAS, type PontosDoPercurso } from '../src/sistemas/percurso'

const ARQUIVO = join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb')
/** O pulo do personagem (`personagem.tsx`): 8,5 para cima com gravidade 24 sobe uns 1,5. */
const ALTURA_DO_PULO = 8.5 ** 2 / (2 * GRAVIDADE_DO_CIPO)
const ANDAR = CORPO.andar
const CORRER = CORPO.correr
const DEGRAU = 0.45

type Caixa = Extract<ColisorDaIlha, { forma: 'caixa' }>
type Cilindro = Extract<ColisorDaIlha, { forma: 'cilindro' }>
type Forma = Caixa | Cilindro

function grupo(nome: string): string {
  const partes = nome.split('-')
  return /^\d+$/.test(partes.at(-1) ?? '') ? partes.slice(0, -1).join('-') : nome
}

function matriz(c: Forma): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...c.posicao),
    new Quaternion(...c.rotacao),
    new Vector3(1, 1, 1),
  )
}

function topoEm(c: Forma, x: number, z: number): number | undefined {
  const raio = new Ray(new Vector3(x, 50, z), new Vector3(0, -1, 0)).applyMatrix4(
    matriz(c).invert(),
  )
  if (c.forma === 'caixa') {
    const caixa = new Box3(new Vector3(...c.meio).negate(), new Vector3(...c.meio))
    const p = raio.intersectBox(caixa, new Vector3())
    return p ? p.applyMatrix4(matriz(c)).y : undefined
  }
  if (Math.hypot(raio.origin.x, raio.origin.z) > c.raio) return undefined
  return c.posicao[1] + c.meiaAltura
}

/** O corpo (centro em `p`, cápsula do personagem) bate nesta forma? */
function bate(c: Forma, p: { x: number; y: number; z: number }): boolean {
  const local = new Vector3(p.x, p.y, p.z).applyMatrix4(matriz(c).invert())
  if (c.forma === 'caixa') {
    return (
      Math.abs(local.x) < c.meio[0] + CORPO.raio &&
      Math.abs(local.y) < c.meio[1] + CORPO.doCentroAoPe &&
      Math.abs(local.z) < c.meio[2] + CORPO.raio
    )
  }
  return (
    Math.hypot(local.x, local.z) < c.raio + CORPO.raio &&
    Math.abs(local.y) < c.meiaAltura + CORPO.doCentroAoPe
  )
}

let raiz: Object3D
let colisores: Forma[]
let pontos: PontosDoPercurso
const PISO = ['col-cil-deque', 'col-ponte', 'col-degrau', 'col-escorregador']

const doGrupo = (...g: string[]) => colisores.filter((c) => g.includes(grupo(c.nome)))
const obstaculos = () => colisores.filter((c) => !PISO.includes(grupo(c.nome)))
/** O piso mais alto sob (x, z) que o corpo alcança de `altura` (subindo um degrau ou caindo). */
function pisoSob(x: number, z: number, altura = Number.POSITIVE_INFINITY): number | undefined {
  const alturas = doGrupo(...PISO)
    .map((c) => topoEm(c, x, z))
    .filter((v): v is number => v !== undefined && v <= altura + DEGRAU)
  return alturas.length ? Math.max(...alturas) : undefined
}
const quemBate = (p: { x: number; y: number; z: number }) =>
  obstaculos().find((c) => bate(c, p))?.nome

interface CipoDoArquivo {
  nome: string
  pivo: { x: number; y: number; z: number }
  corda: number
  pegada: number
}
let cipos: CipoDoArquivo[]

beforeAll(async () => {
  const buf = readFileSync(ARQUIVO)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  raiz = (await new GLTFLoader().parseAsync(ab, '')).scene
  raiz.updateMatrixWorld(true)
  colisores = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  const ancoras: Partial<AncorasDoPercurso> = {}
  for (const nome of NOMES_DAS_ANCORAS_DO_PERCURSO) {
    const o = raiz.getObjectByName(nome)
    if (!o) throw new Error(`sem a âncora ${nome}`)
    ancoras[nome] = { x: o.position.x, y: o.position.y, z: o.position.z }
  }
  pontos = percursoNoModelo(ancoras as AncorasDoPercurso)
  cipos = CIPOS_DO_BOSQUE.map((nome) => {
    const no = raiz.getObjectByName(nome)
    if (!no) throw new Error(`sem o ${nome}`)
    const fundo = new Box3().setFromObject(no).min.y
    const corda = no.position.y - fundo
    return {
      nome,
      pivo: { x: no.position.x, y: no.position.y, z: no.position.z },
      corda,
      pegada: comprimentoDaPegada(no.position.y, TOPO_DO_BOSQUE, corda, CORPO.doCentroAoPe),
    }
  })
})

/** Bombeia o cipó na direção `rumo` e solta na primeira ida passada de `soltarEm` (radianos). */
function bombearESoltar(c: CipoDoArquivo, rumo: number, soltarEm: number) {
  const b: Balanco = { ...criarBalanco(), rumo, comprimento: c.pegada }
  const px = Math.sin(rumo)
  const pz = Math.cos(rumo)
  let anterior = b.angulo
  for (let i = 0; i < 60 * 10; i++) {
    passoDoBalanco(b, px, pz, 1 / 60, true)
    if (anterior < soltarEm && b.angulo >= soltarEm && b.velocidade > 0) break
    anterior = b.angulo
  }
  return {
    corpo: corpoNoBalanco(b, c.pivo, { x: 0, y: 0, z: 0 }),
    vel: velocidadeAoSoltar(b, { x: 0, y: 0, z: 0 }),
  }
}

/** Voa (sem controle no ar) e devolve a primeira posição das mãos que pega o cipó `alvo`. */
function voaAte(
  de: { x: number; y: number; z: number },
  vel: { x: number; y: number; z: number },
  alvo: CipoDoArquivo,
): boolean {
  const parado = criarBalanco()
  for (let t = 0; t < 1.5; t += 1 / 120) {
    const maos = {
      x: de.x + vel.x * t,
      y: de.y + CIPO.maosAcimaDoCentro + vel.y * t - 0.5 * GRAVIDADE_DO_CIPO * t * t,
      z: de.z + vel.z * t,
    }
    if (maos.y - CIPO.maosAcimaDoCentro - CORPO.doCentroAoPe < TOPO_DO_BOSQUE) return false
    if (distanciaDaCorda(parado, alvo.pivo, alvo.corda, maos) < CIPO.raioDaPegadaNoAr) return true
  }
  return false
}

describe('cipós do Bosque', () => {
  test('os três cipós pendem do galho por cima do lago, um depois do outro', () => {
    expect(cipos.map((c) => c.pivo.x)).toEqual([7.1, 5.6, 4.1].map((x) => expect.closeTo(x, 2)))
    for (const c of cipos) {
      expect(c.pivo.y).toBeGreaterThan(6)
      expect(c.corda).toBeGreaterThan(4)
      // As mãos seguram acima do fim da corda e os pés passam livres no ponto mais baixo.
      expect(c.pegada).toBeLessThanOrEqual(c.corda)
      const pes = c.pivo.y - c.pegada - CIPO.maosAcimaDoCentro - CORPO.doCentroAoPe
      expect(pes).toBeCloseTo(TOPO_DO_BOSQUE + CIPO.folgaDosPes, 5)
    }
  })

  test('do primeiro ao terceiro: bombeia, solta e pega o próximo no ar', () => {
    for (let i = 0; i < 2; i++) {
      const de = cipos[i]
      const para = cipos[i + 1]
      if (!de || !para) throw new Error('sem cipó')
      const rumo = Math.atan2(para.pivo.x - de.pivo.x, para.pivo.z - de.pivo.z)
      const { corpo, vel } = bombearESoltar(de, rumo, 0.35)
      expect(voaAte(corpo, vel, para)).toBe(true)
    }
  })

  test('do último cipó, soltar na ida passa o lago e cai em terra', () => {
    const ultimo = cipos[2]
    if (!ultimo) throw new Error('sem cipó')
    const agua = raiz.getObjectByName('agua') as Mesh
    agua.geometry.computeBoundingBox()
    const lago = agua.geometry.boundingBox
    if (!lago) throw new Error('sem lago')
    // Para −x (o lado da trilha), como quem atravessa.
    const { corpo, vel } = bombearESoltar(ultimo, -Math.PI / 2, 0.45)
    let x = corpo.x
    let y = corpo.y - CORPO.doCentroAoPe
    let vy = vel.y
    while (y > TOPO_DO_BOSQUE) {
      x += vel.x / 120
      vy -= GRAVIDADE_DO_CIPO / 120
      y += vy / 120
    }
    expect(x).toBeLessThan(lago.min.x)
  })

  test('o lago é a água que o personagem nada (rasa: o desenho não tem fundo)', () => {
    const agua = raiz.getObjectByName('agua') as Mesh
    agua.geometry.computeBoundingBox()
    const b = agua.geometry.boundingBox
    if (!b) throw new Error('sem lago')
    expect(b.max.y).toBeCloseTo(TOPO_DO_BOSQUE, 1)
    // O segundo e o terceiro cipós ficam sobre a água; o primeiro, na margem.
    const dentro = (x: number, z: number) =>
      ((x - (b.min.x + b.max.x) / 2) / ((b.max.x - b.min.x) / 2)) ** 2 +
        ((z - (b.min.z + b.max.z) / 2) / ((b.max.z - b.min.z) / 2)) ** 2 <
      1
    expect(cipos.map((c) => dentro(c.pivo.x, c.pivo.z))).toEqual([false, true, true])
  })
})

describe('tronco de escalar (a árvore do galho dos cipós)', () => {
  const t = TRONCO_DOS_CIPOS
  const mao = CIPO.maosAcimaDoCentro
  const troncoDaArvore = () =>
    (doGrupo('col-cil-tronco') as Cilindro[]).filter(
      (c) => Math.hypot(c.posicao[0] - t.base.x, c.posicao[2] - t.base.z) < 1,
    )

  test('segue os colisores do tronco: casca por fora deles, eixo junto', () => {
    const pedacos = troncoDaArvore()
    expect(pedacos.length).toBeGreaterThan(2)
    for (const c of pedacos) {
      const meio = meioNaAltura(t, c.posicao[1], { x: 0, y: 0, z: 0 })
      expect(Math.hypot(meio.x - c.posicao[0], meio.z - c.posicao[2])).toBeLessThan(0.08)
      // O colisor tem 85% da casca: a casca daqui fica por fora dele, e não muito.
      const r = raioNaAltura(t, c.posicao[1])
      expect(r).toBeGreaterThan(c.raio)
      expect(r).toBeLessThan(c.raio / 0.85 + 0.06)
    }
  })

  test('agarrado, em qualquer lado e altura, o corpo não entra em nada sólido', () => {
    const tronco = new Set(troncoDaArvore().map((c) => c.nome))
    for (
      let altura = alturaMinima(t, CORPO.doCentroAoPe);
      altura <= alturaMaxima(t, mao);
      altura += 0.25
    ) {
      for (let k = 0; k < 24; k++) {
        const p = corpoNaEscalada(t, { lado: (k / 24) * Math.PI * 2, altura }, CORPO.raio, {
          x: 0,
          y: 0,
          z: 0,
        })
        const bateu = colisores.find((c) => !tronco.has(c.nome) && bate(c, p))
        expect(bateu?.nome).toBeUndefined()
        // E nem no próprio tronco: a casca desenhada fica por fora do colisor da mesma altura.
        for (const c of troncoDaArvore()) {
          if (Math.abs(p.y - c.posicao[1]) > c.meiaAltura) continue
          const d = Math.hypot(p.x - c.posicao[0], p.z - c.posicao[2])
          expect(d).toBeGreaterThan(c.raio + CORPO.raio)
        }
      }
    }
  })

  test('as mãos param abaixo do galho dos cipós', () => {
    expect(alturaMaxima(t, mao) + mao).toBeLessThan(6)
  })

  test('lá de cima, pular para longe do tronco cai no primeiro cipó', () => {
    const primeiro = cipos[0]
    if (!primeiro) throw new Error('sem cipó')
    const altura = alturaMaxima(t, mao)
    const meio = meioNaAltura(t, altura, { x: 0, y: 0, z: 0 })
    const lado = Math.atan2(primeiro.pivo.x - meio.x, primeiro.pivo.z - meio.z)
    const a = { lado, altura }
    const corpo = corpoNaEscalada(t, a, CORPO.raio, { x: 0, y: 0, z: 0 })
    const vel = saltoDaEscalada(a, 0, 0, { x: 0, y: 0, z: 0 })
    expect(voaAte(corpo, vel, primeiro)).toBe(true)
  })
})

describe('percurso nas copas', () => {
  test('os raios dos deques são os dos colisores', () => {
    const deques = doGrupo('col-cil-deque') as Cilindro[]
    pontos.deques.forEach((d, i) => {
      const c = deques.find((k) => Math.hypot(k.posicao[0] - d.x, k.posicao[2] - d.z) < 0.01)
      expect(c?.raio).toBeCloseTo(RAIOS_DOS_DEQUES[i] ?? 0, 2)
    })
  })

  test('a volta de cada deque fica no piso dele, livre do tronco, da casa e do guarda-corpo', () => {
    for (const d of pontos.deques) {
      expect(pisoSob(d.volta.x, d.volta.z)).toBeCloseTo(d.y, 2)
      expect(quemBate({ ...d.volta, y: d.y + CORPO.doCentroAoPe + 0.05 })).toBeUndefined()
    }
  })

  test('a largada fica no chão, livre, e a placa não tapa a escada', () => {
    const l = pontos.largada
    expect(pisoSob(l.x, l.z)).toBeUndefined()
    expect(quemBate({ ...l, y: TOPO_DO_BOSQUE + CORPO.doCentroAoPe + 0.05 })).toBeUndefined()
    const placa = {
      x: PLACA_DA_LARGADA.x,
      y: TOPO_DO_BOSQUE + CORPO.doCentroAoPe,
      z: PLACA_DA_LARGADA.z,
    }
    // O poste é fino: basta não estar em cima de nada que se pisa ou que colide.
    expect(colisores.find((c) => bate(c, placa))?.nome).toBeUndefined()
  })

  test('a chegada é o fim do escorregador', () => {
    const fim = pontos.chegada
    const calha = doGrupo('col-escorregador') as Caixa[]
    const ultima = calha.reduce((a, b) => (b.posicao[1] < a.posicao[1] ? b : a))
    expect(Math.hypot(ultima.posicao[0] - fim.x, ultima.posicao[2] - fim.z)).toBeLessThan(
      PERCURSO_DAS_COPAS.raioDaChegada,
    )
  })

  test('cada vagalume se alcança do piso de baixo (andando ou num pulo) e fica fora do sólido', () => {
    const vagalumes = pontos.vagalumes
    expect(vagalumes).toHaveLength(PERCURSO_DAS_COPAS.vagalumes)
    for (const v of vagalumes) {
      const piso = pisoSob(v.x, v.z, v.y)
      if (piso === undefined) throw new Error(`vagalume sem piso embaixo em ${v.x}, ${v.z}`)
      const centro = piso + CORPO.doCentroAoPe
      // Em pé já pega, ou pega no alto do pulo.
      expect(v.y - centro).toBeLessThan(PERCURSO_DAS_COPAS.raioDoVagalume + ALTURA_DO_PULO * 0.8)
      expect(v.y).toBeGreaterThan(piso)
      expect(quemBate({ x: v.x, y: centro, z: v.z })).toBeUndefined()
    }
  })

  test('o tempo-alvo cabe no caminho: andando sem cair dá, com folga pequena', () => {
    // Largada, degraus, a volta em cada deque, as pontes e o escorregador, em linha.
    const degraus = (doGrupo('col-degrau') as Caixa[])
      .map((c) => ({ x: c.posicao[0], z: c.posicao[2], y: c.posicao[1] }))
      .sort((a, b) => a.y - b.y)
    const calha = (doGrupo('col-escorregador') as Caixa[])
      .map((c) => ({ x: c.posicao[0], z: c.posicao[2], y: c.posicao[1] }))
      .sort((a, b) => b.y - a.y)
    const caminho = [pontos.largada, ...degraus]
    pontos.deques.forEach((d, i) => {
      const anterior = i === 0 ? degraus.at(-1) : pontos.deques[i - 1]
      if (!anterior) return
      const rumo = Math.atan2(anterior.z - d.z, anterior.x - d.x)
      const r = d.raio - 0.5
      caminho.push({ x: d.x + Math.cos(rumo) * r, y: d.y, z: d.z + Math.sin(rumo) * r })
      // Dá a volta no tronco: meia volta pela borda até a saída.
      const saida = Math.atan2(d.volta.z - d.z, d.volta.x - d.x)
      let delta = saida - rumo
      delta = Math.atan2(Math.sin(delta), Math.cos(delta))
      for (let k = 1; k <= 8; k++) {
        const a = rumo + (delta * k) / 8
        caminho.push({ x: d.x + Math.cos(a) * r, y: d.y, z: d.z + Math.sin(a) * r })
      }
    })
    caminho.push(...calha, pontos.chegada)
    let metros = 0
    for (let i = 1; i < caminho.length; i++) {
      const a = caminho[i - 1]
      const b = caminho[i]
      if (a && b) metros += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    }
    expect(metros).toBeGreaterThan(30)
    expect(metros).toBeLessThan(55)
    const andando = (metros / ANDAR) * 1000
    expect(PERCURSO_DAS_COPAS.tempoAlvoMs).toBeGreaterThan(andando * 1.2)
    expect(PERCURSO_DAS_COPAS.tempoAlvoMs).toBeLessThan(andando * 2.5)
    // Correndo sobra tempo para uma queda (o corte e a volta ao último deque).
    expect(PERCURSO_DAS_COPAS.tempoAlvoMs).toBeGreaterThan((metros / CORRER) * 1000 * 2)
  })
})
