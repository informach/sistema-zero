/**
 * A mídia do cadastro de um curso pelo código do próprio Admin (o mesmo do editor de aula), fora do
 * Next: roda com `--conditions=react-server` e as variáveis do serviço `admin` do ambiente na
 * memória do processo (scripts/cursos/cadastrar-curso.ts passa essas variáveis; nada é impresso).
 *
 *   bun --conditions=react-server scripts/cursos/lib/midia-no-admin.ts <pedido.json>
 *
 * Pedido `midia`: um vídeo do Vimeo por parte com vídeo (o vídeo provisório, com a capa da parte,
 * na pasta e na lista de domínios do ambiente, como o editor faz), as capas e a capa do curso no
 * R2 público e o caderno no R2 privado. O estado fica no arquivo `estado` e o passo é retomável.
 * Pedido `vozes`: a voz do Zappy de cada bloco que fala (o mesmo código do botão "Gerar a voz do
 * Zappy": reaproveita o que já existe no R2 e só gera o que falta).
 *
 * A resposta sai numa linha `SZ_MIDIA=<json>`.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { falasDaAula } from '../../../packages/admin/src/lib/voz-zappy-aula'
import { MAX_TEXTOS_POR_PEDIDO } from '../../../packages/admin/src/lib/voz-zappy-limites'
import { finishVimeoVideoSetup } from '../../../packages/admin/src/server/media'
import {
  r2ObjectExists,
  r2PutObject,
  r2PutObjectPrivate,
} from '../../../packages/admin/src/server/r2'
import {
  createUploadTicket,
  deleteVideo,
  getVideo,
  getVideoThumbnails,
  selectVideoThumbnail,
  uploadVideoThumbnail,
  vimeoFetch,
} from '../../../packages/admin/src/server/vimeo'
import { gerarVozes } from '../../../packages/admin/src/server/voz-zappy'
import { chaveDeVoz } from '../../../packages/core/src/learning/scene'

interface Parte {
  chave: string
  capa: string
}
interface PedidoMidia {
  acao: 'midia'
  estado: string
  nomeDoCurso: string
  data: string
  videoProvisorio: string
  prefixoR2: string
  partes: Parte[]
  caderno: string
  capaDoCurso: string
  /** Partes cujo vídeo travou no processamento do Vimeo: apaga o vídeo e envia de novo. */
  refazer: string[]
}
interface PedidoVozes {
  acao: 'vozes'
  blocos: { id: string; content: unknown }[]
}
interface Video {
  nome: string
  fase: 'reservado' | 'criado' | 'enviado'
  id?: string
  uri?: string
  uploadLink?: string
  embedUrl?: string
  capa?: string
  capaSha?: string
  status?: string
  duracao?: number | null
  capaAtiva?: boolean
}
interface Arquivo {
  url: string
  sha256: string
  bytes: number
}
interface Estado {
  videos: Record<string, Video>
  capas: Record<string, Arquivo>
  caderno?: Arquivo
  capaDoCurso?: Arquivo
}

const pedido = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as PedidoMidia | PedidoVozes
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

