import type { Invoice } from './invoice-repository.port'

/**
 * Gerador LOCAL do DANFSe (NT 008/2026): a API oficial do ADN foi DESLIGADA em
 * produção (sonda de 25/08/2026: `503 No server is available`) e a NT transferiu
 * a geração do PDF aos sistemas emissores. Substitui o antigo `DanfseClient`
 * (que baixava o PDF pronto do governo).
 *
 * ⚠️ Campos FRESCOS fora do `invoice`: no caminho síncrono da emissão o objeto
 * `Invoice` em mãos é o REIVINDICADO (pré-`markEmitted` — `nfseXml`/`emittedAt`/
 * `competenceDate` ainda null nele); os dados recém-autorizados viajam por aqui,
 * no mesmo padrão do `accessKey`/`pdfToken` que já eram params separados por
 * essa exata razão. No retry do worker, o chamador preenche do `findById` fresco.
 *
 * INVARIANTE: `render` é TOTAL sobre os DADOS — XML ausente/ilegível cai no
 * fallback estruturado, nunca lança por conteúdo (a fila de entrega não tem teto
 * de tentativas; uma exceção determinística viraria retry infinito). Só erro
 * ambiental (bug de lib) escapa, protegido pelo try/catch do chamador.
 */
export interface DanfseRenderInput {
  invoice: Invoice
  accessKey: string
  /** XML da NFS-e autorizada — `''`/null = fallback estruturado. */
  nfseXml: string | null
  /** `YYYY-MM-DD` — usado só no fallback (com XML, vale o `dCompet` de lá). */
  competenceDate: string | null
  /** Proxy do `dhProc` no fallback (rotulado como emissão). */
  emittedAt: Date | null
}

export interface DanfseProvider {
  render(input: DanfseRenderInput): Promise<Uint8Array>
}
