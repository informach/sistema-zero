import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
  StandardFonts,
} from '@cantoo/pdf-lib'
import { toBuffer as qrToBuffer } from 'qrcode'
import {
  AMB_GERADOR_LABELS,
  C_STAT_LABELS,
  type DanfseData,
  type DanfseParty,
  OP_SIMP_NAC_LABELS,
  REG_AP_TRIB_SN_LABELS,
  REG_ESP_TRIB_LABELS,
  TP_AMB_LABELS,
  TP_EMIT_LABELS,
  TP_RET_ISSQN_LABELS,
  TRIB_ISSQN_LABELS,
} from '../../domain/danfse/danfse-data'
import type { EmitterProfile } from '../../domain/dps/emitter-profile'
import { formatXmlDecimalBrl } from '../../domain/money'
import type { DanfseProvider, DanfseRenderInput } from '../../domain/ports/danfse-provider.port'
import { logoNfsePng } from './logo-nfse'
import { buildDanfseData } from './nfse-fields'

/** URL de consulta pública do QR Code — literal da NT 008/2026 (item 2.4.3). */
export const NFSE_CONSULTA_PUBLICA_URL = 'https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave='

const CM = 28.3465 // 1cm em pontos PDF
const PAGE_W = 595.28 // A4 retrato
const PAGE_H = 841.89
/** Margem lateral da NT (0,15–0,20cm) — as posições da tabela 2.4.5 são relativas a ela. */
const MARGIN_CM = 0.15
/** Colunas da tabela 2.4.5 (cm a partir da margem). */
const C1 = 0.3
const C2 = 5.41
const C3 = 10.51
const C4 = 15.62
const CELL_W = 5.09
const WIDE_W = 10.19
const FULL_W = 20.4
const ROW_H = 0.63
const SHADE = rgb(0.95, 0.95, 0.95) // cinza 5% (sombreamento da NT)
const LINE = rgb(0, 0, 0)

/**
 * DANFSe v2.0 GERADO LOCALMENTE (NT 008/2026 + Anexo I; a comparação visual de
 * referência é o `spike/out/danfse.pdf` oficial do governo). Uma página A4
 * retrato; layout FLUIDO na vertical (cursor por bloco, com as supressões que a
 * NT permite — bloco vazio vira a linha única dos itens 2.3.1/2.3.2, o canhoto é
 * omitido e a folga vai para as Informações Complementares), colunas/tamanhos de
 * fonte da tabela 2.4.5. Helvetica no lugar de Arial/Microsoft Sans Serif
 * (fontes built-in do pdf-lib — mesmo racional do certificate-pdf do
 * member-shell; a NT fixa TAMANHOS mínimos, e a métrica da Helvetica é a análoga
 * universal da Arial).
 *
 * TOTAL sobre os dados: campo ausente imprime o traço "-" (nota 12 da NT); XML
 * ilegível cai no fallback estruturado (nfse-fields). O QR é best-effort (falha
 * → PDF sai sem ele, nunca quebra a entrega).
 */
export class LocalDanfseRenderer implements DanfseProvider {
  constructor(private readonly profile: EmitterProfile) {}

  async render(input: DanfseRenderInput): Promise<Uint8Array> {
    const data = buildDanfseData(input, this.profile)
    const doc = await PDFDocument.create()
    const page = doc.addPage([PAGE_W, PAGE_H])
    const helv = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)
    const draw = new Drawer(page, helv, bold)

    // Homologação: o aviso vermelho do cabeçalho vale para tpAmb=2 E para o
    // ambiente da linha (cinto-e-suspensório — o fallback sem XML usa o profile).
    const homolog = data.tpAmb === '2' || input.invoice.ambiente !== 'producao'

    let logo: PDFImage | null = null
    try {
      logo = await doc.embedPng(logoNfsePng())
    } catch {
      logo = null
    }
    const qr = await qrImage(doc, `${NFSE_CONSULTA_PUBLICA_URL}${data.accessKey}`)

