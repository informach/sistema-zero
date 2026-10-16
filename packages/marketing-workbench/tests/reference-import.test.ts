import { expect, test } from 'bun:test'
import { parseReferenceImport, referenceImportBatch } from '../src/reference-import'

test('CSV preserva citações, vírgulas e quebras, sem executar fórmulas', () => {
  const rows = parseReferenceImport(
    'title,label,body,classification\r\n"Relato, família",Documento,"Ela disse ""eu criei"".\n=SUM(1,2)",fact',
    'csv',
  )
  expect(rows[0]?.body).toBe('Ela disse "eu criei".\n=SUM(1,2)')
  expect(rows[0]?.classification).toBe('fact')
})
test('dados malformados e colunas desconhecidas são recusados antes da gravação', () => {
  expect(() => parseReferenceImport('title,label\n"Incompleto,Origem', 'csv')).toThrow()
  expect(() =>
    parseReferenceImport('[{"title":"Fonte","label":"Autor","command":"execute"}]', 'json'),
  ).toThrow()
})
test('mesma carga conserva identidade, outro projeto recebe identidades próprias e URL ativa é recusada', async () => {
  const refs = parseReferenceImport(
    '[{"title":"Fonte","label":"Autor","url":"https://example.com"}]',
    'json',
  )
  const project = crypto.randomUUID(),
    first = await referenceImportBatch(project, 'fontes.json', refs),
    again = await referenceImportBatch(project, 'fontes.json', refs),
    other = await referenceImportBatch(crypto.randomUUID(), 'fontes.json', refs)
  expect(first.changes[0]?.entityId).toBe(again.changes[0]?.entityId)
  expect(first.operationId).toBe(again.operationId)
  expect(other.changes[0]?.entityId).not.toBe(first.changes[0]?.entityId)
  const reference = refs[0]
  if (!reference) throw new Error('Referência ausente')
  await expect(
    referenceImportBatch(project, 'arquivo.json', [{ ...reference, url: 'javascript:alert(1)' }]),
  ).rejects.toThrow()
})
