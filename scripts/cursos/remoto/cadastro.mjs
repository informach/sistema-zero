// Roda DENTRO do serviço `members` (pelo `railway ssh` de scripts/cursos/lib/railway.ts), falando com
// a API de admin do próprio contêiner. O cadastro de um curso Kids a partir da pasta dele
// (scripts/cursos/cadastrar-curso.ts):
//   estado      o curso, os módulos, as aulas e o rascunho de cada aula (só leitura)
//   aulas       cria os módulos e as aulas que faltam, acerta título e slug das aulas do seed e
//               importa cada manifesto no modo "preservar" (o mesmo do "Atualizar pelo manifesto")
//   ligar       põe o vídeo provisório e a capa em cada bloco de vídeo, liga os vídeos planejados,
//               anexa o caderno (marcado para o Zappy) no bloco "Passo a passo do projeto" e valida
//   falas       os blocos que falam (balão do Zappy, quiz e experiência), para gerar a voz
//   vozes       grava o dicionário de voz de cada bloco (substitui, como o botão do Admin)
//   publicar    valida e publica cada aula, grava os módulos e o curso (título, descrições, capa,
//               blocos liberados) e publica o curso
export async function run(p) {
  if (process.env.RAILWAY_ENVIRONMENT_ID !== p.ambienteId)
    throw new Error('Contêiner de outro ambiente')
  if (process.env.RAILWAY_SERVICE_NAME !== 'members') throw new Error('Serviço inesperado')
  const base = `http://[::1]:${process.env.PORT}/members/admin`
  const headers = {
    'content-type': 'application/json',
    'x-internal-token': process.env.INTERNAL_API_TOKEN,
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
    'x-auth-user-id': p.ator,
    'x-auth-user-name': 'Cadastro do curso (scripts/cursos)',
  }
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60_000),
    })
    const j = await r.json().catch(() => null)
    if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(j).slice(0, 1500)}`)
    return j
  }
  const canon = (x) =>
    JSON.stringify(x, (_k, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
        : v,
    )
  const ordem = (a, b) => a.sortOrder - b.sortOrder
  const op = () => crypto.randomUUID()

  // O curso Kids pelo slug (a lista de admin, filtrada pelo público).
  const cursos = []
  for (let offset = 0; offset < 5000; offset += 100) {
    const pagina = await call(`/courses?audience=kids&limit=100&offset=${offset}`)
    cursos.push(...pagina.items)
    if (pagina.items.length < 100) break
  }
  const achados = cursos.filter((c) => c.slug === p.curso)
  if (achados.length !== 1) throw new Error(`Curso ${p.curso} (Kids): ${achados.length} achados`)
  const cursoId = achados[0].id
  const arvore = async () => {
    const a = await call(`/courses/${cursoId}`)
    if (a.audience !== 'kids') throw new Error('O curso não é do Kids')
    a.modules.sort(ordem)
    for (const m of a.modules) m.lessons.sort(ordem)
    return a
  }
  const aulasDe = (a) => a.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduloId: m.id })))
  const rascunho = (id) => call(`/lessons/${id}/draft`)
  const mudar = async (id, d, change) => {
    await call(`/lessons/${id}/draft`, 'PATCH', {
      expectedRevision: d.revision,
      operationId: op(),
      change,
    })
    return rascunho(id)
  }
  const validar = async (id, d) => {
    const prontos = d.document.plannedVideos.map((v) => v.videoId).filter(Boolean)
    const v = await call(`/lessons/${id}/draft/validate`, 'POST', {
      expectedRevision: d.revision,
      operationId: op(),
      readyVideoIds: prontos,
    })
    const problemas = Array.isArray(v) ? v : (v.issues ?? [])
    return { prontos, problemas }
  }

  if (p.acao === 'estado') {
    const a = await arvore()
    const modulos = []
    for (const m of a.modules) {
      const aulas = []
      for (const l of m.lessons) {
        const d = await rascunho(l.id)
        aulas.push({
          id: l.id,
          slug: l.slug,
          titulo: l.title,
          publicada: l.isPublished,
          partes: d.document.sections.map((s) => ({
            titulo: s.title,
            blocos: s.blockIds.map((i) => d.document.blocks.find((b) => b.id === i)?.content.kind),
          })),
          videosPlanejados: d.document.plannedVideos.length,
          videosLigados: d.document.plannedVideos.filter((v) => v.videoId).length,
          anexos: d.document.attachments.map((x) => ({
            rotulo: x.label,
            caderno: x.zappyStudentNotebook === true,
          })),
        })
      }
      modulos.push({
        id: m.id,
        titulo: m.title,
        resumo: m.summary,
        animacao: m.animation ? m.animation.title : null,
        aulas,
      })
    }
    return {
      curso: {
        id: a.id,
        slug: a.slug,
        titulo: a.title,
        status: a.status,
        learner: a.learner,
        capa: a.coverImageUrl,
        blocosLiberados: (a.studioUnlockBlocks ?? []).length,
      },
      modulos,
    }
  }

  if (p.acao === 'aulas') {
    let a = await arvore()
    // Os módulos na ordem do modulos.md: o seed traz um ("Plano de produção"); os que faltam são
    // criados. O título e o resumo definitivos entram no passo publicar.
    for (let i = a.modules.length; i < p.modulos.length; i++) {
      const m = p.modulos[i]
      await call(`/courses/${cursoId}/modules`, 'POST', { title: m.titulo, summary: m.resumo })
    }
    a = await arvore()
    const resultado = []
    for (const aula of p.aulas) {
      const modulo = a.modules[aula.modulo]
      if (!modulo) throw new Error(`Falta o módulo ${aula.modulo + 1}`)
      let l = aulasDe(a).find((x) => x.slug === aula.documento.lessonSlug)
      if (l && l.moduloId !== modulo.id)
        throw new Error(`A aula ${l.slug} está em outro módulo; mova no Admin antes`)
      if (!l) {
        await call(`/modules/${modulo.id}/lessons`, 'POST', {
          slug: aula.documento.lessonSlug,
          title: aula.documento.title,
        })
        a = await arvore()
        l = aulasDe(a).find((x) => x.slug === aula.documento.lessonSlug)
      }
      let d = await rascunho(l.id)
      if (d.document.title !== aula.documento.title)
        d = await mudar(l.id, d, {
          type: 'metadata',
          title: aula.documento.title,
          slug: aula.documento.lessonSlug,
          estimatedMinutes: d.document.estimatedMinutes,
        })
      const previa = await call(`/lessons/${l.id}/import-preview`, 'POST', {
        document: aula.documento,
        mode: 'preserve',
      })
      if (!previa.fingerprint) throw new Error(`Prévia sem impressão: ${l.slug}`)
      await call(`/lessons/${l.id}/import-learning`, 'POST', {
        document: aula.documento,
        mode: 'preserve',
        expectedFingerprint: previa.fingerprint,
        operationId: op(),
      })
      d = await rascunho(l.id)
      resultado.push({
        id: l.id,
        slug: d.document.slug,
        titulo: d.document.title,
        partes: d.document.sections.length,
        blocos: d.document.blocks.length,
        videosPlanejados: d.document.plannedVideos.length,
      })
    }
    // A ordem das aulas em cada módulo é a dos manifestos.
    a = await arvore()
    for (const [i, m] of a.modules.entries()) {
      const slugs = p.aulas.filter((x) => x.modulo === i).map((x) => x.documento.lessonSlug)
      const ids = slugs.map((s) => m.lessons.find((l) => l.slug === s)?.id).filter(Boolean)
      const resto = m.lessons.map((l) => l.id).filter((id) => !ids.includes(id))
      const desejada = [...ids, ...resto]
      if (canon(desejada) !== canon(m.lessons.map((l) => l.id)))
        await call(`/modules/${m.id}/lessons/reorder`, 'POST', { orderedIds: desejada })
    }
    return { curso: p.curso, aulas: resultado }
  }

  if (p.acao === 'ligar') {
    const a = await arvore()
    const resultado = []
    // O caderno vai na aula que tem o bloco de materiais "Passo a passo do projeto".
    const comMateriais = []
    for (const aula of p.aulas) {
      const l = aulasDe(a).find((x) => x.slug === aula.slug)
      if (!l) throw new Error(`Falta a aula ${aula.slug}: rode o passo aulas`)
      let d = await rascunho(l.id)
      const fixos = (doc) =>
        canon(doc.blocks.filter((b) => !['video', 'materials'].includes(b.content.kind)))
      const antes = { fixos: fixos(d.document), partes: canon(d.document.sections) }
      const ligacao = new Map()
      for (const parte of aula.partes) {
        const secao = d.document.sections[parte.parte - 1]
        if (!secao) throw new Error(`Aula ${aula.slug}: falta a parte ${parte.parte}`)
        const videos = secao.blockIds
          .map((i) => d.document.blocks.find((b) => b.id === i))
          .filter((b) => b?.content.kind === 'video')
        if (videos.length !== 1)
          throw new Error(`Aula ${aula.slug}, parte ${parte.parte}: ${videos.length} vídeos`)
        const bloco = videos[0]
        const content = {
          kind: 'video',
          provider: 'vimeo',
          src: parte.video.src,
          durationSeconds: parte.video.durationSeconds,
          posterUrl: parte.posterUrl,
        }
        if (canon(bloco.content) !== canon(content))
          d = await mudar(l.id, d, { type: 'block', block: { id: bloco.id, content } })
        ligacao.set(bloco.id, parte.video.id)
      }
      const planejados = d.document.plannedVideos.map((v) => {
        if (!ligacao.has(v.blockId))
          throw new Error(`Aula ${aula.slug}: vídeo planejado sem parte ${v.blockId}`)
        return { ...v, videoId: ligacao.get(v.blockId) }
      })
      if (canon(planejados) !== canon(d.document.plannedVideos))
        d = await mudar(l.id, d, { type: 'planned-videos', plannedVideos: planejados })
      const materiais = d.document.blocks.filter(
        (b) =>
          b.content.kind === 'materials' &&
          String(b.content.title ?? '').startsWith('Passo a passo do projeto'),
      )
      if (materiais.length) comMateriais.push({ l, materiais })
      if (fixos(d.document) !== antes.fixos || canon(d.document.sections) !== antes.partes)
        throw new Error(`Aula ${aula.slug}: a ligação mudou algo além dos vídeos`)
      resultado.push({ slug: aula.slug, id: l.id, videos: ligacao.size })
    }
    const blocosDoCaderno = comMateriais.flatMap((x) => x.materiais)
    if (blocosDoCaderno.length !== 1)
      throw new Error(
        `Esperado um bloco de materiais "Passo a passo do projeto"; há ${blocosDoCaderno.length}`,
      )
    const { l } = comMateriais[0]
    let d = await rascunho(l.id)
    let anexo = d.document.attachments.find((x) => x.url === p.caderno.url)
    if (anexo?.zappyStudentNotebook !== true) {
      anexo = {
        ...(anexo ?? { id: op() }),
        label: p.caderno.rotulo,
        url: p.caderno.url,
        fileType: 'application/pdf',
        sizeBytes: p.caderno.bytes,
        zappyStudentNotebook: true,
      }
      const outros = d.document.attachments.filter((x) => x.id !== anexo.id)
      d = await mudar(l.id, d, { type: 'attachments', attachments: [...outros, anexo] })
    }
    const material = d.document.blocks.find((b) => b.id === blocosDoCaderno[0].id)
    const item = {
      id: 'passo-a-passo-projeto',
      kind: 'file',
      attachmentId: anexo.id,
      label: 'Baixar passo a passo do projeto',
    }
    const content = {
      ...material.content,
      items: [...material.content.items.filter((x) => x.id !== item.id), item],
    }
    if (canon(content) !== canon(material.content))
      d = await mudar(l.id, d, { type: 'block', block: { id: material.id, content } })
    // Valida todas as aulas (nada publicado ainda).
    const a2 = await arvore()
    for (const r of resultado) {
      const dd = await rascunho(r.id)
      const { problemas, prontos } = await validar(r.id, dd)
      if (problemas.length) throw new Error(`Validação ${r.slug}: ${JSON.stringify(problemas)}`)
      r.prontos = prontos.length
    }
    return {
      curso: a2.slug,
      aulas: resultado,
      caderno: { aula: l.slug, anexo: anexo.label, paraOZappy: true },
    }
  }

  if (p.acao === 'falas') {
    const a = await arvore()
    const aulas = []
    for (const l of aulasDe(a)) {
      const d = await rascunho(l.id)
      const blocos = d.document.blocks.filter(
        (b) =>
          b.content.kind === 'dialogue' ||
          b.content.kind === 'quiz' ||
          (b.content.kind === 'interactive' && b.content.activity?.type === 'experimentation'),
      )
      aulas.push({ slug: l.slug, blocos: blocos.map((b) => ({ id: b.id, content: b.content })) })
    }
    return { aulas }
  }

  if (p.acao === 'vozes') {
    const a = await arvore()
    const vozesDe = (c) => (c.kind === 'interactive' ? c.activity?.vozes : c.vozes)
    const comVozes = (c, v) =>
      c.kind === 'interactive'
        ? { ...c, activity: { ...c.activity, vozes: v } }
        : { ...c, vozes: v }
    const resultado = []
    let usados = 0
    for (const l of aulasDe(a)) {
      let d = await rascunho(l.id)
      let mudou = 0
      for (const b of d.document.blocks) {
        const v = p.vozes[b.id]
        if (!v) continue
        usados++
        if (canon(vozesDe(b.content)) === canon(v)) continue
        d = await mudar(l.id, d, {
          type: 'block',
          block: { id: b.id, content: comVozes(b.content, v) },
        })
        mudou++
      }
      resultado.push({ slug: l.slug, blocosComVozNova: mudou })
    }
    if (usados !== Object.keys(p.vozes).length)
      throw new Error(`Bloco com voz fora das aulas: ${usados} de ${Object.keys(p.vozes).length}`)
    return { aulas: resultado }
  }

  if (p.acao === 'publicar') {
    let a = await arvore()
    const aulas = []
    for (const l of aulasDe(a)) {
      const d = await rascunho(l.id)
      const { problemas, prontos } = await validar(l.id, d)
      if (problemas.length) throw new Error(`Validação ${l.slug}: ${JSON.stringify(problemas)}`)
      await call(`/lessons/${l.id}/draft/publish`, 'POST', {
        expectedRevision: d.revision,
        operationId: op(),
        readyVideoIds: prontos,
      })
      const depois = await rascunho(l.id)
      if (!depois.isPublished) throw new Error(`Aula ${l.slug} não ficou publicada`)
      aulas.push({ slug: l.slug, publicada: true, videos: prontos.length })
    }
    if (a.modules.length !== p.modulos.length)
      throw new Error(`O curso tem ${a.modules.length} módulos e o modulos.md ${p.modulos.length}`)
    for (const [i, m] of a.modules.entries()) {
      const alvo = p.modulos[i]
      // Sem `animation` no corpo, a animação do módulo fica como está.
      if (m.title !== alvo.titulo || (m.summary ?? null) !== alvo.resumo)
        await call(`/modules/${m.id}`, 'PATCH', { title: alvo.titulo, summary: alvo.resumo })
    }
    a = await arvore()
    const { modules: _m, id: _i, createdAt: _c, updatedAt: _u, ...campos } = a
    await call(`/courses/${cursoId}`, 'PATCH', {
      ...campos,
      title: p.dadosDoCurso.titulo,
      subtitle: p.dadosDoCurso.subtitulo,
      description: p.dadosDoCurso.descricao,
      coverImageUrl: p.dadosDoCurso.capa,
      studioUnlockBlocks: p.dadosDoCurso.blocos,
      status: 'published',
    })
    a = await arvore()
    const problemas = []
    if (a.status !== 'published') problemas.push('curso não publicado')
    if (a.title !== p.dadosDoCurso.titulo) problemas.push('título')
    if (a.coverImageUrl !== p.dadosDoCurso.capa) problemas.push('capa')
    if (
      canon([...(a.studioUnlockBlocks ?? [])].sort()) !== canon([...p.dadosDoCurso.blocos].sort())
    )
      problemas.push('blocos liberados')
    if (aulasDe(a).some((l) => !l.isPublished)) problemas.push('aula sem publicar')
    if (problemas.length)
      throw new Error(`O curso não ficou como o esperado: ${problemas.join(', ')}`)
    return {
      curso: {
        id: a.id,
        slug: a.slug,
        status: a.status,
        blocosLiberados: a.studioUnlockBlocks.length,
      },
      modulos: a.modules.map((m) => ({ id: m.id, titulo: m.title })),
      aulas,
    }
  }
  throw new Error(`Ação desconhecida: ${p.acao}`)
}
