import 'server-only'
import { MAX_RECURSOS_TERRENO } from '@sistemazero/molda-cenarios-core/v2'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation, isSupportSession } from '../lib/act'
import { avatarLinkWindow } from '../lib/avatar-link-window'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { SessionUser } from '../lib/types'
import {
  type ConferenciaDeUpload,
  ConteudoDeCenarioInvalido,
  conferirUploadDeCenario,
  type TipoDeArquivoDeCenario,
} from '../server/cenarios-conteudo'
import type { GatewayModule, GatewayResponse } from '../server/gateway'
import { r2DeleteObjectsUgc, r2GetObjectUgc, r2PresignGetUgc, r2PresignPutUgc } from '../server/r2'
import { readJsonBodyWithLimit } from '../server/read-json-body'
import type { SessionModule } from '../server/session'
import { criarPublicacoesDeCenariosBff } from './cenarios-publicacoes'
import { criarLeituraDeCenariosDoJogo } from './cenarios-publicados-jogo'

export type CenariosRoutes = ReturnType<typeof createCenariosRoutes>

/** Os mesmos tetos da borda (`cenarios-routes.ts` do gateway). */
const CORPO_PEQUENO = 64 * 1024
const CORPO_DO_LOTE = 8 * 1024 * 1024 + 64 * 1024
const CORPO_DO_REGISTRO = 256 * 1024
/** Um modelo de 64 MB numa conexão ruim: o envio direto tem 15 minutos. */
const ENVIO_VALE_SEGUNDOS = 900
/** Conferências em paralelo no armazenamento ao registrar um lote de modelos. */
const CONFERENCIAS_JUNTAS = 2
/** Por quanto tempo "esta pessoa pode ler este espaço" fica lembrado (a gaveta pede centenas de retratos). */
const LEITURA_LEMBRADA_MS = 60_000
const LEITURAS_LEMBRADAS_MAX = 5_000

const U = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const D = '[a-f0-9]{64}'
const Uuid = z.string().regex(new RegExp(`^${U}$`, 'i'))
const Digest = z.string().regex(new RegExp(`^${D}$`))

/** O que só passa adiante: a regra (quem pode, cota, revisão) é do members. */
interface Repasse {
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  caminho: RegExp
  /** Teto do corpo; `null` = a rota não lê corpo. */
  corpo?: number | null
  consulta?: readonly string[]
}
const exato = (padrao: string) => new RegExp(`^${padrao}$`, 'i')
const REPASSES: readonly Repasse[] = [
  { metodo: 'GET', caminho: exato('acesso') },
  { metodo: 'GET', caminho: exato('espacos') },
  { metodo: 'POST', caminho: exato('publicacoes/preparar') },
  { metodo: 'GET', caminho: exato(`espacos/${U}/bibliotecas`) },
  { metodo: 'POST', caminho: exato(`espacos/${U}/bibliotecas`) },
  { metodo: 'POST', caminho: exato(`espacos/${U}/biblioteca-molda`), corpo: null },
  { metodo: 'PATCH', caminho: exato(`bibliotecas/${U}`) },
  { metodo: 'GET', caminho: exato(`bibliotecas/${U}/organizacao`) },
  {
    metodo: 'GET',
    caminho: exato(`bibliotecas/${U}/modelos`),
    consulta: ['busca', 'pasta', 'digest', 'cursor', 'limite'],
  },
  { metodo: 'PATCH', caminho: exato(`modelos/${U}`) },
  { metodo: 'PATCH', caminho: exato(`texturas/${U}`) },
  {
    metodo: 'GET',
    caminho: exato(`bibliotecas/${U}/conjuntos`),
    consulta: ['busca', 'pasta', 'cursor', 'limite'],
  },
  { metodo: 'POST', caminho: exato(`bibliotecas/${U}/conjuntos`), corpo: CORPO_DO_LOTE },
  { metodo: 'GET', caminho: exato(`conjuntos/${U}`) },
  { metodo: 'GET', caminho: exato(`conjuntos/${U}/versoes/[1-9][0-9]{0,9}`) },
  { metodo: 'PATCH', caminho: exato(`conjuntos/${U}`) },
  { metodo: 'POST', caminho: exato(`conjuntos/${U}/editar`), corpo: null },
  { metodo: 'POST', caminho: exato(`conjuntos/${U}/publicar`), corpo: CORPO_DO_LOTE },
  {
    metodo: 'GET',
    caminho: exato(`bibliotecas/${U}/texturas`),
    consulta: ['busca', 'pasta', 'digest', 'cursor', 'limite'],
  },
  { metodo: 'GET', caminho: exato(`espacos/${U}/mundos`) },
  { metodo: 'GET', caminho: exato(`mundos/${U}`) },
  { metodo: 'POST', caminho: exato(`espacos/${U}/mundos`) },
  { metodo: 'PATCH', caminho: exato(`mundos/${U}`) },
  { metodo: 'DELETE', caminho: exato(`mundos/${U}`), corpo: null },
  { metodo: 'GET', caminho: exato(`mundos/${U}/cenarios`) },
  { metodo: 'POST', caminho: exato(`mundos/${U}/cenarios`) },
  { metodo: 'GET', caminho: exato(`cenarios/${U}`) },
  { metodo: 'POST', caminho: exato(`cenarios/${U}/exportacao`), corpo: 1024 },
  { metodo: 'GET', caminho: exato(`cenarios/${U}/historico`) },
  { metodo: 'GET', caminho: exato(`cenarios/${U}/revisoes`), consulta: ['antes'] },
  { metodo: 'POST', caminho: exato(`cenarios/${U}/historico`) },
  { metodo: 'POST', caminho: exato(`cenarios/${U}/restaurar`) },
  { metodo: 'DELETE', caminho: exato(`cenarios/${U}`), corpo: null },
  { metodo: 'POST', caminho: exato(`cenarios/${U}/lotes`), corpo: CORPO_DO_LOTE },
  { metodo: 'POST', caminho: exato(`cenarios/${U}/duplicar`), corpo: null },
]

