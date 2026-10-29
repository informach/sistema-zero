import type {
  Abertura,
  EixoDaObra,
  TipoDeAbertura,
  Trecho,
} from '@sistemazero/arquipelago-contracts'
import type { Celula } from './lote'

/**
 * As arestas da grade: a parede e a cerca ocupam arestas (o lado de uma célula), nunca células. A
 * aresta de eixo `x` no ponto (x, z) vai até (x + 1, z) e separa as células (x, z - 1) e (x, z); a
 * de eixo `z` vai até (x, z + 1) e separa (x - 1, z) e (x, z).
 */
export interface Aresta {
  eixo: EixoDaObra
  x: number
  z: number
}

export interface Ponto {
  x: number
  z: number
}

export function chaveDaAresta(a: Aresta): string {
  return `${a.eixo}${a.x},${a.z}`
}

export function arestaDaChave(chave: string): Aresta {
  const [x, z] = chave.slice(1).split(',').map(Number)
  return { eixo: chave[0] === 'x' ? 'x' : 'z', x: x ?? 0, z: z ?? 0 }
}

/** As duas células da aresta: a do lado de menos (-z ou -x) e a do lado de mais. */
export function ladosDaAresta(a: Aresta): [Celula, Celula] {
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

/** As pontas da aresta. */
export function pontasDaAresta(a: Aresta): [Ponto, Ponto] {
  return [{ x: a.x, z: a.z }, a.eixo === 'x' ? { x: a.x + 1, z: a.z } : { x: a.x, z: a.z + 1 }]
}

/** A aresta `i` células adiante no mesmo eixo. */
export function adiante(a: Aresta, i: number): Aresta {
  return a.eixo === 'x' ? { ...a, x: a.x + i } : { ...a, z: a.z + i }
}

export function arestasDoTrecho(t: Trecho): Aresta[] {
  return Array.from({ length: t.n }, (_, i) => adiante({ eixo: t.eixo, x: t.x, z: t.z }, i))
}

export function chavesDosTrechos(trechos: readonly Trecho[]): Set<string> {
  const chaves = new Set<string>()
  for (const t of trechos) for (const a of arestasDoTrecho(t)) chaves.add(chaveDaAresta(a))
  return chaves
}

/**
 * As arestas juntadas em trechos retos, na mesma ordem sempre (eixo, depois a linha, depois o
 * começo): a mesma parede sempre vira o mesmo salvamento.
 */
export function trechosDasChaves(chaves: Iterable<string>): Trecho[] {
  const arestas = [...new Set(chaves)].map(arestaDaChave)
  // Na mesma linha: eixo x anda em x com z fixo; eixo z anda em z com x fixo.
  const linha = (a: Aresta) => (a.eixo === 'x' ? a.z : a.x)
  const passo = (a: Aresta) => (a.eixo === 'x' ? a.x : a.z)
  arestas.sort((a, b) => a.eixo.localeCompare(b.eixo) || linha(a) - linha(b) || passo(a) - passo(b))
  const trechos: Trecho[] = []
  for (const a of arestas) {
    const ultimo = trechos.at(-1)
    if (
      ultimo &&
      ultimo.eixo === a.eixo &&
      linha({ eixo: ultimo.eixo, x: ultimo.x, z: ultimo.z }) === linha(a) &&
      passo({ eixo: ultimo.eixo, x: ultimo.x, z: ultimo.z }) + ultimo.n === passo(a)
    ) {
      ultimo.n++
      continue
    }
    trechos.push({ x: a.x, z: a.z, eixo: a.eixo, n: 1 })
  }
  return trechos
}

/**
 * Esticar arrastando: do ponto onde o dedo desceu até onde ele está, pelo eixo em que andou mais
 * (como no Meu quarto, a parede só anda reto). Mesmo ponto: nenhuma aresta.
 */
export function arestasDoArrasto(a: Ponto, b: Ponto): Aresta[] {
  const dx = b.x - a.x
  const dz = b.z - a.z
  if (dx === 0 && dz === 0) return []
  if (Math.abs(dx) >= Math.abs(dz)) {
    const x0 = Math.min(a.x, b.x)
    return Array.from({ length: Math.abs(dx) }, (_, i) => ({
      eixo: 'x' as const,
      x: x0 + i,
      z: a.z,
    }))
  }
  const z0 = Math.min(a.z, b.z)
  return Array.from({ length: Math.abs(dz) }, (_, i) => ({ eixo: 'z' as const, x: a.x, z: z0 + i }))
}

/** O ponto da grade mais perto de uma posição no chão. */
export function pontoMaisPerto(x: number, z: number): Ponto {
  return { x: Math.round(x), z: Math.round(z) }
}

/** A célula embaixo de uma posição no chão. */
export function celulaEm(x: number, z: number): Celula {
  return { x: Math.floor(x), z: Math.floor(z) }
}

/**
 * A aresta mais perto de uma posição no chão (para porta, janela e apagar): a linha da grade mais
 * próxima, na célula onde está.
 */
export function arestaMaisPerto(x: number, z: number): Aresta {
  const fx = x - Math.floor(x)
  const fz = z - Math.floor(z)
  const distX = Math.min(fz, 1 - fz) // até a linha de z inteiro (aresta de eixo x)
  const distZ = Math.min(fx, 1 - fx) // até a linha de x inteiro (aresta de eixo z)
  if (distX <= distZ) return { eixo: 'x', x: Math.floor(x), z: Math.round(z) }
  return { eixo: 'z', x: Math.round(x), z: Math.floor(z) }
}

// ------------------------------------------------------------------ portas e janelas

/** Quantas células cada abertura ocupa na parede (as peças do kit, README de `arte/casa`). */
export const LARGURA_DA_ABERTURA: Readonly<Record<TipoDeAbertura, number>> = {
  porta: 3,
  'janela-grande': 3,
  'janela-arco': 2,
  'janela-redonda': 1,
}

export function arestasDaAbertura(a: Abertura): Aresta[] {
  return Array.from({ length: LARGURA_DA_ABERTURA[a.tipo] }, (_, i) =>
    adiante({ eixo: a.eixo, x: a.x, z: a.z }, i),
  )
}

/** A abertura de um tipo com o meio na aresta tocada (a de 2 células começa nela). */
export function aberturaNaAresta(tipo: TipoDeAbertura, a: Aresta): Abertura {
  const recuo = Math.floor((LARGURA_DA_ABERTURA[tipo] - 1) / 2)
  const inicio = adiante(a, -recuo)
  return { tipo, eixo: a.eixo, x: inicio.x, z: inicio.z }
}
