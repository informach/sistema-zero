import type { Transformer } from '../transformer.port'

/**
 * Reescreve o caminho de saída: remove um prefixo, aplica um regex e/ou adiciona
 * um prefixo. Útil para alinhar a rota pública com o path interno do upstream.
 */
export function pathRewriteTransformer(options: Record<string, unknown>): Transformer {
  const pattern = typeof options.pattern === 'string' ? new RegExp(options.pattern) : undefined
  const replacement = typeof options.replacement === 'string' ? options.replacement : ''
  const stripPrefix = typeof options.stripPrefix === 'string' ? options.stripPrefix : undefined
  const addPrefix = typeof options.addPrefix === 'string' ? options.addPrefix : undefined
  return {
    name: 'path-rewrite',
    transformRequest(ctx) {
      let path = ctx.upstreamPath
      if (stripPrefix && path.startsWith(stripPrefix)) path = path.slice(stripPrefix.length) || '/'
      if (pattern) path = path.replace(pattern, replacement)
      if (addPrefix) path = `${addPrefix}${path}`
      ctx.upstreamPath = path.startsWith('/') ? path : `/${path}`
    },
  }
}
