import { expect, test } from 'bun:test'
import { strToU8, zipSync } from 'fflate'
import { extractOfficeText } from '../src/office-text'

const word = (body: string) =>
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`
const docx = (xml: string) => zipSync({ 'word/document.xml': strToU8(xml) })
test('DOCX conserva parágrafos, acentos, tabelas e original; não inclui texto excluído', () => {
  const bytes = docx(
    word(
      '<w:p><w:r><w:t>Crie &amp; aprenda</w:t><w:tab/><w:t>ação</w:t></w:r><w:del><w:r><w:t>removido</w:t></w:r></w:del></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Célula</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    ),
  )
  const before = bytes.slice()
  const result = extractOfficeText(bytes, 'copy.docx')
  expect(result.text).toBe('Crie & aprenda\tação\nCélula')
  expect(result.notes).toHaveLength(1)
  expect(bytes).toEqual(before)
})
test('XLSX preserva ordem de abas, endereço, strings, valores brutos e fórmula sem executar', () => {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const bytes = zipSync(
    Object.fromEntries(
      Object.entries({
        'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Calendário" r:id="r1"/></sheets></workbook>`,
        'xl/_rels/workbook.xml.rels':
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Target="/xl/worksheets/sheet1.xml"/></Relationships>',
        'xl/sharedStrings.xml': `<sst xmlns="${ns}"><si><t>Post de amanhã</t></si></sst>`,
        'xl/worksheets/sheet1.xml': `<worksheet xmlns="${ns}"><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1"><f>1+2</f><v>3</v></c><c r="C1" t="inlineStr"><is><t>Legenda</t></is></c></row></sheetData></worksheet>`,
      }).map(([name, value]) => [name, strToU8(value)]),
    ),
  )
  const result = extractOfficeText(bytes, 'agenda.xlsx')
  expect(result.text).toContain('Planilha: Calendário\nA1 [s]: Post de amanhã')
  expect(result.text).toContain('B1 [n]: 3 [fórmula não executada: 1+2; valor em cache]')
  expect(result.text).toContain('C1 [inlineStr]: Legenda')
})
test('recusa XML malformado, entidades, expansão excessiva, original grande e pacote sem documento', () => {
  expect(() => extractOfficeText(docx('<w:document>'), 'x.docx')).toThrow()
  expect(() =>
    extractOfficeText(
      docx(`<!DOCTYPE x [<!ENTITY a SYSTEM "file:///private">]>${word('<w:p>&a;</w:p>')}`),
      'x.docx',
    ),
  ).toThrow('DTD')
  expect(() =>
    extractOfficeText(docx(word(`<w:t>${'a'.repeat(2 * 1024 * 1024)}</w:t>`)), 'x.docx'),
  ).toThrow('limite')
  expect(() => extractOfficeText(new Uint8Array(196609), 'x.docx')).toThrow('192 KiB')
  expect(() => extractOfficeText(zipSync({ other: strToU8('data') }), 'x.docx')).toThrow('ausente')
  expect(() =>
    extractOfficeText(
      docx(word(`${'<w:p>'.repeat(101)}<w:t>Texto</w:t>${'</w:p>'.repeat(101)}`)),
      'x.docx',
    ),
  ).toThrow('estrutura')
  expect(() =>
    extractOfficeText(
      docx(word(`<w:p><w:t>api_key = &quot;${'a'.repeat(30)}&quot;</w:t></w:p>`)),
      'x.docx',
    ),
  ).toThrow('credencial')
  expect(() =>
    extractOfficeText(
      zipSync({ '../word/document.xml': strToU8(word('<w:t>Texto</w:t>')) }),
      'x.docx',
    ),
  ).toThrow('caminhos')
})