    drawHeader(draw, data, homolog, logo)
    drawIdentification(draw, data, qr)
    let top = 4.34 // topo do bloco do prestador (tabela 2.4.5)
    top = drawEmitter(draw, data, top)
    top = drawParty(draw, 'TOMADOR / ADQUIRENTE', data.toma, top, {
      missing: 'TOMADOR/ADQUIRENTE DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e',
    })
    // Nossa DPS não preenche destinatário/intermediário (grupo IBS/CBS) — as
    // linhas únicas dos itens 2.3.1/2.3.2 da NT.
    top = drawSingleLineBlock(
      draw,
      data.toma
        ? 'O DESTINATÁRIO É O PRÓPRIO TOMADOR/ADQUIRENTE DA OPERAÇÃO'
        : 'DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e',
      top,
    )
    top = drawSingleLineBlock(draw, 'INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e', top)
    top = drawService(draw, data, top)
    top = drawIssqn(draw, data, top)
    top = drawFederal(draw, top)
    top = drawIbsCbs(draw, top)
    top = drawTotals(draw, data, top)
    drawComplementary(draw, data, top)

    // Borda externa da página (1pt) por cima de tudo — a NT pede moldura.
    page.drawRectangle({
      x: cmx(0),
      y: PAGE_H - cmy(29.7 - 2 * MARGIN_CM),
      width: PAGE_W - 2 * MARGIN_CM * CM,
      height: (29.7 - 2 * MARGIN_CM) * CM,
      borderColor: LINE,
      borderWidth: 1,
    })

    return doc.save()
  }
}

/* ── primitivas de desenho ─────────────────────────────────────────────── */

/** X/Y em cm RELATIVOS à margem (a tabela 2.4.5 é toda nesse referencial). */
function cmx(cm: number): number {
  return (MARGIN_CM + cm) * CM
}
function cmy(cmFromTop: number): number {
  return (MARGIN_CM + cmFromTop) * CM
}

class Drawer {
  constructor(
    readonly page: PDFPage,
    readonly helv: PDFFont,
    readonly bold: PDFFont,
  ) {}

  /** Texto na posição (cm do topo = BASELINE ancorada pelo topo do texto). */
  text(
    value: string,
    opts: {
      x: number
      top: number
      size: number
      bold?: boolean
      color?: ReturnType<typeof rgb>
      maxWidth?: number
    },
  ): void {
    const font = opts.bold ? this.bold : this.helv
    let out = sanitizeWinAnsi(value)
    if (opts.maxWidth !== undefined) out = clampText(font, out, opts.size, opts.maxWidth)
    this.page.drawText(out, {
      x: cmx(opts.x),
      y: PAGE_H - cmy(opts.top) - opts.size,
      size: opts.size,
      font,
      color: opts.color ?? LINE,
    })
  }

  /** Label 6pt bold + valor 7pt (a "célula" padrão da NT). Valor null → "-". */
  field(
    label: string,
    value: string | null,
    opts: { x: number; top: number; w: number; valueBold?: boolean; shadeLabel?: boolean },
  ): void {
    if (opts.shadeLabel) this.shade(opts.x, opts.top, opts.w, ROW_H)
    this.text(label, {
      x: opts.x + 0.05,
      top: opts.top + 0.04,
      size: 6,
      bold: true,
      maxWidth: opts.w - 0.1,
    })
    this.text(value ?? '-', {
      x: opts.x + 0.05,
      top: opts.top + 0.3,
      size: 7,
      bold: opts.valueBold,
      maxWidth: opts.w - 0.1,
    })
  }

  shade(x: number, top: number, w: number, h: number): void {
    this.page.drawRectangle({
      x: cmx(x),
      y: PAGE_H - cmy(top + h),
      width: w * CM,
      height: h * CM,
      color: SHADE,
    })
  }

