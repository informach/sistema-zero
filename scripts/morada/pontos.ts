import type { MoradaPiece } from '../../packages/core/src/morada/types'

type Vetor = [number, number, number]
const ehVetor = (v: unknown): v is Vetor =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
const objeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

/**
 * Os pontos de uma peça da arte: os `pontos` antigos (nome → ponto ou `{ponto|posicao, direcao}`) e
 * os `pontos_de_jogo` (desde 15/11/2026: a lista em que a arte diz onde o avatar senta, deita,
 * planta, usa, entra; `{tipo, ponto, direcao, nome}`). Os de jogo entram com o nome
 * `<tipo>_<nome>` (ou `<tipo>_<n>`), que é o que o jogo procura (`sentar…`, `deitar…`, `plantar…`):
 * qualquer peça nova da biblioteca funciona com o avatar sem código.
 */
export function pontosDaPeca(raw: Record<string, unknown>): MoradaPiece['points'] {
  const pontos: MoradaPiece['points'] = {}
  const antigos = objeto(raw.pontos)
  if (antigos)
    for (const [nome, v] of Object.entries(antigos)) {
      if (ehVetor(v)) pontos[nome] = { position: v }
      else {
        const p = objeto(v)
        const posicao = p?.ponto ?? p?.posicao
        if (p && ehVetor(posicao))
          pontos[nome] = {
            position: posicao,
            ...(ehVetor(p.direcao) ? { direction: p.direcao } : {}),
          }
      }
    }
  if (Array.isArray(raw.pontos_de_jogo))
    raw.pontos_de_jogo.forEach((v, i) => {
      const p = objeto(v)
      if (!p || typeof p.tipo !== 'string') return
      const posicao = posicaoDoPonto(p)
      if (!posicao) return
      const nome = `${p.tipo}_${typeof p.nome === 'string' && p.nome ? p.nome : i}`
      if (pontos[nome]) return
      const direcao = ehVetor(p.direcao) ? p.direcao : ehVetor(p.fora) ? p.fora : null
      pontos[nome] = { position: posicao, ...(direcao ? { direction: direcao } : {}) }
    })
  return pontos
}

/**
 * Onde fica um ponto de jogo, pelo formato do tipo: `ponto` (sentar, deitar) ou `posicao` (a porta);
 * o meio da linha `de`–`ate` (a quina, a tora); o canteiro (`plantar`), o meio dele na altura da
 * terra (`altura_m`, com as `celulas` no plano). Tipos sem um ponto só (a escada, o escorregador)
 * ficam de fora.
 */
function posicaoDoPonto(p: Record<string, unknown>): Vetor | null {
  if (ehVetor(p.ponto)) return p.ponto
  if (ehVetor(p.posicao)) return p.posicao
  if (ehVetor(p.de) && ehVetor(p.ate))
    return [(p.de[0] + p.ate[0]) / 2, (p.de[1] + p.ate[1]) / 2, (p.de[2] + p.ate[2]) / 2]
  if (typeof p.altura_m === 'number' && Array.isArray(p.celulas)) {
    const celulas = p.celulas.filter(
      (c): c is [number, number] =>
        Array.isArray(c) && c.length === 2 && c.every((n) => typeof n === 'number'),
    )
    if (celulas.length === 0) return null
    const x = celulas.reduce((s, c) => s + c[0], 0) / celulas.length
    const z = celulas.reduce((s, c) => s + c[1], 0) / celulas.length
    return [x, p.altura_m, z]
  }
  return null
}
