// Roda DENTRO do serviço `members` (pelo `railway ssh` de scripts/cursos/lib/railway.ts), falando com
// a API de admin do próprio contêiner. Animações dos módulos (ediSVG) na página do curso:
//   listar: os cursos do público (ou só `curso`), com o status e, em cada módulo, a animação que
//           ele tem (título, sha256 e endereço) ou null.
//   gravar: põe a animação (já guardada no R2 pelo Admin) num módulo, conservando título e resumo,
//           e confere o que ficou gravado.
export async function run(p) {
  if (process.env.RAILWAY_ENVIRONMENT_ID !== p.ambienteId)
    throw new Error('Contêiner de outro ambiente')
  if (process.env.RAILWAY_SERVICE_NAME !== 'members') throw new Error('Serviço inesperado')
  if (!['kids', 'adult'].includes(p.publico)) throw new Error('Público inválido')
  const base = `http://[::1]:${process.env.PORT}/members/admin`
  const headers = {
    'content-type': 'application/json',
    'x-internal-token': process.env.INTERNAL_API_TOKEN,
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
    'x-auth-user-id': p.ator,
    'x-auth-user-name': 'Animacao do modulo (scripts/cursos)',
  }
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25_000),
    })
    const j = await r.json().catch(() => null)
    if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(j).slice(0, 600)}`)
    return j
  }
  const ordem = (a, b) => a.sortOrder - b.sortOrder
  // O jsonb do Postgres devolve as chaves em outra ordem: compara com as chaves ordenadas.
  const canon = (x) =>
    JSON.stringify(x, (_k, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
        : v,
    )
  const cursos = []
  for (let offset = 0; offset < 5000; offset += 100) {
    const pagina = await call(`/courses?audience=${p.publico}&limit=100&offset=${offset}`)
    cursos.push(...pagina.items)
    if (pagina.items.length < 100) break
  }

  if (p.acao === 'listar') {
    const lista = []
    for (const c of cursos.filter((x) => !p.curso || x.slug === p.curso)) {
      const arvore = await call(`/courses/${c.id}`)
      lista.push({
        slug: c.slug,
        titulo: c.title,
        status: c.status,
        modulos: [...arvore.modules].sort(ordem).map((m) => ({
          id: m.id,
          titulo: m.title,
          aulas: m.lessons.length,
          animacao: m.animation
            ? { titulo: m.animation.title, sha256: m.animation.sha256, url: m.animation.url }
            : null,
        })),
      })
    }
    return lista
  }

  if (p.acao === 'gravar') {
    const achados = cursos.filter((c) => c.slug === p.curso)
    if (achados.length !== 1)
      throw new Error(`Curso ${p.curso} (${p.publico}): ${achados.length} achados`)
    const arvore = await call(`/courses/${achados[0].id}`)
    const modulo = arvore.modules.find((m) => m.id === p.moduloId)
    if (!modulo) throw new Error(`Módulo ${p.moduloId} não é do curso ${p.curso}`)
    if (modulo.title !== p.tituloDoModulo)
      throw new Error(`Módulo com outro título: "${modulo.title}" (esperado "${p.tituloDoModulo}")`)
    // O PATCH troca título e resumo também (resumo ausente vira null): manda os atuais.
    await call(`/modules/${modulo.id}`, 'PATCH', {
      title: modulo.title,
      summary: modulo.summary ?? null,
      animation: p.animacao,
    })
    const depois = (await call(`/courses/${achados[0].id}`)).modules.find((m) => m.id === modulo.id)
    const igual = canon(depois.animation) === canon(p.animacao)
    if (!igual || depois.title !== modulo.title || depois.summary !== modulo.summary)
      throw new Error('O módulo não ficou como o esperado depois de gravar')
    return {
      modulo: depois.title,
      animacao: depois.animation.url,
      poster: depois.animation.poster.url,
    }
  }
  throw new Error(`Ação desconhecida: ${p.acao}`)
}
