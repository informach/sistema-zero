/**
 * As colisões que herdam a matriz e o volume da entidade (plano "Mundos de 2 km", 23/11/2026). No
 * relevo em campo, cada objeto tem uma colisão com EXATAMENTE a matriz e o volume da entidade dele
 * (uns 190 bytes repetidos por objeto, um quarto do JSON de um mundo de 2 km). O envelope do
 * Estúdio grava a colisão sem os dois quando são iguais aos da entidade, e a leitura do esquema da
 * cena (`CenaCompiladaSchema`) os devolve antes de qualquer leitor: na memória, toda colisão tem a
 * matriz e o volume de sempre. O `cenario.py` faz a mesma volta ao abrir.
 *
 * Só no relevo em campo (`terreno.relevo`): fora dele a cena é a de sempre, byte a byte.
 */

interface ComMatrizEVolume {
  matriz?: unknown
  volume?: unknown
}

const objeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const emCampo = (cena: Record<string, unknown>) =>
  objeto(cena.terreno) && objeto((cena.terreno as Record<string, unknown>).relevo)

/** Igualdade estrutural de JSON (números, listas e objetos), para matriz e volume. */
function igual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => igual(v, b[i]))
  if (objeto(a) && objeto(b)) {
    const ka = Object.keys(a),
      kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => igual(a[k], b[k]))
  }
  return false
}

function entidadesPorId(cena: Record<string, unknown>): Map<string, ComMatrizEVolume> {
  const mapa = new Map<string, ComMatrizEVolume>()
  if (Array.isArray(cena.entidades))
    for (const e of cena.entidades)
      if (objeto(e) && typeof e.id === 'string') mapa.set(e.id, e as ComMatrizEVolume)
  return mapa
}

/**
 * A cena para gravar: em campo, a colisão perde a matriz e o volume que são iguais aos da entidade
 * dela. Fora do campo (ou sem nada a tirar), devolve a MESMA cena.
 */
export function compactarColisoesDaCena<T>(cena: T): T {
  if (!objeto(cena) || !emCampo(cena) || !Array.isArray(cena.colisoes)) return cena
  const entidades = entidadesPorId(cena)
  let mudou = false
  const colisoes = cena.colisoes.map((c: unknown) => {
    if (!objeto(c) || typeof c.entidade !== 'string') return c
    const e = entidades.get(c.entidade)
    if (!e || e.matriz === undefined || e.volume === undefined) return c
    if (!igual(c.matriz, e.matriz) || !igual(c.volume, e.volume)) return c
    const { matriz: _m, volume: _v, ...resto } = c
    mudou = true
    return resto
  })
  return mudou ? ({ ...cena, colisoes } as T) : cena
}

/**
 * A cena lida: em campo, a colisão sem matriz e sem volume recebe os da entidade dela. Qualquer
 * outro caso passa como veio (o esquema recusa o que continuar incompleto).
 */
export function expandirColisoesDaCena(valor: unknown): unknown {
  if (!objeto(valor) || !emCampo(valor) || !Array.isArray(valor.colisoes)) return valor
  const entidades = entidadesPorId(valor)
  let mudou = false
  const colisoes = valor.colisoes.map((c: unknown) => {
    if (!objeto(c) || 'matriz' in c || 'volume' in c || typeof c.entidade !== 'string') return c
    const e = entidades.get(c.entidade)
    if (!e || e.matriz === undefined || e.volume === undefined) return c
    mudou = true
    return { ...c, matriz: e.matriz, volume: e.volume }
  })
  return mudou ? { ...valor, colisoes } : valor
}
