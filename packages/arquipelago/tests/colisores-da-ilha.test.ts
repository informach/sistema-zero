import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ilha } from '@sistemazero/arquipelago-contracts'
import {
  Box3,
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  type Object3D,
  Quaternion,
  Ray,
  Raycaster,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  bordaQueCabe,
  type ColisorDaIlha,
  ehNoDeColisao,
  lerColisores,
  soParaOCorpo,
  tirarNosDeColisao,
} from '../src/mundo/colisores-da-ilha'
import { prepararIlha } from '../src/mundo/ilha-completa'
import { BORDA_DOS_COLISORES } from '../src/mundo/medidas'

const ARQUIVO = join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb')

async function carregar(): Promise<Object3D> {
  const buf = readFileSync(ARQUIVO)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return (await new GLTFLoader().parseAsync(ab, '')).scene
}

function jsonDoGlb(): {
  nodes: { name?: string; mesh?: number }[]
  meshes: { primitives: { material?: number }[] }[]
} {
  const buf = readFileSync(ARQUIVO)
  const n = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + n).toString('utf8'))
}

function grupo(nome: string): string {
  const partes = nome.split('-')
  return /^\d+$/.test(partes.at(-1) ?? '') ? partes.slice(0, -1).join('-') : nome
}

// O personagem: cápsula de raio 0,35, meia altura 0,55; sobe degrau de até 0,45 (autostep).
const RAIO_DO_CORPO = 0.35
const CENTRO_DO_CORPO = 0.9
const DEGRAU = 0.45
/** Rampa que o personagem sobe com folga (o controlador para em 52°). */
const RAMPA_MAXIMA = (40 * Math.PI) / 180

type Caixa = Extract<ColisorDaIlha, { forma: 'caixa' }>
type Cilindro = Extract<ColisorDaIlha, { forma: 'cilindro' }>

function matriz(c: Caixa | Cilindro): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...c.posicao),
    new Quaternion(...c.rotacao),
    new Vector3(1, 1, 1),
  )
}

/** A altura do topo da forma em (x, z), olhando de cima; undefined se não está embaixo. */
function topoEm(c: Caixa | Cilindro, x: number, z: number): number | undefined {
  const inv = matriz(c).invert()
  const raio = new Ray(new Vector3(x, 50, z), new Vector3(0, -1, 0))
  raio.applyMatrix4(inv)
  if (c.forma === 'caixa') {
    const caixa = new Box3(new Vector3(...c.meio).negate(), new Vector3(...c.meio))
    const p = raio.intersectBox(caixa, new Vector3())
    return p ? p.applyMatrix4(matriz(c)).y : undefined
  }
  // Cilindros que se pisam (os deques) ficam em pé.
  const local = raio.origin
  if (Math.hypot(local.x, local.z) > c.raio) return undefined
  return c.posicao[1] + c.meiaAltura
}

/** O corpo (centro em `p`) bate nesta forma? */
function bate(c: Caixa | Cilindro, p: Vector3): boolean {
  const local = p.clone().applyMatrix4(matriz(c).invert())
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

let raiz: Object3D
let colisores: ColisorDaIlha[]
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}
const doGrupo = (g: string) => colisores.filter((c) => grupo(c.nome) === g) as (Caixa | Cilindro)[]

beforeAll(async () => {
  raiz = await carregar()
  // Sem giro: as contas ficam no referencial do modelo (o mesmo das âncoras).
  colisores = lerColisores(raiz)
})

