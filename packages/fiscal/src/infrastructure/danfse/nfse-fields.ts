import { DOMParser } from '@xmldom/xmldom'
import { type DanfseData, nfseNumberFromAccessKey } from '../../domain/danfse/danfse-data'
import type { EmitterProfile } from '../../domain/dps/emitter-profile'
import { centsToReais } from '../../domain/money'
import type { DanfseRenderInput } from '../../domain/ports/danfse-provider.port'

/**
 * `nfse_xml` (NFS-e autorizada, ns `http://www.sped.fazenda.gov.br/nfse`) →
 * `DanfseData`. TOTAL: qualquer XML ausente/ilegível cai no FALLBACK estruturado
 * (linha da invoice + `EmitterProfile`) — nunca lança por conteúdo, porque a fila
 * de entrega não tem teto de tentativas e uma exceção determinística viraria
 * retry infinito de 15min (invariante do plano).
 *
 * Navegação por FILHOS DIRETOS (não `getElementsByTagName` profundo): o XML
 * carrega os subtrees `<Signature>` (xmldsig) da DPS e da NFS-e, e a DPS
 * EMBUTIDA repete tags do nível de cima (`valores`, `verAplic`) — descer nível a
 * nível é o que garante ler o campo certo.
 */
export function buildDanfseData(input: DanfseRenderInput, profile: EmitterProfile): DanfseData {
  const parsed = parseNfseXml(input.nfseXml, input.accessKey)
  if (parsed) return parsed
  return fallbackData(input, profile)
}

