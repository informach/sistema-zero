/**
 * Para onde voltar depois de entrar: só um caminho deste mesmo site. Barras invertidas e
 * caracteres de controle (que o navegador transforma em outro endereço) levam ao início.
 */
const hasControl = (s: string): boolean =>
  [...s].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)

export function safeReturn(volta: string, origin: string): string {
  if (!volta.startsWith('/') || volta.includes('\\') || hasControl(volta)) return '/'
  try {
    const url = new URL(volta, origin)
    return url.origin === new URL(origin).origin ? `${url.pathname}${url.search}` : '/'
  } catch {
    return '/'
  }
}
