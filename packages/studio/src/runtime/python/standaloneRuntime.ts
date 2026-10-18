/** Exported packages and shared previews run the same approved module beside its frame. */
export function standalonePythonFrameURL(moduleURL: string, runtimeHash: string): URL {
  const url = new URL(moduleURL)
  if (
    !/^[a-f0-9]{64}$/.test(runtimeHash) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) ||
    !url.pathname.endsWith(`/${runtimeHash}/standalone.mjs`)
  )
    throw new Error('O player não pertence ao runtime deste snapshot Python.')
  return new URL('frame.html', url)
}