async function midia(p: PedidoMidia) {
  const estado: Estado = existsSync(p.estado)
    ? JSON.parse(readFileSync(p.estado, 'utf8'))
    : { videos: {}, capas: {} }
  const salvar = () => writeFileSync(p.estado, `${JSON.stringify(estado, null, 2)}\n`)
  const provisorio = readFileSync(p.videoProvisorio)
  if (provisorio.length > 200_000) throw new Error('O vídeo provisório deveria ter poucos KB')
  for (const chave of p.refazer) {
    const v = estado.videos[chave]
    if (!v) continue
    if (v.status === 'available')
      throw new Error(`Parte ${chave}: o vídeo está pronto; nada a refazer`)
    if (v.id) await deleteVideo(v.id)
    delete estado.videos[chave]
    salvar()
  }

  // Acha pelo nome exato um vídeo cuja criação foi pedida e não teve resposta (a lista paginada,
  // nunca a busca textual do Vimeo).
  async function reconciliar(nome: string) {
    const achados: { uri: string; upload?: { upload_link?: string }; player_embed_url?: string }[] =
      []
    let caminho: string | null =
      '/me/videos?per_page=100&sort=date&direction=desc&fields=uri,name,upload,player_embed_url'
    for (let i = 0; caminho && i < 5; i++) {
      const pagina: {
        data: {
          uri: string
          name: string
          upload?: { upload_link?: string }
          player_embed_url?: string
        }[]
        paging?: { next?: string | null }
      } = await vimeoFetch(caminho)
      achados.push(...pagina.data.filter((v) => v.name === nome))
      caminho = pagina.paging?.next ?? null
    }
    return achados
  }

  async function video(parte: Parte) {
    const nome = `${p.nomeDoCurso} | Aula ${parte.chave.split('-')[0]} Parte ${parte.chave.split('-')[1]} | provisório | ${p.data}`
    let v = estado.videos[parte.chave]
    if (!v) {
      v = estado.videos[parte.chave] = { nome, fase: 'reservado' }
      salvar()
      const t = await createUploadTicket({ sizeBytes: provisorio.length, name: nome })
      Object.assign(v, {
        fase: 'criado',
        id: t.vimeoVideoId,
        uri: t.uri,
        uploadLink: t.uploadLink,
        embedUrl: t.embedUrl,
      })
      salvar()
      await finishVimeoVideoSetup(t.vimeoVideoId)
    }
    if (v.fase === 'reservado') {
      const achados = await reconciliar(v.nome)
      if (achados.length !== 1 || !achados[0]!.upload?.upload_link)
        throw new Error(
          `Parte ${parte.chave}: ${achados.length} vídeos com o nome reservado; confira no Vimeo`,
        )
      const id = achados[0]!.uri.split('/').at(-1)!
      Object.assign(v, {
        fase: 'criado',
        id,
        uri: achados[0]!.uri,
        uploadLink: achados[0]!.upload.upload_link,
        embedUrl: achados[0]!.player_embed_url,
      })
      salvar()
      await finishVimeoVideoSetup(id)
    }
    if (v.fase === 'criado') {
      const h = await fetch(v.uploadLink!, {
        method: 'HEAD',
        headers: { 'Tus-Resumable': '1.0.0' },
        signal: AbortSignal.timeout(45_000),
      })
      if (!h.ok) throw new Error(`Parte ${parte.chave}: envio TUS (HEAD ${h.status})`)
      const feito = Number(h.headers.get('upload-offset'))
      if (!Number.isInteger(feito) || feito < 0 || feito > provisorio.length)
        throw new Error('Envio TUS: posição inválida')
      if (feito < provisorio.length) {
        const r = await fetch(v.uploadLink!, {
          method: 'PATCH',
          headers: {
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': String(feito),
            'Content-Type': 'application/offset+octet-stream',
          },
          body: provisorio.subarray(feito),
          signal: AbortSignal.timeout(45_000),
        })
        if (!r.ok || Number(r.headers.get('upload-offset')) !== provisorio.length)
          throw new Error(`Parte ${parte.chave}: envio TUS (PATCH ${r.status})`)
      }
      v.fase = 'enviado'
      salvar()
    }
    const capa = readFileSync(parte.capa)
    if (v.capaSha !== sha(capa)) {
      v.capa = await uploadVideoThumbnail(
        v.id!,
        capa.buffer.slice(capa.byteOffset, capa.byteOffset + capa.byteLength) as ArrayBuffer,
        'image/png',
      )
      v.capaSha = sha(capa)
      salvar()
    }
  }

  async function conferir(chave: string) {
    const v = estado.videos[chave]!
    const atual = await getVideo(v.id!)
    v.status = atual.status
    v.duracao = atual.duration
    v.embedUrl = atual.embedUrl
    if (atual.status === 'available') {
      let ativa = (await getVideoThumbnails(v.id!)).current?.id
      if (ativa !== v.capa) {
        await selectVideoThumbnail(v.id!, v.capa!)
        ativa = (await getVideoThumbnails(v.id!)).current?.id
      }
      v.capaAtiva = ativa === v.capa
    }
    salvar()
    return v.status === 'available' && v.capaAtiva === true && Boolean(v.duracao)
  }

  const fila = [...p.partes]
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (fila.length) await video(fila.shift()!)
    }),
  )
  // O R2 antes de esperar o Vimeo: um vídeo travado no processamento não segura o resto.
  async function publico(caminho: string, tipo: string): Promise<Arquivo> {
    const bytes = readFileSync(caminho)
    const s = sha(bytes)
    const key = `${p.prefixoR2}/${s}${caminho.slice(caminho.lastIndexOf('.'))}`
    const { url } = await r2PutObject({ key, body: bytes, contentType: tipo })
    if (!(await r2ObjectExists(key))) throw new Error(`O R2 não guardou ${key}`)
    return { url, sha256: s, bytes: bytes.length }
  }
  for (const parte of p.partes) {
    const s = sha(readFileSync(parte.capa))
    if (estado.capas[parte.chave]?.sha256 !== s) {
      estado.capas[parte.chave] = await publico(parte.capa, 'image/png')
      salvar()
    }
  }
  const capaDoCurso = readFileSync(p.capaDoCurso)
  if (estado.capaDoCurso?.sha256 !== sha(capaDoCurso)) {
    estado.capaDoCurso = await publico(
      p.capaDoCurso,
      p.capaDoCurso.endsWith('.png') ? 'image/png' : 'image/jpeg',
    )
    salvar()
  }
  const caderno = readFileSync(p.caderno)
  if (estado.caderno?.sha256 !== sha(caderno)) {
    const key = `${p.prefixoR2}/${sha(caderno)}.pdf`
    await r2PutObjectPrivate({ key, body: caderno, contentType: 'application/pdf' })
    estado.caderno = { url: `r2priv:${key}`, sha256: sha(caderno), bytes: caderno.length }
    salvar()
  }
  // O Vimeo processa em segundos um vídeo de 2 s; espera até 15 min no total. Um vídeo que passar
  // disso travou (aconteceu no Jardim e no Moedas): --refazer <parte> apaga e envia de novo.
  const prazo = Date.now() + 15 * 60_000
  let faltam = p.partes.map((x) => x.chave)
  while (faltam.length && Date.now() < prazo) {
    const prontos = await Promise.all(faltam.map(conferir))
    faltam = faltam.filter((_, i) => !prontos[i])
    if (faltam.length) await esperar(10_000)
  }
  if (faltam.length)
    throw new Error(
      `Vídeos ainda não prontos no Vimeo: ${faltam.join(', ')}. Rode de novo; se continuar "processando", use --refazer ${faltam.join(',')}`,
    )
  return {
    videos: Object.entries(estado.videos).map(([chave, v]) => ({
      chave,
      id: v.id,
      status: v.status,
      duracao: v.duracao,
      capaAtiva: v.capaAtiva,
    })),
    capas: Object.keys(estado.capas).length,
    capaDoCurso: Boolean(estado.capaDoCurso),
    caderno: estado.caderno?.bytes,
  }
}

