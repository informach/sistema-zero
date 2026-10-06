import { describe, expect, mock, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { PDFDocument } from '@cantoo/pdf-lib'
import sharp from 'sharp'

// `server-only` lança fora do React Server — neutraliza para testar o renderizador puro.
mock.module('server-only', () => ({}))

// DNS é stubado: os testes usam hosts não-resolvíveis (`.test`) com fetch mockado; sem isto a
// checagem anti-DNS-rebinding (`resolvesToPublicAddress`) barraria a imagem. `dnsAddresses` é
// mutável p/ o teste de rebinding (hostname público resolvendo p/ IP privado). O teste de
// redirect a host privado segue passando (o salto privado é IP LITERAL, barrado sincronamente
// por `isSafeRemoteUrl` antes de qualquer resolução).
let dnsAddresses: { address: string; family: number }[] = [{ address: '93.184.216.34', family: 4 }]
mock.module('node:dns/promises', () => ({
  lookup: async () => dnsAddresses,
}))

const { renderCertificatePdf } = await import('../src/server/certificate-pdf')

const CERT = {
  id: '11111111-1111-1111-1111-111111111111',
  serial: 'SZ-2026-ABCDEFGH',
  studentName: 'Maria Silva',
  courseTitle: 'Curso de Lógica',
  courseRef: 'curso-logica',
  completedAt: '2026-06-23T00:00:00.000Z',
  issuedAt: '2026-06-23T00:00:00.000Z',
  revokedAt: null,
}

function pdfHeader(bytes: Uint8Array): string {
  return Buffer.from(bytes.slice(0, 5)).toString('latin1')
}

/**
 * O texto desenhado, para conferir O QUE o certificado diz. O pdf-lib comprime cada fluxo de
 * conteúdo (FlateDecode) e escreve o texto das fontes padrão como hexadecimal WinAnsi
 * (`<…> Tj`); por isso a busca é pelo hexadecimal da frase.
 */
function textoDesenhado(bytes: Uint8Array): string {
  const bruto = Buffer.from(bytes).toString('latin1')
  let texto = ''
  for (const fluxo of bruto.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      texto += inflateSync(Buffer.from(fluxo[1] ?? '', 'latin1')).toString('latin1')
    } catch {
      // Fluxo que não é Flate (imagem, por exemplo): não tem texto.
    }
  }
  return texto.toLowerCase()
}
const hex = (frase: string) => Buffer.from(frase, 'latin1').toString('hex')