  /** Linha horizontal de 0,5pt (separador de bloco) na largura útil. */
  rule(top: number): void {
    this.page.drawLine({
      start: { x: cmx(0), y: PAGE_H - cmy(top) },
      end: { x: PAGE_W - MARGIN_CM * CM, y: PAGE_H - cmy(top) },
      thickness: 0.5,
      color: LINE,
    })
  }

  /**
   * Título de bloco (7pt bold CAPS com sombreado) na 1ª célula da linha —
   * alinhado à MESMA banda dos labels vizinhos (Anexo I; centralizado na
   * vertical ele parecia "afundado" ao lado dos campos, achado do QA visual).
   */
  blockTitle(title: string, top: number): void {
    this.shade(C1, top, CELL_W, ROW_H)
    this.text(title, { x: C1 + 0.05, top: top + 0.03, size: 7, bold: true, maxWidth: CELL_W - 0.1 })
  }
}

/* ── blocos do leiaute ─────────────────────────────────────────────────── */

function drawHeader(draw: Drawer, data: DanfseData, homolog: boolean, logo: PDFImage | null): void {
  // Faixa do cabeçalho (1,16cm) com sombreado integral.
  draw.shade(0, 0.3, FULL_W + 2 * C1, 1.16)
  if (logo) {
    // Área da NT: 4,00 × 0,85 @ 0,49/0,44 — encaixa preservando a proporção.
    const scale = Math.min((4.0 * CM) / logo.width, (0.85 * CM) / logo.height)
    draw.page.drawImage(logo, {
      x: cmx(0.49),
      y: PAGE_H - cmy(0.44) - logo.height * scale,
      width: logo.width * scale,
      height: logo.height * scale,
    })
  }
  const centerX = C1 + 5.11
  const centerW = 10.19
  centerText(draw, 'DANFSe v2.0', 0.42, 9, true, centerX, centerW)
  centerText(draw, 'Documento Auxiliar da NFS-e', 0.78, 9, true, centerX, centerW)
  if (homolog) {
    centerText(
      draw,
      'NFS-e SEM VALIDADE JURÍDICA',
      1.14,
      9,
      true,
      centerX,
      centerW,
      rgb(0.85, 0, 0),
    )
  }
  const mun = data.xLocEmi ? `${data.xLocEmi}${data.emit.uf ? ` / ${data.emit.uf}` : ''}` : '-'
  draw.text(`Município: ${mun}`, { x: C4, top: 0.4, size: 8, maxWidth: CELL_W })
  draw.text(
    `Ambiente Gerador: ${data.ambGer ? (AMB_GERADOR_LABELS[data.ambGer] ?? data.ambGer) : '-'}`,
    {
      x: C4,
      top: 0.78,
      size: 6,
      maxWidth: CELL_W,
    },
  )
  draw.text(`Tipo de Ambiente: ${data.tpAmb ? (TP_AMB_LABELS[data.tpAmb] ?? data.tpAmb) : '-'}`, {
    x: C4,
    top: 1.06,
    size: 6,
    maxWidth: CELL_W,
  })
  draw.rule(1.48)
}

function centerText(
  draw: Drawer,
  value: string,
  top: number,
  size: number,
  boldFace: boolean,
  x: number,
  w: number,
  color?: ReturnType<typeof rgb>,
): void {
  const font = boldFace ? draw.bold : draw.helv
  const width = font.widthOfTextAtSize(sanitizeWinAnsi(value), size)
  draw.text(value, { x: x + Math.max(0, (w - width / CM) / 2), top, size, bold: boldFace, color })
}

