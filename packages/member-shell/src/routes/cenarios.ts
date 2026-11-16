import 'server-only'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation, isSupportSession } from '../lib/act'
import { avatarLinkWindow } from '../lib/avatar-link-window'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { SessionUser } from '../lib/types'
import type { GatewayModule, GatewayResponse } from '../server/gateway'
import { r2DeleteObjectsUgc, r2HeadObjectUgc, r2PresignGetUgc, r2PresignPutUgc } from '../server/r2'
import { readJsonBodyWithLimit } from '../server/read-json-body'
import type { SessionModule } from '../server/session'

export type CenariosRoutes = ReturnType<typeof createCenariosRoutes>

/** Os mesmos tetos da borda (`cenarios-routes.ts` do gateway). */
const CORPO_PEQUENO = 64 * 1024
const CORPO_DO_LOTE = 1024 * 1024
const CORPO_DO_REGISTRO = 256 * 1024
/** Um modelo de 64 MB numa conexão ruim: o envio direto tem 15 minutos. */
const ENVIO_VALE_SEGUNDOS = 900
/** Conferências em paralelo no armazenamento ao registrar um lote de modelos. */
const CONFERENCIAS_JUNTAS = 8
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
  { metodo: 'GET', caminho: exato(`espacos/${U}/bibliotecas`) },
  { metodo: 'POST', caminho: exato(`espacos/${U}/bibliotecas`) },
  { metodo: 'PATCH', caminho: exato(`bibliotecas/${U}`) },
  {
    metodo: 'GET',
    caminho: exato(`bibliotecas/${U}/modelos`),
    consulta: ['busca', 'pasta', 'cursor', 'limite'],
  },
  { metodo: 'PATCH', caminho: exato(`modelos/${U}`) },
  { metodo: 'GET', caminho: exato(`espacos/${U}/mundos`) },
  { metodo: 'POST', caminho: exato(`espacos/${U}/mundos`) },
  { metodo: 'PATCH', caminho: exato(`mundos/${U}`) },
  { metodo: 'DELETE', caminho: exato(`mundos/${U}`), corpo: null },
  { metodo: 'GET', caminho: exato(`mundos/${U}/cenarios`) },
  { metodo: 'POST', caminho: exato(`mundos/${U}/cenarios`) },
  { metodo: 'GET', caminho: exato(`cenarios/${U}`) },
  { metodo: 'DELETE', caminho: exato(`cenarios/${U}`), corpo: null },
  { metodo: 'POST', caminho: exato(`cenarios/${U}/lotes`), corpo: CORPO_DO_LOTE },
  { metodo: 'POST', caminho: exato(`cenarios/${U}/duplicar`), corpo: null },
]

const RESERVAR_MODELOS = exato(`bibliotecas/(${U})/modelos/reservar`)
const REGISTRAR_MODELOS = exato(`bibliotecas/(${U})/modelos`)
const APAGAR_MODELOS = exato(`bibliotecas/(${U})/modelos/apagar`)
const APAGAR_BIBLIOTECA = exato(`bibliotecas/(${U})`)
const RESERVAR_CAPA = exato(`cenarios/(${U})/capa/reservar`)
const DEFINIR_CAPA = exato(`cenarios/(${U})/capa`)
const ARQUIVO = new RegExp(`^espacos/(${U})/arquivos/(${D})$`, 'i')

const RegistrarBody = z.object({
  espacoId: Uuid,
  modelos: z
    .array(z.looseObject({ digest: Digest, miniatura: Digest.nullish() }))
    .min(1)
    .max(50),
})
const CapaBody = z.object({ espacoId: Uuid, digest: Digest })

/** O que o members devolve numa reserva: onde cada arquivo que falta deve ser posto. */
const Reserva = z.object({
  espacoId: Uuid,
  enviar: z.array(
    z.object({
      digest: Digest,
      tipo: z.enum(['modelo', 'miniatura', 'capa']),
      bytes: z.number().int().min(1),
      chave: z.string(),
      tipoDoConteudo: z.string(),
    }),
  ),
})
const Apagados = z.object({ apagar: z.array(z.string()) })

