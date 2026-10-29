import type { Obra, PisoDaCasa } from '@sistemazero/arquipelago-contracts'
import { arestaDaChave, chaveDaAresta, chavesDosTrechos, ladosDaAresta } from './grade'
import { type Celula, chaveDaCelula, type Lote, noFixo } from './lote'

/**
 * A planta de uma obra: as paredes de pé (as da obra e as fixas do lote), as células de dentro de
 * casa e os cômodos. De dentro é o que a parede fecha: o que não se alcança andando pela grade a
 * partir da borda do lote sem atravessar parede. Porta e janela não abrem a parede para isso.
 */
export interface Comodo {
  /** A primeira célula (a menor em z e depois em x): o nome do cômodo. */
  id: string
  celulas: Celula[]
  /** O cômodo do quarto da plataforma (piso e paredes de dentro dela). */
  quarto: boolean
  piso: PisoDaCasa
}

export interface LadoDaParede {
  familia: 'lambri' | 'lisa'
  /** O lado de dentro: -1 é o lado de menos da aresta (-z ou -x), 1 o de mais. */
  dentro: -1 | 1
}

export interface Planta {
  /** Todas as paredes de pé (chaves de aresta), as fixas inclusive. */
  paredes: Set<string>
  /** As fixas (as do quarto que a plataforma desenha). */
  fixas: Set<string>
  /** As travadas (do quarto, desenhadas pelo kit): abrem, mas não se apagam. */
  travadas: Set<string>
  dentro: Set<string>
  comodos: Comodo[]
  /** Índice do cômodo de cada célula de dentro. */
  comodoDe: Map<string, number>
}

export const PISO_PADRAO: PisoDaCasa = 'tabua'

export function planta(obra: Obra, lote: Lote): Planta {
  const fixas = chavesDosTrechos(lote.paredesFixas)
  const travadas = chavesDosTrechos(lote.paredesTravadas)
  const paredes = chavesDosTrechos(obra.paredes)
  for (const k of fixas) paredes.add(k)
  const { x0, z0, x1, z1 } = lote.area
  // Uma volta de células em torno do lote é o "lá fora" de onde a busca sai.
  const fora = new Set<string>()
  const fila: Celula[] = []
  const entrar = (c: Celula) => {
    if (c.x < x0 - 1 || c.x > x1 || c.z < z0 - 1 || c.z > z1) return
    const k = chaveDaCelula(c)
    if (fora.has(k)) return
    fora.add(k)
    fila.push(c)
  }
  for (let x = x0 - 1; x <= x1; x++) {
    entrar({ x, z: z0 - 1 })
    entrar({ x, z: z1 })
  }
  for (let z = z0 - 1; z <= z1; z++) {
    entrar({ x: x0 - 1, z })
    entrar({ x: x1, z })
  }
  for (let i = 0; i < fila.length; i++) {
    const c = fila[i] as Celula
    // Para cada vizinho, a aresta entre os dois precisa estar livre.
    if (!paredes.has(chaveDaAresta({ eixo: 'z', x: c.x + 1, z: c.z })))
      entrar({ x: c.x + 1, z: c.z })
    if (!paredes.has(chaveDaAresta({ eixo: 'z', x: c.x, z: c.z }))) entrar({ x: c.x - 1, z: c.z })
    if (!paredes.has(chaveDaAresta({ eixo: 'x', x: c.x, z: c.z + 1 })))
      entrar({ x: c.x, z: c.z + 1 })
    if (!paredes.has(chaveDaAresta({ eixo: 'x', x: c.x, z: c.z }))) entrar({ x: c.x, z: c.z - 1 })
  }
  const dentro = new Set<string>()
  for (let z = z0; z < z1; z++)
    for (let x = x0; x < x1; x++) {
      const k = chaveDaCelula({ x, z })
      if (!fora.has(k)) dentro.add(k)
    }
  // Os cômodos: as células de dentro ligadas sem parede entre elas.
  const comodos: Comodo[] = []
  const comodoDe = new Map<string, number>()
  for (let z = z0; z < z1; z++)
    for (let x = x0; x < x1; x++) {
      const k0 = chaveDaCelula({ x, z })
      if (!dentro.has(k0) || comodoDe.has(k0)) continue
      const indice = comodos.length
      const celulas: Celula[] = []
      const pilha: Celula[] = [{ x, z }]
      comodoDe.set(k0, indice)
      while (pilha.length > 0) {
        const c = pilha.pop() as Celula
        celulas.push(c)
        const vizinhos: [Celula, string][] = [
          [{ x: c.x + 1, z: c.z }, chaveDaAresta({ eixo: 'z', x: c.x + 1, z: c.z })],
          [{ x: c.x - 1, z: c.z }, chaveDaAresta({ eixo: 'z', x: c.x, z: c.z })],
          [{ x: c.x, z: c.z + 1 }, chaveDaAresta({ eixo: 'x', x: c.x, z: c.z + 1 })],
          [{ x: c.x, z: c.z - 1 }, chaveDaAresta({ eixo: 'x', x: c.x, z: c.z })],
        ]
        for (const [v, aresta] of vizinhos) {
          const kv = chaveDaCelula(v)
          if (paredes.has(aresta) || !dentro.has(kv) || comodoDe.has(kv)) continue
          comodoDe.set(kv, indice)
          pilha.push(v)
        }
      }
      celulas.sort((a, b) => a.z - b.z || a.x - b.x)
      const primeira = celulas[0] as Celula
      comodos.push({
        id: chaveDaCelula(primeira),
        celulas,
        quarto: celulas.some((c) => noFixo(lote, c)),
        piso: PISO_PADRAO,
      })
    }
  // O piso de cada cômodo: o da primeira célula guardada que cai nele.
  const comPiso = new Set<number>()
  for (const p of obra.pisos) {
    const i = comodoDe.get(chaveDaCelula(p))
    const comodo = i === undefined ? undefined : comodos[i]
    if (i === undefined || !comodo || comPiso.has(i)) continue
    comodo.piso = p.tipo
    comPiso.add(i)
  }
  return { paredes, fixas, travadas, dentro, comodos, comodoDe }
}

/**
 * Lambri ou lisa, e o lado de dentro: cômodo dos dois lados é lisa; de um lado só, lambri com a
 * fachada para fora; parede solta (sem cômodo) é lambri com a fachada para o lado de mais.
 */
export function ladoDaParede(p: Planta, chave: string): LadoDaParede {
  const [menos, mais] = ladosDaAresta(arestaDaChave(chave))
  const dMenos = p.dentro.has(chaveDaCelula(menos))
  const dMais = p.dentro.has(chaveDaCelula(mais))
  if (dMenos && dMais) return { familia: 'lisa', dentro: 1 }
  if (dMais) return { familia: 'lambri', dentro: 1 }
  return { familia: 'lambri', dentro: -1 }
}

/** As células de dentro que caem em algo ocupado (não pode: a horta não fica dentro de casa). */
export function ocupadasDentro(p: Planta, lote: Lote): string[] {
  const nomes = new Set<string>()
  for (const o of lote.ocupadas)
    for (let z = o.ret.z0; z < o.ret.z1; z++)
      for (let x = o.ret.x0; x < o.ret.x1; x++)
        if (p.dentro.has(chaveDaCelula({ x, z }))) nomes.add(o.nome)
  return [...nomes]
}
