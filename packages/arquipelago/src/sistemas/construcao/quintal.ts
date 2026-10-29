import type { Canteiro, Obra, PisoDoQuintal } from '@sistemazero/arquipelago-contracts'
import { planta } from './comodos'
import {
  type Aresta,
  arestasDoArrasto,
  chaveDaAresta,
  chavesDosTrechos,
  type Ponto,
  trechosDasChaves,
} from './grade'
import { type Celula, chaveDaCelula, type Lote, naArea, noFixo, ocupante } from './lote'
import { arestaLivre, type Recusa, type Resultado } from './obra'
import { objetoEm } from './projeto-azul'

/**
 * O quintal (modo construção, fase1-11): cercas nas arestas da grade, caminho de pedra ou de grama
 * por célula e canteiros que plantam e regam como a horta. Fica fora de casa: cerca, caminho e
 * canteiro não entram em cômodo.
 */

const recusa = (r: Recusa): Resultado => ({ ok: false, ...r })

/** As células do arrasto, de uma até a outra, pelo eixo em que o dedo andou mais. */
export function celulasDoArrasto(a: Celula, b: Celula): Celula[] {
  const dx = b.x - a.x
  const dz = b.z - a.z
  if (Math.abs(dx) >= Math.abs(dz)) {
    const x0 = Math.min(a.x, b.x)
    return Array.from({ length: Math.abs(dx) + 1 }, (_, i) => ({ x: x0 + i, z: a.z }))
  }
  const z0 = Math.min(a.z, b.z)
  return Array.from({ length: Math.abs(dz) + 1 }, (_, i) => ({ x: a.x, z: z0 + i }))
}

/** O id do canteiro do quintal na horta do salvamento (`q` e a célula). */
export function idDoCanteiro(c: Celula): string {
  return `q${c.x}_${c.z}`
}

/** A célula de um canteiro do quintal pelo id (`null` para os canteiros da horta de antes). */
export function celulaDoCanteiro(id: string): Celula | null {
  const m = /^q(-?\d+)_(-?\d+)$/.exec(id)
  return m ? { x: Number(m[1]), z: Number(m[2]) } : null
}

/** A célula livre para o quintal? (no lote, sem nada, fora do quarto e fora de casa) */
function celulaLivre(lote: Lote, c: Celula, dentro: Set<string>): Recusa | null {
  if (!naArea(lote.area, c)) return { motivo: 'fora-do-lote' }
  const nome = ocupante(lote, c)
  if (nome) return { motivo: 'ocupado', nome }
  if (noFixo(lote, c) || dentro.has(chaveDaCelula(c))) return { motivo: 'dentro-de-casa' }
  return null
}

/** Esticar a cerca de `a` até `b` (nas arestas, como a parede). */
export function esticarCerca(obra: Obra, lote: Lote, a: Ponto, b: Ponto): Resultado {
  const arestas = arestasDoArrasto(a, b)
  if (arestas.length === 0) return recusa({ motivo: 'nada' })
  const p = planta(obra, lote)
  const canteiros = new Set(obra.canteiros.map(chaveDaCelula))
  const cercas = chavesDosTrechos(obra.cercas)
  const antes = cercas.size
  for (const aresta of arestas) {
    const k = chaveDaAresta(aresta)
    if (cercas.has(k)) continue
    const r = arestaLivre(lote, aresta)
    if (r) return recusa(r)
    if (p.paredes.has(k)) return recusa({ motivo: 'tem-parede' })
    const lados = ladosDe(aresta)
    if (lados.every((c) => p.dentro.has(chaveDaCelula(c))))
      return recusa({ motivo: 'dentro-de-casa' })
    if (lados.some((c) => canteiros.has(chaveDaCelula(c))))
      return recusa({ motivo: 'ocupado', nome: 'o canteiro' })
    // A cerca não atravessa um objeto (a casinha).
    const o1 = objetoEm(obra, lados[0])
    if (o1 >= 0 && o1 === objetoEm(obra, lados[1])) return recusa({ motivo: 'tem-objeto' })
    cercas.add(k)
  }
  if (cercas.size === antes) return recusa({ motivo: 'nada' })
  if (cercas.size > lote.limites.arestasDeCerca) return recusa({ motivo: 'limite' })
  const trechos = trechosDasChaves(cercas)
  if (trechos.length > lote.limites.trechosDeCerca) return recusa({ motivo: 'limite' })
  return { ok: true, obra: { ...obra, cercas: trechos } }
}

