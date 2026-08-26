import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'
import { nfseNumberFromAccessKey } from '../../src/domain/danfse/danfse-data'
import type { EmitterProfile } from '../../src/domain/dps/emitter-profile'
import { INFORMACH_BASE } from '../../src/domain/dps/emitter-profile'
import { formatXmlDecimalBrl } from '../../src/domain/money'
import type { Invoice } from '../../src/domain/ports/invoice-repository.port'
import { buildComplementaryInformation } from '../../src/infrastructure/danfse/complementary-information'
import {
  LocalDanfseRenderer,
  NFSE_CONSULTA_PUBLICA_URL,
  sanitizeWinAnsi,
  wrapText,
} from '../../src/infrastructure/danfse/danfse-renderer'
import { loadBundledDanfseFontFiles } from '../../src/infrastructure/danfse/font-files'
import { buildDanfseData } from '../../src/infrastructure/danfse/nfse-fields'
import { applyStatusStamp, stampForStatus } from '../../src/infrastructure/danfse/status-stamp'

const ACCESS_KEY = '31062002243588758000103000000000000126061871788143'

const profile: EmitterProfile = {
  ...INFORMACH_BASE,
  tpAmb: '2',
  im: '13372670018',
  serie: '2',
  cTribMun: '001',
  pTotTribSN: '8.24',
}

/**
 * Fixture SINTÉTICA com a MESMA estrutura do XML real autorizado na Produção
 * Restrita (spike/out/nfse.xml, que é git-ignored): namespace SPED nos dois
 * níveis, DPS embutida, subtrees <Signature> no caminho. Dados fictícios.
 */
const SYNTHETIC_NFSE = `<?xml version="1.0" encoding="utf-8"?><NFSe versao="1.01" xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe Id="NFS${ACCESS_KEY}"><xLocEmi>Belo Horizonte</xLocEmi><xLocPrestacao>Belo Horizonte</xLocPrestacao><nNFSe>1</nNFSe><cLocIncid>3106200</cLocIncid><xLocIncid>Belo Horizonte</xLocIncid><xTribNac>Instrução, treinamento e avaliação.</xTribNac><xTribMun>Instrução e treinamento</xTribMun><xNBS>Outros serviços de educação</xNBS><verAplic>SefinNacional_1.6.0</verAplic><ambGer>2</ambGer><tpEmis>1</tpEmis><procEmi>1</procEmi><cStat>100</cStat><dhProc>2026-06-12T12:42:48-03:00</dhProc><nDFSe>1167908</nDFSe><emit><CNPJ>43588758000103</CNPJ><IM>13372670018</IM><xNome>EMPRESA EXEMPLO LTDA</xNome><enderNac><xLgr>RUA EXEMPLO</xLgr><nro>261</nro><xBairro>CENTRO</xBairro><cMun>3106200</cMun><UF>MG</UF><CEP>31140020</CEP></enderNac></emit><valores><vLiq>37.00</vLiq></valores><DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="DPS310620024358875800010300002000000000000001"><tpAmb>2</tpAmb><dhEmi>2026-06-12T12:41:49-03:00</dhEmi><verAplic>sz-fiscal/1.0</verAplic><serie>2</serie><nDPS>1</nDPS><dCompet>2026-06-12</dCompet><tpEmit>1</tpEmit><cLocEmi>3106200</cLocEmi><prest><CNPJ>43588758000103</CNPJ><IM>13372670018</IM><regTrib><opSimpNac>3</opSimpNac><regApTribSN>1</regApTribSN><regEspTrib>0</regEspTrib></regTrib></prest><toma><CPF>52998224725</CPF><xNome>Maria Compradora</xNome></toma><serv><locPrest><cLocPrestacao>3106200</cLocPrestacao></locPrest><cServ><cTribNac>080201</cTribNac><cTribMun>001</cTribMun><xDescServ>Treinamento on-line - Curso Exemplo</xDescServ><cNBS>122051900</cNBS></cServ></serv><valores><vServPrest><vServ>37.00</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun><totTrib><pTotTribSN>8.24</pTotTribSN></totTrib></trib></valores></infDPS><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="c14n" /></SignedInfo><SignatureValue>x</SignatureValue></Signature></DPS></infNFSe><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="c14n" /></SignedInfo><SignatureValue>y</SignatureValue></Signature></NFSe>`

