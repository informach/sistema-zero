import {
  type DocumentoDeCenario,
  encaixarNaGrade,
  entidadesTransformaveis,
  type FonteDeAlturas,
  type InstanciaDeCenario,
  indiceDaOrganizacao,
  type Transformacao,
  transformacaoResolvida,
} from '@sistemazero/molda-cenarios-core/v2'
import { Euler, type Matrix4, Quaternion, Vector3 } from 'three'

const posicao = new Vector3()
const giro = new Quaternion()
const escala = new Vector3()
const euler = new Euler(0, 0, 0, 'XYZ')

/** Matriz de mundo de um objeto do cenário, com o apoio já resolvido. Escreve em `saida`. */
export function matrizDoObjeto(
  doc: Pick<DocumentoDeCenario, 'base' | 'modelos'> &
    Partial<Pick<DocumentoDeCenario, 'instancias' | 'formas' | 'montagens' | 'aguas'>>,
  o: Pick<InstanciaDeCenario, 'transformacao' | 'apoio' | 'modelo'>,
  saida: Matrix4,
  fonte?: FonteDeAlturas,
): Matrix4 {
  return matrizDaTransformacao(transformacaoResolvida(doc, o, fonte), saida)
}

/** A mesma composição TRS para objetos, montagens, marcadores e estruturas. */
export function matrizDaTransformacao(t: Transformacao, saida: Matrix4): Matrix4 {
  const p = t.posicao,
    r = t.rotacao,
    s = t.escala
  posicao.set(p.x, p.y, p.z)
  giro.setFromEuler(euler.set(r.x, r.y, r.z, 'XYZ'))
  escala.set(s.x, s.y, s.z)
  return saida.compose(posicao, giro, escala)
}

const arredondar = (n: number, casas: number) => {
  const f = 10 ** casas,
    v = Math.round(n * f) / f
  return v === 0 ? 0 : v
}
const prender = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** A transformação que o documento guarda, lida de uma matriz de mundo. */
export function transformacaoDaMatriz(m: Matrix4): Transformacao {
  m.decompose(posicao, giro, escala)
  euler.setFromQuaternion(giro, 'XYZ')
  const e = (n: number) => prender(arredondar(Math.abs(n), 4), 0.01, 100)
  return {
    posicao: {
      x: arredondar(posicao.x, 3),
      y: arredondar(posicao.y, 3),
      z: arredondar(posicao.z, 3),
    },
    rotacao: { x: arredondar(euler.x, 5), y: arredondar(euler.y, 5), z: arredondar(euler.z, 5) },
    escala: { x: e(escala.x), y: e(escala.y), z: e(escala.z) },
  }
}

export function encaixar(valor: number, passo: number | null, origem = 0): number {
  return encaixarNaGrade(valor, passo, origem)
}

/** Num gesto de tamanho com vários objetos, vale o eixo que mais mudou, igual nos três. */
export function fatorUniforme(x: number, y: number, z: number): number {
  let fator = x
  for (const v of [y, z]) if (Math.abs(v - 1) > Math.abs(fator - 1)) fator = v
  return prender(Math.abs(fator), 0.01, 100)
}

export interface LuzDaHora {
  /** Direção DE ONDE a luz vem, unitária. */
  sol: { x: number; y: number; z: number }
  forcaDoSol: number
  forcaDoCeu: number
  corDoSol: number
  corDoCeu: number
  corDoHorizonte: number
}

function misturar(a: number, b: number, t: number): number {
  const k = prender(t, 0, 1)
  const canal = (desloca: number) => {
    const x = (a >> desloca) & 0xff,
      y = (b >> desloca) & 0xff
    return Math.round(x + (y - x) * k) << desloca
  }
  return canal(16) | canal(8) | canal(0)
}

const CEU_DE_DIA = 0x8fcdf7
const CEU_DE_TARDE = 0xf6b98a
const CEU_DE_NOITE = 0x16203f
const HORIZONTE_DE_DIA = 0xdff1fb
const HORIZONTE_DE_TARDE = 0xfbe3c4
const HORIZONTE_DE_NOITE = 0x263457

/** O sol, o céu e a força da luz para uma hora do dia (0 a 24). */
export function luzDaHora(hora: number): LuzDaHora {
  const h = ((hora % 24) + 24) % 24
  // Altura do sol: nasce às 6, pico ao meio-dia, se põe às 18.
  const altura = Math.sin(((h - 6) / 12) * Math.PI)
  const dia = prender(altura * 3 + 0.5, 0, 1)
  const dourado = prender(1 - Math.abs(altura) * 3.2, 0, 1) * (altura > -0.25 ? 1 : 0)
  const azimute = ((h - 6) / 12) * Math.PI
  const elevacao = prender(Math.abs(altura), 0.18, 1) * (Math.PI / 2.4)
  const sol = {
    x: Math.cos(azimute) * Math.cos(elevacao),
    y: Math.sin(elevacao),
    z: 0.45 * Math.cos(elevacao),
  }
  const norma = Math.hypot(sol.x, sol.y, sol.z)
  return {
    sol: { x: sol.x / norma, y: sol.y / norma, z: sol.z / norma },
    // De dia somam o mesmo que a oficina do Molda (2,1 + 1,7): a cor do modelo sai como foi feita.
    forcaDoSol: 0.3 + 1.4 * dia,
    forcaDoCeu: 0.75 + 1.3 * dia,
    corDoSol: misturar(misturar(0x9fb4ff, 0xffffff, dia), 0xffc98f, dourado * 0.8),
    corDoCeu: misturar(misturar(CEU_DE_NOITE, CEU_DE_DIA, dia), CEU_DE_TARDE, dourado * 0.7),
    corDoHorizonte: misturar(
      misturar(HORIZONTE_DE_NOITE, HORIZONTE_DE_DIA, dia),
      HORIZONTE_DE_TARDE,
      dourado * 0.8,
    ),
  }
}

/** Quem está escondido: o próprio objeto ou algum grupo acima dele. */
export function idsEscondidos(
  doc: DocumentoDeCenario,
  indice = indiceDaOrganizacao(doc),
): Set<string> {
  return new Set(
    entidadesTransformaveis(doc)
      .filter((o) => indice.flags.get(o.id)?.oculto)
      .map((o) => o.id),
  )
}
