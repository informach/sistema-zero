/** R2 S3 signs both path-style and virtual-hosted bucket URLs. No credentials, alternate ports or redirects. */
export function r2ObjectUrl(value: string) {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !/^(?:[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.)?[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(
      url.hostname,
    )
  )
    throw new Error('Endereço de armazenamento não autorizado')
  return url.href
}
