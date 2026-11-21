import { pontoNoPoligono } from '../poligonos'
import { alturaDoChao, transformacaoResolvida } from './chao'
import { resolverConjuntos } from './conjuntos'
import { type ConsultaDeAgua, prepararConsultaDaAgua } from './consulta-de-agua'
import type {
  BaseDeCenario,
  CaminhoDeCenario,
  DocumentoDeCenario,
  InstanciaDeCenario,
  Transformacao,
} from './documento'
import { dominioDoChao } from './dominio-do-chao'
import { volumeDaForma } from './formas'
import { PREFIXO_ARQUIPELAGO } from './migrar'
import { indiceDaOrganizacao } from './organizacao'
import {
  CAMPOS_DO_ARQUIPELAGO,
  type CamposDoArquipelago,
  lerCamposDoArquipelago,
  type TipoDeAvisoDoArquipelago,
  validarCamposDoArquipelago,
} from './propriedades-arquipelago'
import type { RecursoDeTerreno } from './recursos-de-terreno'
import {
  criarFonteDeAlturas,
  type FonteDeAlturas,
  type PecaDeAlturas,
  PecaDeTerrenoAusente,
} from './terreno'
import { curvaDoCaminho } from './topologia-de-caminho'
import { transformarPonto, type VolumeDeComposicao } from './volume'

/**
 * Conferência de implantação: o que parece errado no lugar de cada objeto (flutuando,
 * enterrado, sólido no meio do caminho, colado numa superfície) e os metadados do Arquipélago
 * que o jogo recusaria. Pura, sem three.js e sem gravar nada; o chão vem injetado.
 *
 * Medidas: a caixa do modelo (`modelos[].volume` ou a forma autoral) na pose resolvida
 * (`transformacaoResolvida`, a mesma da compilação). O espelho não muda a caixa (reflete em
 * volta do centro dela). Peças de conjuntos entram resolvidas, com `conjunto` no aviso.
 *
 * Caminhos andáveis (trilha, praça, estrada e ponte; cerca e muro não): a faixa é a curva de
 * `curvaDoCaminho` (a mesma suavização do piso) em trechos retos com a largura do caminho.
 * Aproximação documentada: cada trecho vira um retângulo e cada esquina um círculo de meia
 * largura, então a esquina fica arredondada (o piso real alarga em bico até o dobro) e as
 * pontas não ganham sobra. A praça é o polígono do contorno. O piso de trilha, praça e estrada
 * acompanha o chão; o da ponte é a reta entre as cabeceiras (`cotas` ou o chão nelas).
 *
 * Desempenho: O(objetos · peças vizinhas). As peças dos caminhos ficam numa grade de 8 m e
 * cada objeto consulta só as células da própria caixa.
 */

export const LIMITES_DA_IMPLANTACAO = {
  /** Um canto da base mais alto que isto (m) acima do chão flutua. */
  flutuando: 0.15,
  /** Fração da altura abaixo do chão, no centro da base, que já é enterrado demais. */
  enterrado: 0.3,
  /** Folga somada à parte enterrada declarada em `arquipelago.enterrada`. */
  folgaDaEnterrada: 0.1,
  /** Abaixo desta altura (m) a peça é fina. */
  alturaFina: 0.06,
  /** O topo da peça fina a esta distância (m) de outra superfície pode piscar. */
  mesmoPlano: 0.02,
  /** Do piso do caminho até esta altura (m) é o espaço de quem anda. */
  passagem: 2,
  /** Peça que não sobe mais que isto (m) acima do piso não bloqueia a passagem. */
  obstaculo: 0.1,
} as const
export type OpcoesDaImplantacao = Partial<Record<keyof typeof LIMITES_DA_IMPLANTACAO, number>>

export type TipoDeAvisoDeImplantacao =
  | 'ator-repetido'
  | TipoDeAvisoDoArquipelago
  | 'transformacao-do-papel'
  | 'solido-no-caminho'
  | 'flutuando'
  | 'enterrado'
  | 'quase-no-mesmo-plano'
/** A ordem dos avisos na resposta: primeiro o que impede o jogo de abrir. */
export const TIPOS_DE_AVISO_DE_IMPLANTACAO: readonly TipoDeAvisoDeImplantacao[] = [
  'ator-repetido',
  'ator-invalido',
  'placa-incompleta',
  'fisica-invalida',
  'raio-do-tronco-invalido',
  'enterrada-invalida',
  'fundacao-invalida',
  'transformacao-do-papel',
  'solido-no-caminho',
  'flutuando',
  'enterrado',
  'quase-no-mesmo-plano',
]

