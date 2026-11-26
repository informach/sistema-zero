/**
 * Troca os vídeos de um curso publicado pelos arquivos novos, sem mudar nada do lado do aluno: cada
 * vídeo do Vimeo recebe uma VERSÃO nova (o mesmo id, o mesmo endereço, a mesma privacidade e os
 * mesmos domínios), a capa da parte é aplicada de novo e a duração gravada na aula é corrigida.
 * Passo a passo e contexto: docs/operations/cursos-passo-a-passo.md (seção "Trocar vídeos").
 *
 *   bun scripts/cursos/trocar-videos.ts <passo> --ambiente staging --publico kids \
 *     --curso jornada-faisca-missao --videos "C:/.../Finalizadas" \
 *     [--capas docs/aulas-interativas/faisca/o-jardim-secreto/capas-das-aulas] [--partes 1-1,2-3]
 *
 * Passos, nesta ordem (todos retomáveis; o estado fica em .cache/cursos/trocar-videos/...):
 *   inspecionar  lê do Members as aulas, as partes e os vídeos publicados (não muda nada)
 *   checar       confere os arquivos novos, as capas (iguais às gravadas na aula) e as durações
 *   enviar       versão nova no Vimeo + envio TUS + espera o processamento + capa + nome
 *   duracao      grava a duração nova nas aulas e publica só as aulas que mudaram
 *   verificar    confere no Vimeo: versão nova ativa, duração, capa, privacidade e domínios
 *   zappy        confere a legenda de cada vídeo no Vimeo e a base do Zappy do curso. Quem
 *                atualiza a base, sem navegador, é scripts/cursos/base-do-zappy.ts atualizar
 *   descartar    (com --partes) apaga a versão nova que travou no processamento do Vimeo, só se
 *                ela não estiver ativa, e libera a parte para o enviar de novo
 *
 * Produção exige --confirmo-producao. Os segredos (token do Vimeo) ficam só na memória.
 */
import { createHash } from 'node:crypto'
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { capaDaParteConfere } from './lib/capa-da-parte'
import { duracaoDoMp4 } from './lib/mp4'
import { AMBIENTES, type Ambiente, noServico, variaveis } from './lib/railway'

const RAIZ = resolve(import.meta.dir, '../..')
/** Quem aparece como autor das mudanças nas aulas (não é chave estrangeira; o mesmo das trocas anteriores). */
const ATOR_PADRAO = '00000000-0000-4000-8000-00000000a007'
const PASSOS = [
  'inspecionar',
  'checar',
  'enviar',
  'duracao',
  'verificar',
  'zappy',
  'descartar',
] as const
type Passo = (typeof PASSOS)[number]

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    ambiente: { type: 'string' },
    publico: { type: 'string' },
    curso: { type: 'string' },
    videos: { type: 'string' },
    capas: { type: 'string' },
    partes: { type: 'string' },
    ator: { type: 'string', default: ATOR_PADRAO },
    'confirmo-producao': { type: 'boolean', default: false },
  },
})
const passo = positionals[0] as Passo
if (!PASSOS.includes(passo)) throw new Error(`Passo: ${PASSOS.join(' | ')}`)
const ambiente = op.ambiente as Ambiente
if (!(ambiente in AMBIENTES)) throw new Error('--ambiente staging | production')
if (ambiente === 'production' && !op['confirmo-producao'])
  throw new Error('Produção: confira em staging antes e passe --confirmo-producao')
const publico = op.publico === 'adulto' ? 'adult' : op.publico
if (publico !== 'kids' && publico !== 'adult') throw new Error('--publico kids | adulto')
if (!op.curso) throw new Error('--curso <slug do curso>')

const pasta = join(RAIZ, '.cache/cursos/trocar-videos', `${publico}-${op.curso}-${ambiente}`)
mkdirSync(pasta, { recursive: true })
const arq = (nome: string) => join(pasta, nome)
const lerJson = <T>(nome: string): T => JSON.parse(readFileSync(arq(nome), 'utf8')) as T
const gravarJson = (nome: string, v: unknown) =>
  writeFileSync(arq(nome), `${JSON.stringify(v, null, 2)}\n`)
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')
const dois = (n: number) => String(n).padStart(2, '0')

