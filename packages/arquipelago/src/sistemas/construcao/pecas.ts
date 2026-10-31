import type { Obra } from '@sistemazero/arquipelago-contracts'
import { type LadoDaParede, ladoDaParede, type Planta } from './comodos'
import type { Entrada } from './entrada'
import {
  type Aresta,
  adiante,
  arestaDaChave,
  arestasDaAbertura,
  chaveDaAresta,
  LARGURA_DA_ABERTURA,
  ladosDaAresta,
  type Ponto,
} from './grade'
import { type Celula, chaveDaCelula, type ParedeDoMeuQuarto } from './lote'

/**
 * As peças do kit da casa (`src/assets/casa`, contrato no README de `arte/casa`) que desenham uma
 * obra: o nó do GLB, onde vai (o meio da base, na linha da grade, ou o meio da célula no piso) e o
 * giro em volta do eixo vertical. Tudo no referencial da grade (y 0 = topo do piso).
 *
 * O kit, sem giro, corre no eixo x com o lado de dentro para -z (o +Y do Blender). Por isso:
 * parede de eixo x com o dentro em -z gira 0 e com o dentro em +z gira meia volta; de eixo z, com o
 * dentro em -x gira +90° e com o dentro em +x, -90°.
 */
export type ArquivoDoKit = 'paredes' | 'portas' | 'pisos' | 'telhado' | 'varanda'

export interface PecaDoKit {
  /** Identidade estável da peça (a mesma peça no mesmo lugar não é recriada). */
  chave: string
  arquivo: ArquivoDoKit
  no: string
  x: number
  z: number
  giro: number
  /** A altura da origem (o telhado); sem ela, 0 (o topo do piso). */
  y?: number
  /** Numa parede do quarto, o lado que fica para dentro dele (leva a cor do Meu quarto). */
  quarto?: LadoDoQuarto
}

/**
 * O lado de uma peça que fica para dentro do quarto (31/10/2026, pedido dela: por dentro, as paredes
 * do quarto usam a cor que a criança escolheu no Meu quarto). `cor`: a esquerda e a direita do
 * quarto usam a cor da parede da esquerda do Meu quarto; o fundo e a frente, a do fundo (paredes
 * opostas com a mesma cor; o Meu quarto só mostra a esquerda e o fundo). `material`: o nome do
 * material desse lado no kit (`paredeDentro` no +Y local; numa parede lisa com o quarto no -Y,
 * `paredeVerso`).
 */
export interface LadoDoQuarto {
  cor: ParedeDoMeuQuarto
  material: 'paredeDentro' | 'paredeVerso'
}

export interface FolhaDaPorta extends PecaDoKit {
  /** O meio do vão (para a porta abrir quando a pessoa chega perto). */
  meio: Ponto
}

export interface PecasDaObra {
  paredes: PecaDoKit[]
  quinas: PecaDoKit[]
  folhas: FolhaDaPorta[]
  pisos: PecaDoKit[]
}

/** Uma parede está cortada (a peça `-baixa`, de 1 de altura)? Decide quem desenha. */
export type Corte = (chaveDaAresta: string) => boolean

export const NADA_CORTADO: Corte = () => false
export const TUDO_CORTADO: Corte = () => true

export function giroDaParede(eixo: Aresta['eixo'], lado: LadoDaParede): number {
  if (eixo === 'x') return lado.dentro === -1 ? 0 : Math.PI
  return lado.dentro === -1 ? Math.PI / 2 : -Math.PI / 2
}

/** O meio de um trecho de `n` arestas a partir de `a` (onde fica a origem da peça). */
function meioDoTrecho(a: Aresta, n: number): Ponto {
  return a.eixo === 'x' ? { x: a.x + n / 2, z: a.z } : { x: a.x, z: a.z + n / 2 }
}

function peca(arquivo: ArquivoDoKit, no: string, p: Ponto, giro: number): PecaDoKit {
  return { chave: `${no}@${p.x},${p.z},${giro.toFixed(3)}`, arquivo, no, x: p.x, z: p.z, giro }
}

export const NO_DA_JANELA = {
  'janela-grande': 'parede-janela-grande',
  'janela-arco': 'parede-janela-arco',
  'janela-redonda': 'parede-janela-redonda',
} as const

