import { beforeAll, describe, expect, test } from 'bun:test'
import { Box3, Matrix4, Mesh, type Object3D, Quaternion, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { ALTURA_DAS_NUVENS } from '../src/mundo/medidas'
import { BALAO } from '../src/sistemas/balao'
import { CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  TAMPO,
  topoDaForma,
} from './ajuda-colisores'

/**
 * As ilhas mais altas nos postos mais altos (31/10/2026, pedido revisto da dona): a altura vem de
 * marcos que não se pisam, na ilha completa. Medido como ela mede: o topo do desenho (as malhas que não
 * são `col-*`) acima do nível do mar, somando os 7 m das Nuvens (`ALTURA_DAS_NUVENS`). Tolerância de
 * 1 m. A largura da ilha (a caixa do desenho no chão) não muda, e nenhum marco tem colisor que se pise,
 * fora as Nuvens, onde o marco que fica dentro do teto do balão colide para o balão não atravessar.
 */
interface Marco {
  arquivo: string
  /** A altura do topo acima do mar, pedida. */
  alvo: number
  soma: number
  no: string
  /** A caixa do desenho no chão antes dos marcos (x0, x1, z0, z1). */
  caixa: [number, number, number, number]
  /** Os colisores que o marco pode tocar (os que já existiam embaixo dele ou os dele, que não se pisam). */
  colisores: RegExp
}

const MARCOS: Record<string, Marco> = {
  'vila-doce': {
    arquivo: 'vila-doce.glb',
    alvo: 12,
    soma: 0,
    no: 'marco-torre-de-doces',
    caixa: [-18.67, 13.816, -13.79, 15.01],
    colisores: /^col-cil-casquinha-1$/,
  },
  recife: {
    arquivo: 'recife.glb',
    alvo: 9,
    soma: 0,
    no: 'marco-pinaculos',
    caixa: [-21.553, 15.503, -16.252, 15.038],
    colisores: /^col-cil-pinaculo-\d+$/,
  },
  pico: {
    arquivo: 'pico.glb',
    alvo: 18,
    soma: 0,
    no: 'marco-do-cume',
    caixa: [-30.533, 14.519, -17.903, 13.914],
    colisores: /^col-cil-poste-mastro-1$/,
  },
  nuvens: {
    arquivo: 'nuvens.glb',
    alvo: 24,
    soma: ALTURA_DAS_NUVENS,
    no: 'marco-torre-de-nuvem',
    caixa: [-20.435, 12.396, -18.291, 14.609],
    colisores: /^col-(cil-torre-nuvem|arco-marco)-\d+$/,
  },
}

/** O pulo leva os pés a 1,5 m, e a cabeça fica 1,8 m acima dos pés. */
const ALCANCE_DE_CIMA = 1.5 + 1.8

interface Lido {
  raiz: Object3D
  formas: Forma[]
}
const lidos = new Map<string, Lido>()

beforeAll(async () => {
  for (const [ilha, m] of Object.entries(MARCOS)) {
    const raiz = await carregarGlb(arquivoDaIlha(m.arquivo))
    raiz.updateMatrixWorld(true)
    lidos.set(ilha, {
      raiz,
      formas: lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha'),
    })
  }
}, 30_000)

function desenho(raiz: Object3D) {
  const lista: Mesh[] = []
  raiz.traverse((o) => {
    if (o instanceof Mesh && !o.name.startsWith('col-') && !o.name.startsWith('escalada-'))
      lista.push(o)
  })
  return lista
}

function vertices(m: Mesh) {
  const pos = m.geometry.getAttribute('position')
  return Array.from({ length: pos.count }, (_, i) =>
    new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld),
  )
}