interface Inspecao {
  curso: { id: string; slug: string; titulo: string; status: string }
  aulas: {
    aula: number
    id: string
    slug: string
    titulo: string
    rascunhoDiferente: string[]
    partes: {
      parte: number
      titulo: string
      videos: { blockId: string; src: string; durationSeconds: number; posterUrl: string | null }[]
    }[]
  }[]
}
interface Parte {
  chave: string
  aula: number
  parte: number
  titulo: string
  blockId: string
  id: string
  arquivo: string
  capa: string | null
}
interface EstadoParte {
  chave: string
  id: string
  tamanho?: number
  sha256?: string
  duracaoArquivo?: number
  versao?: string
  uploadLink?: string
  enviado?: boolean
  duracaoVimeo?: number
  capa?: string
  capaSha?: string
  capaConfirmada?: boolean
  fase?: string
}
const estadoArq = 'estado.private.json'
const estado: { ambiente: Ambiente; partes: Record<string, EstadoParte> } = existsSync(
  arq(estadoArq),
)
  ? lerJson(estadoArq)
  : { ambiente, partes: {} }
if (estado.ambiente !== ambiente) throw new Error('Estado de outro ambiente')
const salvar = () => gravarJson(estadoArq, estado)

async function membros<T>(pedido: Record<string, unknown>): Promise<T> {
  const codigo = readFileSync(join(import.meta.dir, 'remoto/aulas-do-curso.mjs'), 'utf8')
  return noServico<T>(ambiente, 'members', codigo, {
    ...pedido,
    ambienteId: AMBIENTES[ambiente],
    curso: op.curso,
    publico,
    ator: op.ator,
  })
}

