import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { Matrix4, type Mesh, type Object3D, Quaternion, Raycaster, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  ALTURA_QUE_SEGURA,
  ARVORES,
  COLISORES_DA_BANCADA,
  COLISORES_DO_FAROL,
  COLISORES_DO_PIER,
  colisoresDaCasa,
  colisoresDaHorta,
  colisoresDasArvores,
  corrimaosDaPonte,
  deslocar,
  GRUPOS,
  posicaoDoCanteiro,
  postesDaPonte,
  type Solido,
  tabuasDaPonte,
  variedadeDaArvore,
} from '../src/mundo/colisao-da-ilha-central'
import { lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import {
  alturaDaIlha,
  BANCADA,
  CATA_VENTO,
  CENTRO_DA_CASA,
  FAROL,
  INICIO,
  PIER,
  PORTA,
  QUARTO,
  trajetoDaPonte,
} from '../src/mundo/medidas'

const MUNDO = join(import.meta.dir, '..', 'src', 'assets', 'mundo')

async function carregar(arquivo: string): Promise<Object3D> {
  const buf = readFileSync(join(MUNDO, arquivo))
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return (await new GLTFLoader().parseAsync(ab, '')).scene
}

function nosDeColisao(arquivo: string): { nome: string; material?: number }[] {
  const buf = readFileSync(join(MUNDO, arquivo))
  const doc = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {
    nodes: { name?: string; mesh?: number }[]
    meshes: { primitives: { material?: number }[] }[]
  }
  return doc.nodes
    .filter((n) => n.name?.startsWith('col-'))
    .flatMap((n) =>
      (doc.meshes[n.mesh ?? -1]?.primitives ?? []).map((p) => ({
        nome: n.name ?? '',
        material: p.material,
      })),
    )
}

function grupo(nome: string): string {
  const partes = nome.split('-')
  return /^\d+$/.test(partes.at(-1) ?? '') ? partes.slice(0, -1).join('-') : nome
}

// O personagem: cápsula de raio 0,35, meia altura 0,55; o degrau automático é de 0,45 (com a
// curva do pé ele sobe até uns 0,58, `ALTURA_QUE_SEGURA`). Na busca, qualquer coisa acima de 0,45
// conta como obstáculo (a conta mais rigorosa).
const RAIO_DO_CORPO = 0.35
const CENTRO_DO_CORPO = 0.9
const DEGRAU = 0.45

const inversas = new WeakMap<Solido, Matrix4>()
function inversa(c: Solido): Matrix4 {
  let m = inversas.get(c)
  if (!m) {
    m = new Matrix4()
      .compose(new Vector3(...c.posicao), new Quaternion(...c.rotacao), new Vector3(1, 1, 1))
      .invert()
    inversas.set(c, m)
  }
  return m
}

const local = new Vector3()
/** O corpo (centro em `p`) bate nesta forma? */
function bate(c: Solido, p: Vector3): boolean {
  local.copy(p).applyMatrix4(inversa(c))
  if (c.forma === 'caixa') {
    return (
      Math.abs(local.x) < c.meio[0] + RAIO_DO_CORPO &&
      Math.abs(local.y) < c.meio[1] + CENTRO_DO_CORPO &&
      Math.abs(local.z) < c.meio[2] + RAIO_DO_CORPO
    )
  }
  return (
    Math.hypot(local.x, local.z) < c.raio + RAIO_DO_CORPO &&
    Math.abs(local.y) < c.meiaAltura + CENTRO_DO_CORPO
  )
}

/** A altura do topo (formas em pé ou giradas só em y). */
function topo(c: Solido): number {
  return c.posicao[1] + (c.forma === 'caixa' ? c.meio[1] : c.meiaAltura)
}

let terreno: Object3D
let doTerreno: Solido[]
let doFarol: Solido[]
let doPier: Solido[]
let doCataVento: Solido[]
let todos: Solido[]

const solidos = (raiz: Object3D) =>
  lerColisores(raiz).filter((c): c is Solido => c.forma !== 'malha')

beforeAll(async () => {
  terreno = await carregar('terreno.glb')
  doTerreno = solidos(terreno)
  doFarol = solidos(await carregar('farol.glb'))
  doPier = solidos(await carregar('pier.glb'))
  doCataVento = solidos(await carregar('cata-vento.glb'))
  todos = [
    ...doTerreno,
    ...colisoresDasArvores(),
    ...colisoresDaHorta(),
    ...deslocar(colisoresDaCasa(true), GRUPOS.casa),
    ...deslocar(COLISORES_DA_BANCADA, GRUPOS.bancada),
    ...deslocar([...COLISORES_DO_FAROL, ...doFarol], GRUPOS.farol),
    ...deslocar([...COLISORES_DO_PIER, ...doPier], GRUPOS.pier),
    ...noCataVento(doCataVento),
  ]
})

/** Os colisores do cata-vento no lugar dele (`CATA_VENTO`, girado e no chão da ilha). */
function noCataVento(lista: Solido[]): Solido[] {
  const { x, z, giro } = CATA_VENTO
  const c = Math.cos(giro)
  const s = Math.sin(giro)
  const y = alturaDaIlha(x, z)
  return lista.map((o) => {
    const [px, py, pz] = o.posicao
    return { ...o, posicao: [x + px * c + pz * s, y + py, z - px * s + pz * c] }
  })
}

/** Algo que não dá para subir (mais alto que o degrau) segura o corpo em (x, z)? */
function quemSegura(x: number, z: number, lista = todos): string | undefined {
  const chao = alturaDaIlha(x, z)
  const corpo = new Vector3(x, chao + CENTRO_DO_CORPO, z)
  return lista.find((c) => topo(c) > chao + DEGRAU && bate(c, corpo))?.nome
}

describe('os nós col-* dos modelos da ilha central', () => {
  test('cada arquivo traz os grupos esperados, sem material', () => {
    const esperado: Record<string, Record<string, number>> = {
      'terreno.glb': { 'col-cil-moita': 10 },
      'farol.glb': { 'col-cil-pedra-farol': 8, 'col-degrau-farol': 3 },
      'pier.glb': {
        'col-cil-estaca': 8,
        'col-cil-poste-lampiao': 1,
        'col-cil-poste-lanterna': 1,
        'col-barco': 1,
      },
    }
    for (const [arquivo, grupos] of Object.entries(esperado)) {
      const nos = nosDeColisao(arquivo)
      for (const n of nos) expect(n.material).toBeUndefined()
      for (const [g, quantos] of Object.entries(grupos)) {
        expect(nos.filter((n) => grupo(n.nome) === g)).toHaveLength(quantos)
      }
    }
    // As pedras que cabem na ilha (as outras o script já tira dos caminhos e das pontes).
    expect(doTerreno.filter((c) => grupo(c.nome) === 'col-cil-pedra').length).toBeGreaterThan(10)
    for (const c of [...doTerreno, ...doFarol, ...doPier]) {
      expect(c.forma).toBe(c.nome.startsWith('col-cil-') ? 'cilindro' : 'caixa')
    }
  })

  test('cada moita e cada pedra tem o colisor debaixo do desenho, sem passar dele', () => {
    const enfeites = terreno.getObjectByName('enfeites') as Mesh
    const raio = new Raycaster()
    for (const c of doTerreno) {
      if (c.forma !== 'cilindro') throw new Error(`${c.nome} devia ser cilindro`)
      const [x, , z] = c.posicao
      // O ponto mais alto do desenho perto do meio (a moita são três bolotas, o meio fica baixo).
      let alto = -Infinity
      for (let k = 0; k <= 8; k++) {
        const a = (k * Math.PI) / 4
        const d = k === 0 ? 0 : c.raio * 0.4
        raio.set(new Vector3(x + Math.cos(a) * d, 10, z + Math.sin(a) * d), new Vector3(0, -1, 0))
        const [acerto] = raio.intersectObject(enfeites)
        if (acerto) alto = Math.max(alto, acerto.point.y)
      }
      const chao = alturaDaIlha(x, z)
      // O desenho está ali (acima do chão) e o colisor quase não passa do topo dele.
      expect(alto - chao).toBeGreaterThan(0.25)
      if (c.nome.startsWith('col-cil-moita-')) {
        // Moita não se sobe: passa do que o personagem sobe (o topo invisível fica dentro das
        // folhas ou logo acima) e segura só o corpo (a câmera passa).
        expect(topo(c)).toBeLessThanOrEqual(alto + 0.2)
        expect(topo(c) - chao).toBeGreaterThanOrEqual(ALTURA_QUE_SEGURA - 0.01)
        expect(soParaOCorpo(c.nome)).toBe(true)
      } else {
        expect(topo(c)).toBeLessThanOrEqual(alto + 0.05)
        expect(soParaOCorpo(c.nome)).toBe(false)
      }
    }
  })

  test('o que é fino ou macio segura só o corpo; parede, tronco e pedra tapam a câmera', () => {
    const nomes = todos.map((c) => c.nome)
    const so = (prefixo: string) => nomes.filter((n) => n.startsWith(prefixo))
    for (const n of [
      ...so('col-cil-moita-'),
      ...so('col-cil-copa-'),
      ...so('col-canteiro-'),
      ...so('col-cil-vaso-'),
      ...so('col-coluna-'),
      ...so('col-floreira-'),
      ...so('col-cil-estaca-'),
      ...so('col-cil-poste-'),
      ...so('col-barco-'),
    ]) {
      expect(soParaOCorpo(n)).toBe(true)
    }
    for (const n of [
      ...so('col-parede-'),
      ...so('col-cil-tronco-'),
      ...so('col-cil-pedra'),
      ...so('col-cil-farol'),
    ]) {
      expect(soParaOCorpo(n)).toBe(false)
    }
  })
})

describe('as árvores, a casa e a horta', () => {
  test('cada árvore tem tronco, e o pinheiro também a saia de galhos na altura do corpo', () => {
    const lista = colisoresDasArvores()
    ARVORES.forEach(([x, z], i) => {
      expect(lista.some((c) => c.nome === `col-cil-tronco-arvore-${i + 1}`)).toBe(true)
      const saia = lista.find((c) => c.nome === `col-cil-copa-pinheiro-${i + 1}`)
      expect(Boolean(saia)).toBe(variedadeDaArvore(x, z, i) === 'arvore-pinheiro')
      if (saia?.forma === 'cilindro') {
        // A saia de baixo desce até 0,9 do chão: o corpo (até 1,8) não passa por baixo.
        expect(saia.posicao[1] - saia.meiaAltura - alturaDaIlha(x, z)).toBeLessThan(1.8)
      }
    })
  })

  test('os canteiros passam do que o personagem sobe (ele para na borda)', () => {
    for (const c of colisoresDaHorta()) {
      const chao = alturaDaIlha(c.posicao[0], c.posicao[2])
      expect(topo(c) - chao).toBeGreaterThanOrEqual(ALTURA_QUE_SEGURA - 0.01)
    }
  })

  test('do começo no quarto até a porta aberta, nada da casca segura o corpo', () => {
    const casca = deslocar(colisoresDaCasa(true), GRUPOS.casa)
    const caminho = [
      [INICIO.x, INICIO.z],
      [PORTA.x, CENTRO_DA_CASA.z + QUARTO.fundo / 2 - 1.2],
      [PORTA.x, CENTRO_DA_CASA.z + QUARTO.fundo / 2 + 2.2],
    ] as const
    for (let i = 0; i + 1 < caminho.length; i++) {
      const [x0, z0] = caminho[i] ?? [0, 0]
      const [x1, z1] = caminho[i + 1] ?? [0, 0]
      for (let t = 0; t <= 1; t += 0.05) {
        expect(quemSegura(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, casca)).toBeUndefined()
      }
    }
    // Fechada, a porta nova segura no vão.
    const fechada = deslocar(colisoresDaCasa(false), GRUPOS.casa)
    expect(quemSegura(PORTA.x, CENTRO_DA_CASA.z + QUARTO.fundo / 2, fechada)).toBe('col-porta')
  })

  test('as trilhas de pedra (porta, píer, horta e bancada) ficam livres', () => {
    const trilhas: [number, number][][] = [
      [
        [2.5, 1.6],
        [1.5, 6],
        [-1.5, 12],
        [-4, 18],
        [-5, 24.5],
      ],
      // As pedras até a horta saem de baixo da varanda: quem sai pela porta contorna a coluna.
      [
        [2.5, 2.4],
        [4.5, 2.4],
        [7.4, 1.2],
      ],
      [
        [8.2, -1.2],
        [9.6, -4.4],
      ],
    ]
    for (const trilha of trilhas) {
      for (let i = 0; i + 1 < trilha.length; i++) {
        const [x0, z0] = trilha[i] ?? [0, 0]
        const [x1, z1] = trilha[i + 1] ?? [0, 0]
        const passos = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1)
        for (let k = 0; k <= passos; k++) {
          const t = k / passos
          expect(quemSegura(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)).toBeUndefined()
        }
      }
    }
  })
})

