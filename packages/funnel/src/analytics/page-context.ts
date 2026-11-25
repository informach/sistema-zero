import { getFunnel } from '../funnels/registry'
import type { PageContext } from './types'

/** Pages are recognized by route; their sections/elements are discovered at runtime. */
export function analyticsPage(path: string): PageContext | null {
  if (!/^\/[a-z0-9/_-]*$/.test(path) || path.length > 220) return null
  const normalized = path.replace(/\/$/, '') || '/'
  // `/como-funciona` virou 301 em 20/10/2026 e não gera eventos novos; segue reconhecida para o painel
  // abrir os dados de antes.
  if (normalized === '/' || normalized === '/como-funciona')
    return {
      id: normalized === '/' ? 'bio' : 'como-funciona',
      path: normalized,
      kind: normalized === '/' ? 'bio' : 'explicacao',
      funnel: null,
      publicText: true,
    }
  // A página pública do guia para pais é a oferta do funil `kids/vilao-em-aliado` desde 25/11/2026
  // (antes, curso gratuito fora dos funis, `kind: 'curso-pais'`). O id fica o mesmo para o painel
  // juntar os dados de antes e de depois.
  if (normalized === '/kids/vilao-em-aliado')
    return {
      id: 'kids/vilao-em-aliado',
      path: normalized,
      kind: 'oferta',
      funnel: 'kids/vilao-em-aliado',
      publicText: true,
    }
  const [, audience, product, step, ...variant] = normalized.split('/')
  const f = getFunnel(audience, product)
  if (
    !f ||
    !step ||
    !['quiz', 'resultado', 'oferta', 'checkout', 'obrigado', 'upsell', 'downsell'].includes(step)
  )
    return null
  if (variant.length && step !== 'oferta') return null
  if (
    ['quiz', 'resultado', 'upsell', 'downsell'].includes(step) &&
    !f.steps[step as 'quiz' | 'resultado' | 'upsell' | 'downsell']
  )
    return null
  return {
    id: normalized.slice(1),
    path: normalized,
    kind: step,
    funnel: f.key,
    publicText: ['oferta', 'upsell', 'downsell'].includes(step),
  }
}
