import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { extractPdfText } = await import('../src/server/zappy-knowledge')
const nextConfig = (await import('../next.config')).default

function textPdf(text: string): Uint8Array {
  const escaped = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
  const stream = `BT /F1 18 Tf 72 720 Td (${escaped}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(body)
}

describe('extração PDF do Zappy em Node', () => {
  test('declara e externaliza o canvas usado pelo PDF.js no standalone', async () => {
    const pkg = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as {
      dependencies?: Record<string, string>
    }

    expect(pkg.dependencies?.['@napi-rs/canvas']).toBeDefined()
    expect(nextConfig.serverExternalPackages).toEqual(
      expect.arrayContaining(['pdfjs-dist', '@napi-rs/canvas']),
    )
  })

  test('mantém a aresta estática que leva o worker do PDF.js ao standalone', async () => {
    // O `pdf.mjs` carrega o worker por import DINÂMICO: o file tracing não vê a
    // aresta e o arquivo ficava fora da imagem — a extração quebrava SÓ em
    // produção ("Setting up fake worker failed"), nunca em dev. O import estático
    // é o que faz o tracer copiar (`outputFileTracingIncludes` NÃO funciona: o
    // build com Turbopack ignora). Sem esta guarda, apagar a linha volta a ser um
    // erro que só aparece depois do deploy.
    const source = await Bun.file(
      new URL('../src/server/zappy-knowledge.ts', import.meta.url),
    ).text()
    expect(source).toContain("import('pdfjs-dist/legacy/build/pdf.worker.mjs')")
    expect(source).toContain('pdfjsWorker')
  })

  test('extrai texto de um PDF real sem DOMMatrix pré-existente', async () => {
    Reflect.deleteProperty(globalThis, 'DOMMatrix')

    await expect(extractPdfText(textPdf('Caderno do Aluno'))).resolves.toContain('Caderno do Aluno')
    expect(typeof globalThis.DOMMatrix).toBe('function')
  })
})
