// Roda DENTRO do serviço `members` (pelo `railway ssh` de scripts/cursos/lib/railway.ts), falando com
// a API de admin do próprio contêiner. Duas ações:
//   inspecionar: o curso (pelo slug e público), as aulas na ordem da grade e, em cada parte, os
//                blocos de vídeo publicados (src do Vimeo, duração, capa).
//   duracao:     grava a duração nova de cada bloco de vídeo no rascunho, valida e publica a aula
//                (só as aulas que mudaram), e confere a versão publicada.
// Recusa rascunho com mudança não publicada: publicar levaria junto o que outra pessoa editou.
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
    'x-auth-user-name': 'Troca de videos (scripts/cursos)',
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
  const canon = (x) =>
    JSON.stringify(x, (_k, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
        : v,
    )

  // O curso pelo slug exato, paginando a lista do público.
  const achados = []
  for (let offset = 0; offset < 5000; offset += 100) {
    const pagina = await call(`/courses?audience=${p.publico}&limit=100&offset=${offset}`)
    achados.push(...pagina.items.filter((c) => c.slug === p.curso))
    if (pagina.items.length < 100) break
  }
  if (achados.length !== 1)
    throw new Error(`Curso ${p.curso} (${p.publico}): ${achados.length} achados`)
  const arvore = await call(`/courses/${achados[0].id}`)
  const ordem = (a, b) => a.sortOrder - b.sortOrder
  const licoes = [...arvore.modules].sort(ordem).flatMap((m) => [...m.lessons].sort(ordem))

  const aulas = []
  for (const [i, licao] of licoes.entries()) {
    const rascunho = await call(`/lessons/${licao.id}/draft`)
    const publicado = (await call(`/lessons/${licao.id}/draft/published`)).document
    const difs = Object.keys({ ...publicado, ...rascunho.document }).filter(
      (k) => k !== 'plannedVideos' && canon(publicado[k]) !== canon(rascunho.document[k]),
    )
    aulas.push({
      aula: i + 1,
      id: licao.id,
      slug: licao.slug,
      titulo: licao.title,
      revisao: rascunho.revision,
      publicada: rascunho.isPublished,
      rascunhoDiferente: difs,
      partes: publicado.sections.map((s, n) => ({
        parte: n + 1,
        titulo: s.title,
        videos: s.blockIds
          .map((b) => publicado.blocks.find((x) => x.id === b))
          .filter((x) => x && x.content.kind === 'video')
          .map((x) => ({
            blockId: x.id,
            src: x.content.src,
            durationSeconds: x.content.durationSeconds,
            posterUrl: x.content.posterUrl,
          })),
      })),
    })
  }
  const curso = {
    id: arvore.id,
    slug: arvore.slug,
    titulo: arvore.title,
    status: arvore.status,
    publico: p.publico,
  }
  if (p.acao === 'inspecionar') return { curso, aulas }
  if (p.acao === 'caderno') {
    // O PDF do passo a passo do projeto é sempre o caderno do aluno e fica disponível para o
    // Zappy (decisão da Helena, 24/11/2026): marca "zappyStudentNotebook" em todo anexo PDF,
    // valida e publica só as aulas que mudaram.
    const ehPdf = (a) =>
      a.fileType === 'application/pdf' || /\.pdf$/i.test(a.label) || /\.pdf($|\?)/i.test(a.url)
    const resumo = []
    for (const aula of aulas) {
      let d = await call(`/lessons/${aula.id}/draft`)
      const anexos = d.document.attachments ?? []
      const pdfs = anexos.filter(ehPdf)
      if (pdfs.length === 0) continue
      const faltam = pdfs.filter((a) => a.zappyStudentNotebook !== true)
      if (faltam.length && aula.rascunhoDiferente.length)
        throw new Error(
          `Aula ${aula.aula} com rascunho não publicado (${aula.rascunhoDiferente.join(', ')}): publique ou descarte antes`,
        )
      if (faltam.length) {
        await call(`/lessons/${aula.id}/draft`, 'PATCH', {
          expectedRevision: d.revision,
          operationId: crypto.randomUUID(),
          change: {
            type: 'attachments',
            attachments: anexos.map((a) => (ehPdf(a) ? { ...a, zappyStudentNotebook: true } : a)),
          },
        })
        d = await call(`/lessons/${aula.id}/draft`)
        const prontos = d.document.plannedVideos.map((v) => v.videoId).filter(Boolean)
        const validacao = await call(`/lessons/${aula.id}/draft/validate`, 'POST', {
          expectedRevision: d.revision,
          operationId: crypto.randomUUID(),
          readyVideoIds: prontos,
        })
        const problemas = Array.isArray(validacao) ? validacao : (validacao.issues ?? [])
        if (problemas.length)
          throw new Error(`Validação da aula ${aula.aula}: ${JSON.stringify(problemas)}`)
        await call(`/lessons/${aula.id}/draft/publish`, 'POST', {
          expectedRevision: d.revision,
          operationId: crypto.randomUUID(),
          readyVideoIds: prontos,
        })
      }
      const depois = (await call(`/lessons/${aula.id}/draft/published`)).document
      const marcados = (depois.attachments ?? []).filter(
        (a) => ehPdf(a) && a.zappyStudentNotebook === true,
      )
      if (marcados.length !== pdfs.length)
        throw new Error(`Aula ${aula.aula} publicada sem a marca de caderno`)
      resumo.push({
        aula: aula.aula,
        slug: aula.slug,
        pdfs: pdfs.map((a) => a.label),
        alterados: faltam.length,
      })
    }
    return { curso, resumo }
  }
  if (p.acao === 'resumo') {
    // O que o aluno recebe do cadastro: os campos do curso, os módulos e, em cada aula publicada,
    // os anexos (com a marca de caderno) e quantos blocos de cada tipo. Só leitura.
    const modulos = [...arvore.modules].sort(ordem)
    const porAula = []
    for (const aula of aulas) {
      const pub = (await call(`/lessons/${aula.id}/draft/published`)).document
      const tipos = {}
      for (const b of pub.blocks) tipos[b.content.kind] = (tipos[b.content.kind] ?? 0) + 1
      porAula.push({
        aula: aula.aula,
        slug: aula.slug,
        titulo: aula.titulo,
        publicada: aula.publicada,
        partes: pub.sections.length,
        blocos: tipos,
        anexos: (pub.attachments ?? []).map((x) => ({
          rotulo: x.label,
          url: x.url,
          tipo: x.fileType,
          bytes: x.sizeBytes,
          cadernoDoZappy: x.zappyStudentNotebook === true,
        })),
      })
    }
    return {
      curso: {
        ...curso,
        subtitulo: arvore.subtitle,
        descricao: arvore.description,
        capa: arvore.coverImageUrl,
        nivel: arvore.level,
        trilha: arvore.track,
        blocosLiberados: (arvore.studioUnlockBlocks ?? []).length,
      },
      modulos: modulos.map((m) => ({ titulo: m.title, resumo: m.summary })),
      aulas: porAula,
    }
  }
  if (p.acao === 'blocos') {
    // "Ferramentas que este curso libera no Estúdio" (studioUnlockBlocks): os blocos que a criança
    // ganha ao concluir o curso. Sem p.blocos, só lê; com p.blocos, grava se for diferente. O PATCH
    // do curso exige o objeto inteiro, e o resto do curso é conferido depois.
    const atuais = [...(arvore.studioUnlockBlocks ?? [])].sort()
    if (!p.blocos) return { curso, blocos: atuais }
    const desejados = [...new Set(p.blocos)].sort()
    if (JSON.stringify(atuais) === JSON.stringify(desejados))
      return { curso, blocos: desejados.length, alterado: false }
    const { modules: _m, id: _i, createdAt: _c, updatedAt: _u, ...campos } = arvore
    await call(`/courses/${arvore.id}`, 'PATCH', { ...campos, studioUnlockBlocks: desejados })
    const depois = await call(`/courses/${arvore.id}`)
    const gravados = JSON.stringify([...(depois.studioUnlockBlocks ?? [])].sort())
    const resto = [
      'title',
      'subtitle',
      'description',
      'coverImageUrl',
      'status',
      'salesPageUrl',
      'level',
      'track',
      'audience',
    ]
    const igual = resto.every((k) => JSON.stringify(arvore[k]) === JSON.stringify(depois[k]))
    if (gravados !== JSON.stringify(desejados) || !igual)
      throw new Error('O curso não ficou como esperado')
    return { curso, blocos: desejados.length, alterado: true, antes: atuais.length }
  }
  const ids = new Set(aulas.map((a) => a.id))
  if (p.acao === 'zappy-pendentes') {
    // O mesmo pedido do botão "Atualizar a base do Zappy" do Admin: o Members indexa os textos e
    // devolve o que precisa de extração (legenda de vídeo, PDF do caderno). Fica só o deste curso.
    const pendentes = []
    let cursor
    for (let rodada = 0; rodada < 400; rodada++) {
      const r = await call('/zappy/knowledge/backfill', 'POST', {
        ...(cursor ? { cursor } : {}),
        limit: 25,
      })
      pendentes.push(...r.pending.filter((x) => ids.has(x.lessonId)))
      if (r.done || !r.nextCursor) break
      cursor = r.nextCursor
    }
    return { curso, pendentes }
  }
  if (p.acao === 'zappy-entregar') {
    // Entrega o texto extraído (ou o erro) com a revisão do bloco publicado: o Members recusa
    // revisão velha, e aí basta rodar de novo.
    const resultado = []
    for (const f of p.fontes) {
      if (!ids.has(f.lessonId)) throw new Error(`Fonte de outra aula: ${f.sourceRef}`)
      try {
        await call('/zappy/knowledge/sources', 'POST', {
          lessonId: f.lessonId,
          sourceType: f.sourceType,
          sourceRef: f.sourceRef,
          expectedBlockRevision: f.expectedBlockRevision,
          ...(f.content
            ? { content: f.content }
            : { error: f.error ?? 'Fonte sem texto selecionável' }),
        })
        resultado.push({ sourceRef: f.sourceRef, entregue: true, comTexto: Boolean(f.content) })
      } catch (causa) {
        resultado.push({
          sourceRef: f.sourceRef,
          entregue: false,
          erro: String(causa.message).slice(0, 300),
        })
      }
    }
    return { curso, resultado }
  }
  if (p.acao === 'zappy') {
    // O relatório da base do Zappy, só do que é deste curso: aula com vídeo sem transcrição e
    // fonte de vídeo com erro (sourceRef "block:<id>").
    const r = await call('/zappy/knowledge/report')
    const blocos = new Set(
      aulas.flatMap((a) => a.partes.flatMap((x) => x.videos.map((v) => `block:${v.blockId}`))),
    )
    return {
      curso,
      aulas: aulas.map((a) => ({ aula: a.aula, id: a.id, titulo: a.titulo })),
      semTranscricao: r.lessonsWithVideoWithoutTranscript
        .filter((l) => ids.has(l.lessonId))
        .map((l) => l.lessonId),
      falhas: r.failedSources.filter((f) => blocos.has(f.sourceRef)),
      semCaderno: r.coursesWithoutStudentNotebook.some((c) => c.courseId === curso.id),
    }
  }
  if (p.acao !== 'duracao') throw new Error('Ação desconhecida')

  const resumo = []
  for (const aula of aulas) {
    let d = await call(`/lessons/${aula.id}/draft`)
    const nossos = d.document.blocks.filter(
      (x) => x.content.kind === 'video' && p.duracoes[x.id] !== undefined,
    )
    if (nossos.length === 0) continue
    if (aula.rascunhoDiferente.length)
      throw new Error(
        `Aula ${aula.aula} com rascunho não publicado (${aula.rascunhoDiferente.join(', ')}): publique ou descarte antes`,
      )
    let mudou = 0
    for (const b of nossos) {
      const s = p.duracoes[b.id]
      if (b.content.durationSeconds === s) continue
      await call(`/lessons/${aula.id}/draft`, 'PATCH', {
        expectedRevision: d.revision,
        operationId: crypto.randomUUID(),
        change: {
          type: 'block',
          block: { id: b.id, content: { ...b.content, durationSeconds: s } },
        },
      })
      d = await call(`/lessons/${aula.id}/draft`)
      mudou++
    }
    const prontos = d.document.plannedVideos.map((v) => v.videoId).filter(Boolean)
    const validacao = await call(`/lessons/${aula.id}/draft/validate`, 'POST', {
      expectedRevision: d.revision,
      operationId: crypto.randomUUID(),
      readyVideoIds: prontos,
    })
    const problemas = Array.isArray(validacao) ? validacao : (validacao.issues ?? [])
    if (problemas.length)
      throw new Error(`Validação da aula ${aula.aula}: ${JSON.stringify(problemas)}`)
    if (mudou)
      await call(`/lessons/${aula.id}/draft/publish`, 'POST', {
        expectedRevision: d.revision,
        operationId: crypto.randomUUID(),
        readyVideoIds: prontos,
      })
    const depois = (await call(`/lessons/${aula.id}/draft/published`)).document
    const errados = depois.blocks.filter(
      (x) =>
        x.content.kind === 'video' &&
        p.duracoes[x.id] !== undefined &&
        x.content.durationSeconds !== p.duracoes[x.id],
    ).length
    if (errados) throw new Error(`Aula ${aula.aula} publicada sem a duração nova`)
    resumo.push({ aula: aula.aula, slug: aula.slug, videos: nossos.length, alterados: mudou })
  }
  return { curso, resumo }
}