export function pecasDaObra(obra: Obra, p: Planta, cortada: Corte): PecasDaObra {
  const paredes: PecaDoKit[] = []
  const folhas: FolhaDaPorta[] = []
  // Cada aresta que começa uma abertura, com a abertura; as outras arestas dela são puladas.
  const inicioDe = new Map<string, Obra['aberturas'][number]>()
  const dentroDeAbertura = new Set<string>()
  for (const ab of obra.aberturas) {
    const arestas = arestasDaAbertura(ab)
    if (!arestas.every((a) => p.paredes.has(chaveDaAresta(a)))) continue
    inicioDe.set(chaveDaAresta(arestas[0] as Aresta), ab)
    for (const a of arestas.slice(1)) dentroDeAbertura.add(chaveDaAresta(a))
  }
  for (const k of p.paredes) {
    if (dentroDeAbertura.has(k)) continue
    const a = arestaDaChave(k)
    const lado = ladoDaParede(p, k)
    const giro = giroDaParede(a.eixo, lado)
    const fam = lado.familia
    const ab = inicioDe.get(k)
    const quarto = ladoDoQuarto(p, a, lado)
    const parede = (no: string, onde: Ponto) => {
      const x = peca('paredes', no, onde, giro)
      paredes.push(quarto ? { ...x, quarto } : x)
    }
    if (!ab) {
      parede(cortada(k) ? `parede-${fam}-baixa` : `parede-${fam}`, meioDoTrecho(a, 1))
      continue
    }
    const largura = LARGURA_DA_ABERTURA[ab.tipo]
    const arestas = Array.from({ length: largura }, (_, i) => adiante(a, i))
    const cortadaAqui = arestas.some((x) => cortada(chaveDaAresta(x)))
    const meio = meioDoTrecho(a, largura)
    if (ab.tipo === 'porta') {
      parede(`parede-porta-${fam}${cortadaAqui ? '-baixa' : ''}`, meio)
      // Na parede cortada fica só o batente: a folha some (README do kit).
      if (!cortadaAqui) {
        const no = fam === 'lambri' ? 'porta' : 'porta-interna'
        folhas.push({ ...peca('portas', no, meio, giro), meio })
      }
      continue
    }
    // Com a parede cortada, a janela vista na parede cortada (31/10/2026, pedido dela: as portas e
    // as janelas aparecem no Construir), no meio da abertura como a alta.
    parede(`${NO_DA_JANELA[ab.tipo]}-${fam}${cortadaAqui ? '-baixa' : ''}`, meio)
  }
  paredes.sort((a, b) => a.chave.localeCompare(b.chave))
  return { paredes, quinas: quinasDaObra(p, cortada), folhas, pisos: pisosDaObra(p) }
}

/** O lado da parede que dá para o quarto da plataforma, se ela for do quarto. */
export function ladoDoQuarto(p: Planta, a: Aresta, lado: LadoDaParede): LadoDoQuarto | undefined {
  const doQuarto = (c: Celula) => {
    const i = p.comodoDe.get(chaveDaCelula(c))
    return i !== undefined && p.comodos[i]?.quarto === true
  }
  const [menos, mais] = ladosDaAresta(a)
  const noMenos = doQuarto(menos)
  const noMais = doQuarto(mais)
  if (!noMenos && !noMais) return undefined
  const dentroNoQuarto = lado.dentro === 1 ? noMais : noMenos
  return {
    cor: a.eixo === 'x' ? 'fundo' : 'esquerda',
    material: dentroNoQuarto ? 'paredeDentro' : 'paredeVerso',
  }
}

/**
 * As quinas: em toda ponta solta de parede, em toda dobra em L e onde uma parede em pé encontra
 * uma cortada na mesma linha. No T, no cruzamento e na emenda reta da mesma altura não vai nada (a
 * ponta fica dentro da outra parede). As quatro quinas do quarto também são do kit. Lambri se alguma
 * parede do ponto é lambri; em pé se alguma está em pé.
 */
export function quinasDaObra(p: Planta, cortada: Corte): PecaDoKit[] {
  const pontos = new Map<string, Ponto>()
  for (const k of p.paredes) {
    const a = arestaDaChave(k)
    const fim = a.eixo === 'x' ? { x: a.x + 1, z: a.z } : { x: a.x, z: a.z + 1 }
    for (const pt of [{ x: a.x, z: a.z }, fim]) pontos.set(`${pt.x},${pt.z}`, pt)
  }
  const quinas: PecaDoKit[] = []
  for (const pt of pontos.values()) {
    const em = {
      maisX: chaveDaAresta({ eixo: 'x', x: pt.x, z: pt.z }),
      menosX: chaveDaAresta({ eixo: 'x', x: pt.x - 1, z: pt.z }),
      maisZ: chaveDaAresta({ eixo: 'z', x: pt.x, z: pt.z }),
      menosZ: chaveDaAresta({ eixo: 'z', x: pt.x, z: pt.z - 1 }),
    }
    const tem = {
      maisX: p.paredes.has(em.maisX),
      menosX: p.paredes.has(em.menosX),
      maisZ: p.paredes.has(em.maisZ),
      menosZ: p.paredes.has(em.menosZ),
    }
    const chaves = (Object.keys(em) as (keyof typeof em)[]).filter((d) => tem[d]).map((d) => em[d])
    const emPe = (k: string) => !cortada(k)
    let vai = false
    if (chaves.length === 1) vai = true
    else if (chaves.length === 2) {
      const reta = (tem.maisX && tem.menosX) || (tem.maisZ && tem.menosZ)
      const [a, b] = chaves as [string, string]
      vai = !reta || emPe(a) !== emPe(b)
    }
    if (!vai) continue
    const lambri = chaves.some((k) => ladoDaParede(p, k).familia === 'lambri')
    const alta = chaves.some(emPe)
    quinas.push(
      peca('paredes', `quina-${lambri ? 'lambri' : 'lisa'}${alta ? '' : '-baixa'}`, pt, 0),
    )
  }
  return quinas.sort((a, b) => a.chave.localeCompare(b.chave))
}

