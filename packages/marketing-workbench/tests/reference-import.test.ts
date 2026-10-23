import { expect, test } from 'bun:test'
import { parseReferenceImport, referenceImportBatch } from '../src/reference-import'

test('observação importada preserva zero, ausência, denominador e janela; duplicatas e período impossível falham', async () => {
  const observation = {
    schemaVersion: 1,
    sourceType: 'imported',
    network: 'instagram',
    subject: 'Publicação da pesquisa',
    periodStart: '2026-10-01T12:00:00Z',
    periodEnd: '2026-10-03T12:00:00Z',
    collectedAt: '2026-10-03T12:05:00Z',
    sampleSize: 1,
    coverage: 'Somente contadores públicos; alcance indisponível.',
    dimensions: { objective: 'Prática', audienceNeed: 'Começar', series: 'Jogos', format: 'feed' },
    metrics: [
      {
        key: 'likes',
        label: 'Curtidas',
        unit: 'count',
        measurement: {
          value: 0,
          availability: 'observed',
          denominator: null,
          definition: 'Contador público no instante da coleta',
        },
      },
      {
        key: 'shares',
        label: 'Compartilhamentos',
        unit: 'count',
        measurement: {
          value: null,
          availability: 'unavailable',
          denominator: null,
          definition: 'Não fornecido pela fonte',
        },
      },
    ],
  }
  const input = { title: 'Observação', label: 'Pesquisa', observation },
    parsed = parseReferenceImport(JSON.stringify([input]), 'json'),
    batch = await referenceImportBatch(crypto.randomUUID(), 'metricas.json', parsed)
  expect(batch.changes[0]?.document).toMatchObject({ kind: 'evidence', observation })
  const csv = `title,label,observation\nObservação,Pesquisa,"${JSON.stringify(observation).replaceAll('"', '""')}"`
  expect(parseReferenceImport(csv, 'csv')).toEqual(parsed)
  expect(() =>
    parseReferenceImport(
      JSON.stringify([
        { ...input, observation: { ...observation, periodEnd: '2026-10-04T00:00:00Z' } },
      ]),
      'json',
    ),
  ).toThrow()
  expect(() =>
    parseReferenceImport(
      JSON.stringify([
        {
          ...input,
          observation: {
            ...observation,
            metrics: [observation.metrics[0], observation.metrics[0]],
          },
        },
      ]),
      'json',
    ),
  ).toThrow()
  expect(() =>
    parseReferenceImport(
      JSON.stringify([
        { ...input, observation: { ...observation, sourceType: 'connected-account' } },
      ]),
      'json',
    ),
  ).toThrow()
})

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
