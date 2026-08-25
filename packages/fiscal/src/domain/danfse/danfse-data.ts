/**
 * Dados que o DANFSe local imprime (NT 008/2026 — "DANFSe v2.0"). O shape segue
 * as TAGs do XML da NFS-e autorizada (a NT manda o DANFSe representar o conteúdo
 * das respectivas TAGs; nada que não esteja no XML pode ser impresso). Campos
 * `null` = sem informação no XML → o renderer imprime o traço "-" (nota 12 da NT).
 *
 * O PARSER que preenche isto de `nfse_xml` vive na infraestrutura
 * (`infrastructure/danfse/nfse-fields.ts` — convenção do pacote: XML com lib de
 * terceiro é infra, como o xml-crypto-signer); aqui ficam só o TIPO e os
 * dicionários de domínio do leiaute (descrições das opções numéricas).
 */

export interface DanfseParty {
  /** CNPJ (14) ou CPF (11), sem máscara. */
  doc: string | null
  docKind: 'cnpj' | 'cpf' | null
  im: string | null
  xNome: string | null
  /** Endereço já concatenado (xLgr, nro, xCpl, xBairro — o que houver). */
  endereco: string | null
  municipio: string | null
  uf: string | null
  cMun: string | null
  cep: string | null
  fone: string | null
  email: string | null
}

export interface DanfseData {
  accessKey: string
  /** Chave da NFS-e substituída (`infDPS/subst/chSubstda`), quando houver. */
  chSubstda: string | null
  /** `1` Prefeitura · `2` Sistema Nacional (TSAmbGeradorNFSe). */
  ambGer: string | null
  /** `1` Produção · `2` Homologação — decide o aviso VERMELHO do cabeçalho. */
  tpAmb: string | null
  nNFSe: string | null
  /** ISO com offset, como veio no XML (`2026-06-12T12:42:48-03:00`). */
  dhProc: string | null
  cStat: string | null
  xLocEmi: string | null
  emit: DanfseParty
  regTrib: {
    opSimpNac: string | null
    regApTribSN: string | null
    regEspTrib: string | null
  }
  /** Tomador — `null` = não identificado na NFS-e (linha única do bloco, NT 2.3.1). */
  toma: DanfseParty | null
  serv: {
    cTribNac: string | null
    cTribMun: string | null
    cNBS: string | null
    xDescServ: string | null
    xTribNac: string | null
    xTribMun: string | null
    xNBS: string | null
    xLocPrestacao: string | null
  }
  dps: {
    nDPS: string | null
    serie: string | null
    dhEmi: string | null
    /** `YYYY-MM-DD` (data civil — NUNCA passa por `new Date`). */
    dCompet: string | null
    tpEmit: string | null
  }
  valores: {
    vServ: string | null
    vLiq: string | null
    vBC: string | null
    pAliqAplic: string | null
    vISSQN: string | null
    vTotalRet: string | null
    vDescIncond: string | null
    vDescCond: string | null
    tribISSQN: string | null
    tpRetISSQN: string | null
    cLocIncid: string | null
    xLocIncid: string | null
    /** Percentual total de tributos do SN (Lei 12.741) — vai nas Inf. Complementares. */
    pTotTribSN: string | null
    pTotTribFed: string | null
    pTotTribEst: string | null
    pTotTribMun: string | null
    vTotTribFed: string | null
    vTotTribEst: string | null
    vTotTribMun: string | null
  }
  /** true = montado SEM XML legível (fallback estruturado da linha da invoice). */
  fromFallback: boolean
}

/** Descrições das opções numéricas do leiaute (XSD tiposSimples v1.01). */
export const AMB_GERADOR_LABELS: Record<string, string> = {
  '1': 'Prefeitura',
  '2': 'Sistema Nacional da NFS-e',
}

export const TP_AMB_LABELS: Record<string, string> = {
  '1': 'Produção',
  '2': 'Homologação',
}

export const TP_EMIT_LABELS: Record<string, string> = {
  '1': 'Prestador',
  '2': 'Tomador',
  '3': 'Intermediário',
}

export const OP_SIMP_NAC_LABELS: Record<string, string> = {
  '1': 'Não Optante',
  '2': 'Optante - Microempreendedor Individual (MEI)',
  '3': 'Optante - Microempresa ou Empresa de Pequeno Porte (ME/EPP)',
}

export const REG_AP_TRIB_SN_LABELS: Record<string, string> = {
  '1': 'Regime de apuração dos tributos federais e municipal pelo Simples Nacional',
  '2': 'Regime de apuração dos tributos federais pelo SN e ISSQN fora do SN',
  '3': 'Regime de apuração dos tributos federais e municipal fora do SN',
}

export const REG_ESP_TRIB_LABELS: Record<string, string> = {
  '0': 'Nenhum',
  '1': 'Ato Cooperado (Cooperativa)',
  '2': 'Estimativa',
  '3': 'Microempresa Municipal',
  '4': 'Notário ou Registrador',
  '5': 'Profissional Autônomo',
  '6': 'Sociedade de Profissionais',
  '9': 'Outros',
}

export const TRIB_ISSQN_LABELS: Record<string, string> = {
  '1': 'Operação Tributável',
  '2': 'Imunidade',
  '3': 'Exportação de serviço',
  '4': 'Não Incidência',
}

export const TP_RET_ISSQN_LABELS: Record<string, string> = {
  '1': 'Não Retido',
  '2': 'Retido pelo Tomador',
  '3': 'Retido pelo Intermediário',
}

/** cStat 100 = NFS-e gerada com sucesso; outros códigos saem crus. */
export const C_STAT_LABELS: Record<string, string> = {
  '100': 'NFS-e Gerada',
}

/**
 * nNFSe DERIVADO da chave de acesso (fallback sem XML — o número nunca sai "-"):
 * chave de 50 = cMun(7) + ambGer(1) + tpInsc(1) + inscrição(14) + nNFSe(13) +
 * AnoMes(4) + código(9) + DV(1). Anatomia MEDIDA contra a chave real do spike
 * (`3106200|2|2|43588758000103|0000000000001|2606|…` → nNFSe = 1, batendo com o
 * `<nNFSe>` do XML autorizado). Chave fora do formato → null.
 */
export function nfseNumberFromAccessKey(accessKey: string | null | undefined): string | null {
  const key = accessKey?.trim() ?? ''
  if (!/^\d{50}$/.test(key)) return null
  return key.slice(23, 36).replace(/^0+(?=\d)/, '')
}