function drawIdentification(draw: Drawer, data: DanfseData, qr: PDFImage | null): void {
  // Labels deste bloco: 7pt bold CAIXA ALTA (item 2.4.2, exceção da identificação).
  const idField = (label: string, value: string | null, x: number, top: number, w: number) => {
    draw.text(label, { x: x + 0.05, top: top + 0.02, size: 7, bold: true, maxWidth: w - 0.1 })
    draw.text(value ?? '-', { x: x + 0.05, top: top + 0.32, size: 7, maxWidth: w - 0.1 })
  }
  idField('CHAVE DE ACESSO DA NFS-E', data.accessKey || null, C1, 1.52, 15.3)
  idField('NÚMERO DA NFS-e', data.nNFSe, C1, 2.27, CELL_W)
  idField('COMPETÊNCIA DA NFS-e', fmtCivilDate(data.dps.dCompet), C2, 2.27, CELL_W)
  idField('DATA E HORA DA EMISSÃO DA NFS-E', fmtXmlDateTime(data.dhProc), C3, 2.27, CELL_W)
  idField('NÚMERO DA DPS', data.dps.nDPS, C1, 2.96, CELL_W)
  idField('SÉRIE DA DPS', data.dps.serie, C2, 2.96, CELL_W)
  idField('DATA E HORA DA EMISSÃO DA DPS', fmtXmlDateTime(data.dps.dhEmi), C3, 2.96, CELL_W)
  draw.shade(C1, 3.65, CELL_W, 0.62)
  idField(
    'EMITENTE DA NFS-E',
    data.dps.tpEmit ? (TP_EMIT_LABELS[data.dps.tpEmit] ?? data.dps.tpEmit) : null,
    C1,
    3.65,
    CELL_W,
  )
  idField(
    'SITUAÇÃO DA NFS-E',
    data.cStat ? (C_STAT_LABELS[data.cStat] ?? `Código ${data.cStat}`) : null,
    C2,
    3.65,
    CELL_W,
  )
  idField('FINALIDADE', null, C3, 3.65, CELL_W)

  // QR na posição FIXA da NT (X 17,48 / Y 1,67; 1,52cm²) + o texto de autenticidade.
  if (qr) {
    draw.page.drawImage(qr, {
      x: cmx(17.48),
      y: PAGE_H - cmy(1.67) - 1.52 * CM,
      width: 1.52 * CM,
      height: 1.52 * CM,
    })
  }
  const qrCaption =
    'A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e'
  wrapText(draw.helv, sanitizeWinAnsi(qrCaption), 6, 4.72 * CM)
    .slice(0, 3)
    .forEach((line, i) => {
      draw.text(line, { x: 15.8, top: 3.38 + i * 0.24, size: 6 })
    })
  draw.rule(4.34)
}

function drawEmitter(draw: Drawer, data: DanfseData, top: number): number {
  draw.blockTitle('PRESTADOR / FORNECEDOR', top)
  draw.field('CNPJ / CPF / NIF', fmtDoc(data.emit), { x: C2, top, w: CELL_W })
  draw.field('Indicador Municipal (Inscrição)', data.emit.im, { x: C3, top, w: CELL_W })
  draw.field('Telefone', data.emit.fone, { x: C4, top, w: CELL_W })
  let y = top + ROW_H
  draw.field('Nome / Nome Empresarial', data.emit.xNome, { x: C1, top: y, w: WIDE_W })
  draw.field('Município / Sigla UF', joinMunUf(data.emit.municipio, data.emit.uf), {
    x: C3,
    top: y,
    w: CELL_W,
  })
  draw.field('Código IBGE / CEP', joinIbgeCep(data.emit.cMun, data.emit.cep), {
    x: C4,
    top: y,
    w: CELL_W,
  })
  y += ROW_H
  draw.field('Endereço', data.emit.endereco, { x: C1, top: y, w: WIDE_W })
  draw.field('E-mail', data.emit.email, { x: C3, top: y, w: WIDE_W })
  y += ROW_H
  draw.field(
    'Simples Nacional na Data de Competência',
    data.regTrib.opSimpNac
      ? (OP_SIMP_NAC_LABELS[data.regTrib.opSimpNac] ?? data.regTrib.opSimpNac)
      : null,
    { x: C1, top: y, w: WIDE_W },
  )
  draw.field(
    'Regime de Apuração Tributária pelo SN',
    data.regTrib.regApTribSN
      ? (REG_AP_TRIB_SN_LABELS[data.regTrib.regApTribSN] ?? data.regTrib.regApTribSN)
      : null,
    { x: C3, top: y, w: WIDE_W },
  )
  y += ROW_H
  draw.rule(y)
  return y
}

