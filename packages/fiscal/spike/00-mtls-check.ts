/**
 * Spike 00 — valida o mTLS com o A1 real e consulta a parametrização municipal
 * de BH (convênio + alíquota/parâmetros do serviço 080201).
 * Uso: bun spike/00-mtls-check.ts   (com NFSE_CERT_PFX_PATH/_BASE64 + senha no env)
 */
import { loadA1Certificate } from './lib/cert'
import { baseUrls, dumpResponse, mtlsFetch } from './lib/http'
import { EMITTER } from './lib/profile'

const cert = loadA1Certificate()
console.log('Certificado:', cert.info.subject)
console.log('Validade:', cert.info.notBefore.toISOString(), '→', cert.info.notAfter.toISOString())

const { adnParam, ambiente } = baseUrls()
console.log('Ambiente:', ambiente, '·', adnParam)

const convenio = await mtlsFetch(`${adnParam}/${EMITTER.cLocEmi}/convenio`, cert)
await dumpResponse('GET /parametrizacao/{BH}/convenio', convenio)

const hoje = new Date().toISOString().slice(0, 10)
const aliq = await mtlsFetch(
  `${adnParam}/${EMITTER.cLocEmi}/${EMITTER.cTribNac}/${hoje}/aliquota`,
  cert,
)
await dumpResponse(`GET /parametrizacao/{BH}/${EMITTER.cTribNac}/${hoje}/aliquota`, aliq)

const regimes = await mtlsFetch(
  `${adnParam}/${EMITTER.cLocEmi}/${EMITTER.cTribNac}/${hoje}/regimes_especiais`,
  cert,
)
await dumpResponse('GET .../regimes_especiais', regimes)