const RESERVAR_MODELOS = exato(`bibliotecas/(${U})/modelos/reservar`)
const REGISTRAR_MODELOS = exato(`bibliotecas/(${U})/modelos`)
const RESERVAR_TEXTURAS = exato(`bibliotecas/(${U})/texturas/reservar`)
const REGISTRAR_TEXTURAS = exato(`bibliotecas/(${U})/texturas`)
const APAGAR_TEXTURAS = exato(`bibliotecas/(${U})/texturas/apagar`)
const APAGAR_MODELOS = exato(`bibliotecas/(${U})/modelos/apagar`)
const APAGAR_BIBLIOTECA = exato(`bibliotecas/(${U})`)
const RESERVAR_CAPA = exato(`cenarios/(${U})/capa/reservar`)
const DEFINIR_CAPA = exato(`cenarios/(${U})/capa`)
const RESERVAR_MINIATURA_CONJUNTO = exato(
  `conjuntos/(${U})/versoes/([1-9][0-9]{0,9})/miniatura/reservar`,
)
const MINIATURA_CONJUNTO = exato(`conjuntos/(${U})/versoes/([1-9][0-9]{0,9})/miniatura`)
const RESERVAR_RECURSOS = exato(`cenarios/(${U})/recursos/reservar`)
const GRAVAR_LOTE = exato(`cenarios/(${U})/lotes`)
const ARQUIVO = new RegExp(`^espacos/(${U})/arquivos/(${D})$`, 'i')

const RegistrarBody = z.object({
  espacoId: Uuid,
  modelos: z
    .array(z.looseObject({ digest: Digest, miniatura: Digest.nullish() }))
    .min(1)
    .max(50),
})
const CapaBody = z.object({ espacoId: Uuid, digest: Digest })
const RetratoBody = CapaBody.extend({ revisao: z.number().int().min(0).max(2147483647) })
const RetratoGuardadoBody = z.object({
  revisao: z.number().int().min(0).max(2147483647),
  digest: Digest,
  atual: z.boolean(),
})
const LoteComRecursosBody = z
  .object({
    revisaoEsperada: z.number().int().nonnegative(),
    operacaoId: z
      .string()
      .min(8)
      .max(80)
      .regex(/^[A-Za-z0-9_-]+$/),
    comandos: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
    recursos: z
      .object({ espacoId: Uuid, digests: z.array(Digest).min(1).max(MAX_RECURSOS_TERRENO) })
      .strict(),
  })
  .strict()
const TexturasBody = z.object({
  espacoId: Uuid,
  texturas: z
    .array(z.looseObject({ digest: Digest }))
    .min(1)
    .max(50),
})

/** O que o members devolve numa reserva: onde cada arquivo que falta deve ser posto. */
const Reserva = z.object({
  espacoId: Uuid,
  enviar: z.array(
    z.object({
      digest: Digest,
      tipo: z.enum([
        'modelo',
        'miniatura',
        'capa',
        'textura',
        'terreno',
        'manifesto-compilado',
        'recurso-compilado',
      ]),
      bytes: z.number().int().min(1),
      chave: z.string(),
      tipoDoConteudo: z.string(),
    }),
  ),
})
const Apagados = z.object({ apagar: z.array(z.string()) })
const CHAVE_DE_ARQUIVO = /^cenarios\/([0-9a-f-]{36})\/blobs\/([a-f0-9]{64})$/