describe('renderCertificatePdf', () => {
  test('gera um PDF válido com QR (config + verifyUrl)', async () => {
    const bytes = await renderCertificatePdf({
      certificate: CERT,
      config: { issuerName: 'Equipe Sistema Zero', accentColor: '#0891B2', message: 'Parabéns!' },
      verifyUrl: 'https://comunidade.sistemazero.com.br/validar/abc',
    })
    expect(pdfHeader(bytes)).toBe('%PDF-')
    // QR + texto + moldura → bem acima do PDF vazio.
    expect(bytes.byteLength).toBeGreaterThan(2000)
  })

  test('sem imagem base: a frase do curso no lugar da linha genérica, e o parágrafo sai (06/10/2026)', async () => {
    // O PDF dizia "concluiu" duas vezes ("concluiu com êxito o curso / Cadê Todo Mundo? /
    // concluiu Cadê Todo Mundo?") e não imprimia o parágrafo do que a criança programou.
    const bytes = await renderCertificatePdf({
      certificate: CERT,
      config: {
        title: 'Certificado de Criador',
        introLine: 'Certificamos que',
        coursePhrase: 'completou a aventura Cadê Todo Mundo?',
        bodyText: 'Programou o toque que revela os personagens e a contagem dos achados.',
      },
      verifyUrl: '',
    })
    const texto = textoDesenhado(bytes)
    // Anti-vácuo: a extração acha o nome, então a ausência abaixo quer dizer alguma coisa.
    expect(texto).toContain(hex('Maria Silva'))
    expect(texto).toContain(hex('CERTIFICADO DE CRIADOR'))
    expect(texto).toContain(hex('completou a aventura Cad'))
    expect(texto).not.toContain(hex('concluiu'))
    expect(texto).not.toContain(hex('Curso de L'))
    expect(texto).toContain(hex('Programou o toque'))
  })

  test('sem imagem base e sem frase: a linha genérica com o título, sem "o aluno"', async () => {
    const texto = textoDesenhado(
      await renderCertificatePdf({ certificate: CERT, config: {}, verifyUrl: '' }),
    )
    expect(texto).toContain(hex('Certificamos que'))
    expect(texto).not.toContain(hex('o aluno'))
    expect(texto).toContain(hex('concluiu com '))
    expect(texto).toContain(hex('Curso de L'))
  })

  test('tolera config vazia e verifyUrl vazio (sem QR)', async () => {
    const bytes = await renderCertificatePdf({ certificate: CERT, config: {}, verifyUrl: '' })
    expect(pdfHeader(bytes)).toBe('%PDF-')
  })

  test('cor de destaque inválida não quebra (cai no padrão)', async () => {
    const bytes = await renderCertificatePdf({
      certificate: CERT,
      config: { accentColor: 'roxo' },
      verifyUrl: 'https://x/validar/abc',
    })
    expect(pdfHeader(bytes)).toBe('%PDF-')
  })

  test('embute imagem base WebP do uploader do admin no layout overlay', async () => {
    const webp = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .webp()
      .toBuffer()
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => {
      return new Response(new Uint8Array(webp), { headers: { 'content-type': 'image/webp' } })
    }) as unknown as typeof fetch

    try {
      const bytes = await renderCertificatePdf({
        certificate: CERT,
        config: {
          baseImageUrl: 'https://cdn.sistemazero.test/certificado.webp',
          introLine: 'Certificamos que o aluno',
          coursePhrase: 'concluiu o curso',
          bodyText: 'Criou um projeto e praticou lógica de programação.',
        },
        verifyUrl: '',
      })
      const pdf = await PDFDocument.load(bytes)
      const { width, height } = pdf.getPage(0).getSize()
      expect(Math.round(width)).toBe(842)
      expect(Math.round(height)).toBe(474)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('não embute imagem cujo hostname RESOLVE p/ IP privado (anti DNS rebinding)', async () => {
    const fetchMock = mock(async () => new Response(new Uint8Array([0x89, 0x50]), { status: 200 }))
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock as unknown as typeof fetch
    dnsAddresses = [{ address: '169.254.169.254', family: 4 }] // metadados de nuvem
    try {
      const bytes = await renderCertificatePdf({
        certificate: CERT,
        config: { baseImageUrl: 'https://rebind.sistemazero.test/certificado.png' },
        verifyUrl: '',
      })
      // Imagem barrada ANTES do fetch → cai no layout "marca" (A4 retrato 595pt), não no overlay.
      const pdf = await PDFDocument.load(bytes)
      expect(Math.round(pdf.getPage(0).getSize().height)).toBe(595)
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
      dnsAddresses = [{ address: '93.184.216.34', family: 4 }]
    }
  })

  test('barra IPv4-mapeado em IPv6 hex (::ffff:169.254.169.254 dos metadados)', async () => {
    // O `new URL` normaliza `::ffff:169.254.169.254` p/ `::ffff:a9fe:a9fe` (hex,
    // sem ponto): o guard precisa reconstruir o IPv4 dos hextets, senão escapava.
    const fetchMock = mock(async () => new Response(new Uint8Array([0x89, 0x50]), { status: 200 }))
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock as unknown as typeof fetch
    try {
      const bytes = await renderCertificatePdf({
        certificate: CERT,
        config: { baseImageUrl: 'http://[::ffff:169.254.169.254]/latest/meta-data/' },
        verifyUrl: '',
      })
      // Barrada sincronamente (antes do fetch) → cai no layout "marca" A4 retrato 595pt.
      const pdf = await PDFDocument.load(bytes)
      expect(Math.round(pdf.getPage(0).getSize().height)).toBe(595)
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('não segue redirect de imagem para host privado', async () => {
    const fetchMock = mock(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data' },
      })
    })
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const bytes = await renderCertificatePdf({
        certificate: CERT,
        config: { baseImageUrl: 'https://cdn.sistemazero.test/certificado.png' },
        verifyUrl: '',
      })
      expect(pdfHeader(bytes)).toBe('%PDF-')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const firstCall = fetchMock.mock.calls[0] as unknown as [unknown, RequestInit] | undefined
      expect(firstCall?.[1]).toMatchObject({ redirect: 'manual' })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
