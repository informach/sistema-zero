/**
 * Dados FIXOS do emitente (Informach) + enquadramento do serviço, confirmados
 * na Fase 0 contra os documentos oficiais (ver spike/notes.md):
 *  - cLocEmi 3106200 = Belo Horizonte (Anexo A oficial)
 *  - cTribNac 080201 = único desdobro do item 8.02 (Anexo B, aba 1)
 *  - cNBS 122051900 = NBS 1.2205.19.00 "Outros serviços de educação, inclusive
 *    treinamento, NCP" (Anexo B, aba 2)
 *  - cTribMun "001" (BH, sistema antigo) — confirmar via parametrização municipal
 *  - pTotTribSN = forma simplificada da Lei 12.741 p/ Simples (campo do leiaute!)
 */
export const EMITTER = {
  cnpj: '43588758000103',
  razaoSocial: 'Informach — Núcleo de Aprendizagem Ltda',
  cLocEmi: '3106200',
  /** Inscrição Municipal em BH — OBRIGATÓRIA na DPS (E0116, exigência do CNC de BH).
   *  Formato: só dígitos; se a IM de BH termina em "X", o verificador vira "0". */
  im: process.env['NFSE_IM'] ?? '',
  /** 1=CPF, 2=CNPJ (Anexo I — regra do Id da DPS) */
  tipoInscricaoFederal: '2',
  /** Série PRÓPRIA do sistema (Emissor Web usa a dele) — confirmar no spike 02. */
  serie: process.env['NFSE_DPS_SERIE'] ?? '2',
  verAplic: 'sz-fiscal-spike/0.1',
  /** opSimpNac 3 = Optante Simples Nacional ME/EPP */
  opSimpNac: '3',
  /** Obrigatório p/ ME/EPP (E0166): 1 = tributos federais E municipal apurados
   *  pelo SN (caso normal, sem sublimite estourado). */
  regApTribSN: '1',
  /** regEspTrib 0 = Nenhum */
  regEspTrib: '0',
  cTribNac: '080201',
  cTribMun: process.env['NFSE_CTRIB_MUN'] ?? '001',
  cNBS: '122051900',
  /** Alíquota efetiva do Simples p/ Lei 12.741 (pTotTribSN) — atualizável. */
  pTotTribSN: process.env['NFSE_PTOTTRIB_SN'] ?? '8.24',
} as const

/** Id determinístico da DPS: "DPS" + CódMun(7) + TipoInscr(1) + Inscr(14) + Série(5) + Núm(15). */
export function dpsId(serie: string, numero: bigint | number): string {
  const serie5 = String(serie).padStart(5, '0')
  const num15 = String(numero).padStart(15, '0')
  const inscr14 = EMITTER.cnpj.padStart(14, '0')
  const id = `DPS${EMITTER.cLocEmi}${EMITTER.tipoInscricaoFederal}${inscr14}${serie5}${num15}`
  if (id.length !== 45) throw new Error(`dpsId com ${id.length} posições (esperado 45): ${id}`)
  return id
}

/** Id do pedido de registro de evento: "PRE" + chave(50) + código do evento(6) (Anexo II). */
export function preId(chaveAcesso: string, codigoEvento: string): string {
  if (!/^\d{50}$/.test(chaveAcesso)) throw new Error('chave de acesso deve ter 50 dígitos')
  if (!/^\d{6}$/.test(codigoEvento)) throw new Error('código de evento deve ter 6 dígitos')
  return `PRE${chaveAcesso}${codigoEvento}`
}
