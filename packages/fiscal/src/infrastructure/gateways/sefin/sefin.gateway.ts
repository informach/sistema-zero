import type { Logger } from '@sistemazero/core/logging'
import { buildCancelEventXml, buildDpsXml } from '../../../domain/dps/dps-builder'
import type { EmitterProfile } from '../../../domain/dps/emitter-profile'
import type {
  DanfseClient,
  EmitDpsInput,
  EmitResult,
  SefinNacionalGateway,
} from '../../../domain/ports/sefin-gateway.port'
import type { A1Certificate } from '../../certificate/a1-certificate'
import { type SigAlgo, signXml } from '../../signing/xml-crypto-signer'
import { createMtlsFetch, gunzipBase64, gzipBase64, sefinUrls } from './sefin.client'

interface SefinErrorBody {
  erros?: Array<{ Codigo?: string; Descricao?: string }>
}

/**
 * Adapter REAL da Sefin Nacional — endpoints/envelopes/assinatura validados na
 * Produção Restrita com o A1 da Informach (spike 12/06, spike/notes.md):
 * `POST /nfse {dpsXmlGZipB64}` → 201 `{chaveAcesso, nfseXmlGZipB64}` | 400
 * `{erros:[{Codigo,Descricao}]}` (PascalCase). Numa rejeição 400, ANTES de
 * classificar como determinística consultamos `GET /dps/{id}`: se a NFS-e desta
 * DPS já existe (re-POST pós-timeout com número reusado), é `duplicate` —
 * recuperável, nunca nota dobrada nem FAILED falso.
 */
export class SefinHttpGateway implements SefinNacionalGateway {
  private readonly fetch: ReturnType<typeof createMtlsFetch>
  private readonly base: string
  private readonly adnContribuintes: string
  private readonly perReqMs: number
  private readonly totalBudgetMs: number
  private readonly sigAlgo: SigAlgo

  constructor(
    private readonly profile: EmitterProfile,
    cert: A1Certificate,
    opts: {
      ambiente: 'producao' | 'producao-restrita'
      timeoutMs: number
      totalBudgetMs: number
      sigAlgo: SigAlgo
    },
    private readonly logger: Logger,
    private readonly certRef = cert,
  ) {
    this.fetch = createMtlsFetch(cert, opts.timeoutMs)
    const urls = sefinUrls(opts.ambiente)
    this.base = urls.sefin
    this.adnContribuintes = urls.adnContribuintes
    this.perReqMs = opts.timeoutMs
    this.totalBudgetMs = opts.totalBudgetMs
    this.sigAlgo = opts.sigAlgo
  }

  /** Timeout efetivo da próxima chamada = min(timeout por tentativa, orçamento restante). */
  private remaining(deadline: number): number {
    return Math.max(1, Math.min(this.perReqMs, deadline - Date.now()))
  }

