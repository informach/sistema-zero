import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Matrix4, type Object3D, Quaternion, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'

/**
 * A casa na árvore do Bosque com os mecanismos (física viva, etapa 5), contra o `bosque.glb`: a
 * criança passa pela porta (a folha e o batente vêm do código, nas âncoras `mecanismos-casa` e
 * `-rumo`), e a placa, o caixote e o alçapão ficam no deque onde dá para empurrar o caixote sem
 * fechar o caminho em volta do tronco. Tudo no referencial do modelo.
 */
const ARQUIVO = join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb')
// O personagem: cápsula de raio 0,35 com o meio 0,9 acima dos pés (como em colisores-da-ilha).
const RAIO = 0.35
const CENTRO = 0.9
const FOLHA = 1.1
const CAIXOTE = 0.25

type Forma = Exclude<ColisorDaIlha, { forma: 'malha' }>
let raiz: Object3D
let formas: Forma[]

beforeAll(async () => {
  const buf = readFileSync(ARQUIVO)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  raiz = (await new GLTFLoader().parseAsync(ab, '')).scene
  // O piso dos deques é onde se pisa: não conta como obstáculo.
  formas = lerColisores(raiz).filter(
    (c): c is Forma => c.forma !== 'malha' && !c.nome.startsWith('col-cil-deque'),
  )
})

const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position.clone()
}

/** Quem uma cápsula (raio `r`, meia altura `meia`, meio em `p`) toca. */
function tocados(p: Vector3, r = RAIO, meia = CENTRO): string[] {
  return formas
    .filter((c) => {
      const m = new Matrix4().compose(
        new Vector3(...c.posicao),
        new Quaternion(...c.rotacao),
        new Vector3(1, 1, 1),
      )
      const l = p.clone().applyMatrix4(m.invert())
      if (c.forma === 'caixa')
        return (
          Math.abs(l.x) < c.meio[0] + r &&
          Math.abs(l.y) < c.meio[1] + meia &&
          Math.abs(l.z) < c.meio[2] + r
        )
      return Math.hypot(l.x, l.z) < c.raio + r && Math.abs(l.y) < c.meiaAltura + meia
    })
    .map((c) => c.nome)
}

/** O referencial da porta: x ao longo da folha a partir da dobradiça, z para dentro da casa. */
function referencialDaPorta() {
  const h = ancora('mecanismos-casa')
  const r = ancora('mecanismos-rumo')
  const giro = Math.atan2(r.x - h.x, r.z - h.z)
  const ponto = (x: number, z: number, y = h.y) =>
    new Vector3(
      h.x + x * Math.cos(giro) + z * Math.sin(giro),
      y,
      h.z - x * Math.sin(giro) + z * Math.cos(giro),
    )
  return { h, giro, ponto }
}

describe('a casa na árvore do Bosque', () => {
  test('as âncoras dos mecanismos estão no deque da casa', () => {
    const { h } = referencialDaPorta()
    for (const n of ['rumo', 'placa', 'caixote', 'alcapao'])
      expect(ancora(`mecanismos-${n}`).y).toBeCloseTo(h.y, 5)
    expect(h.y).toBeCloseTo(5, 5)
  })

  test('a criança passa pela porta: de fora, pelo vão, até dentro da casa', () => {
    const { h, ponto } = referencialDaPorta()
    // Em frente à porta cabe meio metro até a guarda do deque; chega-se a ela pelo anel, de lado.
    for (const z of [-0.5, -0.25, 0, 0.5, 0.75])
      expect({ z, toca: tocados(ponto(FOLHA / 2, z, h.y + CENTRO + 0.02)) }).toEqual({
        z,
        toca: [],
      })
    // No vão, a cabeça passa sob a verga com a folga do controlador.
    expect(tocados(ponto(FOLHA / 2, 0, h.y + CENTRO + 0.02), RAIO, CENTRO + 0.15)).toEqual([])
    // A âncora da frente da porta (onde a criança para) fica no lugar livre de fora.
    const frente = ancora('casa-na-arvore')
    expect(tocados(new Vector3(frente.x, h.y + CENTRO + 0.02, frente.z))).toEqual([])
  })

  test('o vão da parede é o da folha: fechado de um lado e do outro do batente', () => {
    const { h, ponto } = referencialDaPorta()
    // A dobradiça fica no canto da casa (a parede do lado do tronco); do outro lado, a parede.
    expect(tocados(ponto(-0.08, 0.08, h.y + CENTRO + 0.02), 0.02).length).toBeGreaterThan(0)
    expect(tocados(ponto(FOLHA + 0.3, 0, h.y + CENTRO + 0.02), 0.1).length).toBeGreaterThan(0)
  })

  test('placa, caixote e alçapão no deque, com lugar para empurrar e o caminho livre ao lado', () => {
    const { h } = referencialDaPorta()
    const placa = ancora('mecanismos-placa')
    const caixote = ancora('mecanismos-caixote')
    const alcapao = ancora('mecanismos-alcapao')
    // O caixote gira quando empurrado: conta a meia diagonal, e longe de tudo (o tronco é torto).
    const noCaixote = (p: Vector3) =>
      tocados(new Vector3(p.x, h.y + 0.4, p.z), CAIXOTE * Math.SQRT2 + 0.1, 0.36)
    // O caixote cabe da largada até a placa, em linha reta.
    for (let t = 0; t <= 1; t += 0.1) expect(noCaixote(caixote.clone().lerp(placa, t))).toEqual([])
    // O alçapão abre girando na borda (até 1,4 rad): todo o caminho dele fica livre.
    const { giro } = referencialDaPorta()
    const xd = new Vector3(Math.cos(giro), 0, -Math.sin(giro))
    const zd = new Vector3(Math.sin(giro), 0, Math.cos(giro))
    const eixo = new Vector3(alcapao.x, h.y + 0.12, alcapao.z).addScaledVector(xd, -0.35)
    for (const angulo of [0, 0.4, 0.8, 1.25, 1.4])
      for (let s = 0; s <= 0.7; s += 0.1)
        for (const w of [-0.3, 0, 0.3]) {
          const p = eixo
            .clone()
            .addScaledVector(xd, Math.cos(angulo) * s)
            .addScaledVector(zd, w)
            .add(new Vector3(0, Math.sin(angulo) * s, 0))
          expect({ angulo, s, toca: tocados(p, 0.08, 0.08) }).toEqual({ angulo, s, toca: [] })
        }
    // Atrás do caixote (do lado oposto à placa) cabe a criança para empurrar.
    const rumo = placa.clone().sub(caixote).setY(0).normalize()
    const atras = caixote.clone().addScaledVector(rumo, -(CAIXOTE + RAIO + 0.05))
    expect(tocados(new Vector3(atras.x, h.y + CENTRO + 0.02, atras.z))).toEqual([])
    // Do lado do tronco o anel continua livre: o percurso passa por ali.
    const t1 = ancora('copas-1')
    for (const p of [caixote, placa]) {
      const fora = p.clone().sub(t1).setY(0).normalize()
      const ao = p.clone().addScaledVector(fora, -(CAIXOTE + RAIO + 0.1))
      expect(tocados(new Vector3(ao.x, h.y + CENTRO + 0.02, ao.z))).toEqual([])
    }
  })
})