/** O piso de cada cômodo novo, célula por célula, todos com o mesmo giro (a tábua continua). */
export function pisosDaObra(p: Planta): PecaDoKit[] {
  const pisos: PecaDoKit[] = []
  for (const c of p.comodos) {
    if (c.quarto) continue
    for (const cel of c.celulas)
      pisos.push(peca('pisos', `piso-${c.piso}`, { x: cel.x + 0.5, z: cel.z + 0.5 }, 0))
  }
  return pisos
}

// ------------------------------------------------------------------ colisão

/** Uma caixa de colisão no referencial da grade (y 0 no topo do piso). */
export interface CaixaDaObra {
  nome: string
  posicao: [number, number, number]
  meio: [number, number, number]
}

/** As medidas que a colisão usa (as das peças do kit, README de `arte/casa`). */
export const MEDIDAS_DO_KIT = {
  alturaDaParede: 4,
  /** Meia espessura do colisor da parede (a parede tem 0,20; o lambri sai um pouco na fachada). */
  meiaEspessura: 0.15,
  vaoDaPorta: { largura: 2.2, altura: 3 },
  meiaQuina: 0.22,
} as const

/**
 * Os colisores da obra: as paredes em pé (sempre altas para o corpo: o corte é desenho), com o vão
 * de cada porta livre, e as quinas. Arestas vizinhas na mesma linha (e no mesmo corte) viram uma
 * caixa só. As quatro paredes do quarto colidem por aqui. A parede cortada ganha o nome
 * `col-obra-cortada-*`: só segura o corpo, e a câmera passa por ela para ver dentro de casa.
 */
export const COLISOR_DA_PAREDE_CORTADA = 'col-obra-cortada-'

export function colisoresDaObra(
  obra: Obra,
  p: Planta,
  cortada: Corte = NADA_CORTADO,
): CaixaDaObra[] {
  const nomeDe = (k: string, resto: string) =>
    cortada(k) ? `${COLISOR_DA_PAREDE_CORTADA}${resto}` : `col-obra-${resto}`
  const H = MEDIDAS_DO_KIT.alturaDaParede
  const e = MEDIDAS_DO_KIT.meiaEspessura
  const caixas: CaixaDaObra[] = []
  const deporta = new Set<string>()
  for (const ab of obra.aberturas) {
    if (ab.tipo !== 'porta') continue
    const arestas = arestasDaAbertura(ab)
    if (!arestas.every((a) => p.paredes.has(chaveDaAresta(a)))) continue
    for (const a of arestas) deporta.add(chaveDaAresta(a))
    const largura = LARGURA_DA_ABERTURA.porta
    const { largura: vao, altura: alturaDoVao } = MEDIDAS_DO_KIT.vaoDaPorta
    const lado = (largura - vao) / 2
    const ini = arestas[0] as Aresta
    const nome = nomeDe(chaveDaAresta(ini), `porta-${ini.eixo}${ini.x},${ini.z}`)
    const naLinha = (t: number, y: number): CaixaDaObra['posicao'] =>
      ini.eixo === 'x' ? [ini.x + t, y, ini.z] : [ini.x, y, ini.z + t]
    const meio = (mt: number, my: number): CaixaDaObra['meio'] =>
      ini.eixo === 'x' ? [mt, my, e] : [e, my, mt]
    caixas.push({
      nome: `${nome}-a`,
      posicao: naLinha(lado / 2, H / 2),
      meio: meio(lado / 2, H / 2),
    })
    caixas.push({
      nome: `${nome}-b`,
      posicao: naLinha(largura - lado / 2, H / 2),
      meio: meio(lado / 2, H / 2),
    })
    const sobra = H - alturaDoVao
    caixas.push({
      nome: `${nome}-c`,
      posicao: naLinha(largura / 2, alturaDoVao + sobra / 2),
      meio: meio(vao / 2, sobra / 2),
    })
  }
  // As outras arestas em pé, juntadas por linha.
  const solidas = [...p.paredes]
    .filter((k) => !deporta.has(k))
    .map(arestaDaChave)
    .sort(
      (a, b) =>
        a.eixo.localeCompare(b.eixo) ||
        (a.eixo === 'x' ? a.z - b.z || a.x - b.x : a.x - b.x || a.z - b.z),
    )
  let i = 0
  while (i < solidas.length) {
    const a = solidas[i] as Aresta
    let n = 1
    while (i + n < solidas.length) {
      const b = solidas[i + n] as Aresta
      if (chaveDaAresta(b) !== chaveDaAresta(adiante(a, n))) break
      if (cortada(chaveDaAresta(b)) !== cortada(chaveDaAresta(a))) break
      n++
    }
    const m = meioDoTrecho(a, n)
    caixas.push({
      nome: nomeDe(chaveDaAresta(a), `parede-${a.eixo}${a.x},${a.z}`),
      posicao: [m.x, H / 2, m.z],
      meio: a.eixo === 'x' ? [n / 2, H / 2, e] : [e, H / 2, n / 2],
    })
    i += n
  }
  for (const q of quinasDaObra(p, () => false)) {
    const s = MEDIDAS_DO_KIT.meiaQuina
    caixas.push({
      nome: `col-obra-quina-${q.x},${q.z}`,
      posicao: [q.x, H / 2, q.z],
      meio: [s, H / 2, s],
    })
  }
  return caixas
}