function drawParty(
  draw: Drawer,
  title: string,
  party: DanfseParty | null,
  top: number,
  opts: { missing: string },
): number {
  if (!party) return drawSingleLineBlock(draw, opts.missing, top)
  draw.blockTitle(title, top)
  draw.field('CNPJ / CPF / NIF', fmtDoc(party), { x: C2, top, w: CELL_W })
  draw.field('Indicador Municipal (Inscrição)', party.im, { x: C3, top, w: CELL_W })
  draw.field('Telefone', party.fone, { x: C4, top, w: CELL_W })
  let y = top + ROW_H
  draw.field('Nome / Nome Empresarial', party.xNome, { x: C1, top: y, w: WIDE_W })
  draw.field('Município / Sigla UF', joinMunUf(party.municipio, party.uf), {
    x: C3,
    top: y,
    w: CELL_W,
  })
  draw.field('Código IBGE / CEP', joinIbgeCep(party.cMun, party.cep), { x: C4, top: y, w: CELL_W })
  y += ROW_H
  draw.field('Endereço', party.endereco, { x: C1, top: y, w: WIDE_W })
  draw.field('E-mail', party.email, { x: C3, top: y, w: WIDE_W })
  y += ROW_H
  draw.rule(y)
  return y
}

/** Bloco suprimido (NT 2.3.1/2.3.2): linha única centralizada, 0,32cm. */
function drawSingleLineBlock(draw: Drawer, message: string, top: number): number {
  centerText(draw, message, top + 0.06, 7, true, C1, FULL_W)
  const y = top + 0.32
  draw.rule(y)
  return y
}

function drawService(draw: Drawer, data: DanfseData, top: number): number {
  draw.blockTitle('SERVIÇO PRESTADO', top)
  draw.field(
    'Código de Tributação Nacional / Municipal',
    joinCodes(fmtTribNac(data.serv.cTribNac), data.serv.cTribMun),
    {
      x: C2,
      top,
      w: CELL_W,
    },
  )
  draw.field('Código da NBS', fmtNbs(data.serv.cNBS), { x: C3, top, w: CELL_W })
  draw.field('Local da Prestação / Sigla UF / País', data.serv.xLocPrestacao, {
    x: C4,
    top,
    w: CELL_W,
  })
  let y = top + ROW_H
  // Descrição do código de tributação (sem label — regra da tabela): municipal vence.
  const xTrib = data.serv.xTribMun ?? data.serv.xTribNac
  draw.text(xTrib ?? '-', { x: C1 + 0.05, top: y + 0.05, size: 7, maxWidth: FULL_W - 0.1 })
  y += 0.38
  // Descrição do serviço: shrink-to-fit + clamp com reticências (a NT permite) —
  // SEMPRE numa página só.
  draw.text('Descrição do Serviço', { x: C1 + 0.05, top: y + 0.04, size: 6, bold: true })
  const desc = layoutServiceDescription(draw.helv, data.serv.xDescServ)
  desc.lines.forEach((line, i) => {
    draw.text(line, { x: C1 + 0.05, top: y + 0.3 + i * desc.size * 0.042, size: desc.size })
  })
  y += Math.max(ROW_H, 0.34 + desc.lines.length * desc.size * 0.042)
  draw.rule(y)
  return y
}

const DESC_SIZES = [7, 6.5, 6]
const DESC_MAX_LINES = 4

function layoutServiceDescription(
  font: PDFFont,
  text: string | null,
): { lines: string[]; size: number } {
  if (!text) return { lines: ['-'], size: 7 }
  const clean = sanitizeWinAnsi(text)
  for (const size of DESC_SIZES) {
    const lines = wrapText(font, clean, size, (FULL_W - 0.1) * CM)
    if (lines.length <= DESC_MAX_LINES) return { lines, size }
  }
  const size = DESC_SIZES[DESC_SIZES.length - 1] as number
  const lines = wrapText(font, clean, size, (FULL_W - 0.1) * CM).slice(0, DESC_MAX_LINES)
  const last = lines[lines.length - 1]
  if (last !== undefined) lines[lines.length - 1] = `${last.slice(0, -3)}...`
  return { lines, size }
}