let token = ''
async function vimeo<T = any>(caminho: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  token ||= variaveis(ambiente, 'admin').VIMEO_ACCESS_TOKEN ?? ''
  if (!token) throw new Error('O Admin deste ambiente não tem VIMEO_ACCESS_TOKEN')
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(`https://api.vimeo.com${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
        'Content-Type': 'application/json',
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(60_000),
    })
    if (r.ok) return (r.status === 204 ? null : await r.json()) as T
    const detalhe = (await r.text()).slice(0, 200)
    // POST nunca é repetido às cegas: um 503 pode ter criado a versão (ver o guia).
    if (metodo !== 'POST' && [429, 500, 502, 503, 504].includes(r.status) && tentativa < 3) {
      await Bun.sleep(2000 * 3 ** tentativa)
      continue
    }
    throw new Error(`Vimeo ${metodo} ${caminho.split('?')[0]} ${r.status} ${detalhe}`)
  }
}

/** As partes com vídeo, cruzando a inspeção com os arquivos novos e as capas. */
async function partesDoCurso(): Promise<Parte[]> {
  const inspecao = lerJson<Inspecao>('inspecao.json')
  if (!op.videos) throw new Error('--videos <pasta com "AulaNN - Parte N.mp4">')
  const arquivos = new Map<string, string>()
  for (const nome of readdirSync(op.videos)) {
    const m = /^aula\s*0*(\d+)\s*-\s*parte\s*0*(\d+)\.mp4$/i.exec(nome)
    if (m) arquivos.set(`${Number(m[1])}-${Number(m[2])}`, join(op.videos, nome))
  }
  const filtro = op.partes ? new Set(op.partes.split(',').map((s) => s.trim())) : null
  const partes: Parte[] = []
  for (const a of inspecao.aulas)
    for (const p of a.partes) {
      const chave = `${a.aula}-${p.parte}`
      if (p.videos.length === 0 || (filtro && !filtro.has(chave))) continue
      if (p.videos.length > 1) throw new Error(`Parte ${chave} tem ${p.videos.length} vídeos`)
      const v = p.videos[0]!
      const id = /video\/(\d+)/.exec(v.src)?.[1]
      if (!id) throw new Error(`Parte ${chave}: o vídeo não é do Vimeo (${v.src})`)
      const arquivo = arquivos.get(chave)
      if (!arquivo) continue
      const capa = op.capas
        ? join(op.capas, `aula-${dois(a.aula)}-parte-${dois(p.parte)}.png`)
        : null
      if (capa && !existsSync(capa)) throw new Error(`Falta a capa ${capa}`)
      // Staging usa o hash dos bytes; a promoção pode usar a identidade do recurso na chave.
      if (capa && v.posterUrl && !(await capaDaParteConfere(v.posterUrl, sha(readFileSync(capa)))))
        throw new Error(`Parte ${chave}: a capa da pasta não é a gravada na aula (${v.posterUrl})`)
      partes.push({
        chave,
        aula: a.aula,
        parte: p.parte,
        titulo: p.titulo,
        blockId: v.blockId,
        id,
        arquivo,
        capa,
      })
    }
  const semVideo = [...arquivos.keys()].filter(
    (k) => !partes.some((p) => p.chave === k) && (!filtro || filtro.has(k)),
  )
  if (semVideo.length)
    throw new Error(`Arquivos sem parte com vídeo no curso: ${semVideo.join(', ')}`)
  if (new Set(partes.map((p) => p.id)).size !== partes.length)
    throw new Error('Duas partes com o mesmo vídeo')
  if (partes.length === 0) throw new Error('Nenhuma parte para trocar')
  return partes
}

async function enviar(p: Parte) {
  estado.partes[p.chave] ??= { chave: p.chave, id: p.id }
  const e = estado.partes[p.chave]!
  const tamanho = statSync(p.arquivo).size
  if (!e.sha256) {
    Object.assign(e, {
      tamanho,
      sha256: sha(readFileSync(p.arquivo)),
      duracaoArquivo: duracaoDoMp4(p.arquivo),
    })
    salvar()
  }
  if (e.tamanho !== tamanho) throw new Error(`O arquivo mudou depois do início: ${p.chave}`)
  if (!e.uploadLink) {
    const v = await vimeo(`/videos/${p.id}/versions`, 'POST', {
      file_name: `Aula${dois(p.aula)} - Parte ${p.parte}.mp4`,
      upload: { status: 'in_progress', size: String(tamanho), approach: 'tus' },
    })
    if (!v?.uri || !v.upload?.upload_link) throw new Error(`Versão sem link de envio: ${p.chave}`)
    Object.assign(e, { versao: v.uri, uploadLink: v.upload.upload_link, fase: 'versao' })
    salvar()
  }
  if (e.enviado) return
  const h = await fetch(e.uploadLink!, {
    method: 'HEAD',
    headers: { 'Tus-Resumable': '1.0.0' },
    signal: AbortSignal.timeout(60_000),
  })
  if (!h.ok) throw new Error(`TUS HEAD ${h.status} ${p.chave}`)
  let offset = Number(h.headers.get('upload-offset'))
  if (!Number.isFinite(offset) || offset < 0 || offset > tamanho)
    throw new Error(`Offset inválido ${p.chave}`)
  const fd = openSync(p.arquivo, 'r')
  try {
    while (offset < tamanho) {
      const n = Math.min(32 * 1024 * 1024, tamanho - offset)
      const pedaco = Buffer.alloc(n)
      if (readSync(fd, pedaco, 0, n, offset) !== n) throw new Error('Leitura incompleta')
      const r = await fetch(e.uploadLink!, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: pedaco,
        signal: AbortSignal.timeout(600_000),
      })
      if (!r.ok) throw new Error(`TUS PATCH ${r.status} ${p.chave}`)
      const proximo = Number(r.headers.get('upload-offset'))
      if (proximo !== offset + n) throw new Error(`Offset divergente ${p.chave}`)
      offset = proximo
    }
  } finally {
    closeSync(fd)
  }
  Object.assign(e, { enviado: true, fase: 'enviado' })
  salvar()
  console.log(JSON.stringify({ parte: p.chave, enviado: true, mb: Math.round(tamanho / 1048576) }))
}

async function finalizar(p: Parte, nomeDoCurso: string) {
  const e = estado.partes[p.chave]!
  let v: any
  for (let i = 0; i < 120; i++) {
    v = await vimeo(`/videos/${p.id}?fields=uri,name,status,duration,transcode.status`)
    if (
      v.status === 'available' &&
      v.transcode?.status === 'complete' &&
      Math.abs(v.duration - e.duracaoArquivo!) <= 1.5
    )
      break
    await Bun.sleep(15_000)
  }
  if (!(v.status === 'available' && Math.abs(v.duration - e.duracaoArquivo!) <= 1.5))
    throw new Error(
      `Ainda processando ou duração errada: ${p.chave} (${v.status}, ${v.duration} s)`,
    )
  e.duracaoVimeo = v.duration
  const nome = `${nomeDoCurso} | Aula ${p.aula} Parte ${p.parte} | ${ambiente}`
  if (v.name !== nome) await vimeo(`/videos/${p.id}`, 'PATCH', { name: nome })
  if (p.capa) {
    const capa = readFileSync(p.capa)
    if (!e.capa || e.capaSha !== sha(capa)) {
      const foto = await vimeo(`/videos/${p.id}/pictures`, 'POST')
      const r = await fetch(foto.link, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: capa,
        signal: AbortSignal.timeout(60_000),
      })
      if (!r.ok) throw new Error(`Envio da capa ${r.status} ${p.chave}`)
      await vimeo(foto.uri, 'PATCH', { active: true })
      Object.assign(e, { capa: foto.uri, capaSha: sha(capa) })
      salvar()
    }
    // A capa nova às vezes demora a ficar ativa: ativa de novo e espera um pouco.
    let atual = await vimeo(`/videos/${p.id}?fields=pictures.uri`)
    for (let i = 0; i < 6 && atual.pictures?.uri !== e.capa; i++) {
      await vimeo(e.capa!, 'PATCH', { active: true })
      await Bun.sleep(5000)
      atual = await vimeo(`/videos/${p.id}?fields=pictures.uri`)
    }
    e.capaConfirmada = atual.pictures?.uri === e.capa
  }
  e.fase = 'pronto'
  salvar()
  console.log(
    JSON.stringify({
      parte: p.chave,
      id: p.id,
      duracao: e.duracaoVimeo,
      arquivo: Math.round(e.duracaoArquivo! * 10) / 10,
      capa: e.capaConfirmada ?? 'sem --capas',
    }),
  )
}

if (passo === 'inspecionar') {
  const r = await membros<Inspecao>({ acao: 'inspecionar' })
  gravarJson('inspecao.json', r)
  console.log(`${r.curso.titulo} (${r.curso.slug}, ${r.curso.status})`)
  for (const a of r.aulas) {
    console.log(
      `Aula ${a.aula}: ${a.titulo} [${a.slug}]${a.rascunhoDiferente.length ? `  ⚠ rascunho não publicado: ${a.rascunhoDiferente.join(', ')}` : ''}`,
    )
    for (const p of a.partes)
      for (const v of p.videos)
        console.log(
          `  Parte ${p.parte}: ${p.titulo} | ${v.src.split('?')[0]} | ${v.durationSeconds} s`,
        )
  }
  console.log(`Inspeção gravada em ${arq('inspecao.json')}`)
} else if (passo === 'checar') {
  for (const p of await partesDoCurso())
    console.log(
      JSON.stringify({
        parte: p.chave,
        id: p.id,
        titulo: p.titulo,
        mb: Math.round(statSync(p.arquivo).size / 1048576),
        duracao: Math.round(duracaoDoMp4(p.arquivo) * 10) / 10,
        capa: p.capa ? 'igual à da aula' : 'sem --capas',
      }),
    )
} else if (passo === 'enviar') {
  const partes = await partesDoCurso()
  const nomeDoCurso = lerJson<Inspecao>('inspecao.json').curso.titulo
  const fila = [...partes]
  const r = await Promise.allSettled(
    Array.from({ length: 3 }, async () => {
      while (fila.length) await enviar(fila.shift()!)
    }),
  )
  for (const x of r) if (x.status === 'rejected') throw x.reason
  for (const p of partes) await finalizar(p, nomeDoCurso)
  const prontos = partes.filter((p) => estado.partes[p.chave]?.fase === 'pronto').length
  console.log(JSON.stringify({ ambiente, videos: partes.length, prontos }))
} else if (passo === 'duracao') {
  const duracoes: Record<string, number> = {}
  for (const p of await partesDoCurso()) {
    const e = estado.partes[p.chave]
    if (e?.fase !== 'pronto' || !Number.isFinite(e.duracaoVimeo))
      throw new Error(`Parte ainda não pronta: ${p.chave} (rode enviar)`)
    duracoes[p.blockId] = e.duracaoVimeo!
  }
  const r = await membros<{ resumo: unknown }>({ acao: 'duracao', duracoes })
  gravarJson('duracao.json', r)
  console.log(JSON.stringify(r.resumo))
} else if (passo === 'verificar') {
  const partes = await partesDoCurso()
  const linhas = []
  for (const p of partes) {
    const e = estado.partes[p.chave]
    if (!e?.versao) throw new Error(`Parte sem versão enviada: ${p.chave}`)
    const v = await vimeo(
      `/videos/${p.id}?fields=status,duration,privacy,pictures.uri,pictures.active`,
    )
    const versoes = (await vimeo(`/videos/${p.id}/versions?per_page=100`)).data as {
      uri: string
      active: boolean
    }[]
    const dominios = (
      (await vimeo(`/videos/${p.id}/privacy/domains?per_page=100`)).data as { domain: string }[]
    ).map((d) => d.domain)
    const l = {
      parte: p.chave,
      id: p.id,
      status: v.status,
      duracao: v.duration,
      arquivo: Math.round(e.duracaoArquivo! * 10) / 10,
      versaoNovaAtiva: versoes.find((x) => x.active)?.uri === e.versao,
      capa: p.capa ? v.pictures?.uri === e.capa && v.pictures?.active === true : 'sem --capas',
      privado:
        v.privacy.view === 'disable' &&
        v.privacy.embed === 'whitelist' &&
        v.privacy.download === false,
      dominios,
    }
    const ok =
      l.status === 'available' &&
      Math.abs(l.duracao - l.arquivo) <= 1.5 &&
      l.versaoNovaAtiva &&
      l.capa !== false &&
      l.privado &&
      dominios.length > 0
    linhas.push({ ...l, ok })
    console.log(JSON.stringify({ ...l, ok }))
  }
  gravarJson('verificacao.json', linhas)
  console.log(JSON.stringify({ videos: linhas.length, ok: linhas.filter((l) => l.ok).length }))
} else if (passo === 'zappy') {
  // A transcrição do vídeo alimenta a base de conhecimento do Zappy. Ela vem da legenda que o
  // Vimeo gera para a versão nova; quem a leva para a base é o Admin (só leitura aqui).
  const inspecao = lerJson<Inspecao>('inspecao.json')
  const linhas = []
  for (const a of inspecao.aulas)
    for (const p of a.partes)
      for (const v of p.videos) {
        const id = /video\/(\d+)/.exec(v.src)?.[1]
        if (!id) continue
        const faixas = (await vimeo(`/videos/${id}/texttracks?per_page=100`)).data as {
          type: string
          language: string
          active: boolean
        }[]
        const legenda = faixas.filter((f) => ['captions', 'subtitles'].includes(f.type))
        linhas.push({
          parte: `${a.aula}-${p.parte}`,
          id,
          blockId: v.blockId,
          legendas: legenda.map((f) => `${f.type}:${f.language}${f.active ? '' : ' (inativa)'}`),
        })
      }
  const base = await membros<{
    semTranscricao: string[]
    falhas: { sourceRef: string; lessonTitle: string; error: string }[]
    semCaderno: boolean
  }>({ acao: 'zappy' })
  const aulasSem = new Set(base.semTranscricao)
  for (const l of linhas) {
    const aula = inspecao.aulas.find((a) =>
      a.partes.some((p) => p.videos.some((v) => v.blockId === l.blockId)),
    )!
    const falha = base.falhas.find((f) => f.sourceRef === `block:${l.blockId}`)
    console.log(
      JSON.stringify({
        parte: l.parte,
        legendaNoVimeo: l.legendas.length ? l.legendas : 'ainda não',
        aulaPendenteNoZappy: aulasSem.has(aula.id),
        erroNoZappy: falha?.error ?? null,
      }),
    )
  }
  gravarJson('zappy.json', { linhas, base })
  const semLegenda = linhas.filter((l) => l.legendas.length === 0).length
  console.log(
    JSON.stringify({
      videos: linhas.length,
      semLegendaNoVimeo: semLegenda,
      aulasPendentesNoZappy: base.semTranscricao.length,
      falhas: base.falhas.length,
      cursoSemCaderno: base.semCaderno,
    }),
  )
  if (semLegenda)
    console.log('Espere o Vimeo gerar as legendas (minutos) e rode este passo de novo.')
  else if (base.semTranscricao.length || base.falhas.length)
    console.log(
      `Rode: bun scripts/cursos/base-do-zappy.ts atualizar --ambiente ${ambiente} --publico ${op.publico} --curso ${op.curso}`,
    )
  else console.log('Base do Zappy em dia para este curso.')
} else if (passo === 'descartar') {
  if (!op.partes) throw new Error('descartar exige --partes (as partes travadas)')
  for (const p of await partesDoCurso()) {
    const e = estado.partes[p.chave]
    if (!e?.versao) {
      console.log(JSON.stringify({ parte: p.chave, descartada: false, motivo: 'sem versão nova' }))
      continue
    }
    const versoes = (await vimeo(`/videos/${p.id}/versions?per_page=100`)).data as {
      uri: string
      active: boolean
    }[]
    const alvo = versoes.find((x) => x.uri === e.versao)
    if (alvo?.active)
      throw new Error(`Parte ${p.chave}: a versão nova já está ativa; não há o que descartar`)
    if (alvo) await vimeo(e.versao, 'DELETE')
    for (const c of ['versao', 'uploadLink', 'enviado', 'fase', 'duracaoVimeo'] as const)
      delete e[c]
    salvar()
    console.log(
      JSON.stringify({
        parte: p.chave,
        descartada: Boolean(alvo),
        proximo: 'rode enviar com as mesmas --partes',
      }),
    )
  }
}
