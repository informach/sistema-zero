import {
  PosseDaGaleriaSchema,
  ResultadoDaCompraDaGaleriaSchema,
} from '@sistemazero/arquipelago-contracts'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { type PortaDaPosse, PosseIndisponivelError } from '../../domain/posse.port'

export class PosseHttp implements PortaDaPosse {
  constructor(private readonly config: { url: string; token: string; fetch?: typeof fetch }) {}

  async ler(dono: Parameters<PortaDaPosse['ler']>[0]) {
    const url = new URL('/members/internal/arquipelago/galeria', this.config.url)
    url.search = new URLSearchParams(dono).toString()
    const { status, body } = await this.pedir(url)
    const parsed = PosseDaGaleriaSchema.safeParse(body)
    if (status !== 200 || !parsed.success) throw new PosseIndisponivelError()
    return parsed.data
  }

  async comprar(pedido: Parameters<PortaDaPosse['comprar']>[0]) {
    const url = new URL('/members/internal/arquipelago/galeria/compras', this.config.url)
    const { status, body } = await this.pedir(url, pedido)
    const parsed = ResultadoDaCompraDaGaleriaSchema.safeParse(body)
    if (!parsed.success || (parsed.data.ok ? status !== 200 : ![403, 409].includes(status)))
      throw new PosseIndisponivelError()
    return parsed.data
  }

  private async pedir(url: URL, pedido?: object): Promise<{ status: number; body: unknown }> {
    try {
      const signal = AbortSignal.timeout(5_000)
      const response = await (this.config.fetch ?? fetch)(url, {
        method: pedido ? 'POST' : 'GET',
        headers: {
          'x-arquipelago-token': this.config.token,
          accept: 'application/json',
          ...(pedido ? { 'content-type': 'application/json' } : {}),
        },
        ...(pedido ? { body: JSON.stringify(pedido) } : {}),
        signal,
        cache: 'no-store',
        redirect: 'error',
      })
      if (![200, 403, 409].includes(response.status)) throw new PosseIndisponivelError()
      return { status: response.status, body: await readJsonBodyWithLimit(response, 8_192, signal) }
    } catch {
      throw new PosseIndisponivelError()
    }
  }
}
