/**
 * Ensaios com bibliotecas gráficas reais (pygame-ce, pgzero) no CI.
 *
 * O job studio-python-extensions instala as bibliotecas e aponta o PYTHON: lá o ensaio roda com
 * esse Python mesmo que a biblioteca falte e falha alto, em vez de pular calado (a mesma guarda
 * de `it.skipIf(!python && !process.env.CI)` do scenePackage.test.ts). Os outros jobs não apontam
 * o PYTHON; neles, e na máquina sem a biblioteca, o caso aparece como pulado.
 */
export function pythonRequiredInCi(found: string | undefined): string | undefined {
  return found ?? (process.env.CI && process.env.PYTHON ? process.env.PYTHON : undefined)
}

/** Ferramentas que o CI não tem (Tiled, raylib com janela): o pulo vira um aviso no CI. */
export function warnSkippedInCi(available: unknown, reason: string) {
  if (process.env.CI && !available) console.warn(`::warning::${reason}`)
}
