import { beforeAll, describe, expect, test } from 'bun:test'
import { type Mesh, type Object3D, Quaternion, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE } from '../src/mundo/medidas'
import { alcanceMaximoDoPulo, alturaDoPulo, CORPO } from '../src/sistemas/corpo'
import { RAPIDEZ_DOS_PATINS } from '../src/sistemas/patins'
import { PLANADOR } from '../src/sistemas/planador'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  pisoEm,
  TAMPO,
  topoDaForma,
  topoEm,
} from './ajuda-colisores'

/**
 * O segredo dos patins no Bosque (31/10/2026, pedido dela; o toco subiu 0,45 m no ajuste aprovado),
 * contra o `bosque.glb` real: a pista suspensa de tábuas, reta, e depois do vão o toco alto, um pouco
 * acima da pista, com a âncora `segredo-patins` em cima.
 *
 * Os pulos saem da trajetória do corpo (`CORPO.pulo`, `GRAVIDADE`), correndo a pé (`CORPO.correr`) e de
 * patins (vezes `RAPIDEZ_DOS_PATINS`): o de patins chega com o meio do corpo à borda do toco ainda acima
 * dela; o a pé não chega nem com o pé redondo pegando as duas bordas (o `alcanceMaximoDoPulo`, um raio
 * de cada lado). O planador (`PLANADOR`) abre perto do alto do pulo e de lá desce devagar: de nenhum
 * lugar que se pisa ele chega ao toco, menos da própria pista (veja o último teste: qualquer beirada
 * que o pulo alcança, o planador aberto no alto do mesmo pulo também alcança).
 */
const PULO = alturaDoPulo(GRAVIDADE)
const A_PE = CORPO.correr
const DE_PATINS = CORPO.correr * RAPIDEZ_DOS_PATINS
const PASSO = 1 / 600

/**
 * Até onde (m, no plano) o meio do corpo vai ainda acima de `acima` (m sobre a borda de saída), saindo a
 * `velocidade` com o pulo. Com `planador`, abre quando o corpo pode (`noArHa`, `subindoAte`) e segue
 * como o modo `planar` (a velocidade vertical vai à descida, a do plano à do planador).
 */
function alcanceDoCorpo(velocidade: number, acima: number, planador = false) {
  let x = 0
  let y = 0
  let vy = CORPO.pulo
  let vx = velocidade
  let t = 0
  let aberto = false
  let melhor = 0
  let alto = 0
  while (t < 8) {
    if (planador && !aberto && t > PLANADOR.noArHa && vy < PLANADOR.subindoAte) aberto = true
    if (aberto) {
      vy += (-PLANADOR.descida - vy) * Math.min(1, PLANADOR.ajusteVertical * PASSO)
      const d = PLANADOR.velocidade - vx
      vx += Math.sign(d) * Math.min(Math.abs(d), PLANADOR.aceleracao * PASSO)
    } else vy -= GRAVIDADE * PASSO
    x += vx * PASSO
    y += vy * PASSO
    t += PASSO
    alto = Math.max(alto, y)
    if (y >= acima) melhor = x
    else if (vy < 0) break
  }
  return { ate: melhor, alto }
}
/** O degrau que o corpo sobe sozinho mais a curva do pé numa quina. */
const SOBE_NA_QUINA = 0.58

let raiz: Object3D
let formas: Forma[]
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position.clone()
}
const doSegredo = (nome: string) =>
  /^col-(cil-toco-segredo|pista-segredo|guarda-pista-segredo|cil-poste-pista-segredo)-/.test(
    nome,
  ) || nome === 'col-escada-reta-2'

beforeAll(async () => {
  raiz = await carregarGlb(arquivoDaIlha('bosque.glb'))
  raiz.updateMatrixWorld(true)
  formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
}, 30_000)

function toco() {
  const c = formas.find((f) => f.nome === 'col-cil-toco-segredo-1')
  if (c?.forma !== 'cilindro') throw new Error('sem col-cil-toco-segredo-1')
  return c
}