function parseNfseXml(xml: string | null, accessKeyFallback: string): DanfseData | null {
  const raw = xml?.trim()
  if (!raw) return null
  try {
    // errorHandler mudo: warning/error não-fatais seguem; fatal lança e cai no
    // catch (→ fallback). O DANFSe nunca pode falhar por XML torto.
    const doc = new DOMParser({ errorHandler: () => undefined }).parseFromString(raw, 'text/xml')
    const nfse =
      childEl(doc, 'NFSe') ??
      (doc.documentElement?.localName === 'NFSe' ? doc.documentElement : null)
    const inf = nfse ? childEl(nfse, 'infNFSe') : null
    if (!inf) return null

    const accessKey = (inf.getAttribute('Id') ?? '').replace(/^NFS/, '') || accessKeyFallback
    const emitEl = childEl(inf, 'emit')
    const enderNac = emitEl ? childEl(emitEl, 'enderNac') : null
    const dps = childEl(inf, 'DPS')
    const infDps = dps ? childEl(dps, 'infDPS') : null
    const prest = infDps ? childEl(infDps, 'prest') : null
    const regTrib = prest ? childEl(prest, 'regTrib') : null
    const toma = infDps ? childEl(infDps, 'toma') : null
    const serv = infDps ? childEl(infDps, 'serv') : null
    const cServ = serv ? childEl(serv, 'cServ') : null
    const locPrest = serv ? childEl(serv, 'locPrest') : null
    const dpsValores = infDps ? childEl(infDps, 'valores') : null
    const vServPrest = dpsValores ? childEl(dpsValores, 'vServPrest') : null
    const vDescCondIncond = dpsValores ? childEl(dpsValores, 'vDescCondIncond') : null
    const trib = dpsValores ? childEl(dpsValores, 'trib') : null
    const tribMun = trib ? childEl(trib, 'tribMun') : null
    const totTrib = trib ? childEl(trib, 'totTrib') : null
    const vTotTrib = totTrib ? childEl(totTrib, 'vTotTrib') : null
    const nfseValores = childEl(inf, 'valores')

    const emitDoc = text(emitEl, 'CNPJ') ?? text(emitEl, 'CPF')
    const tomaDoc = text(toma, 'CNPJ') ?? text(toma, 'CPF')
    const tomaEnd = toma ? childEl(toma, 'end') : null
    const tomaEndNac = tomaEnd ? childEl(tomaEnd, 'endNac') : null

    return {
      accessKey,
      ambGer: text(inf, 'ambGer'),
      tpAmb: text(infDps, 'tpAmb'),
      nNFSe: text(inf, 'nNFSe'),
      dhProc: text(inf, 'dhProc'),
      cStat: text(inf, 'cStat'),
      xLocEmi: text(inf, 'xLocEmi'),
      emit: {
        doc: emitDoc,
        docKind: emitDoc ? (text(emitEl, 'CNPJ') ? 'cnpj' : 'cpf') : null,
        im: text(emitEl, 'IM'),
        xNome: text(emitEl, 'xNome'),
        endereco: joinAddress(enderNac),
        municipio: text(inf, 'xLocEmi'),
        uf: text(enderNac, 'UF'),
        cMun: text(enderNac, 'cMun'),
        cep: text(enderNac, 'CEP'),
        fone: text(emitEl, 'fone'),
        email: text(emitEl, 'email'),
      },
      regTrib: {
        opSimpNac: text(regTrib, 'opSimpNac'),
        regApTribSN: text(regTrib, 'regApTribSN'),
        regEspTrib: text(regTrib, 'regEspTrib'),
      },
      toma: toma
        ? {
            doc: tomaDoc,
            docKind: tomaDoc ? (text(toma, 'CNPJ') ? 'cnpj' : 'cpf') : null,
            im: text(toma, 'IM'),
            xNome: text(toma, 'xNome'),
            endereco: joinAddress(tomaEnd ?? toma),
            municipio: null,
            uf: text(tomaEndNac, 'UF'),
            cMun: text(tomaEndNac, 'cMun'),
            cep: text(tomaEndNac, 'CEP'),
            fone: text(toma, 'fone'),
            email: text(toma, 'email'),
          }
        : null,
      serv: {
        cTribNac: text(cServ, 'cTribNac'),
        cTribMun: text(cServ, 'cTribMun'),
        cNBS: text(cServ, 'cNBS'),
        xDescServ: text(cServ, 'xDescServ'),
        xTribNac: text(inf, 'xTribNac'),
        xTribMun: text(inf, 'xTribMun'),
        xNBS: text(inf, 'xNBS'),
        xLocPrestacao: text(inf, 'xLocPrestacao') ?? text(locPrest, 'cLocPrestacao'),
      },
      dps: {
        nDPS: text(infDps, 'nDPS'),
        serie: text(infDps, 'serie'),
        dhEmi: text(infDps, 'dhEmi'),
        dCompet: text(infDps, 'dCompet'),
        tpEmit: text(infDps, 'tpEmit'),
      },
      valores: {
        vServ: text(vServPrest, 'vServ'),
        vLiq: text(nfseValores, 'vLiq'),
        vBC: text(nfseValores, 'vBC'),
        pAliqAplic: text(nfseValores, 'pAliqAplic'),
        vISSQN: text(nfseValores, 'vISSQN'),
        vTotalRet: text(nfseValores, 'vTotalRet'),
        vDescIncond: text(vDescCondIncond, 'vDescIncond'),
        vDescCond: text(vDescCondIncond, 'vDescCond'),
        tribISSQN: text(tribMun, 'tribISSQN'),
        tpRetISSQN: text(tribMun, 'tpRetISSQN'),
        cLocIncid: text(inf, 'cLocIncid'),
        xLocIncid: text(inf, 'xLocIncid'),
        pTotTribSN: text(totTrib, 'pTotTribSN'),
        vTotTribFed: text(vTotTrib, 'vTotTribFed'),
        vTotTribEst: text(vTotTrib, 'vTotTribEst'),
        vTotTribMun: text(vTotTrib, 'vTotTribMun'),
      },
      fromFallback: false,
    }
  } catch {
    return null
  }
}

/**
 * Sem XML legível (caminho `duplicate` da emissão, fake de dev): monta o DANFSe
 * dos dados ESTRUTURADOS da linha + perfil do emitente. O nNFSe sai da CHAVE
 * (nunca "-"); `dhProc` usa o instante da emissão como proxy. Campos que só a
 * Sefin devolve (nome/endereço resolvidos do emitente, descrições xTrib*) ficam
 * null → o renderer imprime o traço da nota 12 da NT.
 */