function ladosDe(a: Aresta): [Celula, Celula] {
  return a.eixo === 'x'
    ? [
        { x: a.x, z: a.z - 1 },
        { x: a.x, z: a.z },
      ]
    : [
        { x: a.x - 1, z: a.z },
        { x: a.x, z: a.z },
      ]
}

/** Pintar o caminho (pedra ou grama) pelas células do arrasto; o que já é caminho troca de tipo. */
export function pintarCaminho(
  obra: Obra,
  lote: Lote,
  celulas: readonly Celula[],
  tipo: PisoDoQuintal,
): Resultado {
  const p = planta(obra, lote)
  const canteiros = new Set(obra.canteiros.map(chaveDaCelula))
  const porCelula = new Map(obra.caminhos.map((c) => [chaveDaCelula(c), c]))
  let mudou = false
  for (const c of celulas) {
    const r = celulaLivre(lote, c, p.dentro)
    if (r) return recusa(r)
    if (canteiros.has(chaveDaCelula(c))) return recusa({ motivo: 'ocupado', nome: 'o canteiro' })
    if (objetoEm(obra, c) >= 0) return recusa({ motivo: 'tem-objeto' })
    const atual = porCelula.get(chaveDaCelula(c))
    if (atual?.tipo === tipo) continue
    porCelula.set(chaveDaCelula(c), { x: c.x, z: c.z, tipo })
    mudou = true
  }
  if (!mudou) return recusa({ motivo: 'nada' })
  if (porCelula.size > lote.limites.caminhos) return recusa({ motivo: 'limite' })
  return { ok: true, obra: { ...obra, caminhos: [...porCelula.values()] } }
}

/** Pôr um canteiro numa célula do quintal (vazia: sem caminho, sem cerca em volta). */
export function porCanteiro(obra: Obra, lote: Lote, c: Celula): Resultado {
  const p = planta(obra, lote)
  const r = celulaLivre(lote, c, p.dentro)
  if (r) return recusa(r)
  const k = chaveDaCelula(c)
  if (obra.canteiros.some((x) => chaveDaCelula(x) === k)) return recusa({ motivo: 'nada' })
  if (obra.caminhos.some((x) => chaveDaCelula(x) === k)) return recusa({ motivo: 'tem-caminho' })
  if (objetoEm(obra, c) >= 0) return recusa({ motivo: 'tem-objeto' })
  const cercas = chavesDosTrechos(obra.cercas)
  const bordas: Aresta[] = [
    { eixo: 'x', x: c.x, z: c.z },
    { eixo: 'x', x: c.x, z: c.z + 1 },
    { eixo: 'z', x: c.x, z: c.z },
    { eixo: 'z', x: c.x + 1, z: c.z },
  ]
  if (bordas.some((b) => cercas.has(chaveDaAresta(b)) || p.paredes.has(chaveDaAresta(b))))
    return recusa({ motivo: 'tem-parede' })
  if (obra.canteiros.length >= lote.limites.canteiros) return recusa({ motivo: 'limite' })
  return { ok: true, obra: { ...obra, canteiros: [...obra.canteiros, { x: c.x, z: c.z }] } }
}

/** Tirar a cerca das arestas. */
export function apagarCerca(obra: Obra, arestas: readonly Aresta[]): Resultado {
  const cercas = chavesDosTrechos(obra.cercas)
  let tirou = false
  for (const a of arestas) tirou = cercas.delete(chaveDaAresta(a)) || tirou
  if (!tirou) return recusa({ motivo: 'nada' })
  return { ok: true, obra: { ...obra, cercas: trechosDasChaves(cercas) } }
}