function invoiceStub(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    version: 1,
    paymentId: 'pay-1',
    status: 'EMITTED',
    customer: { name: 'Maria Compradora', email: 'maria@example.com', document: '52998224725' },
    amountInCents: 3700n,
    serviceDescription: 'Treinamento on-line - Curso Exemplo',
    offerId: null,
    guaranteeDays: 7,
    paidAt: new Date('2026-06-01T12:00:00Z'),
    scheduledFor: new Date('2026-06-12T12:00:00Z'),
    attempts: 1,
    claimedAt: null,
    claimToken: null,
    nextAttemptAt: null,
    lastError: null,
    skipReason: null,
    dpsSeries: '2',
    dpsNumber: 1n,
    dpsId: 'DPS310620024358875800010300002000000000000001',
    dpsXml: '<DPS/>',
    nfseXml: SYNTHETIC_NFSE,
    accessKey: ACCESS_KEY,
    competenceDate: '2026-06-12',
    ambiente: 'producao-restrita',
    emittedAt: new Date('2026-06-12T15:42:48Z'),
    cancelReason: null,
    cancelRequestedBy: null,
    cancelEventXml: null,
    cancelledAt: null,
    substitutesId: null,
    substitutedById: null,
    pdfStoredAt: null,
    pdfToken: 'a'.repeat(64),
    emailSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Invoice
}

function renderInput(overrides: Partial<Parameters<LocalDanfseRenderer['render']>[0]> = {}) {
  const invoice = invoiceStub()
  return {
    invoice,
    accessKey: ACCESS_KEY,
    nfseXml: SYNTHETIC_NFSE,
    competenceDate: '2026-06-12',
    emittedAt: new Date('2026-06-12T15:42:48Z'),
    ...overrides,
  }
}

describe('nfse-fields — parser do XML da NFS-e (TOTAL, nunca lança)', () => {
  test('extrai os campos do XML sintético (estrutura real, com Signatures no caminho)', () => {
    const data = buildDanfseData(renderInput(), profile)
    expect(data.fromFallback).toBe(false)
    expect(data.accessKey).toBe(ACCESS_KEY)
    expect(data.nNFSe).toBe('1')
    expect(data.dhProc).toBe('2026-06-12T12:42:48-03:00')
    expect(data.cStat).toBe('100')
    expect(data.ambGer).toBe('2')
    expect(data.tpAmb).toBe('2')
    expect(data.emit.doc).toBe('43588758000103')
    expect(data.emit.docKind).toBe('cnpj')
    expect(data.emit.xNome).toBe('EMPRESA EXEMPLO LTDA')
    expect(data.emit.endereco).toBe('RUA EXEMPLO, 261, CENTRO')
    expect(data.emit.uf).toBe('MG')
    expect(data.emit.cep).toBe('31140020')
    expect(data.regTrib.opSimpNac).toBe('3')
    expect(data.toma?.doc).toBe('52998224725')
    expect(data.toma?.docKind).toBe('cpf')
    expect(data.toma?.xNome).toBe('Maria Compradora')
    expect(data.serv.cTribNac).toBe('080201')
    expect(data.serv.xDescServ).toBe('Treinamento on-line - Curso Exemplo')
    expect(data.dps.nDPS).toBe('1')
    expect(data.dps.serie).toBe('2')
    expect(data.dps.dCompet).toBe('2026-06-12')
    expect(data.valores.vServ).toBe('37.00')
    expect(data.valores.vLiq).toBe('37.00')
    expect(data.valores.tribISSQN).toBe('1')
    expect(data.valores.pTotTribSN).toBe('8.24')
  })

  test('extrai a chave substituída e os três percentuais aproximados', () => {
    const substitutedKey = '31062002243588758000103000000000000226061871788140'
    const xml = SYNTHETIC_NFSE.replace(
      '<prest>',
      `<subst><chSubstda>${substitutedKey}</chSubstda></subst><prest>`,
    ).replace(
      '<pTotTribSN>8.24</pTotTribSN>',
      '<pTotTrib><pTotTribFed>4.20</pTotTribFed><pTotTribEst>1.10</pTotTribEst><pTotTribMun>3.00</pTotTribMun></pTotTrib>',
    )

    const data = buildDanfseData(renderInput({ nfseXml: xml }), profile)

    expect(data.chSubstda).toBe(substitutedKey)
    expect(data.valores.pTotTribFed).toBe('4.20')
    expect(data.valores.pTotTribEst).toBe('1.10')
    expect(data.valores.pTotTribMun).toBe('3.00')
    expect(data.valores.pTotTribSN).toBeNull()
  })

  test('sem <toma> → tomador null (bloco "não identificado" no PDF)', () => {
    const xml = SYNTHETIC_NFSE.replace(/<toma>.*?<\/toma>/, '')
    const data = buildDanfseData(renderInput({ nfseXml: xml }), profile)
    expect(data.fromFallback).toBe(false)
    expect(data.toma).toBeNull()
  })

  test('XML vazio/ilegível → fallback estruturado com nNFSe derivado da CHAVE', () => {
    for (const xml of [null, '', '   ', '<NFSe-FAKE dpsId="x"/>', 'não é xml <<<']) {
      const data = buildDanfseData(renderInput({ nfseXml: xml }), profile)
      expect(data.fromFallback).toBe(true)
      expect(data.nNFSe).toBe('1')
      expect(data.accessKey).toBe(ACCESS_KEY)
      expect(data.emit.doc).toBe(profile.cnpj)
      expect(data.toma?.doc).toBe('52998224725')
      expect(data.valores.vServ).toBe('37.00')
      expect(data.valores.pTotTribSN).toBe('8.24')
      // dhProc do fallback = emissão em ISO-BRT (offset fixo -03:00)
      expect(data.dhProc).toBe('2026-06-12T12:42:48-03:00')
    }
  })

  test('nfseNumberFromAccessKey: anatomia medida contra a chave real', () => {
    expect(nfseNumberFromAccessKey(ACCESS_KEY)).toBe('1')
    expect(nfseNumberFromAccessKey('123')).toBeNull()
    expect(nfseNumberFromAccessKey(null)).toBeNull()
  })

  test('XML REAL do spike (se presente nesta máquina)', () => {
    const realPath = join(import.meta.dir, '../../spike/out/nfse.xml')
    if (!existsSync(realPath)) return
    const xml = readFileSync(realPath, 'utf8')
    const data = buildDanfseData(renderInput({ nfseXml: xml }), profile)
    expect(data.fromFallback).toBe(false)
    expect(data.nNFSe).toBe('1')
    expect(data.emit.xNome).toContain('INFORMACH')
    expect(data.toma).toBeNull() // o spike emitiu sem tomador (E0207)
    expect(data.valores.vLiq).toBe('37.00')
  })
})

