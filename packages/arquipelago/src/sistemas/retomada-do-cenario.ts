import type { PublicacaoParaOJogo } from '@sistemazero/molda-cenarios-core/publicacao'

type Posicao = { x: number; y: number; z: number }
type Versao = Pick<PublicacaoParaOJogo, 'id' | 'versao' | 'manifesto'>
export const chaveDaRetomada = (p: Versao) => `arquipelago:publicado:${p.id}:${p.versao}`
function posicaoValida(p: unknown): p is Posicao {
  if (!p || typeof p !== 'object') return false
  const v = p as Posicao
  return [v.x, v.y, v.z].every(
    (n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e9,
  )
}
export function codificarRetomadaDoCenario(p: Versao, posicao: Posicao) {
  if (!posicaoValida(posicao)) throw Error('A posição deste ensaio não pode ser guardada.')
  return JSON.stringify({
    formato: 'arquipelago-ensaio-publicado',
    versao: 1,
    publicacao: p.id,
    revisao: p.versao,
    manifesto: p.manifesto.digest,
    posicao: { x: posicao.x, y: posicao.y, z: posicao.z },
  })
}
/** A geometria/colisores conferem depois o apoio; este leitor não inventa chão. */
export function lerRetomadaDoCenario(bruto: string | null, p: Versao): Posicao | null {
  if (bruto === null) return null
  try {
    const r: unknown = JSON.parse(bruto)
    if (!r || typeof r !== 'object') throw Error()
    const v = r as Record<string, unknown>
    if (
      v.formato !== 'arquipelago-ensaio-publicado' ||
      v.versao !== 1 ||
      v.publicacao !== p.id ||
      v.revisao !== p.versao ||
      v.manifesto !== p.manifesto.digest ||
      !posicaoValida(v.posicao)
    )
      throw Error()
    return { ...v.posicao }
  } catch {
    throw Error('A posição guardada não pertence a esta versão do ensaio publicado.')
  }
}
