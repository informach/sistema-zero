/** Baixa o spec OpenAPI da Sefin (Produção Restrita) usando mTLS — sem cert dá 403. */
import { writeFileSync } from 'node:fs'
import { loadA1Certificate } from './lib/cert'
import { mtlsFetch } from './lib/http'

const cert = loadA1Certificate()
for (const url of [
  'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/swagger/docs/v1',
  'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/swagger/docs/v1',
]) {
  const res = await mtlsFetch(url, cert)
  console.log(url, '→', res.status, res.headers.get('content-type'))
  if (!res.ok) continue
  const text = await res.text()
  try {
    const spec = JSON.parse(text) as {
      basePath?: string
      host?: string
      paths?: Record<string, Record<string, { summary?: string }>>
    }
    writeFileSync(`${import.meta.dir}/docs/swagger-sefin-pr.json`, JSON.stringify(spec, null, 2))
    console.log('host:', spec.host, '· basePath:', spec.basePath)
    for (const [p, methods] of Object.entries(spec.paths ?? {})) {
      for (const m of Object.keys(methods))
        console.log(m.toUpperCase().padEnd(6), p, '—', methods[m]?.summary ?? '')
    }
  } catch {
    console.log(text.slice(0, 500))
  }
  break
}
