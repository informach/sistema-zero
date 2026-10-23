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
