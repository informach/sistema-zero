import { dpsId, EMITTER } from './profile'

export interface DpsInput {
  numero: bigint | number
  /** Data da prestação/competência (YYYY-MM-DD). */
  dCompet: string
  /** Omitido → nota sem tomador (toma é minOccurs=0; útil no spike — a Produção
   *  Restrita valida o CPF contra o cadastro REAL da Receita, erro E0207). */
  tomador?: { cpf: string; nome: string }
  /** Valor do serviço em reais com 2 casas, ex. "37.00". */
  valor: string
  descricao: string
  /** 1=Produção, 2=Homologação. */
  tpAmb: '1' | '2'
  /** Presente apenas em DPS de SUBSTITUIÇÃO. */
  substituicao?: {
    chaveOriginal: string
    cMotivo: '01' | '02' | '03' | '04' | '05' | '99'
    xMotivo?: string
  }
}

const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/**
 * Data/hora em TZ de Brasília (o XSD exige TZD explícito), com 60s de margem:
 * relógio local adiantado em segundos vs o servidor → E0008 ("data de emissão
 * posterior à data do processamento"), visto na prática no spike.
 */
export function dhAgora(): string {
  const now = new Date(Date.now() - 3 * 3600 * 1000 - 60_000)
  return `${now.toISOString().slice(0, 19)}-03:00`
}

/**
 * Monta o XML da DPS v1.01 (leiaute do XSD oficial — ver spike/notes.md).
 * Simples Nacional: sem destaque de ISS (alíquota vem da parametrização de BH),
 * sem grupo IBSCBS (dispensado em 2026), Lei 12.741 via pTotTribSN.
 */
export function buildDpsXml(input: DpsInput): { xml: string; id: string } {
  const id = dpsId(EMITTER.serie, input.numero)
  const subst = input.substituicao
    ? `<subst><chSubstda>${input.substituicao.chaveOriginal}</chSubstda><cMotivo>${input.substituicao.cMotivo}</cMotivo>${
        input.substituicao.xMotivo ? `<xMotivo>${esc(input.substituicao.xMotivo)}</xMotivo>` : ''
      }</subst>`
    : ''

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">` +
    `<infDPS Id="${id}">` +
    `<tpAmb>${input.tpAmb}</tpAmb>` +
    `<dhEmi>${dhAgora()}</dhEmi>` +
    `<verAplic>${EMITTER.verAplic}</verAplic>` +
    `<serie>${EMITTER.serie}</serie>` +
    `<nDPS>${input.numero}</nDPS>` +
    `<dCompet>${input.dCompet}</dCompet>` +
    `<tpEmit>1</tpEmit>` +
    `<cLocEmi>${EMITTER.cLocEmi}</cLocEmi>` +
    subst +
    `<prest>` +
    `<CNPJ>${EMITTER.cnpj}</CNPJ>` +
    (EMITTER.im ? `<IM>${EMITTER.im}</IM>` : '') +
    `<regTrib><opSimpNac>${EMITTER.opSimpNac}</opSimpNac><regApTribSN>${EMITTER.regApTribSN}</regApTribSN><regEspTrib>${EMITTER.regEspTrib}</regEspTrib></regTrib>` +
    `</prest>` +
    (input.tomador
      ? `<toma><CPF>${input.tomador.cpf}</CPF><xNome>${esc(input.tomador.nome)}</xNome></toma>`
      : '') +
    `<serv>` +
    `<locPrest><cLocPrestacao>${EMITTER.cLocEmi}</cLocPrestacao></locPrest>` +
    `<cServ>` +
    `<cTribNac>${EMITTER.cTribNac}</cTribNac>` +
    `<cTribMun>${EMITTER.cTribMun}</cTribMun>` +
    `<xDescServ>${esc(input.descricao)}</xDescServ>` +
    `<cNBS>${EMITTER.cNBS}</cNBS>` +
    `</cServ>` +
    `</serv>` +
    `<valores>` +
    `<vServPrest><vServ>${input.valor}</vServ></vServPrest>` +
    `<trib>` +
    `<tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>` +
    `<totTrib><pTotTribSN>${EMITTER.pTotTribSN}</pTotTribSN></totTrib>` +
    `</trib>` +
    `</valores>` +
    `</infDPS>` +
    `</DPS>`

  return { xml, id }
}
