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
      if (!p || typeof p.tipo !== 'string' || !ehVetor(p.ponto)) return
      const nome = `${p.tipo}_${typeof p.nome === 'string' && p.nome ? p.nome : i}`
      if (pontos[nome]) return
      pontos[nome] = { position: p.ponto, ...(ehVetor(p.direcao) ? { direction: p.direcao } : {}) }
    })
  return pontos
}