const ArquivoGuardado = z.object({
  chave: z.string(),
  tipoDoConteudo: z.enum([
    'model/gltf-binary',
    'image/webp',
    'image/png',
    'application/octet-stream',
  ]),
  bytes: z.number().int().positive(),
})

interface Armazenamento {
  presignPut: typeof r2PresignPutUgc
  presignGet: typeof r2PresignGetUgc
  abrir: typeof r2GetObjectUgc
  apagar: typeof r2DeleteObjectsUgc
}

const erro = (status: number, code: string, message: string) =>
  privado(NextResponse.json({ error: { code, message } }, { status }))
const invalido = () => erro(400, 'VALIDATION_ERROR', 'Requisição inválida')
const semRota = () => erro(404, 'NOT_FOUND', 'Não achei isso')

function privado(resposta: NextResponse) {
  resposta.headers.set('cache-control', 'private, no-store')
  return resposta
}

function repasse(r: GatewayResponse) {
  const headers = r.retryAfter ? { 'retry-after': r.retryAfter } : undefined
  if (r.body !== null && r.body !== undefined)
    return privado(NextResponse.json(r.body, { status: r.status, headers }))
  // 204 e afins viram um corpo pequeno: o cliente sempre lê JSON.
  if (r.status >= 200 && r.status < 300)
    return privado(NextResponse.json({ ok: true }, { headers }))
  return privado(
    NextResponse.json(
      {
        error: {
          code: 'CENARIOS_INDISPONIVEL',
          message: 'Não consegui falar com a oficina agora.',
        },
      },
      { status: r.status, headers },
    ),
  )
}

async function corpoJson(
  req: Request,
  teto: number,
): Promise<{ ok: true; corpo: unknown } | { ok: false }> {
  try {
    return { ok: true, corpo: await readJsonBodyWithLimit(req, teto, req.signal) }
  } catch {
    return { ok: false }
  }
}

/** Depois da resposta quando dá (`after` do Next); fora de um pedido do Next, em seguida. */
function depois(tarefa: () => Promise<void>): void {
  const rodar = () => tarefa().catch(() => undefined)
  try {
    after(rodar)
  } catch {
    void rodar()
  }
}

/** A chave do arquivo: por conteúdo e dentro do espaço (o mesmo `chaveDoBlob` do members). */
export const chaveDoArquivoDoCenario = (espacoId: string, digest: string) =>
  `cenarios/${espacoId.toLowerCase()}/blobs/${digest}`

/** Quem pede, como o members precisa saber nas rotas internas (o BFF leu a sessão). */
function atorDe(user: SessionUser) {
  return {
    usuarioId: user.id,
    contaId: user.activeProfile?.accountId ?? user.id,
    equipe: isPrivilegedRole(user.role) && user.status === 'active',
    suporte: isSupportSession(user),
    // Sessão de perfil (a criança no Kids): o acervo da equipe e a publicação ficam de fora.
    perfil: Boolean(user.activeProfile),
  }
}

const LEMBRADAS = Symbol.for('sz.cenarios.leituras')
function leiturasLembradas(): Map<string, number> {
  const g = globalThis as { [LEMBRADAS]?: Map<string, number> }
  g[LEMBRADAS] ??= new Map()
  return g[LEMBRADAS]
}

/**
 * BFF do Molda Cenários (a oficina de cenários 3D). O navegador fala só com `/api/cenarios/*`:
 *
 * - quase tudo é repasse ao members pelo gateway, com a sessão (quem pode usar, de quem é cada
 *   espaço, cota e revisão são decididos lá);
 * - o navegador envia os arquivos direto ao armazenamento, por uma assinatura com tamanho,
 *   tipo e criação única. Este servidor depois confere o conteúdo por leitura incremental;
 * - quem afirma ao members que o arquivo chegou é este servidor, depois de olhar o
 *   armazenamento (rotas internas com HMAC). O navegador não tem como afirmar isso;
 * - ler um arquivo é um redirecionamento para um endereço assinado (ou o próprio endereço, com
 *   `?como=endereco`), igual dentro da mesma janela de 6 horas, para a gaveta de modelos e os
 *   modelos do cenário saírem do cache do navegador.
 */