/**
 * Tirar o que está na célula: o canteiro (só vazio: a planta não some sem colher) ou o caminho.
 */
export function apagarNaCelula(obra: Obra, c: Celula, horta: readonly Canteiro[]): Resultado {
  const k = chaveDaCelula(c)
  if (obra.canteiros.some((x) => chaveDaCelula(x) === k)) {
    const plantado = horta.find((h) => h.id === idDoCanteiro(c))?.semente
    if (plantado) return recusa({ motivo: 'canteiro-com-planta' })
    return {
      ok: true,
      obra: { ...obra, canteiros: obra.canteiros.filter((x) => chaveDaCelula(x) !== k) },
    }
  }
  if (obra.caminhos.some((x) => chaveDaCelula(x) === k))
    return {
      ok: true,
      obra: { ...obra, caminhos: obra.caminhos.filter((x) => chaveDaCelula(x) !== k) },
    }
  return recusa({ motivo: 'nada' })
}

/**
 * A horta do salvamento segue os canteiros da obra: cada canteiro novo do quintal entra vazio; o
 * que saiu da obra sai da horta. Os seis da horta de antes ficam sempre.
 */
export function hortaComOQuintal(horta: readonly Canteiro[], obra: Obra | null): Canteiro[] {
  const doQuintal = new Set((obra?.canteiros ?? []).map(idDoCanteiro))
  const fica = horta.filter((h) => !celulaDoCanteiro(h.id) || doQuintal.has(h.id))
  const tem = new Set(fica.map((h) => h.id))
  const novos = (obra?.canteiros ?? [])
    .map(idDoCanteiro)
    .filter((id) => !tem.has(id))
    .map((id) => ({ id, semente: null, plantadoEm: null, regadoEm: null }))
  return novos.length === 0 && fica.length === horta.length ? [...horta] : [...fica, ...novos]
}

// ------------------------------------------------------------------ a cerca no mundo

/**
 * A cerca de madeira (o kit de `arte/casa` ainda não tem cerca: formas do código, anotado no README
 * de lá): um poste em cada ponto da grade com cerca e duas travessas em cada aresta.
 */
export const CERCA = {
  altura: 0.9,
  poste: 0.12,
  travessas: [0.35, 0.72],
  espessura: 0.05,
  alturaDaTravessa: 0.09,
} as const

export function postesDaCerca(obra: Obra): Ponto[] {
  const pontos = new Map<string, Ponto>()
  for (const k of chavesDosTrechos(obra.cercas)) {
    const [a, b] = pontasDe(k)
    for (const p of [a, b]) pontos.set(`${p.x},${p.z}`, p)
  }
  return [...pontos.values()].sort((a, b) => a.z - b.z || a.x - b.x)
}

function pontasDe(k: string): [Ponto, Ponto] {
  const eixo = k[0]
  const [x, z] = k.slice(1).split(',').map(Number) as [number, number]
  return [{ x, z }, eixo === 'x' ? { x: x + 1, z } : { x, z: z + 1 }]
}

/** Um colisor por trecho de cerca: segura o corpo; a câmera passa (`col-cerca-*`). */
export function colisoresDaCerca(obra: Obra): {
  nome: string
  posicao: [number, number, number]
  meio: [number, number, number]
}[] {
  return obra.cercas.map((t) => {
    const meioDoTrecho =
      t.eixo === 'x' ? { x: t.x + t.n / 2, z: t.z } : { x: t.x, z: t.z + t.n / 2 }
    const h = CERCA.altura / 2
    return {
      nome: `col-cerca-${t.eixo}${t.x},${t.z}`,
      posicao: [meioDoTrecho.x, h, meioDoTrecho.z],
      meio: t.eixo === 'x' ? [t.n / 2 + 0.06, h, 0.08] : [0.08, h, t.n / 2 + 0.06],
    }
  })
}
