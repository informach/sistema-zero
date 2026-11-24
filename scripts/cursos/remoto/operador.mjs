// Roda DENTRO do serviço `members` (pelo `railway ssh` de scripts/cursos/lib/railway.ts) e chama o
// operador implantado `packages/members/scripts/publish-course.ts`: o mesmo serviço e o mesmo
// trabalho durável dos botões "Publicar e atualizar no adulto" e "Promover para produção" do Admin.
// Recebe { ambienteId, pedido, curso? }: sem `sourceCourseId`, a prévia acha o curso Kids pelo slug.
export async function run(p) {
  if (process.env.RAILWAY_ENVIRONMENT_ID !== p.ambienteId)
    throw new Error('Contêiner de outro ambiente')
  if (process.env.RAILWAY_SERVICE_NAME !== 'members') throw new Error('Serviço inesperado')
  const fs = await import('node:fs')
  const raiz = ['/app', process.cwd()].find((r) =>
    fs.existsSync(`${r}/packages/members/scripts/publish-course.ts`),
  )
  if (!raiz) throw new Error('publish-course.ts não está implantado neste Members')
  const script = `${raiz}/packages/members/scripts/publish-course.ts`
  // Sem o await, a conexão fecha antes de a operação terminar (CONNECTION_ENDED, 23/11/2026).
  if (!fs.readFileSync(script, 'utf8').includes('return await service.prepare'))
    throw new Error(
      'O operador implantado é anterior ao conserto do await: implante o members atual',
    )

  const pedido = { ...p.pedido }
  if (pedido.action === 'preview' && !pedido.sourceCourseId) {
    const headers = {
      'content-type': 'application/json',
      'x-internal-token': process.env.INTERNAL_API_TOKEN,
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'active',
      'x-auth-user-id': pedido.actorId,
      'x-auth-user-name': 'Publicacao de curso (scripts/cursos)',
    }
    const achados = []
    for (let offset = 0; offset < 5000; offset += 100) {
      const r = await fetch(
        `http://[::1]:${process.env.PORT}/members/admin/courses?audience=kids&limit=100&offset=${offset}`,
        { headers, signal: AbortSignal.timeout(25_000) },
      )
      if (!r.ok) throw new Error(`Lista de cursos ${r.status}`)
      const pagina = await r.json()
      achados.push(...pagina.items.filter((c) => c.slug === p.curso))
      if (pagina.items.length < 100) break
    }
    if (achados.length !== 1) throw new Error(`Curso Kids ${p.curso}: ${achados.length} achados`)
    pedido.sourceCourseId = achados[0].id
  }

  const arquivo = `/tmp/sz-pedido-${crypto.randomUUID()}.json`
  fs.writeFileSync(arquivo, JSON.stringify(pedido), { mode: 0o600 })
  let r
  try {
    r = Bun.spawnSync(['bun', '--no-env-file', script, arquivo], {
      cwd: raiz,
      stdout: 'pipe',
      stderr: 'pipe',
    })
  } finally {
    fs.unlinkSync(arquivo)
  }
  const saida = r.stdout
    .toString()
    .trim()
    .split('\n')
    .filter((l) => l.startsWith('{'))
    .at(-1)
  if (r.exitCode !== 0 || !saida)
    throw new Error(`publish-course falhou: ${r.stderr.toString().slice(-1500)}`)
  return { pedido: { ...pedido, actorId: undefined }, trabalho: JSON.parse(saida) }
}