/** A pista: as duas pontas do tampo (a do vão primeiro), no meio da largura. */
function pista() {
  const c = formas.find((f) => f.nome === 'col-pista-segredo-1')
  if (c?.forma !== 'caixa') throw new Error('sem col-pista-segredo-1')
  const q = new Quaternion(...c.rotacao)
  const meio = new Vector3(...c.posicao).add(new Vector3(0, c.meio[1], 0).applyQuaternion(q))
  const ao = new Vector3(c.meio[0], 0, 0).applyQuaternion(q)
  const t = toco()
  const pontas = [meio.clone().sub(ao), meio.clone().add(ao)].sort(
    (p, r) =>
      Math.hypot(p.x - t.posicao[0], p.z - t.posicao[2]) -
      Math.hypot(r.x - t.posicao[0], r.z - t.posicao[2]),
  ) as [Vector3, Vector3]
  return { c, vao: pontas[0], outra: pontas[1], comprimento: c.meio[0] * 2, largura: c.meio[2] * 2 }
}

describe('o segredo dos patins', () => {
  test('a âncora fica em cima do toco, de 0,4 a 0,6 m acima do tampo da pista', () => {
    const a = ancora('segredo-patins')
    const t = toco()
    const piso = pisoEm(formas, a.x, a.z)
    expect(piso.nome).toBe(t.nome)
    expect(piso.y).toBeCloseTo(a.y, 2)
    const acima = a.y - pista().vao.y
    expect(acima).toBeGreaterThanOrEqual(0.4)
    expect(acima).toBeLessThanOrEqual(0.6)
    const corpo = new Vector3(a.x, a.y + CENTRO_DO_CORPO + 0.05, a.z)
    expect(formas.filter((f) => f !== t && bate(f, corpo)).map((f) => f.nome)).toEqual([])
  })

  test('pela trajetória do corpo: o pulo de patins chega ao toco, o a pé (correndo) não chega', () => {
    const { vao } = pista()
    const t = toco()
    const gap = Math.hypot(vao.x - t.posicao[0], vao.z - t.posicao[2]) - t.raio
    const acima = topoDaForma(t) - vao.y
    // De patins, só com o meio do corpo (sem a ajuda do pé redondo), passa da borda ainda acima dela.
    const patins = alcanceDoCorpo(DE_PATINS, acima).ate
    expect(patins).toBeGreaterThan(gap + 0.05)
    // A pé, mesmo com o pé redondo pegando as duas bordas (um raio de cada lado), fica antes.
    const aPe = alcanceDoCorpo(A_PE, acima).ate + 2 * CORPO.raio
    expect(aPe).toBeLessThan(gap - 0.05)
    // Conferência com as contas do corpo: na mesma altura o a pé chegaria a 3,95 m (`alcanceMaximoDoPulo`).
    expect(alcanceDoCorpo(A_PE, 0).ate + 2 * CORPO.raio).toBeCloseTo(
      alcanceMaximoDoPulo(A_PE, GRAVIDADE),
      1,
    )
  })

  test('a pista é reta, tem pelo menos 6 m, aponta para o toco e o corpo corre nela inteira', () => {
    const { vao, outra, comprimento, largura } = pista()
    const t = toco()
    expect(comprimento).toBeGreaterThanOrEqual(6)
    expect(largura).toBeGreaterThanOrEqual(1)
    const rumo = new Vector3(vao.x - outra.x, 0, vao.z - outra.z).normalize()
    const paraOToco = new Vector3(t.posicao[0] - vao.x, 0, t.posicao[2] - vao.z).normalize()
    expect(rumo.dot(paraOToco)).toBeGreaterThan(Math.cos((3 * Math.PI) / 180))
    // De 5 cm de uma ponta a 5 cm da outra (bem na quina, o raio pode passar raspando).
    const n = Math.ceil(comprimento / 0.1)
    const de = outra.clone().lerp(vao, 0.05 / comprimento)
    const ate = vao.clone().lerp(outra, 0.05 / comprimento)
    for (let k = 0; k <= n; k++) {
      const p = de.clone().lerp(ate, k / n)
      // O tampo da pista está debaixo do ponto (o `pisoEm` erra com os cilindros inclinados dos troncos).
      expect(Math.abs((topoEm(pista().c, p.x, p.z) ?? -1) - p.y)).toBeLessThan(0.01)
      const corpo = new Vector3(p.x, p.y + CENTRO_DO_CORPO + 0.05, p.z)
      const batem = formas.filter((f) => topoDaForma(f) > p.y + CORPO.degrau && bate(f, corpo))
      expect({ k, batem: batem.map((f) => f.nome) }).toEqual({ k, batem: [] })
    }
  })

  test('sobe-se à pista pela escada de mão, que se alcança a pé da chegada', () => {
    const base = ancora('escada-2-base')
    const topo = ancora('escada-2-topo')
    const saida = ancora('escada-2-saida')
    const { vao } = pista()
    expect(base.y).toBeCloseTo(TAMPO, 2)
    expect(topo.y).toBeCloseTo(vao.y, 2)
    expect(Math.hypot(base.x - topo.x, base.z - topo.z)).toBeLessThan(0.01)
    expect(pisoEm(formas, saida.x, saida.z).y).toBeCloseTo(vao.y, 2)
    expect(formas.some((f) => f.nome === 'col-escada-reta-2')).toBe(true)
    const terreno = raiz.getObjectByName('col-terreno') as Mesh
    const grade = gradeDeAndar(terreno, formas, 24, 0.25, { meioX: -4 })
    const chegada = ancora('chegada')
    expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), base.x, base.z, 0.7)).toBe(true)
  }, 60_000)

  test('não há outro caminho pulando; planando, só os dois lugares registrados (o limite)', () => {
    const t = toco()
    const alto = topoDaForma(t)
    // Do chão em volta (o tampo), nem pulando se chega.
    expect(alto - TAMPO).toBeGreaterThan(PULO + SOBE_NA_QUINA + 0.5)
    // O que se pisa: o que se alcança do chão subindo de um tampo para outro vizinho (até 2 m de
    // distância) com um pulo, até não mudar mais. Corrimão, lado de ponte e o próprio segredo ficam de
    // fora.
    const raioDe = (f: Forma) => (f.forma === 'caixa' ? Math.hypot(f.meio[0], f.meio[2]) : f.raio)
    // Só conta o tampo onde cabe um corpo em pé no meio (o pedaço de tronco que entra no de cima não) e
    // largo o bastante para o pé (parede fina, viga e corda não se pisam).
    const cabeEmCima = (f: Forma) => {
      if ((f.forma === 'caixa' ? Math.min(f.meio[0], f.meio[2]) : f.raio) < 0.15) return false
      const topo = topoDaForma(f)
      // O meio e oito pontos a 70% da beira (o deque em volta do tronco se pisa fora do meio).
      const q = new Quaternion(...f.rotacao)
      const pontos = [new Vector3()]
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4
        const [rx, rz] = f.forma === 'caixa' ? [f.meio[0], f.meio[2]] : [f.raio, f.raio]
        pontos.push(new Vector3(Math.cos(a) * rx * 0.7, 0, Math.sin(a) * rz * 0.7))
      }
      return pontos.some((l) => {
        const p = l.applyQuaternion(q).add(new Vector3(...f.posicao))
        const corpo = new Vector3(p.x, topo + CENTRO_DO_CORPO + 0.05, p.z)
        return !formas.some(
          (g) => g !== f && topoDaForma(g) > topo + CORPO.degrau && bate(g, corpo),
        )
      })
    }
    const candidatas = formas.filter(
      (f) =>
        !doSegredo(f.nome) &&
        !f.nome.startsWith('col-guarda-') &&
        !f.nome.startsWith('col-ponte-lado-') &&
        cabeEmCima(f),
    )
    const pisaveis = new Set<Forma>(
      candidatas.filter((f) => topoDaForma(f) - TAMPO <= PULO + SOBE_NA_QUINA),
    )
    for (let mudou = true; mudou; ) {
      mudou = false
      for (const f of candidatas) {
        if (pisaveis.has(f)) continue
        const perto = [...pisaveis].some((g) => {
          const d =
            Math.hypot(f.posicao[0] - g.posicao[0], f.posicao[2] - g.posicao[2]) -
            raioDe(f) -
            raioDe(g)
          return d < 2 && topoDaForma(f) - topoDaForma(g) <= PULO + SOBE_NA_QUINA
        })
        if (perto) {
          pisaveis.add(f)
          mudou = true
        }
      }
    }
    // Os deques do percurso nas copas (4 a 4,8 m do chão) entram na conta.
    expect(Math.max(...[...pisaveis].map(topoDaForma)) - TAMPO).toBeGreaterThanOrEqual(4.8 - 0.01)
    const problemas: string[] = []
    const planando: string[] = []
    for (const f of pisaveis) {
      const topo = topoDaForma(f)
      const d = Math.max(
        0,
        Math.hypot(f.posicao[0] - t.posicao[0], f.posicao[2] - t.posicao[2]) - raioDe(f) - t.raio,
      )
      // Pulando de patins (o pulo mais longo), com o pé redondo ajudando nas duas bordas.
      const pulo = alcanceDoCorpo(DE_PATINS, alto - topo).ate
      if (pulo > 0 && d < pulo + 2 * CORPO.raio) problemas.push(`pulo de ${f.nome}`)
      // Planando: aberto no alto do pulo de patins, pela regra do modo planar (e de longe, com folga
      // para a corrente de ar que não há aqui: a conta é a do planador descendo).
      const voo = alcanceDoCorpo(DE_PATINS, alto - topo, true).ate
      if (voo > 0 && d < voo + 2 * CORPO.raio) planando.push(f.nome)
    }
    expect(problemas).toEqual([])
    // Planando, pela regra do modo planar (abre no alto do pulo e ainda sobe uns 4 cm, a descida vai a
    // 1,8 m/s aos poucos), chega-se ao toco do deque da T3 (4,8 m do chão, a 6,5 m do toco; o voo de lá
    // vai a uns 8,7 m) e da ponta da ponte ao lado dele (8,7 m; o voo, 8,4 m mais o pé). Na ponta de
    // campo não há lugar a mais de uns 9,4 m dos deques: o limite fica registrado aqui, para a dona
    // decidir no jogo (por exemplo, o planador não abrir perto do segredo). Lugar novo reprova.
    expect(planando.sort()).toEqual(['col-cil-deque-3', 'col-ponte-12'])
  })

  test('o planador saindo da própria pista chega ao toco: o limite que fica (nenhuma altura resolve)', () => {
    // O planador abre perto do alto do pulo e ainda sobe um pouco: passa da altura do pulo. Então
    // qualquer beirada que o pulo de patins alcança, ele alcança também, e muito mais longe. Este teste
    // registra o número (para a dona decidir, no jogo, o que fazer com o planador perto do segredo).
    const { vao } = pista()
    const t = toco()
    const gap = Math.hypot(vao.x - t.posicao[0], vao.z - t.posicao[2]) - t.raio
    const voo = alcanceDoCorpo(DE_PATINS, topoDaForma(t) - vao.y, true)
    expect(voo.alto).toBeGreaterThan(PULO)
    expect(voo.ate).toBeGreaterThan(gap)
  })

  test('a pista e o toco ficam fora do lote da cabana', () => {
    const a = ancora('lote-cabana-a')
    const b = ancora('lote-cabana-b')
    const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)]
    const [z0, z1] = [Math.min(a.z, b.z), Math.max(a.z, b.z)]
    for (const f of formas.filter((c) => doSegredo(c.nome))) {
      const r = f.forma === 'caixa' ? Math.hypot(f.meio[0], f.meio[2]) : f.raio
      const dentroX = f.posicao[0] + r > x0 && f.posicao[0] - r < x1
      const dentroZ = f.posicao[2] + r > z0 && f.posicao[2] - r < z1
      // A pista é comprida: confere pela caixa girada, ponto a ponto.
      if (f.forma === 'caixa' && f.meio[0] > 1) {
        const q = new Quaternion(...f.rotacao)
        for (let s = -1; s <= 1; s += 0.05) {
          const p = new Vector3(...f.posicao).add(
            new Vector3(f.meio[0] * s, 0, 0).applyQuaternion(q),
          )
          expect(p.x > x0 - 0.6 && p.x < x1 + 0.6 && p.z > z0 - 0.6 && p.z < z1 + 0.6).toBe(false)
        }
      } else expect(dentroX && dentroZ).toBe(false)
    }
  })
})
