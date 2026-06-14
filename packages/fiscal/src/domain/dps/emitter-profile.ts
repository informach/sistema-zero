/**
 * Dados FIXOS do emitente (Informach) + enquadramento do serviço, validados na
 * Fase 0 contra a Produção Restrita (ver packages/fiscal/spike/notes.md):
 * cTribNac 080201 (único desdobro do 8.02), cNBS 122051900 (1.2205.19.00),
 * cTribMun 001 aceito por BH, IM obrigatória (E0116), regApTribSN=1 (E0166).
 */
export interface EmitterProfile {
  cnpj: string
  /** Código IBGE de Belo Horizonte (Anexo A oficial). */
  cLocEmi: string
  /** Tipo de ambiente da DPS: 1=Produção, 2=Homologação (derivado de NFSE_AMBIENTE). */
  tpAmb: '1' | '2'
  /** Inscrição Municipal (BH exige — E0116). Vazia só em dev/teste. */
  im: string
  /** 1=CPF, 2=CNPJ (Anexo I — regra do Id da DPS). */
  tipoInscricaoFederal: '1' | '2'
  serie: string
  verAplic: string
  /** 3 = Optante Simples Nacional ME/EPP. */
  opSimpNac: string
  /** 1 = tributos federais E municipal apurados pelo SN (E0166). */
  regApTribSN: string
  /** 0 = nenhum regime especial. */
  regEspTrib: string
  cTribNac: string
  cTribMun: string
  cNBS: string
  /** Lei 12.741 (forma simplificada do Simples) — alíquota efetiva, configurável. */
  pTotTribSN: string
}

export const INFORMACH_BASE = {
  cnpj: '43588758000103',
  cLocEmi: '3106200',
  tipoInscricaoFederal: '2',
  verAplic: 'sz-fiscal/1.0',
  opSimpNac: '3',
  regApTribSN: '1',
  regEspTrib: '0',
  cTribNac: '080201',
  cNBS: '122051900',
} as const satisfies Partial<EmitterProfile>

/** Teto da discriminação (xDescServ) — alinhado ao maxLength da substituição admin. */
const MAX_SERVICE_DESC = 1900

/**
 * Discriminação do serviço na nota: prefixo (ex. "Treinamento online") + nome
 * REAL do produto comprado (catálogo). Pedido do usuário 12/06 — o prefixo
 * reforça o enquadramento no item 8.02 (instrução/treinamento). Cap defensivo:
 * nome de produto muito longo estouraria o limite do xDescServ → rejeição.
 */
export function composeServiceDescription(prefix: string, productName: string | null): string {
  const name = productName?.trim() || 'Produto digital'
  const p = prefix.trim()
  const full = p ? `${p} - ${name}` : name
  // Trunca por CODEPOINT (não por unidade UTF-16): `slice` poderia cortar um par
  // surrogate (emoji) ao meio e deixar um surrogate solto = UTF-8/XML inválido.
  const points = [...full]
  return points.length > MAX_SERVICE_DESC ? points.slice(0, MAX_SERVICE_DESC).join('') : full
}

/**
 * Id determinístico da DPS (45 posições, TSIdDPS):
 * "DPS" + CódMun(7) + TipoInscr(1) + Inscrição(14) + Série(5) + Número(15).
 */
export function buildDpsId(profile: EmitterProfile, serie: string, numero: bigint): string {
  const id =
    `DPS${profile.cLocEmi}${profile.tipoInscricaoFederal}` +
    `${profile.cnpj.padStart(14, '0')}${serie.padStart(5, '0')}${String(numero).padStart(15, '0')}`
  if (id.length !== 45) throw new Error(`dpsId com ${id.length} posições (esperado 45): ${id}`)
  return id
}
