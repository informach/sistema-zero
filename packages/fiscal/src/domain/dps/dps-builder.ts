import type { EmitDpsInput } from '../ports/sefin-gateway.port'
import type { EmitterProfile } from './emitter-profile'

/**
 * Remove caracteres de controle C0 PROIBIDOS no XML 1.0 (códigos 0–8, 11, 12,
 * 14–31; mantém \t=9, \n=10, \r=13) — não há entidade que os represente. Um byte
 * de controle vindo de nome/descrição de upstream tornaria o XML mal-formado e
 * quebraria a assinatura/emissão. Filtro por código (sem regex) p/ legibilidade.
 */
function stripXmlControls(s: string): string {
  let out = ''
  for (const ch of s) {
    const c = ch.charCodeAt(0)
    if (c <= 8 || c === 11 || c === 12 || (c >= 14 && c <= 31)) continue
    out += ch
  }
  return out
}

const esc = (s: string) =>
  stripXmlControls(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** UTC-3 fixo (Brasil sem horário de verão) + 60s de folga de clock skew. */
const BRT_OFFSET_MS = 3 * 3600_000
const CLOCK_SKEW_MARGIN_MS = 60_000

/**
 * Data/hora em TZ de Brasília com 60s de margem: relógio local adiantado vs o
 * servidor da Sefin → E0008 ("emissão posterior ao processamento"), visto na
 * prática no spike.
 */
export function dhEmissao(now = Date.now()): string {
  const d = new Date(now - BRT_OFFSET_MS - CLOCK_SKEW_MARGIN_MS)
  return `${d.toISOString().slice(0, 19)}-03:00`
}

/**
 * Data de competência (YYYY-MM-DD) na MESMA base/margem do dhEmi. Computar a
 * competência sem a margem de 60s fazia, na virada da meia-noite BRT, dCompet
 * cair no dia N enquanto o dhEmi (com a folga) caía no dia N-1 → rejeição.
 */
export function dCompetBRT(now = Date.now()): string {
  return new Date(now - BRT_OFFSET_MS - CLOCK_SKEW_MARGIN_MS).toISOString().slice(0, 10)
}

/**
 * Monta o XML da DPS v1.01 — função PURA, leiaute validado na Produção Restrita
 * (spike/notes.md): namespace SPED, infDPS na ordem do XSD, IM obrigatória (BH,
 * E0116), regApTribSN=1 (E0166), Simples sem destaque de ISS (tribISSQN=1 +
 * tpRetISSQN=1, sem pAliq — BH parametrizado), Lei 12.741 via pTotTribSN, SEM
 * grupo IBSCBS (Simples dispensado em 2026). `subst` presente = substituição.
 */
export function buildDpsXml(profile: EmitterProfile, input: EmitDpsInput): string {
  const subst = input.substituicao
    ? `<subst><chSubstda>${input.substituicao.chaveOriginal}</chSubstda><cMotivo>${input.substituicao.cMotivo}</cMotivo>${
        input.substituicao.xMotivo ? `<xMotivo>${esc(input.substituicao.xMotivo)}</xMotivo>` : ''
      }</subst>`
    : ''

  const toma = input.tomador
    ? `<toma><CPF>${input.tomador.cpf}</CPF><xNome>${esc(input.tomador.nome)}</xNome></toma>`
    : ''

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">` +
    `<infDPS Id="${input.dpsId}">` +
    `<tpAmb>${profile.tpAmb}</tpAmb>` +
    `<dhEmi>${dhEmissao()}</dhEmi>` +
    `<verAplic>${profile.verAplic}</verAplic>` +
    `<serie>${input.serie}</serie>` +
    `<nDPS>${input.dpsNumber}</nDPS>` +
    `<dCompet>${input.competenceDate}</dCompet>` +
    `<tpEmit>1</tpEmit>` +
    `<cLocEmi>${profile.cLocEmi}</cLocEmi>` +
    subst +
    `<prest>` +
    `<CNPJ>${profile.cnpj}</CNPJ>` +
    (profile.im ? `<IM>${profile.im}</IM>` : '') +
    `<regTrib><opSimpNac>${profile.opSimpNac}</opSimpNac><regApTribSN>${profile.regApTribSN}</regApTribSN><regEspTrib>${profile.regEspTrib}</regEspTrib></regTrib>` +
    `</prest>` +
    toma +
    `<serv>` +
    `<locPrest><cLocPrestacao>${profile.cLocEmi}</cLocPrestacao></locPrest>` +
    `<cServ>` +
    `<cTribNac>${profile.cTribNac}</cTribNac>` +
    `<cTribMun>${profile.cTribMun}</cTribMun>` +
    `<xDescServ>${esc(input.descricao)}</xDescServ>` +
    `<cNBS>${profile.cNBS}</cNBS>` +
    `</cServ>` +
    `</serv>` +
    `<valores>` +
    `<vServPrest><vServ>${input.valor}</vServ></vServPrest>` +
    `<trib>` +
    `<tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>` +
    `<totTrib><pTotTribSN>${profile.pTotTribSN}</pTotTribSN></totTrib>` +
    `</trib>` +
    `</valores>` +
    `</infDPS>` +
    `</DPS>`
  )
}

/**
 * Pedido de registro do evento de CANCELAMENTO (e101101). Id do PRE = literal
 * "PRE" + chave(50) + código do evento(6) — Anexo II. `xDesc` é literal fixo.
 */
export function buildCancelEventXml(
  profile: EmitterProfile,
  input: { accessKey: string; cMotivo: '1' | '2' | '9'; xMotivo: string },
): { xml: string; preId: string } {
  if (!/^\d{50}$/.test(input.accessKey)) throw new Error('chave de acesso deve ter 50 dígitos')
  const preId = `PRE${input.accessKey}101101`
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">` +
    `<infPedReg Id="${preId}">` +
    `<tpAmb>${profile.tpAmb}</tpAmb>` +
    `<verAplic>${profile.verAplic}</verAplic>` +
    `<dhEvento>${dhEmissao()}</dhEvento>` +
    `<CNPJAutor>${profile.cnpj}</CNPJAutor>` +
    `<chNFSe>${input.accessKey}</chNFSe>` +
    `<e101101>` +
    `<xDesc>Cancelamento de NFS-e</xDesc>` +
    `<cMotivo>${input.cMotivo}</cMotivo>` +
    `<xMotivo>${esc(input.xMotivo)}</xMotivo>` +
    `</e101101>` +
    `</infPedReg>` +
    `</pedRegEvento>`
  return { xml, preId }
}
