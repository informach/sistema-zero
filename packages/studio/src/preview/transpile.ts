import { transform } from 'sucrase'

/**
 * Transpila um arquivo extra `.ts` para JavaScript do browser, SÓ no caminho de
 * preview do modo Código (o que o aluno vê/edita no Monaco e persiste continua
 * sendo o TS original). Síncrono e sem rede (Sucrase é JS puro). `.js`/`.mjs`
 * passam direto.
 *
 * `.tsx`/`.jsx` NÃO são suportados: transpilariam para imports de
 * `react/jsx-runtime`, ausente do importmap (não há React no preview), e o
 * módulo falharia silenciosamente. Devolvem um `throw` legível.
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

  // JSX/TSX transpilam para imports de `react/jsx-runtime`, que NÃO existem no
  // importmap do preview (não há React no ambiente de aprendizado). O módulo
  // resultante falharia silenciosamente ao resolver o specifier. Em vez disso,
  // emitimos um `throw` legível (mesmo padrão do erro de transpile abaixo), que
  // o interceptor captura como runtimeError visível no console do aluno.
  if (isTsx || isJsx) {
    return `throw new Error(${JSON.stringify(
      `JSX/TSX não é suportado no preview (${fileName}). Não há React no ambiente de aprendizado.`,
    )});`
  }

  try {
    // Só `.ts` chega aqui (TSX/JSX já retornaram acima): só a transformação de
    // tipos do TypeScript, sem JSX.
    return transform(code, { transforms: ['typescript'] }).code
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `throw new Error(${JSON.stringify(`Erro ao compilar ${fileName}: ${message}`)});`
  }
}