async function vozes(p: PedidoVozes) {
  const falas = falasDaAula(p.blocos as Parameters<typeof falasDaAula>[0])
  const unicas = [
    ...new Map(falas.flatMap((b) => b.falas).map((f) => [chaveDeVoz(f.speechText), f])).values(),
  ]
  const dicionario: Record<string, string> = {}
  let geradas = 0
  let reaproveitadas = 0
  let longasDemais = 0
  for (let i = 0; i < unicas.length; i += MAX_TEXTOS_POR_PEDIDO) {
    const r = await gerarVozes(unicas.slice(i, i + MAX_TEXTOS_POR_PEDIDO))
    Object.assign(dicionario, r.vozes)
    geradas += r.geradas
    reaproveitadas += r.reaproveitadas
    longasDemais += r.longasDemais
  }
  // Como o botão: só as falas de cada bloco, e só as que voltaram.
  const porBloco: Record<string, Record<string, string>> = {}
  for (const b of falas) {
    const d: Record<string, string> = {}
    for (const f of b.falas) {
      const url = dicionario[chaveDeVoz(f.speechText)]
      if (url) d[chaveDeVoz(f.speechText)] = url
    }
    if (Object.keys(d).length) porBloco[b.id] = d
  }
  for (const url of new Set(Object.values(dicionario))) {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20_000) })
    if (!r.ok || !r.headers.get('content-type')?.startsWith('audio/'))
      throw new Error(`O áudio do Zappy não está acessível: ${url}`)
  }
  const semVoz = unicas.length - Object.keys(dicionario).length
  return { vozes: porBloco, falas: unicas.length, geradas, reaproveitadas, longasDemais, semVoz }
}

const resposta = pedido.acao === 'midia' ? await midia(pedido) : await vozes(pedido)
console.log(`SZ_MIDIA=${JSON.stringify(resposta)}`)
