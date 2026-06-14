import { transform } from 'sucrase'

/**
 * Transpila um arquivo extra `.ts`/`.tsx`/`.jsx` para JavaScript do browser,
 * SÓ no caminho de preview do modo Código (o que o aluno vê/edita no Monaco e
 * persiste continua sendo o TS original). Síncrono e sem rede (Sucrase é JS
 * puro). `.js`/`.mjs` passam direto.
 *
 * Erro de transpile NÃO quebra o preview: vira um `throw` legível no console do
 * iframe (capturado pelo interceptor como runtimeError).
 */
export function transpileExtra(fileName: string, code: string): string {
  const lower = fileName.toLowerCase()
  const isTs = lower.endsWith('.ts')
  const isTsx = lower.endsWith('.tsx')
  const isJsx = lower.endsWith('.jsx')
  if (!isTs && !isTsx && !isJsx) return code

  const transforms: Array<'typescript' | 'jsx'> = []
  if (isTs || isTsx) transforms.push('typescript')
  if (isTsx || isJsx) transforms.push('jsx')

  try {
    return transform(code, {
      transforms,
      jsxRuntime: 'automatic',
      production: true,
    }).code
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `throw new Error(${JSON.stringify(`Erro ao compilar ${fileName}: ${message}`)});`
  }
}