describe('dá para andar da porta até tudo', () => {
  const PASSO = 0.25
  const LADO = 30
  const n = Math.round((2 * LADO) / PASSO) + 1
  const celula = (x: number, z: number) =>
    Math.round((z + LADO) / PASSO) * n + Math.round((x + LADO) / PASSO)
  let alcancadas: Set<number>

  beforeAll(() => {
    // Busca em largura numa grade de 25 cm, só em terra e sem nada que segure o corpo.
    const livre = (i: number) => {
      const x = (i % n) * PASSO - LADO
      const z = Math.floor(i / n) * PASSO - LADO
      return alturaDaIlha(x, z) > 0.1 && !quemSegura(x, z)
    }
    const inicio = celula(PORTA.x, CENTRO_DA_CASA.z + QUARTO.fundo / 2 + 1.25)
    expect(livre(inicio)).toBe(true)
    alcancadas = new Set([inicio])
    const fila = [inicio]
    while (fila.length > 0) {
      const i = fila.pop() as number
      const coluna = i % n
      for (const j of [i - n, i + n, coluna > 0 ? i - 1 : -1, coluna < n - 1 ? i + 1 : -1]) {
        if (j < 0 || j >= n * n || alcancadas.has(j) || !livre(j)) continue
        alcancadas.add(j)
        fila.push(j)
      }
    }
  })

  const chegaPerto = (x: number, z: number, raio: number) => {
    for (let dx = -raio; dx <= raio; dx += PASSO) {
      for (let dz = -raio; dz <= raio; dz += PASSO) {
        if (Math.hypot(dx, dz) <= raio && alcancadas.has(celula(x + dx, z + dz))) return true
      }
    }
    return false
  }

  test('cada canteiro da horta (a 1,6 do meio dele, para plantar e colher)', () => {
    for (let i = 0; i < 6; i++) {
      const { x, z } = posicaoDoCanteiro(i)
      expect(chegaPerto(x, z, 1.6)).toBe(true)
    }
  })

  test('o cata-vento ao lado da horta (dentro do alcance de "Mudar o clima", 1,8 m)', () => {
    expect(chegaPerto(CATA_VENTO.x, CATA_VENTO.z, 1.6)).toBe(true)
    // Ele segura o corpo, mas não tapa nenhum canteiro.
    expect(quemSegura(CATA_VENTO.x, CATA_VENTO.z)).toBe('col-cil-poste-cata-vento-1')
    for (let i = 0; i < 6; i++) {
      const { x, z } = posicaoDoCanteiro(i)
      expect(Math.hypot(x - CATA_VENTO.x, z - CATA_VENTO.z)).toBeGreaterThan(1.3)
    }
  })

  test('a bancada, o farol e o começo do píer', () => {
    expect(chegaPerto(BANCADA.x, BANCADA.z, 2)).toBe(true)
    expect(chegaPerto(FAROL.x, FAROL.z, 3.4)).toBe(true)
    expect(chegaPerto(PIER.x, PIER.z - 0.5, 0.6)).toBe(true)
  })

  test('a cabeça de cada ponte', () => {
    for (const ilha of ilhasDoAnel()) {
      const [cabeca] = trajetoDaPonte(ilha)
      if (!cabeca) throw new Error('sem ponte')
      expect(chegaPerto(cabeca.x, cabeca.z, 0.6)).toBe(true)
    }
  })
})