function drawIssqn(draw: Drawer, data: DanfseData, top: number): number {
  const v = data.valores
  draw.blockTitle('TRIBUTAÇÃO MUNICIPAL (ISSQN)', top)
  draw.field(
    'Tipo de Tributação do ISSQN',
    v.tribISSQN ? (TRIB_ISSQN_LABELS[v.tribISSQN] ?? v.tribISSQN) : null,
    { x: C2, top, w: CELL_W },
  )
  draw.field(
    'Município / Sigla UF / País de Incidência do ISSQN',
    v.xLocIncid
      ? joinMunUf(v.xLocIncid, v.cLocIncid === data.emit.cMun ? data.emit.uf : null)
      : null,
    { x: C3, top, w: WIDE_W },
  )
  let y = top + ROW_H
  draw.field(
    'Regime Especial de Tributação do ISSQN',
    data.regTrib.regEspTrib
      ? (REG_ESP_TRIB_LABELS[data.regTrib.regEspTrib] ?? data.regTrib.regEspTrib)
      : null,
    { x: C1, top: y, w: CELL_W },
  )
  draw.field('Tipo de Imunidade do ISSQN', null, { x: C2, top: y, w: CELL_W })
  draw.field('Suspensão da Exigibilidade do ISSQN', null, { x: C3, top: y, w: CELL_W })
  draw.field('Número Processo Suspensão', null, { x: C4, top: y, w: CELL_W })
  y += ROW_H
  // Linha BM/deduções/desconto: nossa nota nunca preenche — suprimível (nota 5).
  draw.field('BC ISSQN', formatXmlDecimalBrl(v.vBC), { x: C1, top: y, w: CELL_W })
  draw.field('Alíquota Aplicada', fmtPercent(v.pAliqAplic), { x: C2, top: y, w: CELL_W })
  draw.field(
    'Retenção do ISSQN',
    v.tpRetISSQN ? (TP_RET_ISSQN_LABELS[v.tpRetISSQN] ?? v.tpRetISSQN) : null,
    { x: C3, top: y, w: CELL_W },
  )
  draw.field('ISSQN Apurado', formatXmlDecimalBrl(v.vISSQN), { x: C4, top: y, w: CELL_W })
  y += ROW_H
  draw.rule(y)
  return y
}

function drawFederal(draw: Drawer, top: number): number {
  draw.blockTitle('TRIBUTAÇÃO FEDERAL (EXCETO CBS)', top)
  draw.field('IRRF', null, { x: C2, top, w: CELL_W })
  draw.field('Contribuição Previdenciária - Retida', null, { x: C3, top, w: CELL_W })
  draw.field('Contribuições Sociais - Retidas', null, { x: C4, top, w: CELL_W })
  // Linha PIS/COFINS (nota 6 — impressa p/ competência até 2026): sem dados → "-".
  let y = top + ROW_H
  draw.field('PIS - Débito Apuração Própria', null, { x: C1, top: y, w: CELL_W })
  draw.field('COFINS - Débito Apuração Própria', null, { x: C2, top: y, w: CELL_W })
  draw.field('Descrição Contrib. Sociais - Retidas', null, { x: C3, top: y, w: WIDE_W })
  y += ROW_H
  draw.rule(y)
  return y
}

