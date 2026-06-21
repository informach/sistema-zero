/**
 * Spike 03 — cancela a NFS-e emitida no spike 02 via evento e101101.
 * Uso: bun spike/03-cancel.ts [chaveAcesso]  (default: out/chave-acesso.txt)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { loadA1Certificate } from './lib/cert'
import { dhAgora } from './lib/dps'
import { baseUrls, dumpResponse, gzipBase64, mtlsFetch } from './lib/http'
import { EMITTER, preId } from './lib/profile'
import { signXml } from './lib/sign'

const cert = loadA1Certificate()
const { sefin, ambiente, tpAmb } = baseUrls()
if (ambiente === 'producao') throw new Error('Spike NÃO roda em produção.')

const chave = (
  process.argv[2] ?? readFileSync(`${import.meta.dir}/out/chave-acesso.txt`, 'utf8')
).trim()
const id = preId(chave, '101101')

// pedRegEvento conforme XSD (pedRegEvento_v1.01.xsd + tiposEventos_v1.01.xsd):
// cMotivo do e101101: 1=Erro na Emissão · 2=Serviço não Prestado · 9=Outros
const cMotivo = process.env.NFSE_CANCEL_MOTIVO ?? '2'
const xMotivo =
  process.env.NFSE_CANCEL_DESC ??
  'Compra reembolsada ao consumidor dentro da garantia (teste spike)'

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">` +
  `<infPedReg Id="${id}">` +
  `<tpAmb>${tpAmb}</tpAmb>` +
  `<verAplic>${EMITTER.verAplic}</verAplic>` +
  `<dhEvento>${dhAgora()}</dhEvento>` +
  `<CNPJAutor>${EMITTER.cnpj}</CNPJAutor>` +
  `<chNFSe>${chave}</chNFSe>` +
  `<e101101>` +
  `<xDesc>Cancelamento de NFS-e</xDesc>` +
  `<cMotivo>${cMotivo}</cMotivo>` +
  `<xMotivo>${xMotivo}</xMotivo>` +
  `</e101101>` +
  `</infPedReg>` +
  `</pedRegEvento>`

const signed = signXml(xml, 'infPedReg', cert)
writeFileSync(`${import.meta.dir}/out/cancel-signed.xml`, signed)

const res = await mtlsFetch(`${sefin}/nfse/${chave}/eventos`, cert, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ pedidoRegistroEventoXmlGZipB64: gzipBase64(signed) }),
})
const body = await dumpResponse('POST /nfse/{chave}/eventos (e101101)', res)
writeFileSync(`${import.meta.dir}/out/cancel-response.json`, body)

const eventos = await mtlsFetch(`${sefin}/nfse/${chave}/eventos`, cert)
await dumpResponse('GET /nfse/{chave}/eventos', eventos)
