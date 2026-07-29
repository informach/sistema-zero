import { describe, expect, test } from 'bun:test'
import * as forge from 'node-forge'
import { type EmitterProfile, INFORMACH_BASE } from '../../src/domain/dps/emitter-profile'
import type { A1Certificate } from '../../src/infrastructure/certificate/a1-certificate'
import { SefinHttpGateway } from '../../src/infrastructure/gateways/sefin/sefin.gateway'
import { silentLogger } from '../fakes/in-memory'

const profile: EmitterProfile = {
  ...INFORMACH_BASE,
  tpAmb: '2',
  im: '13372670018',
  serie: '901',
  cTribMun: '001',
  pTotTribSN: '8.24',
}

const input = {
  dpsId: 'DPS310620024358875800010390100000000000001',
  dpsNumber: 1n,
  serie: '901',
  competenceDate: '2026-07-24',
  tomador: { cpf: '52998224725', nome: 'Maria' },
  valor: '37.00',
  descricao: 'Treinamento',
}

function certificate(): A1Certificate {
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date('2026-01-01T00:00:00Z')
  cert.validity.notAfter = new Date('2027-01-01T00:00:00Z')
  cert.setSubject([{ name: 'commonName', value: 'test' }])
  cert.setIssuer([{ name: 'commonName', value: 'test' }])
  cert.sign(keys.privateKey, forge.md.sha256.create())
  const leafCertPem = forge.pki.certificateToPem(cert)
  return {
    cert: leafCertPem,
    leafCertPem,
    key: forge.pki.privateKeyToPem(keys.privateKey),
    info: { subject: 'test', notBefore: cert.validity.notBefore, notAfter: cert.validity.notAfter },
  }
}

type FetchMock = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

async function withFetchMock<T>(mock: FetchMock, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: mock, writable: true })
  try {
    return await run()
  } finally {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: original,
      writable: true,
    })
  }
}

describe('SefinHttpGateway', () => {
  test('falha da consulta de recuperação após 400 permanece retentável', async () => {
    let calls = 0
    const fetchMock: FetchMock = async () => {
      calls += 1
      if (calls === 1) {
        return Response.json(
          { erros: [{ Codigo: 'E0001', Descricao: 'DPS existente' }] },
          { status: 400 },
        )
      }
      throw new Error('consulta indisponível')
    }

    await withFetchMock(fetchMock, async () => {
      const cert = certificate()
      const gateway = new SefinHttpGateway(
        profile,
        cert,
        { ambiente: 'producao-restrita', timeoutMs: 1000, totalBudgetMs: 2000, sigAlgo: 'sha1' },
        silentLogger,
      )
      await expect(gateway.emitDps(input)).rejects.toThrow('consulta indisponível')
    })
  })

  test('201 com XML compactado inválido falha em vez de persistir XML vazio', async () => {
    const fetchMock: FetchMock = async () =>
      Response.json({ chaveAcesso: '1'.repeat(50), nfseXmlGZipB64: 'inválido' }, { status: 201 })

    await withFetchMock(fetchMock, async () => {
      const cert = certificate()
      const gateway = new SefinHttpGateway(
        profile,
        cert,
        { ambiente: 'producao-restrita', timeoutMs: 1000, totalBudgetMs: 2000, sigAlgo: 'sha1' },
        silentLogger,
      )
      await expect(gateway.emitDps(input)).rejects.toThrow('nfseXmlGZipB64 inválido')
    })
  })

  test('400 ao repetir cancelamento recupera o evento já registrado no ADN', async () => {
    let calls = 0
    const fetchMock: FetchMock = async () => {
      calls += 1
      if (calls === 1) {
        return Response.json(
          { erros: [{ Codigo: 'E0001', Descricao: 'evento já registrado' }] },
          { status: 400 },
        )
      }
      return Response.json({ eventos: [{ tipo: 'e101101', xml: '<evento cancelado/>' }] })
    }

    await withFetchMock(fetchMock, async () => {
      const gateway = new SefinHttpGateway(
        profile,
        certificate(),
        { ambiente: 'producao-restrita', timeoutMs: 1000, totalBudgetMs: 2000, sigAlgo: 'sha1' },
        silentLogger,
      )
      const result = await gateway.cancelNfse({
        accessKey: '1'.repeat(50),
        cMotivo: '2',
        xMotivo: 'Pagamento reembolsado ao consumidor',
      })

      expect(result.kind).toBe('accepted')
      expect(calls).toBe(2)
    })
  })

  test('evento já registrado ainda ausente no ADN permanece retentável', async () => {
    let calls = 0
    const fetchMock: FetchMock = async () => {
      calls += 1
      if (calls === 1) {
        return Response.json(
          { erros: [{ Codigo: 'E0001', Descricao: 'evento já registrado' }] },
          { status: 400 },
        )
      }
      return new Response(null, { status: 404 })
    }

    await withFetchMock(fetchMock, async () => {
      const gateway = new SefinHttpGateway(
        profile,
        certificate(),
        { ambiente: 'producao-restrita', timeoutMs: 1000, totalBudgetMs: 2000, sigAlgo: 'sha1' },
        silentLogger,
      )

      await expect(
        gateway.cancelNfse({
          accessKey: '1'.repeat(50),
          cMotivo: '2',
          xMotivo: 'Pagamento reembolsado ao consumidor',
        }),
      ).rejects.toThrow('aguardando disponibilidade no ADN')
      expect(calls).toBe(2)
    })
  })

  test('erro HTTP da Sefin não ecoa CPF formatado', async () => {
    const fetchMock: FetchMock = async () =>
      new Response('tomador CPF 529.982.247-25', { status: 503 })

    await withFetchMock(fetchMock, async () => {
      const gateway = new SefinHttpGateway(
        profile,
        certificate(),
        { ambiente: 'producao-restrita', timeoutMs: 1000, totalBudgetMs: 2000, sigAlgo: 'sha1' },
        silentLogger,
      )
      await expect(gateway.emitDps(input)).rejects.not.toThrow('529.982.247-25')
    })
  })
})