function drawIbsCbs(draw: Drawer, top: number): number {
  // Nota Simples Nacional 2026: o grupo IBSCBS não existe no XML — todos os
  // campos saem com o traço da nota 12 (o bloco é parte fixa do modelo).
  draw.blockTitle('TRIBUTAÇÃO IBS / CBS', top)
  draw.field('CST / cClassTrib', null, { x: C2, top, w: CELL_W })
  draw.field('Indicador de Operação / Código IBGE / Município Incidência / Sigla UF', null, {
    x: C3,
    top,
    w: WIDE_W,
  })
  let y = top + ROW_H
  draw.field('Exclusões e Reduções da Base de Cálculo', null, { x: C1, top: y, w: CELL_W })
  draw.field('Base de Cálculo Após Exclusões e Reduções', null, { x: C2, top: y, w: CELL_W })
  draw.field('Red. Alíquota IBS / Red. Alíquota CBS', null, { x: C3, top: y, w: CELL_W })
  draw.field('Alíquota - IBS UF / IBS Mun', null, { x: C4, top: y, w: CELL_W })
  y += ROW_H
  draw.field('Valor Total Apurado - IBS', null, { x: C1, top: y, w: CELL_W })
  draw.field('Alíquota - CBS', null, { x: C2, top: y, w: CELL_W })
  draw.field('Alíquota Efetiva - CBS', null, { x: C3, top: y, w: CELL_W })
  draw.field('Valor Total Apurado - CBS', null, { x: C4, top: y, w: CELL_W })
  y += ROW_H
  draw.rule(y)
  return y
}

function drawTotals(draw: Drawer, data: DanfseData, top: number): number {
  const v = data.valores
  draw.blockTitle('VALOR TOTAL DA NFS-E', top)
  draw.field('Valor da Operação / Serviço', formatXmlDecimalBrl(v.vServ), { x: C2, top, w: CELL_W })
  draw.field('Desconto Incondicionado', formatXmlDecimalBrl(v.vDescIncond), {
    x: C3,
    top,
    w: CELL_W,
  })
  draw.field('Desconto Condicionado', formatXmlDecimalBrl(v.vDescCond), { x: C4, top, w: CELL_W })
  let y = top + ROW_H
  draw.field('Total das Retenções (ISSQN / Federais)', formatXmlDecimalBrl(v.vTotalRet), {
    x: C1,
    top: y,
    w: CELL_W,
  })
  draw.field('VALOR LÍQUIDO DA NFS-e', formatXmlDecimalBrl(v.vLiq), {
    x: C2,
    top: y,
    w: CELL_W,
    valueBold: true,
  })
  draw.field('Total do IBS/CBS', null, { x: C3, top: y, w: CELL_W })
  draw.field('VALOR LÍQUIDO DA NFS-e + IBS/CBS', null, {
    x: C4,
    top: y,
    w: CELL_W,
    valueBold: true,
    shadeLabel: true,
  })
  y += ROW_H
  draw.rule(y)
  return y
}

function drawComplementary(draw: Drawer, data: DanfseData, top: number): void {
  draw.shade(C1, top, FULL_W, 0.32)
  draw.text('INFORMAÇÕES COMPLEMENTARES', { x: C1 + 0.05, top: top + 0.06, size: 7, bold: true })
  const lines = complementaryLines(data)
  lines.slice(0, 8).forEach((line, i) => {
    draw.text(line, { x: C1 + 0.05, top: top + 0.42 + i * 0.32, size: 7, maxWidth: FULL_W - 0.1 })
  })
}

/** Nota 10 da NT: os totais aproximados (Lei 12.741) são linha OBRIGATÓRIA. */
function complementaryLines(data: DanfseData): string[] {
  const v = data.valores
  const lines: string[] = []
  if (v.vTotTribFed || v.vTotTribEst || v.vTotTribMun) {
    lines.push(
      'Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012: ' +
        `Federais: ${formatXmlDecimalBrl(v.vTotTribFed) ?? '-'}; ` +
        `Estaduais: ${formatXmlDecimalBrl(v.vTotTribEst) ?? '-'}; ` +
        `Municipais: ${formatXmlDecimalBrl(v.vTotTribMun) ?? '-'}`,
    )
  } else if (v.pTotTribSN) {
    lines.push(
      `Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012: ${fmtPercent(v.pTotTribSN) ?? '-'}`,
    )
  } else {
    lines.push('Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012: -')
  }
  return lines
}