  async emitDps(input: EmitDpsInput): Promise<EmitResult> {
    const deadline = Date.now() + this.totalBudgetMs
    const xml = buildDpsXml(this.profile, input)
    const signed = signXml(xml, 'infDPS', this.certRef, this.sigAlgo)

    const res = await this.fetch(
      `${this.base}/nfse`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dpsXmlGZipB64: gzipBase64(signed) }),
      },
      this.remaining(deadline),
    )

    if (res.status === 201) {
      const body = (await res.json()) as { chaveAcesso?: string; nfseXmlGZipB64?: string }
      if (!body.chaveAcesso) throw new Error('Sefin 201 sem chaveAcesso (contrato mudou?)')
      return {
        kind: 'accepted',
        accessKey: body.chaveAcesso,
        nfseXml: body.nfseXmlGZipB64 ? gunzipRequired(body.nfseXmlGZipB64, 'nfseXmlGZipB64') : '',
        dpsXml: signed,
      }
    }

    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as SefinErrorBody
      const errors = (body.erros ?? []).map((e) => ({
        code: e.Codigo ?? 'DESCONHECIDO',
        message: e.Descricao ?? '',
      }))
      // Número reusado já virou NFS-e num envio anterior? → duplicate (não FAILED).
      // A chave resolvida AQUI viaja no resultado — o serviço NÃO reconsulta.
      const existing = await this.findNfseByDpsId(input.dpsId, this.remaining(deadline))
      if (existing) {
        this.logger.info('fiscal.sefin_duplicate_detected', { dpsId: input.dpsId })
        return { kind: 'duplicate', accessKey: existing.accessKey, dpsXml: signed }
      }
      return { kind: 'rejected', errors, dpsXml: signed }
    }

    // 403 = certificado (expirado/revogado/sem permissão) — erro ACIONÁVEL distinto
    // (senão o lastError da nota FAILED era um "403" cru sem ligação com o A1).
    if (res.status === 403) {
      throw new Error(
        'Sefin recusou o certificado A1 (403) — expirado/revogado? Verifique NFSE_CERT_* e a validade.',
      )
    }
    // 5xx = instabilidade — re-tentável (alertável).
    throw new Error(`Sefin respondeu ${res.status}`)
  }

  async findNfseByDpsId(dpsId: string, timeoutMs?: number): Promise<{ accessKey: string } | null> {
    const res = await this.fetch(`${this.base}/dps/${encodeURIComponent(dpsId)}`, {}, timeoutMs)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Sefin GET /dps respondeu ${res.status}`)
    const body = (await res.json()) as { chaveAcesso?: string }
    return body.chaveAcesso ? { accessKey: body.chaveAcesso } : null
  }

  async cancelNfse(input: { accessKey: string; cMotivo: '1' | '2' | '9'; xMotivo: string }) {
    const deadline = Date.now() + this.totalBudgetMs
    const { xml } = buildCancelEventXml(this.profile, input)
    const signed = signXml(xml, 'infPedReg', this.certRef, this.sigAlgo)

    const res = await this.fetch(
      `${this.base}/nfse/${input.accessKey}/eventos`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pedidoRegistroEventoXmlGZipB64: gzipBase64(signed) }),
      },
      this.remaining(deadline),
    )

    if (res.status === 201) {
      const body = (await res.json()) as { eventoXmlGZipB64?: string }
      return {
        kind: 'accepted' as const,
        eventXml: body.eventoXmlGZipB64
          ? gunzipRequired(body.eventoXmlGZipB64, 'eventoXmlGZipB64')
          : signed,
      }
    }
    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as SefinErrorBody
      const errors = (body.erros ?? []).map((e) => ({
        code: e.Codigo ?? 'DESCONHECIDO',
        message: e.Descricao ?? '',
      }))
      // Um 400 pode ser a repetição de um e101101 que a Sefin JÁ aceitou, mas
      // cuja resposta se perdeu antes de conseguirmos persistir a transição.
      // O ADN é a fonte de verdade desses eventos: só classificamos como
      // rejeição depois de confirmar que o cancelamento ainda não existe lá.
      const recovered = await this.findCancellationEvent(input.accessKey, this.remaining(deadline))
      if (recovered.found) {
        this.logger.info('fiscal.sefin_cancel_duplicate_recovered', {
          accessKey: input.accessKey,
        })
        return {
          kind: 'accepted' as const,
          // O ADN pode expor somente metadados na listagem. O pedido assinado
          // identifica exatamente o e101101 neste caso e já é o fallback dos
          // 201 sem XML de evento.
          eventXml: recovered.eventXml ?? signed,
          recovered: true,
        }
      }
      // A distribuição para o ADN pode atrasar a resposta do POST que criou o
      // evento. Uma indicação explícita de duplicidade sem evento visível ainda
      // é ambígua; lançar mantém a nota em CANCEL_PENDING para reconciliação.
      if (isDuplicateCancellation(errors)) {
        throw new Error('Cancelamento possivelmente registrado; aguardando disponibilidade no ADN')
      }
      return {
        kind: 'rejected' as const,
        errors,
      }
    }
    throw new Error(`Sefin eventos respondeu ${res.status}`)
  }

  /**
   * Consulta de eventos no ADN (a Sefin emissora aceita só o POST em produção).
   * O manual oficial do contribuinte define `GET /NFSe/{chaveAcesso}/Eventos`;
   * toleramos o envelope listado pelo ADN e conservamos o XML quando presente.
   */
  private async findCancellationEvent(
    accessKey: string,
    timeoutMs?: number,
  ): Promise<{ found: boolean; eventXml?: string }> {
    const res = await this.fetch(
      `${this.adnContribuintes}/NFSe/${encodeURIComponent(accessKey)}/Eventos`,
      {},
      timeoutMs,
    )
    if (res.status === 404) return { found: false }
    if (!res.ok) throw new Error(`ADN GET eventos respondeu ${res.status}`)
    return findCancellationEventInBody(await res.json())
  }
}

/** DANFSe no ADN (`GET /danfse/{chave}`) — endpoint muda em jul/2026, por isso isolado. */
export class AdnDanfseClient implements DanfseClient {
  private readonly fetch: ReturnType<typeof createMtlsFetch>
  private readonly base: string

  constructor(
    cert: A1Certificate,
    opts: { ambiente: 'producao' | 'producao-restrita'; timeoutMs: number },
  ) {
    this.fetch = createMtlsFetch(cert, opts.timeoutMs)
    this.base = sefinUrls(opts.ambiente).adnDanfse
  }

  async fetchPdf(accessKey: string): Promise<Uint8Array> {
    const res = await this.fetch(`${this.base}/${accessKey}`)
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.includes('pdf')) {
      throw new Error(`DANFSe respondeu ${res.status} (${type})`)
    }
    return new Uint8Array(await res.arrayBuffer())
  }
}

function gunzipRequired(b64: string, field: string): string {
  try {
    return gunzipBase64(b64)
  } catch (error) {
    throw new Error(
      `${field} inválido na resposta da Sefin: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function findCancellationEventInBody(body: unknown): { found: boolean; eventXml?: string } {
  if (!body || typeof body !== 'object') return { found: false }
  const events = (body as { eventos?: unknown }).eventos
  if (!Array.isArray(events)) return { found: false }
  for (const event of events) {
    if (!event || typeof event !== 'object') continue
    const record = event as Record<string, unknown>
    const type = record.tipo ?? record.tipoEvento
    if (String(type).replace(/^e/i, '') !== '101101') continue
    const xml = record.xml ?? record.eventoXml
    if (typeof xml === 'string') return { found: true, eventXml: xml }
    const compressed = record.xmlGZipB64 ?? record.eventoXmlGZipB64
    if (typeof compressed === 'string') {
      return { found: true, eventXml: gunzipRequired(compressed, 'eventoXmlGZipB64') }
    }
    return { found: true }
  }
  return { found: false }
}

function isDuplicateCancellation(errors: Array<{ code: string; message: string }>): boolean {
  return errors.some(({ message }) =>
    /(?:j[áa]\s+)?(?:registrad[oa]|duplicad[oa])|j[áa]\s+existe/i.test(message),
  )
}