describe('os corrimãos das pontes', () => {
  test('seguram dos lados e deixam o meio da ponte livre', () => {
    for (const ilha of ilhasDoAnel()) {
      const pontos = trajetoDaPonte(ilha, 36)
      const corrimaos = corrimaosDaPonte(ilha.id, postesDaPonte(tabuasDaPonte(pontos)))
      expect(corrimaos.length).toBeGreaterThan(0)
      for (const c of corrimaos) expect(soParaOCorpo(c.nome)).toBe(true)
      for (const p of pontos) {
        const corpo = new Vector3(p.x, p.y + 0.12 + CENTRO_DO_CORPO, p.z)
        expect(corrimaos.find((c) => bate(c, corpo))?.nome).toBeUndefined()
      }
      // No meio da ponte, um passo para fora da tábua bate na corda.
      const meio = pontos[18]
      const proximo = pontos[19]
      if (!meio || !proximo) throw new Error('ponte curta')
      const giro = Math.atan2(proximo.x - meio.x, proximo.z - meio.z)
      const fora = new Vector3(
        meio.x + Math.cos(giro) * 1.1,
        meio.y + CENTRO_DO_CORPO,
        meio.z - Math.sin(giro) * 1.1,
      )
      expect(corrimaos.some((c) => bate(c, fora))).toBe(true)
    }
  })
})