describe('os nós col-* do Bosque', () => {
  test('existem todos os grupos, sem material (não desenham)', () => {
    const doc = jsonDoGlb()
    const nos = doc.nodes.filter((n) => n.name?.startsWith('col-'))
    const grupos = new Set(nos.map((n) => grupo(n.name ?? '')))
    for (const g of [
      'col-terreno',
      'col-cil-deque',
      'col-guarda',
      'col-ponte',
      'col-ponte-lado',
      'col-degrau',
      'col-casa-na-arvore',
      'col-escorregador',
      'col-escorregador-lado',
      'col-cabana',
      'col-varanda',
      'col-cerca',
      'col-cil-tronco',
      'col-cil-tora',
      'col-cil-toco',
    ]) {
      expect(grupos.has(g)).toBe(true)
    }
    for (const n of nos) {
      for (const p of doc.meshes[n.mesh ?? -1]?.primitives ?? []) expect(p.material).toBeUndefined()
    }
    expect(colisores.length).toBe(nos.length)
  })

  test('caixa, cilindro e malha saem do nome; a malha só no chão', () => {
    for (const c of colisores) {
      if (c.nome === 'col-terreno') expect(c.forma).toBe('malha')
      else if (c.nome.startsWith('col-cil-')) expect(c.forma).toBe('cilindro')
      else expect(c.forma).toBe('caixa')
    }
    const chao = colisores.find((c) => c.forma === 'malha')
    if (chao?.forma !== 'malha') throw new Error('sem chão')
    expect(chao.indices.length % 3).toBe(0)
    for (const i of chao.indices) expect(i).toBeLessThan(chao.vertices.length / 3)
    let topo = -Infinity
    for (let i = 1; i < chao.vertices.length; i += 3) topo = Math.max(topo, chao.vertices[i] ?? 0)
    // O tampo da ilha fica em y = 1, como o da versão leve.
    expect(topo).toBeCloseTo(1, 2)
  })

  test('os quatro deques ficam na altura das âncoras do percurso', () => {
    const deques = doGrupo('col-cil-deque') as Cilindro[]
    expect(deques).toHaveLength(4)
    for (let i = 1; i <= 4; i++) {
      const a = ancora(`copas-${i}`)
      const d = deques.find((c) => Math.hypot(c.posicao[0] - a.x, c.posicao[2] - a.z) < 0.01)
      if (!d) throw new Error(`sem deque em copas-${i}`)
      expect(d.posicao[1] + d.meiaAltura).toBeCloseTo(a.y, 2)
    }
  })

  test('o percurso nas copas anda de ponta a ponta: escada, deques, pontes e escorregador', () => {
    const piso = [...doGrupo('col-cil-deque'), ...doGrupo('col-ponte')]
    const obstaculos = [
      ...doGrupo('col-guarda'),
      ...doGrupo('col-ponte-lado'),
      ...doGrupo('col-cil-tronco'),
      ...doGrupo('col-casa-na-arvore'),
    ]
    const deques = [1, 2, 3, 4].map((i) => {
      const a = ancora(`copas-${i}`)
      const d = (doGrupo('col-cil-deque') as Cilindro[]).find(
        (c) => Math.hypot(c.posicao[0] - a.x, c.posicao[2] - a.z) < 0.01,
      )
      if (!d) throw new Error(`sem deque em copas-${i}`)
      return { x: a.x, y: a.y, z: a.z, raio: d.raio }
    })
    const livre = (x: number, y: number, z: number) =>
      obstaculos.find((c) => bate(c, new Vector3(x, y + CENTRO_DO_CORPO, z)))?.nome
    /** Anda em linha reta pisando sempre em algo (sem subir mais que um degrau de cada vez). */
    function andar(de: Vector3, ate: Vector3, altura: number): number {
      const passos = Math.ceil(de.distanceTo(ate) / 0.1)
      // Quanto o piso pode subir ou descer num passo sem virar rampa íngreme demais.
      const subida = (de.distanceTo(ate) / passos) * Math.tan(RAMPA_MAXIMA) + 0.02
      let h = altura
      for (let k = 0; k <= passos; k++) {
        const p = de.clone().lerp(ate, k / passos)
        const alturas = piso
          .map((c) => topoEm(c, p.x, p.z))
          .filter((v): v is number => v !== undefined && Math.abs(v - h) <= DEGRAU)
        expect(alturas.length).toBeGreaterThan(0)
        const antes = h
        h = Math.max(...alturas)
        if (k > 0) expect(Math.abs(h - antes)).toBeLessThanOrEqual(subida)
        expect(livre(p.x, h, p.z)).toBeUndefined()
      }
      return h
    }
    /** Dá a volta no tronco, por um dos dois lados, de um ângulo ao outro do deque. */
    function contornar(d: (typeof deques)[number], de: number, ate: number) {
      const caminhos: number[][] = []
      for (const sentido of [1, -1]) {
        let delta = (ate - de) * sentido
        delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        for (const folga of [0.45, 0.55, 0.65]) {
          const r = d.raio - folga
          const angulos = Array.from({ length: 61 }, (_, k) => de + sentido * delta * (k / 60))
          if (angulos.every((t) => !livre(d.x + Math.cos(t) * r, d.y, d.z + Math.sin(t) * r))) {
            caminhos.push(angulos)
          }
        }
      }
      expect(caminhos.length).toBeGreaterThan(0)
    }
    const rumo = (de: (typeof deques)[number], ate: (typeof deques)[number]) =>
      Math.atan2(ate.z - de.z, ate.x - de.x)
    const borda = (d: (typeof deques)[number], angulo: number, folga: number) =>
      new Vector3(
        d.x + Math.cos(angulo) * (d.raio - folga),
        0,
        d.z + Math.sin(angulo) * (d.raio - folga),
      )

    // A escada chega na T1 onde está o último degrau.
    const topo = (doGrupo('col-degrau') as Caixa[]).reduce((a, b) =>
      b.posicao[1] > a.posicao[1] ? b : a,
    )
    const t1 = deques[0]
    if (!t1) throw new Error('sem T1')
    contornar(
      t1,
      Math.atan2(topo.posicao[2] - t1.z, topo.posicao[0] - t1.x),
      rumo(t1, deques[1] ?? t1),
    )
    for (let i = 0; i < 3; i++) {
      const a = deques[i]
      const b = deques[i + 1]
      if (!a || !b) throw new Error('sem deque')
      // A ponte: da borda de um deque à do outro, pisando sempre em tábua.
      const chegou = andar(borda(a, rumo(a, b), 0.45), borda(b, rumo(b, a), 0.45), a.y)
      expect(chegou).toBeCloseTo(b.y, 1)
      const proxima = deques[i + 2]
      // No último deque, o escorregador sai a +28° (no chão do jogo).
      contornar(b, rumo(b, a), proxima ? rumo(b, proxima) : (28 * Math.PI) / 180)
    }
  })

  test('a escada sobe do chão até o primeiro deque, degrau por degrau', () => {
    const degraus = (doGrupo('col-degrau') as Caixa[])
      .map((c) => ({ c, topo: c.posicao[1] + c.meio[1] }))
      .sort((x, y) => x.topo - y.topo)
    expect(degraus.length).toBeGreaterThan(8)
    let antes = 1
    let onde = new Vector3(...(degraus[0]?.c.posicao ?? [0, 0, 0]))
    for (const { c, topo } of degraus) {
      expect(topo - antes).toBeLessThanOrEqual(DEGRAU)
      const aqui = new Vector3(...c.posicao)
      // Um degrau encosta no outro (cada um tem 1 de lado).
      expect(Math.hypot(aqui.x - onde.x, aqui.z - onde.z)).toBeLessThan(1)
      antes = topo
      onde = aqui
    }
    const deque = ancora('copas-1')
    expect(antes).toBeCloseTo(deque.y, 2)
    const raio = (doGrupo('col-cil-deque') as Cilindro[]).find(
      (c) => Math.hypot(c.posicao[0] - deque.x, c.posicao[2] - deque.z) < 0.01,
    )?.raio
    // O último degrau encosta na borda do deque, e o guarda-corpo abre ali.
    expect(Math.hypot(onde.x - deque.x, onde.z - deque.z) - 0.5).toBeLessThan((raio ?? 0) + 0.1)
    const passagem = new Vector3(onde.x, deque.y + CENTRO_DO_CORPO, onde.z).lerp(
      new Vector3(deque.x, deque.y + CENTRO_DO_CORPO, deque.z),
      0.25,
    )
    expect(doGrupo('col-guarda').find((c) => bate(c, passagem))?.nome).toBeUndefined()
  })

  test('o escorregador desce do último deque até o chão', () => {
    const calha = (doGrupo('col-escorregador') as Caixa[]).map((c) => c.posicao[1])
    expect(Math.max(...calha)).toBeGreaterThan(ancora('copas-4').y - 0.3)
    expect(Math.min(...calha)).toBeLessThan(1.4)
    const fim = ancora('escorregador-fim')
    const perto = (doGrupo('col-escorregador') as Caixa[]).some(
      (c) => Math.hypot(c.posicao[0] - fim.x, c.posicao[2] - fim.z) < 0.6,
    )
    expect(perto).toBe(true)
  })

  test('a chegada da ponte fica livre (só o chão colide no corredor)', () => {
    const chegada = ancora('chegada')
    for (let x = 5.5; x <= chegada.x; x += 0.5) {
      const corpo = new Vector3(x, 1 + CENTRO_DO_CORPO, 0)
      const bloqueio = colisores.find((c) => c.forma !== 'malha' && bate(c, corpo))
      expect(bloqueio?.nome).toBeUndefined()
    }
  })
})