export interface AvisoDeImplantacao {
  /** A entidade do documento (para peças de conjunto, a peça resolvida). */
  id: string
  tipo: TipoDeAvisoDeImplantacao
  mensagem: string
  detalhe?: string
  /** O campo `arquipelago.*` em questão, nos avisos dos metadados do jogo. */
  campo?: string
  /** A montagem de onde veio a peça, quando o aviso é de uma peça de conjunto. */
  conjunto?: string
}

/** Do `fisica-nativa-do-cenario.ts` do jogo: raio padrão e meia altura de 0,9 do tronco. */
const TRONCO_DO_JOGO = { raio: 0.23, altura: 1.8 } as const
/** Inclinação até a qual a face de baixo ainda é a base (cos 25°). */
const BASE_DEITADA = Math.cos((25 * Math.PI) / 180)
const LADO_DA_GRADE = 8
const CAMINHOS_ANDAVEIS = new Set(['trilha', 'praca', 'estrada', 'ponte'])
/** Peças que fazem parte do piso: quem anda passa por cima delas. */
const FISICAS_PISAVEIS = new Set(['ponte', 'escada', 'solo'])

type P2 = { x: number; z: number }
type P3 = { x: number; y: number; z: number }
type Caixa = { x0: number; z0: number; x1: number; z1: number }

/**
 * O leitor do chão a partir das peças de relevo já carregadas (bytes lidos com
 * `lerRecursoDeTerreno` ou só as alturas). Plano e perfil respondem zero, como `alturaDoChao`.
 * `temChao` diz o domínio da base; buracos ficam com a fonte da oficina, que já os conhece.
 */
export function leitorDoChao(
  base: BaseDeCenario,
  pecas?: ReadonlyMap<string, PecaDeAlturas | RecursoDeTerreno>,
): FonteDeAlturas {
  if (base.tipo === 'terreno') {
    if (!pecas) throw new PecaDeTerrenoAusente('Carregue o relevo antes de conferir o chão.')
    const alturas = new Map<string, PecaDeAlturas>()
    for (const [digest, r] of pecas) {
      if ('amostras' in r) alturas.set(digest, r)
      else if (r.tipo === 'alturas') alturas.set(digest, r.alturas)
    }
    const fonte = criarFonteDeAlturas(base, alturas)
    fonte.temChao = dominioDoChao(base)
    return fonte
  }
  const fonte: FonteDeAlturas = () => 0
  if (base.tipo === 'plano') fonte.temChao = dominioDoChao(base)
  return fonte
}