function fallbackData(input: DanfseRenderInput, profile: EmitterProfile): DanfseData {
  const invoice = input.invoice
  const doc = invoice.customer.document?.trim() || null
  return {
    accessKey: input.accessKey,
    ambGer: '2',
    tpAmb: profile.tpAmb,
    nNFSe: nfseNumberFromAccessKey(input.accessKey),
    // Proxy do dhProc: instante da emissão em ISO-BRT (mesma base do dps-builder;
    // o renderer imprime a hora LITERAL do campo, nunca converte TZ).
    dhProc: input.emittedAt ? toBrtIso(input.emittedAt) : null,
    cStat: '100',
    xLocEmi: null,
    emit: {
      doc: profile.cnpj,
      docKind: 'cnpj',
      im: profile.im || null,
      xNome: null,
      endereco: null,
      municipio: null,
      uf: null,
      cMun: profile.cLocEmi,
      cep: null,
      fone: null,
      email: null,
    },
    regTrib: {
      opSimpNac: profile.opSimpNac,
      regApTribSN: profile.regApTribSN,
      regEspTrib: profile.regEspTrib,
    },
    toma: doc
      ? {
          doc,
          docKind: doc.length === 14 ? 'cnpj' : 'cpf',
          im: null,
          xNome: invoice.customer.name?.trim() || null,
          endereco: null,
          municipio: null,
          uf: null,
          cMun: null,
          cep: null,
          fone: null,
          email: null,
        }
      : null,
    serv: {
      cTribNac: profile.cTribNac,
      cTribMun: profile.cTribMun,
      cNBS: profile.cNBS,
      xDescServ: invoice.serviceDescription,
      xTribNac: null,
      xTribMun: null,
      xNBS: null,
      xLocPrestacao: null,
    },
    dps: {
      nDPS: invoice.dpsNumber !== null ? String(invoice.dpsNumber) : null,
      serie: invoice.dpsSeries,
      dhEmi: null,
      dCompet: input.competenceDate,
      tpEmit: '1',
    },
    valores: {
      vServ: centsToReais(invoice.amountInCents),
      vLiq: centsToReais(invoice.amountInCents),
      vBC: null,
      pAliqAplic: null,
      vISSQN: null,
      vTotalRet: null,
      vDescIncond: null,
      vDescCond: null,
      tribISSQN: null,
      tpRetISSQN: null,
      cLocIncid: null,
      xLocIncid: null,
      pTotTribSN: profile.pTotTribSN || null,
      vTotTribFed: null,
      vTotTribEst: null,
      vTotTribMun: null,
    },
    fromFallback: true,
  }
}

/** UTC → ISO com offset -03:00 (offset FIXO de Brasília, padrão do dps-builder). */
function toBrtIso(date: Date): string {
  const BRT_OFFSET_MS = 3 * 3600_000
  return `${new Date(date.getTime() - BRT_OFFSET_MS).toISOString().slice(0, 19)}-03:00`
}

type ElementLike = {
  localName: string | null
  childNodes: { length: number; item(i: number): NodeLike | null }
  getAttribute(name: string): string | null
  textContent: string | null
}
type NodeLike = { nodeType: number; localName?: string | null }

/** 1º FILHO DIRETO elemento com o localName dado (nunca desce em Signature). */
function childEl(parent: unknown, localName: string): ElementLike | null {
  const p = parent as { childNodes?: { length: number; item(i: number): NodeLike | null } } | null
  const kids = p?.childNodes
  if (!kids) return null
  for (let i = 0; i < kids.length; i++) {
    const node = kids.item(i)
    if (node && node.nodeType === 1 && node.localName === localName) {
      return node as unknown as ElementLike
    }
  }
  return null
}

/** Texto (trim) do 1º filho direto `tag` — vazio/ausente → null. */
function text(parent: ElementLike | null, tag: string): string | null {
  const el = parent ? childEl(parent, tag) : null
  const value = el?.textContent?.trim()
  return value ? value : null
}

/** "RUA JURUA, 261, GRACA" — concatena o que houver (xLgr, nro, xCpl, xBairro). */
function joinAddress(container: ElementLike | null): string | null {
  if (!container) return null
  const parts = [
    text(container, 'xLgr'),
    text(container, 'nro'),
    text(container, 'xCpl'),
    text(container, 'xBairro'),
  ].filter((v): v is string => v !== null)
  return parts.length > 0 ? parts.join(', ') : null
}
