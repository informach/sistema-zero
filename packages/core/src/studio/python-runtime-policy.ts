/** Caller supplies the immutable, approved distribution directory on the runtime origin. */
export function pythonFrameContentSecurityPolicy(directory: string) {
  const base = new URL(directory)
  if (
    !['https:', 'http:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !base.pathname.endsWith('/')
  )
    throw new Error('Diretório de runtime inválido.')
  if (
    base.protocol === 'http:' &&
    base.hostname !== '127.0.0.1' &&
    base.hostname !== 'localhost' &&
    base.hostname !== '[::1]'
  )
    throw new Error('O runtime precisa usar HTTPS.')
  return [
    "default-src 'none'",
    'sandbox allow-scripts allow-pointer-lock',
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
    `script-src 'wasm-unsafe-eval' ${base.href}`,
    `connect-src data: blob: ${base.href}`,
    `worker-src blob: ${base.href}`,
    'img-src data: blob:',
    'media-src data: blob:',
    "style-src 'unsafe-inline'",
    "require-trusted-types-for 'script'",
    'trusted-types sz-python-bootstrap',
  ].join('; ')
}