describe('informações complementares — ordem e totais da NT 008/2026', () => {
  test('chave substituída precede a linha fixa de percentuais', () => {
    const data = buildDanfseData(renderInput(), profile)
    data.chSubstda = '31062002243588758000103000000000000226061871788140'
    data.valores.pTotTribSN = null
    data.valores.pTotTribFed = '4.20'
    data.valores.pTotTribEst = '1.10'
    data.valores.pTotTribMun = '3.00'

    expect(buildComplementaryInformation(data)).toEqual([
      'NFS-e Subst.: 31062002243588758000103000000000000226061871788140',
      'Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012: Federais: 4,20% ; Estaduais: 1,10% ; Municipais: 3,00%',
    ])
  })

  test('pTotTribSN não é atribuído falsamente a uma esfera tributária', () => {
    const data = buildDanfseData(renderInput(), profile)

    expect(buildComplementaryInformation(data)).toEqual([
      'Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012: Federais: - ; Estaduais: - ; Municipais: -',
    ])
  })
})

describe('LocalDanfseRenderer — PDF A4 do DANFSe v2.0', () => {
  const renderer = new LocalDanfseRenderer(profile)

  async function renderAndParse(input = renderInput()) {
    const bytes = await renderer.render(input)
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-')
    expect(bytes.byteLength).toBeGreaterThan(5_000)
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(1)
    const { width, height } = pdf.getPage(0).getSize()
    expect(Math.round(width)).toBe(595)
    expect(Math.round(height)).toBe(842)
    return bytes
  }

  test('caminho feliz (XML completo, com tomador)', async () => {
    const bytes = await renderAndParse()
    const pdfSource = Buffer.from(bytes).toString('latin1')
    expect(pdfSource).toContain('Arial')
    expect(pdfSource).toContain('MicrosoftSansSerif')
    expect(pdfSource).not.toContain('Helvetica')
  })

  test('sem tomador / fallback sem XML / descrição gigante — sempre 1 página A4', async () => {
    await renderAndParse(renderInput({ nfseXml: SYNTHETIC_NFSE.replace(/<toma>.*?<\/toma>/, '') }))
    await renderAndParse(renderInput({ nfseXml: null }))
    const longDesc = SYNTHETIC_NFSE.replace(
      'Treinamento on-line - Curso Exemplo',
      `Treinamento on-line - ${'palavra '.repeat(260)}`,
    )
    await renderAndParse(renderInput({ nfseXml: longDesc }))
    // Palavra ÚNICA gigante (URL sem espaços no nome do produto) também rende.
    const monsterWord = SYNTHETIC_NFSE.replace(
      'Treinamento on-line - Curso Exemplo',
      `Treinamento https://exemplo.com/${'x'.repeat(300)}`,
    )
    await renderAndParse(renderInput({ nfseXml: monsterWord }))
  })

  test('wrapText quebra DURO palavra mais larga que a linha (nunca estoura a borda)', async () => {
    const doc = await PDFDocument.create()
    const helv = await doc.embedFont(StandardFonts.Helvetica)
    const maxPt = 20.3 * 28.3465
    const lines = wrapText(helv, `Treinamento https://exemplo.com/${'x'.repeat(300)}`, 6, maxPt)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(helv.widthOfTextAtSize(line, 6)).toBeLessThanOrEqual(maxPt)
    }
  })

  test('produção NÃO leva o aviso de homologação (tpAmb=1 + ambiente producao)', async () => {
    const xml = SYNTHETIC_NFSE.replace('<tpAmb>2</tpAmb>', '<tpAmb>1</tpAmb>')
    const invoice = invoiceStub({ ambiente: 'producao' })
    await renderAndParse(renderInput({ invoice, nfseXml: xml }))
  })

  test('URL do QR é a da NT 008 (consulta pública + chave)', () => {
    expect(`${NFSE_CONSULTA_PUBLICA_URL}${ACCESS_KEY}`).toBe(
      `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${ACCESS_KEY}`,
    )
  })
})

