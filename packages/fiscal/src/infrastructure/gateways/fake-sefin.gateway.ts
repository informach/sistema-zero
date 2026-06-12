import type { Logger } from '@sistemazero/core/logging'
import type {
  DanfseClient,
  EmitDpsInput,
  EmitResult,
  SefinNacionalGateway,
} from '../../domain/ports/sefin-gateway.port'

/**
 * Gateway FAKE da Sefin — Fase 1 (o real, com mTLS + assinatura do spike, entra
 * na Fase 2). Emite chaves sintéticas e loga ALTO que nada foi à Sefin. NUNCA
 * pode rodar com NFSE_AMBIENTE=producao (guard no composition-root).
 */
export class FakeSefinGateway implements SefinNacionalGateway {
  constructor(private readonly logger: Logger) {}

  async emitDps(input: EmitDpsInput): Promise<EmitResult> {
    const accessKey =
      `00000000000000000000000000000000000000${String(input.dpsNumber).padStart(12, '0')}`.slice(
        -50,
      )
    this.logger.warn('fiscal.FAKE_sefin_emit', { dpsId: input.dpsId, accessKey })
    return {
      kind: 'accepted',
      accessKey,
      nfseXml: `<NFSe-FAKE dpsId="${input.dpsId}"/>`,
      dpsXml: `<DPS-FAKE id="${input.dpsId}"/>`,
    }
  }

  async findNfseByDpsId(): Promise<{ accessKey: string } | null> {
    return null
  }

  async cancelNfse(input: { accessKey: string }): Promise<{ kind: 'accepted'; eventXml: string }> {
    this.logger.warn('fiscal.FAKE_sefin_cancel', { accessKey: input.accessKey })
    return { kind: 'accepted', eventXml: '<evento-FAKE/>' }
  }
}

export class FakeDanfseClient implements DanfseClient {
  async fetchPdf(): Promise<Uint8Array> {
    return new TextEncoder().encode('%PDF-1.4 FAKE DANFSe (fase 1)')
  }
}