describe('os enfeites do Bosque que seguram o corpo', () => {
  const TAMPO = 1

  test('moitas, pedras, cogumelos, tocas, floreiras e pernas do escorregador têm colisor', () => {
    const quantos: Record<string, number> = {
      'col-cil-moita': 8,
      'col-cil-pedra': 5,
      'col-cil-pedra-lago': 9,
      'col-cil-cogumelo': 18,
      'col-cil-toca': 2,
      'col-floreira': 2,
    }
    for (const [g, n] of Object.entries(quantos)) expect(doGrupo(g)).toHaveLength(n)
    expect(doGrupo('col-cil-perna-escorregador').length).toBeGreaterThan(0)
  })

  test('cada colisor fica debaixo do desenho e não passa do topo dele', () => {
    const vegetacao = raiz.getObjectByName('vegetacao')
    if (!vegetacao) throw new Error('sem vegetacao')
    const raio = new Raycaster()
    for (const g of [
      'col-cil-moita',
      'col-cil-pedra',
      'col-cil-pedra-lago',
      'col-cil-cogumelo',
      'col-cil-toca',
    ]) {
      for (const c of doGrupo(g) as Cilindro[]) {
        let alto = -Infinity
        for (let k = 0; k <= 8; k++) {
          const a = (k * Math.PI) / 4
          const d = k === 0 ? 0 : c.raio * 0.4
          raio.set(
            new Vector3(c.posicao[0] + Math.cos(a) * d, 20, c.posicao[2] + Math.sin(a) * d),
            new Vector3(0, -1, 0),
          )
          const [acerto] = raio.intersectObject(vegetacao)
          if (acerto) alto = Math.max(alto, acerto.point.y)
        }
        expect(alto).toBeGreaterThan(TAMPO + 0.15)
        // A moita pode passar um pouco do topo (invisível, dentro das folhas ou logo acima).
        const folga = g === 'col-cil-moita' ? 0.2 : 0.05
        expect(c.posicao[1] + c.meiaAltura).toBeLessThanOrEqual(alto + folga)
      }
    }
  })

  test('a moita não se sobe; as pedras do lago sim (os cipós ficam ao alcance)', () => {
    // Com a curva do pé o personagem sobe até uns 0,58 (o degrau automático é de 0,45).
    for (const c of doGrupo('col-cil-moita') as Cilindro[]) {
      expect(c.posicao[1] + c.meiaAltura - TAMPO).toBeGreaterThan(0.65)
    }
    for (const c of doGrupo('col-cil-pedra-lago') as Cilindro[]) {
      expect(c.posicao[1] + c.meiaAltura - TAMPO).toBeLessThan(DEGRAU)
    }
  })

  test('folhagem e peça fina seguram só o corpo; pedra e toca tapam a câmera', () => {
    for (const g of [
      'col-cil-moita',
      'col-cil-cogumelo',
      'col-floreira',
      'col-cil-perna-escorregador',
    ]) {
      for (const c of doGrupo(g)) expect(soParaOCorpo(c.nome)).toBe(true)
    }
    for (const g of ['col-cil-pedra', 'col-cil-pedra-lago', 'col-cil-toca']) {
      for (const c of doGrupo(g)) expect(soParaOCorpo(c.nome)).toBe(false)
    }
  })

  test('nenhum enfeite novo ocupa onde ficam a Capi, os Lumis, as portas e as chegadas', () => {
    const novos = [
      'col-cil-moita',
      'col-cil-pedra',
      'col-cil-pedra-lago',
      'col-cil-cogumelo',
      'col-cil-toca',
      'col-floreira',
      'col-cil-perna-escorregador',
    ].flatMap(doGrupo)
    for (const nome of [
      'chegada',
      'morador',
      'lumi-1',
      'lumi-2',
      'lumi-3',
      'lumi-4',
      'escada',
      'cabana',
      'cercado',
      'lago',
      'escorregador-fim',
    ]) {
      const a = ancora(nome)
      const corpo = new Vector3(a.x, a.y + CENTRO_DO_CORPO, a.z)
      expect(novos.find((c) => bate(c, corpo))?.nome).toBeUndefined()
    }
  })
})

