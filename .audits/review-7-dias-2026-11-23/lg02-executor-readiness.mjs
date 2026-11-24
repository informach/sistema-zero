// Executado no Members de staging. Nunca imprime URL completa, token ou dados de alunos.
;(async () => {
  const base = process.env.STUDIO_PRO_RUNTIME_URL
  const token = process.env.STUDIO_PRO_RUNTIME_TOKEN
  if (!base || !token) throw new Error('Executor de staging não configurado')
  const url = new URL('/v1/check/warm', base)
  if (!url.hostname.includes('staging')) throw new Error('Recusado executor fora de staging')
  const start = Date.now()
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ executionId: 'lg02-readiness-20261123', threeD: false }),
    signal: AbortSignal.timeout(60000),
  })
  const body = await response.json().catch(() => null)
  console.log(JSON.stringify({
    testedAt: new Date().toISOString(),
    environment: 'staging',
    host: url.hostname,
    path: url.pathname,
    status: response.status,
    durationMs: Date.now() - start,
    warming: body?.warming ?? null,
    errorCode: body?.error?.code ?? null,
    responseKeys: body && typeof body === 'object' ? Object.keys(body) : [],
  }))
})().catch((error) => { console.error(error.name); process.exitCode = 1 })