describe.each(Object.entries(MARCOS))('o marco: %s', (ilha, m) => {
  const lido = () => lidos.get(ilha) as Lido

  test('o topo do desenho fica no alvo (±1 m), e quem chega lá é o marco', () => {
    const { raiz } = lido()
    let topo = -Infinity
    let dono = ''
    for (const o of desenho(raiz))
      for (const v of vertices(o))
        if (v.y > topo) {
          topo = v.y
          dono = o.name
        }
    expect(Math.abs(topo + m.soma - m.alvo)).toBeLessThanOrEqual(1)
    const no = raiz.getObjectByName(m.no)
    if (!no) throw new Error(`sem o nó ${m.no}`)
    const nomes = new Set<string>()
    no.traverse((o) => {
      nomes.add(o.name)
    })
    expect(nomes.has(dono)).toBe(true)
  })

  test('a largura da ilha não muda (a caixa do desenho no chão é a mesma de antes)', () => {
    const caixa = new Box3()
    for (const o of desenho(lido().raiz)) for (const v of vertices(o)) caixa.expandByPoint(v)
    const [x0, x1, z0, z1] = m.caixa
    expect(caixa.min.x).toBeCloseTo(x0, 1)
    expect(caixa.max.x).toBeCloseTo(x1, 1)
    expect(caixa.min.z).toBeCloseTo(z0, 1)
    expect(caixa.max.z).toBeCloseTo(z1, 1)
  })

  test('o marco não fica ao alcance de quem anda, pula ou nada (nenhum ponto dele em cima do chão que se pisa)', () => {
    const { raiz, formas } = lido()
    const no = raiz.getObjectByName(m.no) as Object3D
    const caixa = new Box3().setFromObject(no)
    const raio =
      Math.max(
        Math.abs(caixa.min.x),
        Math.abs(caixa.max.x),
        Math.abs(caixa.min.z),
        Math.abs(caixa.max.z),
      ) + 1
    const terreno = raiz.getObjectByName('col-terreno') as Mesh
    const grade = gradeDeAndar(terreno, formas, raio, 0.25, { pisoMinimo: -Infinity })
    const problemas: string[] = []
    for (const o of desenho(no)) {
      for (const v of vertices(o)) {
        // As células com o corpo cabendo a menos de um raio do corpo (no mar, os pináculos do Recife têm o
        // colisor do tronco: quem nada não os atravessa).
        for (let dx = -0.5; dx <= 0.5 + 1e-9; dx += 0.25)
          for (let dz = -0.5; dz <= 0.5 + 1e-9; dz += 0.25) {
            const i = grade.indice(v.x + dx, v.z + dz)
            const c = grade.celulas[i]
            const meio = grade.centro(i)
            if (!c?.livre || Math.hypot(meio.x - v.x, meio.z - v.z) >= CORPO.raio) continue
            if (v.y < c.y + ALCANCE_DE_CIMA)
              problemas.push(`${o.name} em ${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}`)
          }
      }
    }
    expect(problemas.slice(0, 5)).toEqual([])
  }, 60_000)

  test('os colisores no marco são só os de antes embaixo dele ou os dele, que não se pisam', () => {
    const { raiz, formas } = lido()
    const pontos = desenho(raiz.getObjectByName(m.no) as Object3D).flatMap(vertices)
    // Um colisor toca o marco quando algum ponto do desenho dele fica dentro (ou a 5 cm) do colisor.
    const tocam = formas.filter((f) => {
      const inv = new Matrix4()
        .compose(new Vector3(...f.posicao), new Quaternion(...f.rotacao), new Vector3(1, 1, 1))
        .invert()
      return pontos.some((p) => {
        const l = p.clone().applyMatrix4(inv)
        if (f.forma === 'caixa')
          return (
            Math.abs(l.x) < f.meio[0] + 0.05 &&
            Math.abs(l.y) < f.meio[1] + 0.05 &&
            Math.abs(l.z) < f.meio[2] + 0.05
          )
        return Math.hypot(l.x, l.z) < f.raio + 0.05 && Math.abs(l.y) < f.meiaAltura + 0.05
      })
    })
    expect(tocam.filter((f) => !m.colisores.test(f.nome)).map((f) => f.nome)).toEqual([])
    for (const f of tocam) {
      if (ilha === 'nuvens') {
        // Dentro do teto do balão: colide (o balão não atravessa) e só o balão pousa em cima.
        expect(topoDaForma(f) - TAMPO).toBeLessThanOrEqual(BALAO.teto)
      } else if (ilha === 'recife') {
        // No mar: do nado (cabeça na superfície) ou de qualquer chão perto, nenhum pulo chega em cima.
        expect(topoDaForma(f)).toBeGreaterThan(TAMPO + ALCANCE_DE_CIMA + 1)
      }
    }
  })
})
