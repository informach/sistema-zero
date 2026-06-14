import { describe, expect, test } from 'bun:test'
import {
  buildCancelEventXml,
  buildDpsXml,
  dCompetBRT,
  dhEmissao,
} from '../../src/domain/dps/dps-builder'
import {
  buildDpsId,
  composeServiceDescription,
  type EmitterProfile,
  INFORMACH_BASE,
} from '../../src/domain/dps/emitter-profile'

const profile: EmitterProfile = {
  ...INFORMACH_BASE,
  tpAmb: '2',
  im: '13372670018',
  serie: '2',
  cTribMun: '001',
  pTotTribSN: '8.24',
}

describe('buildDpsXml (leiaute ACEITO pela Sefin na Produção Restrita — spike 12/06)', () => {
  const input = {
    dpsId: buildDpsId(profile, '2', 1n),
    dpsNumber: 1n,
    serie: '2',
    competenceDate: '2026-06-12',
    tomador: { cpf: '52998224725', nome: 'Maria & Cia <teste>' },
    valor: '37.00',
    descricao: 'No Comando da IA',
  }

  test('estrutura na ordem do XSD com os campos validados (IM, regApTribSN, pTotTribSN)', () => {
    const xml = buildDpsXml(profile, input)
    expect(xml).toContain('<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">')
    expect(xml).toContain(`<infDPS Id="${input.dpsId}">`)
    expect(xml).toContain('<tpAmb>2</tpAmb>')
    expect(xml).toContain('<cLocEmi>3106200</cLocEmi>')
    // Prestador: CNPJ → IM (E0116) → regTrib com regApTribSN=1 (E0166), nesta ordem.
    expect(xml).toMatch(
      /<prest><CNPJ>43588758000103<\/CNPJ><IM>13372670018<\/IM><regTrib><opSimpNac>3<\/opSimpNac><regApTribSN>1<\/regApTribSN><regEspTrib>0<\/regEspTrib><\/regTrib><\/prest>/,
    )
    expect(xml).toContain('<cTribNac>080201</cTribNac>')
    expect(xml).toContain('<cTribMun>001</cTribMun>')
    expect(xml).toContain('<cNBS>122051900</cNBS>')
    // Simples: sem destaque de ISS; Lei 12.741 via pTotTribSN; sem IBSCBS em 2026.
    expect(xml).toContain('<tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>')
    expect(xml).toContain('<totTrib><pTotTribSN>8.24</pTotTribSN></totTrib>')
    expect(xml).not.toContain('IBSCBS')
    expect(xml).not.toContain('pAliq')
    // Escapes no nome do tomador.
    expect(xml).toContain('<xNome>Maria &amp; Cia &lt;teste&gt;</xNome>')
  })

  test('sem tomador → grupo toma omitido (toma é minOccurs=0; usado em homolog)', () => {
    const xml = buildDpsXml(profile, { ...input, tomador: null })
    expect(xml).not.toContain('<toma>')
  })

  test('substituição → grupo subst ANTES do prest, com chave/motivo', () => {
    const xml = buildDpsXml(profile, {
      ...input,
      substituicao: { chaveOriginal: '5'.repeat(50), cMotivo: '99', xMotivo: 'Correção' },
    })
    expect(xml).toContain(
      `<subst><chSubstda>${'5'.repeat(50)}</chSubstda><cMotivo>99</cMotivo><xMotivo>Correção</xMotivo></subst>`,
    )
    expect(xml.indexOf('<subst>')).toBeLessThan(xml.indexOf('<prest>'))
  })

  test('dhEmissao: TZ -03:00 com margem de 60s (E0008)', () => {
    const fixed = Date.parse('2026-06-12T15:00:00Z')
    expect(dhEmissao(fixed)).toBe('2026-06-12T11:59:00-03:00')
  })

  test('caracteres de controle C0 são removidos do XML (mal-formaria/quebraria a assinatura)', () => {
    const sujo = `Mar${String.fromCharCode(7)}ia${String.fromCharCode(0)}` // BEL + NUL
    const desc = `Cur${String.fromCharCode(0x1b)}so` // ESC
    const xml = buildDpsXml(profile, {
      ...input,
      tomador: { cpf: '52998224725', nome: sujo },
      descricao: desc,
    })
    expect(xml).toContain('<xNome>Maria</xNome>')
    expect(xml).toContain('<xDescServ>Curso</xDescServ>')
    // Nenhum byte de controle C0 (exceto \t \n \r) sobrou no XML.
    const hasControl = [...xml].some((c) => {
      const n = c.charCodeAt(0)
      return n <= 8 || n === 11 || n === 12 || (n >= 14 && n <= 31)
    })
    expect(hasControl).toBe(false)
  })
})

