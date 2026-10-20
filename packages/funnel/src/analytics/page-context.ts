import { getFunnel } from '../funnels/registry'
import type { PageContext } from './types'

/** Pages are recognized by route; their sections/elements are discovered at runtime. */
export function analyticsPage(path: string): PageContext | null {
  if (!/^\/[a-z0-9/_-]*$/.test(path) || path.length > 220) return null
  const normalized = path.replace(/\/$/, '') || '/'
  // `/como-funciona` virou redirecionamento (20/10/2026): só a bio fica fora dos funis.
  if (normalized === '/')
    return { id: 'bio', path: normalized, kind: 'bio', funnel: null, publicText: true }
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