export function createCenariosRoutes(deps: {
  gateway: Pick<GatewayModule, 'gatewayFetch' | 'gatewayFetchHmac'>
  session: SessionModule
  armazenamento?: Armazenamento
  /** Só testes: onde a limpeza do armazenamento é agendada. */
  depois?: (tarefa: () => Promise<void>) => void
  agora?: () => number
}) {
  const { gateway, session } = deps
  const armazenamento: Armazenamento = deps.armazenamento ?? {
    presignPut: r2PresignPutUgc,
    presignGet: r2PresignGetUgc,
    abrir: r2GetObjectUgc,
    apagar: r2DeleteObjectsUgc,
  }
  const agendar = deps.depois ?? depois
  const agora = deps.agora ?? Date.now
  const arquivosLembrados = new Map<string, { ate: number; tipoDoConteudo: string }>()

  /** O perfil que fez o pedido ainda é o da sessão? (irmão que entrou com um envio em voo) */
  async function mesmaPessoa(req: Request, user: SessionUser | null): Promise<NextResponse | null> {
    const afirmado = req.headers.get('x-sz-viewer')
    if (!afirmado || !user || user.id === afirmado) return null
    return erro(409, 'VIEWER_MISMATCH', 'A sessão trocou de perfil.')
  }

  /** Sessão de suporte que não foi elevada só olha. */
  function soLeitura(user: SessionUser | null): NextResponse | null {
    return isReadonlyImpersonation(user)
      ? erro(403, 'IMPERSONATION_READONLY', 'Sessão de suporte é só leitura.')
      : null
  }

  const members = (caminho: string) => `/members/cenarios/${caminho}`

  /** Troca cada chave da reserva por um endereço assinado de envio. */
  async function comEnderecos(r: GatewayResponse): Promise<NextResponse> {
    if (r.status !== 200) return repasse(r)
    const reserva = Reserva.safeParse(r.body)
    if (!reserva.success)
      return erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
    const { espacoId, enviar } = reserva.data
    const arquivos = await Promise.all(
      enviar.map(async (a) => {
        // A chave vem do members, mas só assino a que é mesmo deste espaço e deste conteúdo.
        if (a.chave !== chaveDoArquivoDoCenario(espacoId, a.digest)) return null
        return {
          digest: a.digest,
          tipo: a.tipo,
          bytes: a.bytes,
          tipoDoConteudo: a.tipoDoConteudo,
          criarUmaVez: true,
          url: await armazenamento.presignPut({
            key: a.chave,
            contentType: a.tipoDoConteudo,
            contentLength: a.bytes,
            expiresInSeconds: ENVIO_VALE_SEGUNDOS,
            criarUmaVez: true,
          }),
        }
      }),
    )
    if (arquivos.some((a) => a === null))
      return erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
    return privado(NextResponse.json({ espacoId, enviar: arquivos }))
  }

  /** Só confirma bytes recebidos, por hash e formato. Nunca basta a existência da chave. */
  async function conferir(
    espacoId: string,
    referencias: readonly { digest: string; tipo: TipoDeArquivoDeCenario }[],
    pedido: Request,
  ): Promise<ConferenciaDeUpload[]> {
    const unicos = [...new Map(referencias.map((r) => [r.digest, r])).values()]
    const achados: ConferenciaDeUpload[] = []
    let falha: unknown = null
    let proximo = 0
    const controle = new AbortController()
    const sinal = AbortSignal.any([pedido.signal, controle.signal, AbortSignal.timeout(120_000)])
    await Promise.all(
      Array.from({ length: Math.min(CONFERENCIAS_JUNTAS, unicos.length) }, async () => {
        while (proximo < unicos.length && !falha) {
          const ref = unicos[proximo++]!
          try {
            const objeto = await armazenamento.abrir(
              chaveDoArquivoDoCenario(espacoId, ref.digest),
              sinal,
            )
            if (!objeto) continue
            achados.push(await conferirUploadDeCenario(objeto, ref.digest, ref.tipo, sinal))
          } catch (erro) {
            if (!falha) {
              falha = erro
              controle.abort(erro)
            }
          }
        }
      }),
    )
    if (falha) throw falha
    return achados
  }
  const semConferencia = () =>
    erro(503, 'CENARIOS_ARMAZENAMENTO', 'Não consegui conferir os arquivos agora. Tente de novo.')
  const conferenciaRecusada = (e: unknown) =>
    e instanceof ConteudoDeCenarioInvalido
      ? erro(422, 'CENARIO_ARQUIVO_INVALIDO', e.message)
      : semConferencia()

  /** O members disse quais arquivos ficaram sem dono: saem do armazenamento depois da resposta.
   * Só depois de apagar o members libera o mesmo hash para uma nova reserva (até lá, uma reserva
   * dele espera): sem isso, um envio no meio do caminho seria confirmado e apagado em seguida. */
  function soltar(
    user: SessionUser | null,
    r: GatewayResponse,
    retrato?: z.infer<typeof RetratoGuardadoBody>,
  ): NextResponse {
    if (r.status !== 200) return repasse(r)
    const apagados = Apagados.safeParse(r.body)
    const chaves = apagados.success
      ? apagados.data.apagar.filter((c) => CHAVE_DE_ARQUIVO.test(c))
      : []
    if (chaves.length) {
      // Sem sessão o gateway já recusou antes; sem ator, a marca vence sozinha em 10 minutos.
      const ator = user ? atorDe(user) : null
      agendar(async () => {
        try {
          await armazenamento.apagar(chaves)
        } catch (error) {
          console.warn('[cenarios] não apagou arquivos soltos', { quantos: chaves.length, error })
          return
        }
        if (!ator) return
        const porEspaco = new Map<string, string[]>()
        for (const c of chaves) {
          const [, espacoId, digest] = CHAVE_DE_ARQUIVO.exec(c)!
          porEspaco.set(espacoId!, [...(porEspaco.get(espacoId!) ?? []), digest!])
        }
        for (const [espacoId, digests] of porEspaco)
          for (let i = 0; i < digests.length; i += 2000)
            await gateway
              .gatewayFetchHmac('/members/internal/cenarios/arquivos/sairam', {
                method: 'POST',
                body: { ator, espacoId, digests: digests.slice(i, i + 2000) },
              })
              .catch((error: unknown) =>
                console.warn('[cenarios] não liberou arquivos apagados', { espacoId, error }),
              )
      })
    }
    return privado(NextResponse.json(retrato ?? { ok: true }))
  }

  async function podeLer(user: SessionUser, espacoId: string): Promise<boolean | NextResponse> {
    const lembradas = leiturasLembradas()
    const chave = `${user.id}:${espacoId}`
    const ate = lembradas.get(chave)
    if (ate !== undefined && ate > agora()) return true
    const r = await gateway.gatewayFetch<Array<{ id?: unknown }>>(members('espacos'))
    if (r.status !== 200) return repasse(r)
    if (!Array.isArray(r.body))
      return erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
    const pode = r.body.some((e) => typeof e?.id === 'string' && e.id.toLowerCase() === espacoId)
    if (pode) {
      if (lembradas.size >= LEITURAS_LEMBRADAS_MAX) lembradas.clear()
      lembradas.set(chave, agora() + LEITURA_LEMBRADA_MS)
    }
    return pode
  }

  async function lerArquivo(req: Request, user: SessionUser, espacoId: string, digest: string) {
    const permitido = await podeLer(user, espacoId)
    if (permitido !== true) return permitido === false ? semRota() : permitido
    const consulta = new URL(req.url).searchParams
    const chave = chaveDoArquivoDoCenario(espacoId, digest)
    const chaveDaLembranca = `${user.id}:${espacoId}:${digest}`
    let arquivo = arquivosLembrados.get(chaveDaLembranca)
    if (!arquivo || arquivo.ate <= agora()) {
      const resposta = await gateway.gatewayFetch(members(`espacos/${espacoId}/arquivos/${digest}`))
      if (resposta.status !== 200) return repasse(resposta)
      const lido = ArquivoGuardado.safeParse(resposta.body)
      if (!lido.success || lido.data.chave !== chave)
        return erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
      arquivo = { ate: agora() + LEITURA_LEMBRADA_MS, tipoDoConteudo: lido.data.tipoDoConteudo }
      if (arquivosLembrados.size >= LEITURAS_LEMBRADAS_MAX) arquivosLembrados.clear()
      arquivosLembrados.set(chaveDaLembranca, arquivo)
    }
    const janela = avatarLinkWindow(agora())
    const url = await armazenamento.presignGet(chave, {
      expiresInSeconds: janela.expiresInSeconds,
      signingDate: janela.signingDate,
      responseCacheControl: janela.fileCacheControl,
      // O MIME confirmado do arquivo, nunca o tipo afirmado pelo navegador.
      responseContentType: arquivo.tipoDoConteudo,
    })
    // A imagem segue o redirecionamento. O modelo é baixado por `fetch`, que levaria os
    // cabeçalhos da sessão ao armazenamento (e o navegador barraria): a oficina pede o endereço
    // e busca o arquivo sem eles.
    const resposta =
      consulta.get('como') === 'endereco'
        ? NextResponse.json({ url })
        : NextResponse.redirect(url, 302)
    resposta.headers.set('cache-control', `private, max-age=${janela.redirectMaxAgeSeconds}`)
    return resposta
  }

  const leituraDoJogo = criarLeituraDeCenariosDoJogo({
    gateway,
    assinar: armazenamento.presignGet,
    agora,
    ator: atorDe,
    responder: repasse,
    erro,
  })
  const publicacoes = criarPublicacoesDeCenariosBff({
    gateway,
    abrir: armazenamento.abrir,
    chave: chaveDoArquivoDoCenario,
    ator: atorDe,
    lerCorpo: corpoJson,
    assinar: comEnderecos,
    responder: repasse,
    erro,
  })

  async function atender(
    metodo: Repasse['metodo'],
    req: Request,
    ctx: { params: Promise<{ caminho: string[] }> },
  ): Promise<NextResponse> {
    const caminho = (await ctx.params).caminho.join('/')
    const user = await session.getSession()
    const trocou = await mesmaPessoa(req, user)
    if (trocou) return trocou
    if (metodo !== 'GET') {
      const recusa = soLeitura(user)
      if (recusa) return recusa
    }
    const semSessao = () => erro(401, 'UNAUTHENTICATED', 'Entre de novo para continuar.')
    const jogo = await leituraDoJogo(metodo, caminho, req, user)
    if (jogo) return jogo
    const publicada = await publicacoes(metodo, caminho, req, user)
    if (publicada) return publicada

    if (metodo === 'GET') {
      const arquivo = ARQUIVO.exec(caminho)
      if (arquivo) {
        if (!user) return semSessao()
        return lerArquivo(req, user, arquivo[1]!.toLowerCase(), arquivo[2]!.toLowerCase())
      }
    }

    if (metodo === 'POST') {
      const reservarModelos = RESERVAR_MODELOS.exec(caminho) ?? RESERVAR_TEXTURAS.exec(caminho)
      const reservarCapa = RESERVAR_CAPA.exec(caminho)
      if (
        reservarModelos ||
        reservarCapa ||
        RESERVAR_RECURSOS.test(caminho) ||
        RESERVAR_MINIATURA_CONJUNTO.test(caminho)
      ) {
        const lido = await corpoJson(req, CORPO_PEQUENO)
        if (!lido.ok) return invalido()
        return comEnderecos(
          await gateway.gatewayFetch(members(caminho), { method: 'POST', body: lido.corpo }),
        )
      }

      const lote = GRAVAR_LOTE.exec(caminho)
      if (lote) {
        if (!user) return semSessao()
        const lido = await corpoJson(req, CORPO_DO_LOTE)
        if (!lido.ok) return invalido()
        if (!lido.corpo || typeof lido.corpo !== 'object' || Array.isArray(lido.corpo))
          return invalido()
        if (!Object.hasOwn(lido.corpo, 'recursos'))
          return repasse(
            await gateway.gatewayFetch(members(caminho), { method: 'POST', body: lido.corpo }),
          )
        const corpo = LoteComRecursosBody.safeParse(lido.corpo)
        if (!corpo.success) return invalido()
        const espacoId = corpo.data.recursos.espacoId.toLowerCase()
        const permitido = await podeLer(user, espacoId)
        if (permitido !== true) return permitido === false ? semRota() : permitido
        // Autoriza o cenário antes de ler o bucket; ler um espaço não permite editar outro cenário.
        const cenario = await gateway.gatewayFetch(members(`cenarios/${lote[1]}`), {
          method: 'GET',
        })
        if (cenario.status !== 200) return repasse(cenario)
        const dono = cenario.body as { espacoId?: unknown } | null
        if (dono?.espacoId !== espacoId) return semRota()
        let conferidos: ConferenciaDeUpload[]
        try {
          conferidos = await conferir(
            espacoId,
            corpo.data.recursos.digests.map((digest) => ({ digest, tipo: 'terreno' as const })),
            req,
          )
        } catch (e) {
          return conferenciaRecusada(e)
        }
        if (conferidos.length !== new Set(corpo.data.recursos.digests).size)
          return erro(409, 'CENARIO_ARQUIVO_AUSENTE', 'Faltam peças do relevo; envie de novo')
        const { recursos: _recursos, ...dados } = corpo.data
        return repasse(
          await gateway.gatewayFetchHmac('/members/internal/cenarios/lotes', {
            method: 'POST',
            body: {
              ator: atorDe(user),
              cenarioId: lote[1]!.toLowerCase(),
              espacoId,
              lote: dados,
              conferidos,
            },
          }),
        )
      }

      const registrar = REGISTRAR_MODELOS.exec(caminho)
      if (registrar) {
        if (!user) return semSessao()
        const lido = await corpoJson(req, CORPO_DO_REGISTRO)
        const corpo = lido.ok ? RegistrarBody.safeParse(lido.corpo) : null
        if (!corpo?.success) return invalido()
        const espacoId = corpo.data.espacoId.toLowerCase()
        const permitido = await podeLer(user, espacoId)
        if (permitido !== true) return permitido === false ? semRota() : permitido
        let conferidos: ConferenciaDeUpload[]
        try {
          conferidos = await conferir(
            espacoId,
            corpo.data.modelos.flatMap((m) => [
              { digest: m.digest, tipo: 'modelo' as const },
              ...(m.miniatura ? [{ digest: m.miniatura, tipo: 'miniatura' as const }] : []),
            ]),
            req,
          )
        } catch (e) {
          return conferenciaRecusada(e)
        }
        const presentes = new Set(conferidos.map((c) => c.digest))
        if (corpo.data.modelos.some((m) => !presentes.has(m.digest)))
          return erro(409, 'CENARIO_ARQUIVO_AUSENTE', 'Faltam arquivos de modelos; envie de novo')
        return repasse(
          await gateway.gatewayFetchHmac('/members/internal/cenarios/modelos', {
            method: 'POST',
            body: {
              ator: atorDe(user),
              bibliotecaId: registrar[1]!.toLowerCase(),
              espacoId,
              modelos: corpo.data.modelos.map((m) => ({
                ...m,
                miniatura: m.miniatura && presentes.has(m.miniatura) ? m.miniatura : null,
              })),
              conferidos,
            },
          }),
        )
      }

      const texturas = REGISTRAR_TEXTURAS.exec(caminho)
      if (texturas) {
        if (!user) return semSessao()
        const lido = await corpoJson(req, CORPO_DO_REGISTRO)
        const corpo = lido.ok ? TexturasBody.safeParse(lido.corpo) : null
        if (!corpo?.success) return invalido()
        const espacoId = corpo.data.espacoId.toLowerCase()
        const permitido = await podeLer(user, espacoId)
        if (permitido !== true) return permitido === false ? semRota() : permitido
        let conferidos: ConferenciaDeUpload[]
        try {
          conferidos = await conferir(
            espacoId,
            corpo.data.texturas.map((t) => ({ digest: t.digest, tipo: 'textura' as const })),
            req,
          )
        } catch (e) {
          return conferenciaRecusada(e)
        }
        const presentes = new Set(conferidos.map((c) => c.digest))
        if (corpo.data.texturas.some((t) => !presentes.has(t.digest)))
          return erro(409, 'CENARIO_ARQUIVO_AUSENTE', 'Faltam imagens; envie de novo')
        return repasse(
          await gateway.gatewayFetchHmac('/members/internal/cenarios/texturas', {
            method: 'POST',
            body: {
              ator: atorDe(user),
              bibliotecaId: texturas[1]!.toLowerCase(),
              espacoId,
              texturas: corpo.data.texturas,
              conferidos,
            },
          }),
        )
      }

      const miniatura = MINIATURA_CONJUNTO.exec(caminho)
      if (miniatura) {
        if (!user) return semSessao()
        const lido = await corpoJson(req, CORPO_PEQUENO)
        const corpo = lido.ok ? CapaBody.safeParse(lido.corpo) : null
        if (!corpo?.success) return invalido()
        const espacoId = corpo.data.espacoId.toLowerCase()
        const conjunto = await gateway.gatewayFetch(members(`conjuntos/${miniatura[1]}`), {
          method: 'GET',
        })
        if (conjunto.status !== 200) return repasse(conjunto)
        if ((conjunto.body as { espacoId?: unknown } | null)?.espacoId !== espacoId)
          return semRota()
        const versao = await gateway.gatewayFetch(
          members(`conjuntos/${miniatura[1]}/versoes/${miniatura[2]}`),
          { method: 'GET' },
        )
        if (versao.status !== 200) return repasse(versao)
        let conferidos: ConferenciaDeUpload[]
        try {
          conferidos = await conferir(
            espacoId,
            [{ digest: corpo.data.digest, tipo: 'miniatura' }],
            req,
          )
        } catch (e) {
          return conferenciaRecusada(e)
        }
        const imagem = conferidos[0]
        if (!imagem) return erro(409, 'CENARIO_ARQUIVO_AUSENTE', 'Envie a miniatura de novo')
        return repasse(
          await gateway.gatewayFetchHmac('/members/internal/cenarios/conjuntos/miniatura', {
            method: 'POST',
            body: {
              ator: atorDe(user),
              conjuntoId: miniatura[1]!.toLowerCase(),
              revisao: Number(miniatura[2]),
              espacoId,
              digest: corpo.data.digest,
              conferido: imagem,
            },
          }),
        )
      }
      const capa = DEFINIR_CAPA.exec(caminho)
      if (capa) {
        if (!user) return semSessao()
        const lido = await corpoJson(req, CORPO_PEQUENO)
        const corpo = lido.ok ? RetratoBody.safeParse(lido.corpo) : null
        if (!corpo?.success) return invalido()
        const espacoId = corpo.data.espacoId.toLowerCase()
        const permitido = await podeLer(user, espacoId)
        if (permitido !== true) return permitido === false ? semRota() : permitido
        let conferidos: ConferenciaDeUpload[]
        try {
          conferidos = await conferir(espacoId, [{ digest: corpo.data.digest, tipo: 'capa' }], req)
        } catch (e) {
          return conferenciaRecusada(e)
        }
        if (!conferidos.length)
          return erro(409, 'CENARIO_ARQUIVO_AUSENTE', 'Envie o retrato de novo')
        const resultado = await gateway.gatewayFetchHmac('/members/internal/cenarios/capa', {
          method: 'POST',
          body: {
            ator: atorDe(user),
            cenarioId: capa[1]!.toLowerCase(),
            revisao: corpo.data.revisao,
            espacoId,
            digest: corpo.data.digest,
            conferido: conferidos[0] ?? null,
          },
        })
        if (resultado.status !== 200) return repasse(resultado)
        const retrato = RetratoGuardadoBody.safeParse(resultado.body)
        if (!retrato.success || retrato.data.revisao !== corpo.data.revisao)
          return erro(502, 'CENARIOS_RETRATO', 'O servidor não confirmou o retrato desta versão')
        return soltar(user, resultado, retrato.data)
      }

      if (APAGAR_MODELOS.test(caminho) || APAGAR_TEXTURAS.test(caminho)) {
        const lido = await corpoJson(req, CORPO_PEQUENO)
        if (!lido.ok) return invalido()
        return soltar(
          user,
          await gateway.gatewayFetch(members(caminho), { method: 'POST', body: lido.corpo }),
        )
      }
    }

    if (
      metodo === 'DELETE' &&
      (APAGAR_BIBLIOTECA.test(caminho) || exato(`conjuntos/${U}`).test(caminho))
    )
      return soltar(user, await gateway.gatewayFetch(members(caminho), { method: 'DELETE' }))
    if (
      metodo === 'DELETE' &&
      (exato(`mundos/${U}`).test(caminho) || exato(`cenarios/${U}`).test(caminho))
    )
      return soltar(user, await gateway.gatewayFetch(members(caminho), { method: 'DELETE' }))

    const rota = REPASSES.find((r) => r.metodo === metodo && r.caminho.test(caminho))
    if (!rota) return semRota()
    const consulta: Record<string, string> = {}
    if (rota.consulta) {
      const pedida = new URL(req.url).searchParams
      for (const nome of rota.consulta) {
        const valor = pedida.get(nome)
        if (valor !== null && valor !== '') consulta[nome] = valor.slice(0, 240)
      }
    }
    let body: unknown
    if (metodo !== 'GET' && rota.corpo !== null) {
      const lido = await corpoJson(req, rota.corpo ?? CORPO_PEQUENO)
      if (!lido.ok) return invalido()
      body = lido.corpo
    }
    return repasse(
      await gateway.gatewayFetch(members(caminho), {
        method: metodo,
        ...(body === undefined ? {} : { body }),
        ...(rota.consulta ? { query: consulta } : {}),
      }),
    )
  }

  type Ctx = { params: Promise<{ caminho: string[] }> }
  return {
    /** `app/api/cenarios/[...caminho]/route.ts` exporta estes quatro. */
    cenarios: {
      GET: (req: Request, ctx: Ctx) => atender('GET', req, ctx),
      POST: (req: Request, ctx: Ctx) => atender('POST', req, ctx),
      PATCH: (req: Request, ctx: Ctx) => atender('PATCH', req, ctx),
      DELETE: (req: Request, ctx: Ctx) => atender('DELETE', req, ctx),
    },
  }
}