describe('dCompetBRT (competência = data da emissão, MESMA base/margem do dhEmi — fix B3)', () => {
  test('na virada da meia-noite BRT, dCompet NÃO fica 1 dia à frente do dhEmi', () => {
    // 23:59:30 BRT (02:59:30Z do dia seguinte) — a margem de 60s puxa p/ o dia anterior.
    const instant = Date.parse('2026-06-13T02:59:30Z')
    expect(dCompetBRT(instant)).toBe('2026-06-12')
    // Casa EXATAMENTE com o prefixo de data do dhEmi no mesmo instante.
    expect(dCompetBRT(instant)).toBe(dhEmissao(instant).slice(0, 10))
  })

  test('logo após a meia-noite BRT também casa com o dhEmi', () => {
    const instant = Date.parse('2026-06-13T03:00:30Z') // 00:00:30 BRT
    expect(dCompetBRT(instant)).toBe(dhEmissao(instant).slice(0, 10))
  })
})

describe('buildCancelEventXml (e101101)', () => {
  test('Id PRE + chave(50) + 101101; xDesc literal fixo', () => {
    const chave = '3'.repeat(50)
    const { xml, preId } = buildCancelEventXml(profile, {
      accessKey: chave,
      cMotivo: '2',
      xMotivo: 'Compra reembolsada',
    })
    expect(preId).toBe(`PRE${chave}101101`)
    expect(preId).toHaveLength(59)
    expect(xml).toContain(`<infPedReg Id="${preId}">`)
    expect(xml).toContain('<CNPJAutor>43588758000103</CNPJAutor>')
    expect(xml).toContain('<xDesc>Cancelamento de NFS-e</xDesc>')
    expect(xml).toContain('<cMotivo>2</cMotivo>')
  })

  test('chave inválida → erro alto', () => {
    expect(() =>
      buildCancelEventXml(profile, { accessKey: '123', cMotivo: '9', xMotivo: 'x' }),
    ).toThrow('50 dígitos')
  })
})

describe('composeServiceDescription', () => {
  test('prefixo + nome real do produto; fallback "Produto digital"; sem prefixo = só o nome', () => {
    expect(composeServiceDescription('Treinamento on-line', 'No Comando da IA')).toBe(
      'Treinamento on-line - No Comando da IA',
    )
    expect(composeServiceDescription('Treinamento on-line', null)).toBe(
      'Treinamento on-line - Produto digital',
    )
    expect(composeServiceDescription('', 'No Comando da IA')).toBe('No Comando da IA')
    expect(composeServiceDescription('  Treinamento on-line  ', '  Curso X  ')).toBe(
      'Treinamento on-line - Curso X',
    )
  })

  test('trunca em 1900 por CODEPOINT — não parte um par surrogate (emoji)', () => {
    const desc = composeServiceDescription('', '😀'.repeat(2000)) // 2000 codepoints > 1900
    expect([...desc]).toHaveLength(1900)
    // Um surrogate solto faria o encode/serialização XML estourar.
    expect(() => encodeURIComponent(desc)).not.toThrow()
  })
})
