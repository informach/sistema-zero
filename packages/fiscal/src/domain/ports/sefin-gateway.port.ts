/** Dados necessários p/ montar e emitir a DPS de uma nota. */
export interface EmitDpsInput {
  dpsId: string
  dpsNumber: bigint
  serie: string
  /** Competência (YYYY-MM-DD, BRT) — decisão do usuário: data da emissão. */
  competenceDate: string
  tomador: { cpf: string; nome: string } | null
  /** Valor em reais com 2 casas (ex. "37.00"). */
  valor: string
  descricao: string
  /** Presente quando esta DPS SUBSTITUI uma NFS-e (o sistema cancela a original). */
  substituicao?: {
    chaveOriginal: string
    cMotivo: '01' | '02' | '03' | '04' | '05' | '99'
    xMotivo?: string
  }
}

export type EmitResult =
  | { kind: 'accepted'; accessKey: string; nfseXml: string; dpsXml: string }
  /** Rejeição determinística (regra de negócio da Sefin) — NÃO re-tentar. */
  | { kind: 'rejected'; errors: Array<{ code: string; message: string }>; dpsXml: string }
  /**
   * A DPS já tinha virado NFS-e (re-POST pós-timeout). O gateway JÁ resolveu a
   * chave na consulta do 400 — vem aqui (não há 2ª consulta no serviço).
   */
  | { kind: 'duplicate'; accessKey: string; dpsXml: string }

export interface SefinNacionalGateway {
  /** Monta, assina e envia a DPS (síncrono). Lança em erro de rede/5xx (re-tentável). */
  emitDps(input: EmitDpsInput): Promise<EmitResult>
  /** Recupera a chave da NFS-e gerada a partir do Id da DPS (resposta ambígua). */
  findNfseByDpsId(dpsId: string): Promise<{ accessKey: string } | null>
  /** Evento de cancelamento e101101. Lança em erro de rede/5xx. */
  cancelNfse(input: {
    accessKey: string
    cMotivo: '1' | '2' | '9'
    xMotivo: string
  }): Promise<
    | { kind: 'accepted'; eventXml: string }
    | { kind: 'rejected'; errors: Array<{ code: string; message: string }> }
  >
}