const metros = (v: number) => `${v.toFixed(2).replace('.', ',')} m`
const porcento = (v: number) => `${Math.round(v * 100)}%`
const juntar = (partes: readonly string[]) =>
  partes.length < 2 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`
const ROTULO_DO_CAMPO = new Map(CAMPOS_DO_ARQUIPELAGO.map((c) => [c.chave, c.rotulo]))
const SEM_GIRO = { x: 0, y: 0, z: 0 }
const UM = { x: 1, y: 1, z: 1 }

// ----- Geometria plana -----

/** Envoltória convexa em sentido anti-horário (cadeia monótona); colineares saem. */
function envoltoria(pontos: readonly P2[]): P2[] {
  const ps = [...pontos].sort((a, b) => a.x - b.x || a.z - b.z)
  if (ps.length < 3) return ps
  const cruz = (o: P2, a: P2, b: P2) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x)
  const baixo: P2[] = [],
    cima: P2[] = []
  for (const p of ps) {
    while (baixo.length >= 2 && cruz(baixo.at(-2)!, baixo.at(-1)!, p) <= 1e-12) baixo.pop()
    baixo.push(p)
  }
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]!
    while (cima.length >= 2 && cruz(cima.at(-2)!, cima.at(-1)!, p) <= 1e-12) cima.pop()
    cima.push(p)
  }
  return [...baixo.slice(0, -1), ...cima.slice(0, -1)]
}

/** Eixos de separação: normal e direção de cada aresta (a direção cobre formas achatadas). */
function eixosDe(forma: readonly P2[], saida: P2[]) {
  const n = forma.length
  for (let i = 0; i < (n === 2 ? 1 : n); i++) {
    const a = forma[i]!,
      b = forma[(i + 1) % n]!,
      dx = b.x - a.x,
      dz = b.z - a.z,
      m = Math.hypot(dx, dz)
    if (m < 1e-12) continue
    saida.push({ x: dx / m, z: dz / m }, { x: -dz / m, z: dx / m })
  }
}
function intervalo(forma: readonly P2[], e: P2): [number, number] {
  let lo = Infinity,
    hi = -Infinity
  for (const p of forma) {
    const d = p.x * e.x + p.z * e.z
    if (d < lo) lo = d
    if (d > hi) hi = d
  }
  return [lo, hi]
}
/** Teste dos eixos separadores entre duas formas convexas (pontos, segmentos ou polígonos). */
function convexosSeTocam(a: readonly P2[], b: readonly P2[]): boolean {
  const eixos: P2[] = []
  eixosDe(a, eixos)
  eixosDe(b, eixos)
  if (!eixos.length) return Math.hypot(a[0]!.x - b[0]!.x, a[0]!.z - b[0]!.z) < 1e-9
  for (const e of eixos) {
    const [alo, ahi] = intervalo(a, e),
      [blo, bhi] = intervalo(b, e)
    if (ahi < blo - 1e-9 || bhi < alo - 1e-9) return false
  }
  return true
}
function distanciaAoSegmento(p: P2, a: P2, b: P2) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    m2 = dx * dx + dz * dz,
    t = m2 < 1e-24 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / m2))
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t))
}
function distanciaAoConvexo(p: P2, forma: readonly P2[]) {
  if (forma.length >= 3) {
    let dentro = true
    for (let i = 0; i < forma.length && dentro; i++) {
      const a = forma[i]!,
        b = forma[(i + 1) % forma.length]!
      if ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x) < 0) dentro = false
    }
    if (dentro) return 0
  }
  if (forma.length === 1) return Math.hypot(p.x - forma[0]!.x, p.z - forma[0]!.z)
  let d = Infinity
  for (let i = 0; i < forma.length; i++)
    d = Math.min(d, distanciaAoSegmento(p, forma[i]!, forma[(i + 1) % forma.length]!))
  return d
}
const caixaDe = (pontos: readonly P2[], folga = 0): Caixa => {
  const c = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity }
  for (const p of pontos) {
    c.x0 = Math.min(c.x0, p.x - folga)
    c.z0 = Math.min(c.z0, p.z - folga)
    c.x1 = Math.max(c.x1, p.x + folga)
    c.z1 = Math.max(c.z1, p.z + folga)
  }
  return c
}
const caixasSeTocam = (a: Caixa, b: Caixa) =>
  a.x0 <= b.x1 && b.x0 <= a.x1 && a.z0 <= b.z1 && b.z0 <= a.z1

// ----- Caminhos andáveis -----

type PecaDoCaminho =
  /** Um trecho reto: começa em `a`, avança `comprimento` em `u`, meia largura para cada lado. */
  | {
      tipo: 'faixa'
      caminho: number
      retangulo: P2[]
      a: P2
      u: P2
      comprimento: number
      meia: number
    }
  /** A esquina entre dois trechos. */
  | { tipo: 'junta'; caminho: number; centro: P2; raio: number }
  /** Um lado do contorno da praça. */
  | { tipo: 'borda'; caminho: number; segmento: P2[] }
interface CaminhoAndavel {
  c: CaminhoDeCenario
  caixa: Caixa
  poligono?: P2[]
  ponte?: { a: P3; b: P3 }
}

/** As peças numa grade uniforme; peças enormes ficam numa lista que todo mundo consulta. */
class GradeDePecas {
  private readonly celulas = new Map<number, number[]>()
  private readonly sempre: number[] = []
  private readonly marca: Int32Array
  private consulta = 0
  constructor(pecas: readonly { caixa: Caixa }[]) {
    this.marca = new Int32Array(pecas.length)
    pecas.forEach((p, i) => {
      const [ix0, iz0, ix1, iz1] = this.indices(p.caixa)
      if ((ix1 - ix0 + 1) * (iz1 - iz0 + 1) > 4096) {
        this.sempre.push(i)
        return
      }
      for (let ix = ix0; ix <= ix1; ix++)
        for (let iz = iz0; iz <= iz1; iz++) {
          const k = this.chave(ix, iz),
            lista = this.celulas.get(k)
          if (lista) lista.push(i)
          else this.celulas.set(k, [i])
        }
    })
  }
  private indice(v: number) {
    return Math.max(-32767, Math.min(32767, Math.floor(v / LADO_DA_GRADE)))
  }
  private indices(c: Caixa) {
    return [this.indice(c.x0), this.indice(c.z0), this.indice(c.x1), this.indice(c.z1)] as const
  }
  private chave(ix: number, iz: number) {
    return (ix + 32768) * 65536 + (iz + 32768)
  }
  /** Visita cada peça perto da caixa uma vez; `true` encerra a consulta. */
  visitar(caixa: Caixa, visita: (indice: number) => boolean): boolean {
    if (++this.consulta > 2_000_000_000) {
      this.consulta = 1
      this.marca.fill(0)
    }
    const nova = (i: number) => {
      if (this.marca[i] === this.consulta) return false
      this.marca[i] = this.consulta
      return true
    }
    for (const i of this.sempre) if (nova(i) && visita(i)) return true
    const [ix0, iz0, ix1, iz1] = this.indices(caixa)
    for (let ix = ix0; ix <= ix1; ix++)
      for (let iz = iz0; iz <= iz1; iz++)
        for (const i of this.celulas.get(this.chave(ix, iz)) ?? [])
          if (nova(i) && visita(i)) return true
    return false
  }
}

function prepararCaminhos(
  caminhos: readonly CaminhoDeCenario[],
  oculto: (id: string, proprio: boolean) => boolean,
  altura: (x: number, z: number) => number,
) {
  const andaveis: CaminhoAndavel[] = [],
    pecas: (PecaDoCaminho & { caixa: Caixa })[] = []
  for (const c of caminhos) {
    if (!CAMINHOS_ANDAVEIS.has(c.tipo) || oculto(c.id, c.oculto)) continue
    let pontos: P2[], fechada: boolean
    try {
      const curva = curvaDoCaminho(c)
      pontos = curva.pontos
      fechada = curva.fechada
    } catch {
      continue // Um caminho que nem o piso consegue desenhar não tem faixa a conferir.
    }
    const indice = andaveis.length,
      meia = c.largura / 2
    if (c.tipo === 'praca') {
      andaveis.push({ c, caixa: caixaDe(pontos), poligono: pontos })
      for (let i = 0; i < pontos.length; i++) {
        const segmento = [pontos[i]!, pontos[(i + 1) % pontos.length]!]
        pecas.push({ tipo: 'borda', caminho: indice, segmento, caixa: caixaDe(segmento) })
      }
      continue
    }
    let ponte: CaminhoAndavel['ponte']
    if (c.tipo === 'ponte') {
      try {
        const [a, b] = pontos as [P2, P2]
        ponte = {
          a: { ...a, y: c.cotas?.de ?? altura(a.x, a.z) },
          b: { ...b, y: c.cotas?.ate ?? altura(b.x, b.z) },
        }
      } catch {
        continue
      }
    }
    andaveis.push({ c, caixa: caixaDe(pontos, meia), ...(ponte ? { ponte } : {}) })
    const trechos = fechada ? pontos.length : pontos.length - 1
    for (let i = 0; i < trechos; i++) {
      const a = pontos[i]!,
        b = pontos[(i + 1) % pontos.length]!,
        comprimento = Math.hypot(b.x - a.x, b.z - a.z)
      if (comprimento < 1e-9) continue
      const u = { x: (b.x - a.x) / comprimento, z: (b.z - a.z) / comprimento },
        n = { x: -u.z * meia, z: u.x * meia },
        retangulo = [
          { x: a.x + n.x, z: a.z + n.z },
          { x: a.x - n.x, z: a.z - n.z },
          { x: b.x - n.x, z: b.z - n.z },
          { x: b.x + n.x, z: b.z + n.z },
        ]
      pecas.push({
        tipo: 'faixa',
        caminho: indice,
        retangulo,
        a,
        u,
        comprimento,
        meia,
        caixa: caixaDe(retangulo),
      })
    }
    for (let i = fechada ? 0 : 1; i < (fechada ? pontos.length : pontos.length - 1); i++) {
      const centro = pontos[i]!
      pecas.push({
        tipo: 'junta',
        caminho: indice,
        centro,
        raio: meia,
        caixa: caixaDe([centro], meia),
      })
    }
  }
  return { andaveis, pecas, grade: new GradeDePecas(pecas) }
}

function pecaTocaForma(p: PecaDoCaminho, forma: readonly P2[]): boolean {
  if (p.tipo === 'junta') return distanciaAoConvexo(p.centro, forma) <= p.raio
  return convexosSeTocam(p.tipo === 'faixa' ? p.retangulo : p.segmento, forma)
}
function pecaContemPonto(p: PecaDoCaminho, q: P2): boolean {
  if (p.tipo === 'junta') return Math.hypot(q.x - p.centro.x, q.z - p.centro.z) <= p.raio
  if (p.tipo === 'borda') return false
  const dx = q.x - p.a.x,
    dz = q.z - p.a.z,
    ao = dx * p.u.x + dz * p.u.z,
    lado = -dx * p.u.z + dz * p.u.x
  return ao >= -1e-9 && ao <= p.comprimento + 1e-9 && Math.abs(lado) <= p.meia + 1e-9
}

// ----- Formas do objeto -----

function cantosDoVolume(v: VolumeDeComposicao): P3[] {
  const r: P3[] = []
  for (const x of [v.min.x, v.max.x])
    for (const y of [v.min.y, v.max.y]) for (const z of [v.min.z, v.max.z]) r.push({ x, y, z })
  return r
}
function anel(centro: P2, raio: number, y: number): P3[] {
  return Array.from({ length: 8 }, (_, i) => ({
    x: centro.x + raio * Math.cos((i * Math.PI) / 4),
    y,
    z: centro.z + raio * Math.sin((i * Math.PI) / 4),
  }))
}
interface CorpoSolido {
  forma: P2[]
  caixa: Caixa
  centro: P2
  yMin: number
  yMax: number
}
function corpoDe(pontos: readonly P3[]): CorpoSolido {
  let yMin = Infinity,
    yMax = -Infinity,
    cx = 0,
    cz = 0
  for (const p of pontos) {
    yMin = Math.min(yMin, p.y)
    yMax = Math.max(yMax, p.y)
    cx += p.x
    cz += p.z
  }
  const forma = envoltoria(pontos)
  return {
    forma,
    caixa: caixaDe(forma),
    centro: { x: cx / pontos.length, z: cz / pontos.length },
    yMin,
    yMax,
  }
}

/**
 * O que segura o corpo de quem anda, como o jogo monta: o tronco nativo (cilindro no pivô),
 * a fundação (caixa local) e a colisão do objeto (`caixa`/`malha` pela caixa do modelo,
 * `capsula` como o motor: raio = menor entre meia altura e meio lado maior, no centro).
 * `arquipelago.fisica` `nenhuma` ou `tronco` tira a colisão do objeto, como no jogo.
 */
function corposSolidos(
  o: InstanciaDeCenario,
  volume: VolumeDeComposicao,
  t: Transformacao,
  cantos: readonly P3[],
  campos: CamposDoArquipelago,
): CorpoSolido[] {
  const corpos: CorpoSolido[] = [],
    fisica = campos.fisica?.tipo
  if (fisica === 'tronco') {
    const raio = (campos.fisica?.raioDoTronco ?? TRONCO_DO_JOGO.raio) * t.escala.x,
      base = t.posicao.y
    corpos.push(
      corpoDe([
        ...anel(t.posicao, raio, base),
        ...anel(t.posicao, raio, base + TRONCO_DO_JOGO.altura * t.escala.y),
      ]),
    )
  } else if (o.colisao !== 'nenhuma' && fisica !== 'nenhuma') {
    if (o.colisao === 'capsula') {
      const lx = volume.max.x - volume.min.x,
        ly = volume.max.y - volume.min.y,
        lz = volume.max.z - volume.min.z,
        raio = Math.min(ly / 2, Math.max(lx, lz) / 2),
        centro = { x: (volume.min.x + volume.max.x) / 2, z: (volume.min.z + volume.max.z) / 2 }
      if (raio > 0)
        corpos.push(
          corpoDe(
            [...anel(centro, raio, volume.min.y), ...anel(centro, raio, volume.max.y)].map((p) =>
              transformarPonto(p, t),
            ),
          ),
        )
    } else corpos.push(corpoDe(cantos))
  }
  if (campos.fundacao)
    corpos.push(corpoDe(cantosDoVolume(campos.fundacao).map((p) => transformarPonto(p, t))))
  return corpos
}

/** O quanto o eixo local, já girado, aponta para cima (componente y). */
const subidaDoEixo = (eixo: P3, rotacao: Transformacao['rotacao']) =>
  transformarPonto(eixo, { posicao: SEM_GIRO, rotacao, escala: UM }).y

// ----- A conferência -----

/**
 * Avisos de implantação de cada objeto visível. `chao` é obrigatório com relevo (crie com
 * `leitorDoChao` ou use a fonte da oficina); na base plana, sem ele, o chão é zero.
 */
export function conferirImplantacao(
  entrada: DocumentoDeCenario,
  chao?: FonteDeAlturas | null,
  opcoes: OpcoesDaImplantacao = {},
): AvisoDeImplantacao[] {
  const L: Record<keyof typeof LIMITES_DA_IMPLANTACAO, number> = { ...LIMITES_DA_IMPLANTACAO }
  for (const chave of Object.keys(L) as (keyof typeof L)[]) {
    const v = opcoes[chave]
    if (typeof v === 'number' && Number.isFinite(v)) L[chave] = v
  }
  if (entrada.base.tipo === 'terreno' && !chao)
    throw new PecaDeTerrenoAusente('Carregue o relevo antes de conferir a implantação.')
  const fonte = chao ?? undefined
  let doc = entrada,
    origens: ReadonlyMap<string, string> = new Map()
  if (entrada.montagens?.length || entrada.definicoesConjuntos?.length)
    try {
      const r = resolverConjuntos(entrada, fonte)
      doc = r.documento
      origens = r.origens
    } catch {
      // Conjunto que não resolve fica de fora; a validação do documento já o aponta.
    }
  let flags: ReturnType<typeof indiceDaOrganizacao>['flags'] | null = null
  try {
    flags = indiceDaOrganizacao(doc).flags
  } catch {
    flags = null
  }
  const oculto = (id: string, proprio: boolean) => flags?.get(id)?.oculto ?? proprio
  const altura = (x: number, z: number) => alturaDoChao(doc.base, x, z, fonte)
  const temChao: (p: P2) => boolean =
    fonte?.temChao ?? (doc.base.tipo === 'perfil' ? () => true : dominioDoChao(doc.base))

  const volumes = new Map<string, VolumeDeComposicao>()
  for (const m of doc.modelos) if (m.volume) volumes.set(m.id, m.volume)
  for (const f of doc.formas ?? []) volumes.set(f.id, volumeDaForma(f))

  const { andaveis, pecas, grade } = prepararCaminhos(doc.caminhos, oculto, altura)
  const aguas: { nome: string; consulta: ConsultaDeAgua }[] = []
  for (const a of doc.aguas) {
    if (oculto(a.id, a.oculto)) continue
    try {
      aguas.push({ nome: a.nome, consulta: prepararConsultaDaAgua(a) })
    } catch {
      // Água sem geometria válida não tem nível a comparar.
    }
  }
  /** Piso do caminho num ponto: a ponte pela reta das cabeceiras; os outros, o chão. */
  const pisoDo = (caminho: CaminhoAndavel, p: P2): number | null => {
    const ponte = caminho.ponte
    if (ponte) {
      const dx = ponte.b.x - ponte.a.x,
        dz = ponte.b.z - ponte.a.z,
        t = Math.max(
          0,
          Math.min(1, ((p.x - ponte.a.x) * dx + (p.z - ponte.a.z) * dz) / (dx * dx + dz * dz)),
        )
      return ponte.a.y + (ponte.b.y - ponte.a.y) * t
    }
    return temChao(p) ? altura(p.x, p.z) : null
  }

  const avisos: AvisoDeImplantacao[] = []
  const avisar = (
    o: InstanciaDeCenario,
    tipo: TipoDeAvisoDeImplantacao,
    mensagem: string,
    extra: Pick<AvisoDeImplantacao, 'detalhe' | 'campo'> = {},
  ) => {
    const conjunto = origens.get(o.id)
    avisos.push({ id: o.id, tipo, mensagem, ...extra, ...(conjunto ? { conjunto } : {}) })
  }

  const instancias = doc.instancias.filter((o) => !oculto(o.id, o.oculto))
  const iris = instancias.filter((o) => o.propriedades?.[`${PREFIXO_ARQUIPELAGO}ator`] === 'iris')
  if (iris.length > 1)
    for (const o of iris)
      avisar(o, 'ator-repetido', 'Só pode haver uma Íris no cenário.', {
        detalhe: `Há ${iris.length} Íris; o jogo não abre assim.`,
      })

  for (const o of instancias) {
    const props = o.propriedades
    let campos: CamposDoArquipelago = {}
    if (props && Object.keys(props).some((c) => c.startsWith(PREFIXO_ARQUIPELAGO))) {
      for (const a of validarCamposDoArquipelago(props))
        avisar(o, a.tipo, a.mensagem, {
          campo: a.chave,
          detalhe:
            a.regra === 'fisica-nativa'
              ? `Campo "${ROTULO_DO_CAMPO.get(a.chave) ?? a.chave}". O jogo recusa ao montar a física.`
              : `Campo "${ROTULO_DO_CAMPO.get(a.chave) ?? a.chave}".`,
        })
      campos = lerCamposDoArquipelago(props)
    }

    let t: Transformacao
    try {
      t = transformacaoResolvida(doc, o, fonte)
    } catch {
      continue // Apoio quebrado: a validação do documento já o aponta.
    }

    // Papéis nativos do jogo exigem a matriz em pé (fisica-nativa-do-cenario.ts).
    if (campos.ator || campos.fisica?.tipo === 'tronco' || campos.fundacao) {
      const cima = transformarPonto(
        { x: 0, y: 1, z: 0 },
        { posicao: SEM_GIRO, rotacao: t.rotacao, escala: UM },
      )
      const s = t.escala
      if (cima.x ** 2 + (cima.y - 1) ** 2 + cima.z ** 2 > 1e-10)
        avisar(o, 'transformacao-do-papel', 'Este objeto precisa ficar em pé, sem inclinar.', {
          detalhe:
            'O jogo só aceita giro em volta do eixo vertical para a Íris, o tronco e a fundação.',
        })
      if (campos.ator && (Math.abs(s.x - s.y) > 1e-6 || Math.abs(s.x - s.z) > 1e-6))
        avisar(
          o,
          'transformacao-do-papel',
          'A Íris precisa ter o mesmo tamanho em todas as direções.',
        )
      if (campos.fisica?.tipo === 'tronco' && Math.abs(s.x - s.z) > 1e-6)
        avisar(o, 'transformacao-do-papel', 'O tronco precisa da mesma escala em x e em z.')
    }

    const volume = volumes.get(o.modelo)
    if (!volume) continue
    const cantos = cantosDoVolume(volume).map((p) => transformarPonto(p, t))
    let yMin = Infinity,
      yMax = -Infinity,
      maisBaixo = cantos[0]!
    for (const c of cantos) {
      if (c.y < yMin) {
        yMin = c.y
        maisBaixo = c
      }
      yMax = Math.max(yMax, c.y)
    }
    const altoDoObjeto = yMax - yMin

    // A base é a face local cuja normal mais aponta para baixo (a de baixo, se está em pé).
    const subidas = {
      x: subidaDoEixo({ x: 1, y: 0, z: 0 }, t.rotacao),
      y: subidaDoEixo({ x: 0, y: 1, z: 0 }, t.rotacao),
      z: subidaDoEixo({ x: 0, y: 0, z: 1 }, t.rotacao),
    }
    let eixo: 'x' | 'y' | 'z' = 'y'
    for (const e of ['x', 'z'] as const)
      if (Math.abs(subidas[e]) > Math.abs(subidas[eixo]) + 1e-12) eixo = e
    const [ea, eb] = (['x', 'y', 'z'] as const).filter((e) => e !== eixo) as [
      'x' | 'y' | 'z',
      'x' | 'y' | 'z',
    ]
    const fixo = subidas[eixo] > 0 ? volume.min[eixo] : volume.max[eixo],
      emPe = Math.abs(subidas[eixo]) >= BASE_DEITADA
    const local = (a: number, b: number) => ({ [eixo]: fixo, [ea]: a, [eb]: b }) as P3
    const base = [
      local(volume.min[ea], volume.min[eb]),
      local(volume.max[ea], volume.min[eb]),
      local(volume.min[ea], volume.max[eb]),
      local(volume.max[ea], volume.max[eb]),
    ].map((p) => transformarPonto(p, t))
    const centro = transformarPonto(
      local((volume.min[ea] + volume.max[ea]) / 2, (volume.min[eb] + volume.max[eb]) / 2),
      t,
    )
    const noChao = temChao(centro),
      chaoNoCentro = noChao ? altura(centro.x, centro.z) : Number.NaN
    const fina = altoDoObjeto < L.alturaFina

    // Flutuando: só quem pisa no relevo (apoio em objeto, água ou absoluto fica onde foi posto).
    if (o.apoio.tipo === 'terreno') {
      let folga = -Infinity
      for (const c of emPe ? base : [maisBaixo])
        if (temChao(c)) folga = Math.max(folga, c.y - altura(c.x, c.z))
      if (folga > L.flutuando)
        avisar(o, 'flutuando', 'Este objeto está flutuando acima do chão.', {
          detalhe: `${emPe ? 'Um canto da base' : 'O ponto mais baixo'} fica ${metros(folga)} acima do chão.`,
        })
    }

    // Enterrado: a parte da altura abaixo do chão no centro da base.
    if (noChao && altoDoObjeto > 1e-9) {
      if (fina) {
        if (yMax < chaoNoCentro - L.mesmoPlano)
          avisar(o, 'enterrado', 'Esta peça fina ficou escondida embaixo do chão.', {
            detalhe: `O topo fica ${metros(chaoNoCentro - yMax)} abaixo do chão.`,
          })
      } else {
        const fracao = Math.max(0, Math.min(1, (chaoNoCentro - yMin) / altoDoObjeto)),
          declarada = campos.enterrada,
          limite =
            declarada === undefined
              ? L.enterrado
              : Math.max(L.enterrado, declarada + L.folgaDaEnterrada)
        if (fracao > limite)
          avisar(o, 'enterrado', 'Este objeto está muito enterrado no chão.', {
            detalhe:
              declarada === undefined
                ? `${porcento(fracao)} da altura fica abaixo do chão.`
                : `${porcento(fracao)} da altura fica abaixo do chão; a parte enterrada marcada é ${porcento(declarada)}.`,
          })
      }
    }

    // Peça fina colada: topo a poucos centímetros do chão, do piso de um caminho ou da água.
    if (fina) {
      const perto: string[] = []
      let menor = Infinity
      const conferir = (superficie: number | null, nome: string) => {
        if (superficie === null || !Number.isFinite(superficie)) return
        const d = Math.abs(yMax - superficie)
        if (d > L.mesmoPlano) return
        menor = Math.min(menor, d)
        if (!perto.includes(nome)) perto.push(nome)
      }
      if (noChao) conferir(chaoNoCentro, 'do chão')
      const ponto = { x: centro.x, z: centro.z },
        caixaDoPonto = { x0: ponto.x, z0: ponto.z, x1: ponto.x, z1: ponto.z }
      grade.visitar(caixaDoPonto, (i) => {
        const p = pecas[i]!
        if (pecaContemPonto(p, ponto)) {
          const caminho = andaveis[p.caminho]!
          conferir(pisoDo(caminho, ponto), `do caminho "${caminho.c.nome}"`)
        }
        return false
      })
      for (const caminho of andaveis)
        if (
          caminho.poligono &&
          caixasSeTocam(caminho.caixa, caixaDoPonto) &&
          pontoNoPoligono(ponto, caminho.poligono)
        )
          conferir(pisoDo(caminho, ponto), `do caminho "${caminho.c.nome}"`)
      for (const a of aguas) {
        const l = a.consulta.limites
        if (l && (ponto.x < l.x0 || ponto.x > l.x1 || ponto.z < l.z0 || ponto.z > l.z1)) continue
        conferir(a.consulta.em(ponto.x, ponto.z, fonte)?.nivel ?? null, `da água "${a.nome}"`)
      }
      if (perto.length)
        avisar(
          o,
          'quase-no-mesmo-plano',
          'Esta peça fina está colada em outra superfície e pode piscar.',
          { detalhe: `O topo fica a ${metros(menor)} ${juntar(perto)}.` },
        )
    }

    // Sólido no caminho: o corpo invade a faixa e o espaço de passagem acima do piso.
    const sobreEstrutura =
      o.apoio.tipo === 'objeto' && o.apoio.parte && !/^(tabuleiro|modelo)\//.test(o.apoio.parte)
    if (!andaveis.length || sobreEstrutura || FISICAS_PISAVEIS.has(campos.fisica?.tipo ?? ''))
      continue
    for (const corpo of corposSolidos(o, volume, t, cantos, campos)) {
      if (corpo.forma.length === 0) continue
      const invade = (caminho: CaminhoAndavel) => {
        const piso = pisoDo(caminho, corpo.centro)
        return piso !== null && corpo.yMax > piso + L.obstaculo && corpo.yMin < piso + L.passagem
      }
      let bloqueado: CaminhoAndavel | undefined
      grade.visitar(corpo.caixa, (i) => {
        const p = pecas[i]!,
          caminho = andaveis[p.caminho]!
        if (!caixasSeTocam(p.caixa, corpo.caixa) || !pecaTocaForma(p, corpo.forma)) return false
        if (!invade(caminho)) return false
        bloqueado = caminho
        return true
      })
      if (!bloqueado)
        for (const caminho of andaveis)
          if (
            caminho.poligono &&
            caixasSeTocam(caminho.caixa, corpo.caixa) &&
            pontoNoPoligono(corpo.centro, caminho.poligono) &&
            invade(caminho)
          ) {
            bloqueado = caminho
            break
          }
      if (bloqueado) {
        const achado: CaminhoAndavel = bloqueado
        avisar(o, 'solido-no-caminho', 'Este objeto sólido está no meio do caminho.', {
          detalhe: `Quem anda pelo caminho "${achado.c.nome}" esbarra nele.`,
        })
        break
      }
    }
  }

  const ordem = new Map(TIPOS_DE_AVISO_DE_IMPLANTACAO.map((t, i) => [t, i]))
  return avisos.sort((a, b) => ordem.get(a.tipo)! - ordem.get(b.tipo)!)
}