const TIPO_DA_LEITURA = { modelo: 'model/gltf-binary', imagem: 'image/webp' } as const

interface Armazenamento {
  presignPut: typeof r2PresignPutUgc
  presignGet: typeof r2PresignGetUgc
  head: typeof r2HeadObjectUgc
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
 * - os ARQUIVOS (o modelo `.glb`, o retrato dele e a capa do cenário) não passam por aqui: a
 *   reserva volta com um endereço assinado para o navegador pôr o arquivo direto no
 *   armazenamento, com o tamanho e o tipo exatos presos na assinatura;
 * - quem afirma ao members que o arquivo chegou é este servidor, depois de olhar o
 *   armazenamento (rotas internas com HMAC). O navegador não tem como afirmar isso;
 * - ler um arquivo é um redirecionamento para um endereço assinado, igual dentro da mesma
 *   janela de 6 horas, para a gaveta de modelos sair do cache do navegador.
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
    head: r2HeadObjectUgc,
    apagar: r2DeleteObjectsUgc,
  }
  const agendar = deps.depois ?? depois
  const agora = deps.agora ?? Date.now

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
          url: await armazenamento.presignPut({
            key: a.chave,
            contentType: a.tipoDoConteudo,
            contentLength: a.bytes,
            expiresInSeconds: ENVIO_VALE_SEGUNDOS,
          }),
        }
      }),
    )
    if (arquivos.some((a) => a === null))
      return erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
    return privado(NextResponse.json({ espacoId, enviar: arquivos }))
  }

  /** Quais destes arquivos estão no armazenamento. `null` = não deu para saber agora. */
  async function conferir(espacoId: string, digests: readonly string[]): Promise<string[] | null> {
    const unicos = [...new Set(digests)]
    const achados: string[] = []
    let duvida = false
    let proximo = 0
    await Promise.all(
      Array.from({ length: Math.min(CONFERENCIAS_JUNTAS, unicos.length) }, async () => {
        while (proximo < unicos.length && !duvida) {
          const digest = unicos[proximo++]!
          const existe = await armazenamento
            .head(chaveDoArquivoDoCenario(espacoId, digest))
            .catch(() => null)
          if (existe === null) duvida = true
          else if (existe) achados.push(digest)
        }
      }),
    )
    return duvida ? null : achados
  }
  const semConferencia = () =>
    erro(503, 'CENARIOS_ARMAZENAMENTO', 'Não consegui conferir os arquivos agora. Tente de novo.')

  /** O members disse quais arquivos ficaram sem dono: saem do armazenamento depois da resposta. */
  function soltar(r: GatewayResponse): NextResponse {
    if (r.status !== 200) return repasse(r)
    const apagados = Apagados.safeParse(r.body)
    const chaves = apagados.success
      ? apagados.data.apagar.filter((c) => /^cenarios\/[0-9a-f-]{36}\/blobs\/[a-f0-9]{64}$/.test(c))
      : []
    if (chaves.length)
      agendar(async () => {
        try {
          await armazenamento.apagar(chaves)
        } catch (error) {
          console.warn('[cenarios] não apagou arquivos soltos', { quantos: chaves.length, error })
        }
      })
    return privado(NextResponse.json({ ok: true }))
  }

  async function podeLer(user: SessionUser, espacoId: string): Promise<boolean | NextResponse> {
    const lembradas = leiturasLembradas()
    const chave = `${user.id}:${espacoId}`
    const ate = lembradas.get(chave)
    if (ate !== undefined && ate > agora()) return true
    const r = await gateway.gatewayFetch<Array<{ id?: unknown }>>(members('espacos'))
    if (r.status !== 200 || !Array.isArray(r.body)) return repasse(r)
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
    const tipo = new URL(req.url).searchParams.get('tipo') === 'modelo' ? 'modelo' : 'imagem'
    const janela = avatarLinkWindow(agora())
    const url = await armazenamento.presignGet(chaveDoArquivoDoCenario(espacoId, digest), {
      expiresInSeconds: janela.expiresInSeconds,
      signingDate: janela.signingDate,
      responseCacheControl: janela.fileCacheControl,
      // Tipo fixo por pedido: o que está guardado nunca é servido como página.
      responseContentType: TIPO_DA_LEITURA[tipo],
    })
    const resposta = NextResponse.redirect(url, 302)
    resposta.headers.set('cache-control', `private, max-age=${janela.redirectMaxAgeSeconds}`)
    return resposta
  }

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

    if (metodo === 'GET') {
      const arquivo = ARQUIVO.exec(caminho)
      if (arquivo) {
        if (!user) return semSessao()
        return lerArquivo(req, user, arquivo[1]!.toLowerCase(), arquivo[2]!.toLowerCase())
      }
    }

    if (metodo === 'POST') {
      const reservarModelos = RESERVAR_MODELOS.exec(caminho)
      const reservarCapa = RESERVAR_CAPA.exec(caminho)
      if (reservarModelos || reservarCapa) {
        const lido = await corpoJson(req, CORPO_PEQUENO)
        if (!lido.ok) return invalido()
        return comEnderecos(
          await gateway.gatewayFetch(members(caminho), { method: 'POST', body: lido.corpo }),
        )
      }

      const registrar = REGISTRAR_MODELOS.exec(caminho)
      if (registrar) {
        if (!user) return semSessao()
        const lido = await corpoJson(req, CORPO_DO_REGISTRO)
        const corpo = lido.ok ? RegistrarBody.safeParse(lido.corpo) : null
        if (!corpo?.success) return invalido()
        const espacoId = corpo.data.espacoId.toLowerCase()
        const conferidos = await conferir(
          espacoId,
          corpo.data.modelos.flatMap((m) => (m.miniatura ? [m.digest, m.miniatura] : [m.digest])),
        )
        if (!conferidos) return semConferencia()
        return repasse(
          await gateway.gatewayFetchHmac('/members/internal/cenarios/modelos', {
            method: 'POST',
            body: {
              ator: atorDe(user),
              bibliotecaId: registrar[1]!.toLowerCase(),
              espacoId,
              modelos: corpo.data.modelos,
              conferidos,
            },
          }),
        )
      }

      const capa = DEFINIR_CAPA.exec(caminho)
      if (capa) {
        if (!user) return semSessao()
        const lido = await corpoJson(req, CORPO_PEQUENO)
        const corpo = lido.ok ? CapaBody.safeParse(lido.corpo) : null
        if (!corpo?.success) return invalido()
        const espacoId = corpo.data.espacoId.toLowerCase()
        const conferidos = await conferir(espacoId, [corpo.data.digest])
        if (!conferidos) return semConferencia()
        return repasse(
          await gateway.gatewayFetchHmac('/members/internal/cenarios/capa', {
            method: 'POST',
            body: {
              ator: atorDe(user),
              cenarioId: capa[1]!.toLowerCase(),
              espacoId,
              digest: corpo.data.digest,
              conferido: conferidos.length === 1,
            },
          }),
        )
      }

      if (APAGAR_MODELOS.test(caminho)) {
        const lido = await corpoJson(req, CORPO_PEQUENO)
        if (!lido.ok) return invalido()
        return soltar(
          await gateway.gatewayFetch(members(caminho), { method: 'POST', body: lido.corpo }),
        )
      }
    }

    if (metodo === 'DELETE' && APAGAR_BIBLIOTECA.test(caminho))
      return soltar(await gateway.gatewayFetch(members(caminho), { method: 'DELETE' }))

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
