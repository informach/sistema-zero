import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, Matrix4, type Object3D, Quaternion, Ray, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { type ColisorDaIlha, lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE } from '../src/mundo/medidas'
import { posicaoDoQuadro } from '../src/mundo/quadro-das-cores'
import { alturaDoPulo, CORPO } from '../src/sistemas/corpo'

const ARQUIVO = join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'vila-doce.glb')
const TAMPO = 1
const CENTRO_DO_CORPO = CORPO.doCentroAoPe

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

type Forma = Exclude<ColisorDaIlha, { forma: 'malha' }>

function matriz(c: Forma): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...c.posicao),
    new Quaternion(...c.rotacao),
    new Vector3(1, 1, 1),
  )
}

/** A altura do topo da forma em (x, z), olhando de cima; undefined se não está embaixo. */
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

/** O corpo (centro em `p`) bate nesta forma? */
function bate(c: Forma, p: Vector3): boolean {
  const local = p.clone().applyMatrix4(matriz(c).invert())
  if (c.forma === 'caixa') {
    return (
      Math.abs(local.x) < c.meio[0] + CORPO.raio &&
      Math.abs(local.y) < c.meio[1] + CENTRO_DO_CORPO &&
      Math.abs(local.z) < c.meio[2] + CORPO.raio
    )
  }
  return (
    Math.hypot(local.x, local.z) < c.raio + CORPO.raio &&
    Math.abs(local.y) < c.meiaAltura + CENTRO_DO_CORPO
  )
}

let raiz: Object3D
let colisores: ColisorDaIlha[]
let formas: Forma[]
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}
const doGrupo = (g: string) => formas.filter((c) => grupo(c.nome) === g)

/** O piso mais alto debaixo de (x, z), contando só as formas (o chão da ilha fica em TAMPO). */
function pisoEm(x: number, z: number): { y: number; nome?: string } {
  let melhor: { y: number; nome?: string } = { y: TAMPO }
  for (const c of formas) {
    const y = topoEm(c, x, z)
    if (y !== undefined && y > melhor.y) melhor = { y, nome: c.nome }
  }
  return melhor
}

beforeAll(async () => {
  raiz = await carregar()
  colisores = lerColisores(raiz)
  formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
})

