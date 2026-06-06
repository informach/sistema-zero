/**
 * IP do cliente p/ o rate limit. Atrás de proxy (Railway), o `clientAddress` do
 * Astro é o IP do PROXY: sem `security.allowedDomains` o Astro IGNORA o
 * x-forwarded-for (verificado no fonte — `core/app/node.js`), e mesmo com ela
 * usaria o PRIMEIRO valor da lista, que é o que o CLIENTE enviou (forjável).
 * Com `trustProxy`, usamos o ÚLTIMO valor do x-forwarded-for — o hop anexado
 * pela borda confiável, fora do controle do cliente. Sem proxy (dev/local),
 * cai no `clientAddress` do socket.
 */
export function clientIp(request: Request, clientAddress: string, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = request.headers.get('x-forwarded-for')
    if (xff) {
      const parts = xff.split(',')
      const last = parts[parts.length - 1]?.trim()
      if (last) return last
    }
  }
  return clientAddress || 'unknown'
}