// ------------------------------------------------------------------ a varanda da entrada

/**
 * Os nós da varanda (`casa-varanda.glb`, 31/10/2026): o deque com as vigas, o degrau, as colunas, os
 * vasinhos e o lampião (`varanda`) e o toldo (`varanda-toldo`, que sai com o telhado: no Construir e
 * com a pessoa dentro de casa). Origem no meio da porta, na linha da grade, com o giro da parede.
 */
export const NOS_DA_VARANDA = { varanda: 'varanda', toldo: 'varanda-toldo' } as const

/** As peças da varanda na porta de entrada (nenhuma sem entrada). */
export function pecasDaVaranda(e: Entrada | null): { varanda: PecaDoKit[]; toldo: PecaDoKit[] } {
  if (!e) return { varanda: [], toldo: [] }
  return {
    varanda: [peca('varanda', NOS_DA_VARANDA.varanda, e.meio, e.giro)],
    toldo: [peca('varanda', NOS_DA_VARANDA.toldo, e.meio, e.giro)],
  }
}

/**
 * Os colisores da varanda no referencial da peça (giro 0: a parede corre em x e o lado de fora é o
 * +z), as mesmas caixas `col-varanda-*` do `casa-varanda.glb` (o teste confere): o tampo do deque
 * (de 0,20 a 1,75 da linha da parede), o degrau, as duas colunas do toldo e os dois vasinhos. Todos
 * só seguram o corpo (a câmera passa, `SO_PARA_O_CORPO`).
 */
export const COLISORES_DA_VARANDA: readonly CaixaDaObra[] = [
  { nome: 'col-varanda-deque', posicao: [0, 0, 0.975], meio: [2.1, 0.05, 0.775] },
  { nome: 'col-varanda-degrau', posicao: [0, -0.04, 1.97], meio: [1.2, 0.04, 0.2] },
  { nome: 'col-varanda-coluna-1', posicao: [-1.95, 1.7, 1.6], meio: [0.12, 1.7, 0.12] },
  { nome: 'col-varanda-coluna-2', posicao: [1.95, 1.7, 1.6], meio: [0.12, 1.7, 0.12] },
  { nome: 'col-varanda-vaso-1', posicao: [-1.6, 0.36, 0.5], meio: [0.22, 0.36, 0.22] },
  { nome: 'col-varanda-vaso-2', posicao: [1.6, 0.36, 0.5], meio: [0.22, 0.36, 0.22] },
]

/** Os colisores da varanda na entrada, no referencial da grade (o giro é sempre de quarto de volta). */
export function colisoresDaVaranda(e: Entrada | null): CaixaDaObra[] {
  if (!e) return []
  const c = Math.round(Math.cos(e.giro))
  const s = Math.round(Math.sin(e.giro))
  return COLISORES_DA_VARANDA.map((k) => {
    const [x, y, z] = k.posicao
    const [mx, my, mz] = k.meio
    // O mesmo giro em volta do y do three.js: (x, z) -> (x cos + z sen, -x sen + z cos).
    return {
      nome: k.nome,
      posicao: [e.meio.x + x * c + z * s, y, e.meio.z - x * s + z * c],
      meio: s === 0 ? [mx, my, mz] : [mz, my, mx],
    }
  })
}