describe('os nós col-* da Vila Doce', () => {
  test('existem todos os grupos, sem material (não desenham)', () => {
    const doc = jsonDoGlb()
    const nos = doc.nodes.filter((n) => n.name?.startsWith('col-'))
    const grupos = new Set(nos.map((n) => grupo(n.name ?? '')))
    for (const g of [
      'col-terreno',
      'col-cil-fonte',
      'col-casinha',
      'col-cil-morango',
      'col-caixote',
      'col-sorveteria',
      'col-mureta',
      'col-balcao',
      'col-cil-casquinha',
      'col-padaria',
      'col-telhado-padaria',
      'col-chamine',
      'col-barraca',
      'col-cil-poste',
      'col-cil-jujuba',
      'col-cil-vaso',
      'col-cil-moita',
    ]) {
      expect(grupos.has(g)).toBe(true)
    }
    for (const n of nos) {
      for (const p of doc.meshes[n.mesh ?? -1]?.primitives ?? []) expect(p.material).toBeUndefined()
    }
    expect(colisores.length).toBe(nos.length)
  })

  test('caixa, cilindro e malha saem do nome; o chão fica no tampo', () => {
    for (const c of colisores) {
      if (c.nome === 'col-terreno') expect(c.forma).toBe('malha')
      else if (c.nome.startsWith('col-cil-')) expect(c.forma).toBe('cilindro')
      else expect(c.forma).toBe('caixa')
    }
    const chao = colisores.find((c) => c.forma === 'malha')
    if (chao?.forma !== 'malha') throw new Error('sem chão')
    let topo = -Infinity
    for (let i = 1; i < chao.vertices.length; i += 3) topo = Math.max(topo, chao.vertices[i] ?? 0)
    expect(topo).toBeCloseTo(TAMPO, 2)
  })

  test('cada parada do percurso dos telhados fica em cima de um colisor, na altura da âncora', () => {
    for (const nome of [
      'telhados-inicio',
      'telhados-1',
      'telhados-2',
      'telhados-3',
      'telhados-fim',
    ]) {
      const a = ancora(nome)
      const piso = pisoEm(a.x, a.z)
      expect(piso.nome).toBeDefined()
      expect(piso.y).toBeCloseTo(a.y, 2)
      // Em pé ali, nada além do piso encosta no corpo (a casquinha e as muretas ficam de lado).
      const corpo = new Vector3(a.x, a.y + CENTRO_DO_CORPO + 0.02, a.z)
      expect(formas.find((c) => bate(c, corpo))?.nome).toBeUndefined()
    }
  })

  test('do chão ao terraço da sorveteria, cada pulo sobe menos que o pulo alcança e o vão é curto', () => {
    const paradas = ['telhados-inicio', 'telhados-1', 'telhados-2', 'telhados-3', 'telhados-fim']
    const subida = alturaDoPulo(GRAVIDADE) - 0.3 // com folga para a criança
    // O primeiro caixote se alcança pelo caixote baixo, que é só um degrau grande.
    const baixo = doGrupo('col-caixote').map(
      (c) => c.posicao[1] + (c.forma === 'caixa' ? c.meio[1] : 0),
    )
    expect(Math.min(...baixo) - TAMPO).toBeLessThan(subida)
    expect(Math.max(...baixo) - Math.min(...baixo)).toBeLessThan(subida)
    for (let k = 1; k < paradas.length; k++) {
      const de = ancora(paradas[k - 1] ?? '')
      const ate = ancora(paradas[k] ?? '')
      expect(ate.y - de.y).toBeGreaterThan(0)
      expect(ate.y - de.y).toBeLessThan(subida)
      // O vão mais curto entre o topo de uma parada e o da outra (amostras de 10 cm em volta).
      const topoDe = (a: Vector3) => {
        const pontos: [number, number][] = []
        for (let x = a.x - 4; x <= a.x + 4; x += 0.1)
          for (let z = a.z - 4; z <= a.z + 4; z += 0.1)
            if (Math.abs(pisoEm(x, z).y - a.y) < 0.02) pontos.push([x, z])
        return pontos
      }
      const daqui = topoDe(de)
      const dali = topoDe(ate)
      let vao = Infinity
      for (const [x1, z1] of daqui)
        for (const [x2, z2] of dali) vao = Math.min(vao, Math.hypot(x2 - x1, z2 - z1))
      // Andando, o pulo cai no alto depois de subir; o pé redondo pega a borda um raio antes.
      const h = ate.y - de.y
      const tempo = (CORPO.pulo + Math.sqrt(CORPO.pulo ** 2 - 2 * GRAVIDADE * h)) / GRAVIDADE
      const alcance = CORPO.andar * tempo + 2 * CORPO.raio
      expect(vao).toBeLessThan(alcance - 0.3)
    }
  })

  test('a chegada e a rua até a praça ficam livres (só o chão colide no corredor)', () => {
    const chegada = ancora('chegada')
    for (let x = 2.4; x <= chegada.x; x += 0.25) {
      const corpo = new Vector3(x, TAMPO + CENTRO_DO_CORPO, 0)
      expect(formas.find((c) => bate(c, corpo))?.nome).toBeUndefined()
    }
  })

  test('nenhum colisor ocupa onde ficam o Bento, os Lumis e a frente das lojas e barracas', () => {
    const nomes = [
      'chegada',
      'morador',
      'lumi-1',
      'lumi-2',
      'lumi-3',
      'lumi-4',
      'padaria',
      'sorveteria',
    ]
    for (let i = 1; i <= 6; i++) nomes.push(`barraca-${i}`)
    for (const nome of nomes) {
      const a = ancora(nome)
      const corpo = new Vector3(a.x, a.y + CENTRO_DO_CORPO, a.z)
      expect(formas.find((c) => bate(c, corpo))?.nome).toBeUndefined()
    }
  })

  test('o cavalete do Quadro das Cores cabe perto da chegada, com lugar para a criança na frente', () => {
    const q = posicaoDoQuadro(raiz)
    // Nada da ilha a menos de um corpo do cavalete (1,3 de largura, como `COLISORES_DO_QUADRO`).
    const lado = { x: Math.cos(q.giro), z: -Math.sin(q.giro) }
    for (const d of [-0.65, 0, 0.65]) {
      const p = new Vector3(q.x + lado.x * d, TAMPO + CENTRO_DO_CORPO, q.z + lado.z * d)
      expect(formas.find((c) => bate(c, p))?.nome).toBeUndefined()
    }
    // Quem pinta fica 1 m à frente do cavalete, virado para ele.
    const frente = new Vector3(
      q.x + Math.sin(q.giro),
      TAMPO + CENTRO_DO_CORPO,
      q.z + Math.cos(q.giro),
    )
    expect(formas.find((c) => bate(c, frente))?.nome).toBeUndefined()
  })

  test('folhagem e peça fina seguram só o corpo; casas, fonte e casquinha tapam a câmera', () => {
    for (const g of ['col-cil-poste', 'col-cil-vaso', 'col-cil-moita']) {
      for (const c of doGrupo(g)) expect(soParaOCorpo(c.nome)).toBe(true)
    }
    for (const g of [
      'col-casinha',
      'col-sorveteria',
      'col-padaria',
      'col-cil-fonte',
      'col-cil-casquinha',
    ]) {
      for (const c of doGrupo(g)) expect(soParaOCorpo(c.nome)).toBe(false)
    }
  })

  test('moitas e canteiros seguram o corpo (não se sobem andando)', () => {
    for (const c of [...doGrupo('col-cil-moita'), ...doGrupo('col-cil-vaso')]) {
      if (c.forma !== 'cilindro') throw new Error(c.nome)
      expect(c.posicao[1] + c.meiaAltura - TAMPO).toBeGreaterThan(0.65)
    }
  })
})