describe('ler e tirar os nós de colisão', () => {
  test('o giro da ilha gira os colisores junto com o desenho', async () => {
    const outra = await carregar()
    outra.rotation.y = Math.PI
    const girados = lerColisores(outra)
    const a = colisores.find((c) => c.nome === 'col-cabana-1')
    const b = girados.find((c) => c.nome === 'col-cabana-1')
    if (a?.forma !== 'caixa' || b?.forma !== 'caixa') throw new Error('sem a cabana')
    expect(b.posicao[0]).toBeCloseTo(-a.posicao[0], 4)
    expect(b.posicao[1]).toBeCloseTo(a.posicao[1], 4)
    expect(b.posicao[2]).toBeCloseTo(-a.posicao[2], 4)
    expect(b.meio).toEqual(a.meio)
  })

  test('preparar duas vezes a mesma cena não perde os colisores', async () => {
    const cena = await carregar()
    const primeira = prepararIlha(cena, ilha('bosque'))
    const segunda = prepararIlha(cena, ilha('bosque'))
    expect(segunda).toBe(primeira)
    expect(segunda.colisores.length).toBe(colisores.length)
    let restantes = 0
    cena.traverse((o) => {
      if (ehNoDeColisao(o)) restantes++
    })
    expect(restantes).toBe(0)
  })

  test('caixa com escala no nó vira meia-medida; tirar deixa só o desenho', () => {
    const g = new Group()
    const desenho = new Mesh(new BoxGeometry(1, 1, 1))
    desenho.name = 'telhado'
    const col = new Mesh(new BoxGeometry(1, 1, 1))
    col.name = 'col-muro-1'
    col.scale.set(4, 2, 0.5)
    col.position.set(1, 2, 3)
    g.add(desenho, col)
    const [c] = lerColisores(g)
    expect(c?.forma).toBe('caixa')
    if (c?.forma === 'caixa') {
      expect(c.meio).toEqual([2, 1, 0.25])
      expect(c.posicao).toEqual([1, 2, 3])
    }
    expect(tirarNosDeColisao(g)).toBe(1)
    let sobrou = 0
    g.traverse((o) => {
      if (ehNoDeColisao(o)) sobrou++
    })
    expect(sobrou).toBe(0)
    expect(g.children).toEqual([desenho])
  })

  test('a borda arredondada nunca come uma tábua fina', () => {
    expect(bordaQueCabe(1, 1, 1)).toBe(BORDA_DOS_COLISORES)
    expect(bordaQueCabe(0.5, 0.04, 0.5)).toBeCloseTo(0.02)
    expect(bordaQueCabe(0)).toBe(0)
  })
})