describe('fontes oficiais do DANFSe — ativos de implantação', () => {
  test('carrega os três arquivos autorizados e verifica o inventário', () => {
    const fonts = loadBundledDanfseFontFiles()
    const sha256 = (bytes: Uint8Array) =>
      createHash('sha256').update(bytes).digest('hex').toUpperCase()

    expect(sha256(fonts.arialRegular)).toBe(
      'B3658EADAE55E682B5F69EB64C439C1ECC8F196C0BB8D4756D145D13BC86476A',
    )
    expect(sha256(fonts.arialBold)).toBe(
      'E8F4E3BAF6CC35FED6FCCE3A540E8B39E8F6CDA1D22A28F2EC8F526FEF7A43F5',
    )
    expect(sha256(fonts.microsoftSansSerif)).toBe(
      '89B42A12EA0379133FB2F4A1D1BD53058FB61E2343C1D509452D5761ACC85B7A',
    )
  })
})

describe('sanitizeWinAnsi — CP1252 sem "?" mudo', () => {
  test('pt-BR passa intacto; emoji some; pontuação tipográfica fica', () => {
    expect(sanitizeWinAnsi('Instrução, treinamento — avaliação até ç')).toBe(
      'Instrução, treinamento — avaliação até ç',
    )
    expect(sanitizeWinAnsi('Jogo 🎮 do Zero ✅')).toBe('Jogo do Zero')
    expect(sanitizeWinAnsi('aspas “curvas” e reticências…')).toBe('aspas “curvas” e reticências…')
  })
})

describe('formatXmlDecimalBrl — dinheiro por string, nunca float', () => {
  test('formata valores do XML', () => {
    expect(formatXmlDecimalBrl('37.00')).toBe('R$ 37,00')
    expect(formatXmlDecimalBrl('1234.5')).toBe('R$ 1.234,50')
    expect(formatXmlDecimalBrl('0.07')).toBe('R$ 0,07')
    expect(formatXmlDecimalBrl('-12.30')).toBe('-R$ 12,30')
    expect(formatXmlDecimalBrl('abc')).toBeNull()
    expect(formatXmlDecimalBrl(null)).toBeNull()
  })
})

describe('applyStatusStamp — marca d’água CANCELADA/SUBSTITUÍDA no serve', () => {
  test('carimba um PDF válido e devolve PDF válido', async () => {
    const renderer = new LocalDanfseRenderer(profile)
    const original = await renderer.render(renderInput())
    const stamped = await applyStatusStamp(original, 'CANCELADA')
    expect(Buffer.from(stamped.slice(0, 5)).toString('latin1')).toBe('%PDF-')
    expect(stamped.byteLength).toBeGreaterThan(original.byteLength * 0.5)
    const pdf = await PDFDocument.load(stamped)
    expect(pdf.getPageCount()).toBe(1)
  })

  test('bytes que não são PDF → rejeita para o endpoint responder 500', async () => {
    const junk = new TextEncoder().encode('não sou um pdf')
    expect(applyStatusStamp(junk, 'SUBSTITUÍDA')).rejects.toThrow()
  })

  test('stampForStatus: só CANCELLED/SUBSTITUTED carimbam', () => {
    expect(stampForStatus('CANCELLED')).toBe('CANCELADA')
    expect(stampForStatus('SUBSTITUTED')).toBe('SUBSTITUÍDA')
    expect(stampForStatus('EMITTED')).toBeNull()
    expect(stampForStatus('SCHEDULED')).toBeNull()
  })
})