/* ── QR / texto / formatos ─────────────────────────────────────────────── */

/** QR best-effort (falha → PDF sem QR; nunca derruba a entrega). */
async function qrImage(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const png = await qrToBuffer(url, {
      errorCorrectionLevel: 'M',
      // Quiet zone de 4 módulos (padrão QR) — a NT exige leitura confiável.
      margin: 4,
      width: 360,
      color: { dark: '#000000ff', light: '#FFFFFFff' },
    })
    return await doc.embedPng(new Uint8Array(png))
  } catch {
    return null
  }
}

/**
 * WinAnsi (CP1252) cobre pt-BR inteiro; fora dele o fork do pdf-lib troca por
 * `?` EM SILÊNCIO (medido) — e a descrição do serviço admite emoji. Normaliza a
 * pontuação típica e REMOVE o resto não-encodável.
 */
const WINANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
export function sanitizeWinAnsi(value: string): string {
  let out = ''
  for (const ch of value.normalize('NFC')) {
    const code = ch.codePointAt(0) ?? 0
    if ((code >= 0x20 && code <= 0xff && (code < 0x7f || code > 0x9f)) || WINANSI_EXTRAS.has(ch)) {
      out += ch
    } else if (code === 0x2212) {
      out += '-' // sinal de menos matemático
    }
    // demais (emoji, box-drawing, controles) caem fora — melhor ausente que "?"
  }
  return out.replace(/\s+/g, ' ').trim()
}

function clampText(font: PDFFont, value: string, size: number, maxWidthCm: number): string {
  const maxPt = maxWidthCm * CM
  if (font.widthOfTextAtSize(value, size) <= maxPt) return value
  let out = value
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxPt) {
    out = out.slice(0, -1)
  }
  return `${out}...`
}

function wrapText(font: PDFFont, text: string, size: number, maxWidthPt: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidthPt) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function fmtDoc(party: DanfseParty): string | null {
  if (!party.doc) return null
  if (party.docKind === 'cnpj' && party.doc.length === 14) {
    return party.doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }
  if (party.docKind === 'cpf' && party.doc.length === 11) {
    return party.doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }
  return party.doc
}

function joinMunUf(municipio: string | null, uf: string | null): string | null {
  if (!municipio) return null
  return uf ? `${municipio} / ${uf}` : municipio
}

function joinIbgeCep(cMun: string | null, cep: string | null): string | null {
  if (!cMun && !cep) return null
  const cepFmt =
    cep && /^\d{8}$/.test(cep) ? cep.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3') : cep
  return [cMun ?? '-', cepFmt ?? '-'].join(' / ')
}

function joinCodes(a: string | null, b: string | null): string | null {
  if (!a && !b) return null
  return [a ?? '-', b ?? '-'].join(' / ')
}

/** "080201" → "08.02.01" (formato nn.nn.nn da tabela 2.4.5). */
function fmtTribNac(code: string | null): string | null {
  if (!code || !/^\d{6}$/.test(code)) return code
  return `${code.slice(0, 2)}.${code.slice(2, 4)}.${code.slice(4, 6)}`
}

/** "122051900" → "1.2205.19.00" (formato n.nnnn.nn.nn). */
function fmtNbs(code: string | null): string | null {
  if (!code || !/^\d{9}$/.test(code)) return code
  return `${code.slice(0, 1)}.${code.slice(1, 5)}.${code.slice(5, 7)}.${code.slice(7, 9)}`
}

/** "2026-06-12" → "12/06/2026" — por SLICE (data civil nunca passa por Date). */
function fmtCivilDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return value
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
}

/** ISO com offset → "12/06/2026 12:42:48" com a hora LITERAL do XML (sem TZ math). */
function fmtXmlDateTime(value: string | null): string | null {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/)
  if (!m) return value
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}`
}

/** "8.24" → "8,24%". */
function fmtPercent(value: string | null): string | null {
  const raw = value?.trim()
  if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) return null
  return `${raw.replace('.', ',')}%`
}
