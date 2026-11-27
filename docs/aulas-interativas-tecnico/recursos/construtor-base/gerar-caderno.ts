/** Diagramação comum das duas trilhas do Construtor, pela receita visual do Faísca. */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import {
  arteDoCurso,
  cabecalho,
  caixa,
  capaHtml,
  cssDoCaderno,
  entrega,
  nota,
  paragrafos,
  passo,
  rodape,
} from '../caderno-visual/visual'
import { B, desenhosDaMudanca, escapeHtml } from './blocos'

export function gerarCaderno(resource: string) {
  const root = resolve(import.meta.dir, '../../../..')
  const directory = resolve(root, 'docs/aulas-interativas-tecnico/recursos', resource)
  const meta = JSON.parse(readFileSync(resolve(directory, 'caderno-metadados.json'), 'utf8'))
  const pages = JSON.parse(readFileSync(resolve(directory, 'caderno-conteudo.json'), 'utf8'))
  const course = resolve(root, 'docs/aulas-interativas/construtor', meta.course)
  const cache = new Map<string, any>()
  const project = (stage: string) => {
    if (!cache.has(stage))
      cache.set(
        stage,
        JSON.parse(readFileSync(resolve(course, 'projetos', `${stage}.szproject.json`), 'utf8')),
      )
    return cache.get(stage)
  }
  const initial = JSON.parse(
    readFileSync(resolve(course, 'projeto-inicial.szproject.json'), 'utf8'),
  )
  const assets = new Map(initial.assets.map((a: any) => [a.name, a.dataUrl]))
  const picture = (name: string) => {
    const result = assets.get(name)
    if (!result) throw new Error(`Imagem ausente no projeto: ${name}`)
    return `data:image/png;base64,${readFileSync(resolve(root, 'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte', `${name}.png`)).toString('base64')}`
  }
  // Cada área ganha um item independente: a paginação pode levá-la inteira à continuação.
  const expanded = pages.map((page: any) => ({
    ...page,
    items: page.items.flatMap((item: any) => {
      if (item.kind !== 'drawings') return [item]
      const drawings = desenhosDaMudanca(project(item.before), project(item.after), item.focus)
      return drawings.map((drawing, index) => ({
        ...item,
        kind: 'drawing',
        index,
        html: B.esquema(item.title, drawing.area, drawing.html),
      }))
    }),
  }))
  const paginationFile = resolve(directory, 'caderno-paginacao.json')
  let pagination: Record<string, number[]> = {}
  try {
    pagination = JSON.parse(readFileSync(paginationFile, 'utf8'))
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error
  }
  const sheets: any[] = []
  for (const page of expanded) {
    // Uma regeneração pode retirar um esquema; cortes além do último item ficam obsoletos.
    const cuts = (pagination[page.id] ?? []).filter(
      (cut: number) => cut > 0 && cut < page.items.length,
    )
    const boundaries = [0, ...cuts, page.items.length]
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i],
        end = boundaries[i + 1]
      if (start >= end) throw new Error(`Paginação inválida: ${page.id}`)
      sheets.push({
        ...page,
        baseId: page.id,
        id: i ? `${page.id}-continua-${i}` : page.id,
        kicker: i ? `${page.kicker} · ${meta.ui.continuation} ${i}` : page.kicker,
        itemStart: start,
        itemEnd: end,
        items: page.items.slice(start, end),
      })
    }
  }
  const numbers = new Map(sheets.map((sheet, index) => [sheet.id, index + 2]))
  const lastNumbers = new Map(sheets.map((sheet, index) => [sheet.baseId, index + 2]))
  const pageRef = (text: string) =>
    text.replace(
      /\{\{(pagina|ultima-pagina):([^}]+)\}\}/g,
      (_: string, mode: string, id: string) => {
        const map = mode === 'ultima-pagina' ? lastNumbers : numbers
        if (!map.has(id)) throw new Error(`Referência de página ausente: ${id}`)
        return String(map.get(id))
      },
    )
  const renderItem = (item: any) => {
    if (item.kind === 'text') return `<div class="texto">${paragrafos(item.text)}</div>`
    if (item.kind === 'box')
      return caixa({
        tom: item.tone ?? 'azul',
        icone: item.tone === 'amarelo' ? 'olho' : 'livro',
        titulo: item.title,
        html: item.text,
      })
    if (item.kind === 'note') return nota(item.text)
    if (item.kind === 'step') return passo(item.number, item.title ?? '', item.text)
    if (item.kind === 'tests')
      return caixa({
        tom: 'amarelo',
        icone: 'controle',
        titulo: item.title,
        html: item.tests.map((text: string, i: number) => `<b>${i + 1}.</b> ${text}`).join('<br/>'),
      })
    if (item.kind === 'delivery') return entrega(item.title, item.text)
    if (item.kind === 'drawing') return item.html
    if (item.kind === 'index')
      return `<div class="index-card"><h3>${escapeHtml(item.title)}</h3>${paragrafos(item.text)}<p class="index-pages">${item.pages}</p></div>`
    if (item.kind === 'gallery')
      return `<div class="galeria">${item.names.map((name: string) => `<figure class="galeria-item"><img src="${picture(name)}" alt="${escapeHtml(name)}"><figcaption>${escapeHtml(name)}</figcaption></figure>`).join('')}</div>`
    if (item.kind === 'gallery3d')
      return `<div class="galeria galeria--modelos">${item.names.map((name: string) => `<figure class="galeria-item"><img src="data:image/png;base64,${readFileSync(resolve(root, 'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte', `modelo-${name}.png`)).toString('base64')}" alt="${escapeHtml(name)}"><figcaption>${escapeHtml(name)}</figcaption></figure>`).join('')}</div>`
    throw new Error(`Item desconhecido: ${item.kind}`)
  }
  const art = arteDoCurso(meta.cover)
  const cover = capaHtml({
    arte: art,
    iconeSelo: 'livro',
    linha1: meta.line1,
    linha2: meta.line2,
    frase: meta.phrase,
    fraseBaixo: meta.promise,
    tema: `capa--${meta.dimension}`,
  })
  const count = sheets.length + 1
  const body = sheets
    .map(
      (page, i) =>
        `<section class="page" data-id="${page.id}" data-base-id="${page.baseId}" data-item-start="${page.itemStart}" data-item-end="${page.itemEnd}"><div class="inner">${cabecalho({ cena: art, alt: meta.title, kicker: page.kicker, titulo: page.title, resumo: page.subtitle })}<div class="content">${page.items.map((item: any, k: number) => `<div class="content-item" data-item="${page.itemStart + k}">${renderItem(item)}</div>`).join('')}</div></div>${rodape(meta.title, `${i + 2} / ${count}`)}</section>`,
    )
    .join('')
  const fonts = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}\n@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`
  const accent = meta.dimension === '2d' ? '#1255a2' : '#126b75'
  const courseCss = `
body { --fundo:#f7fafe; --tinta:#142b49; --texto:#3d4a5c; --destaque:${accent}; --destaque-claro:#e2edf9; --caminho:#3553c6; --entrega-fundo:#132d52; --entrega-borda:#132d52; --entrega-texto:#fff; --entrega-rotulo:#ffdd69; --entrega-forte:#ffdd69; }
.capa--2d,.capa--3d { --capa-painel:${accent}; --capa-painel-fundo:linear-gradient(${accent},#102a4a); --capa-amarelo:#ffdb5e; --capa-frase:#e2f5ff; --selo-fundo:#be5427; --selo-topo:604px; --selo-altura:62px; --selo-largura:560px; --selo-letra:26px; --titulo-topo:692px; --frase-largura:470px; }
.capa--3d { --selo-fundo:#7942a5; }
.capa-titulo span { font-size:${meta.dimension === '2d' ? 82 : 92}px; }
.capa-titulo em { font-size:${meta.dimension === '2d' ? 82 : 86}px; }
.content { display:block; }
.content-item + .content-item { margin-top:3.6mm; }
.inner { display:block; position:absolute; top:0; left:0; right:0; bottom:0; height:auto; }
.index-card { background:#e6effb; border:1px solid #c5d7ef; border-radius:14px; padding:4mm 5mm; }
.index-card h3 { font-size:16pt; margin-bottom:2mm; }
.index-card p { font-size:10.8pt; line-height:1.45; }
.index-pages { font-weight:800; color:var(--destaque); margin-top:2mm; }
.cabecalho-cena { width:28%; }
.cabecalho-cena img { height:46mm; object-fit:cover; object-position:center 20%; }
.cabecalho-texto { min-width:0; display:block; }
.cabecalho-texto h2 { font-size:20pt; }
.galeria { display:block; }
.galeria-item { display:block; margin-bottom:3mm; padding:3mm 4mm; }
.galeria-item img { height:34mm; }
.galeria-item figcaption { font-size:10pt; white-space:normal; }
.galeria--modelos .galeria-item img { height:30mm; }
/* Fluxo de impressão equivalente para Chromium e WeasyPrint: os campos continuam encaixados. */
.bk, .bk-chapeu, .bk-valor, .bk-campo, .bk-numero { display:inline-block; vertical-align:middle; }
.bk { max-width:100%; }
.bk-campo--texto { white-space:normal; max-width:100%; box-sizing:border-box; }
.bk-boca, .bk-area, .bk-pilha { display:block; }
.bk-boca-meio { display:table; width:100%; }
.bk-boca-rotulo { display:table-cell; width:14mm; }
.bk-boca-meio > .bk-pilha { display:table-cell; }
.bk-pilha > * + * { margin-top:1mm; }
.bk-pilha > .bk { display:block; }
.bk-numero { height:auto; min-height:6.4mm; text-align:center; }
.bk-chapeu-icone, .bk-campo-seta, .bk-campo-icone { vertical-align:middle; }
.esquema-painel { display:block; }
.esquema-area { margin-bottom:2.4mm; }
.contexto-do-desenho { padding:2mm 3mm; margin-bottom:2mm; background:#f4f7fc; border:1px solid #d1dae6; border-radius:6px; color:#43516a; font-size:9.5pt; line-height:1.4; }
.bk-pronto { background:#f7eee5; }
.bk-pe { display:block; }
.page-no { font-size:8.5pt; }
.passo-numero { display:block; text-align:center; line-height:10mm; }
`
  const iconColor = (svg: string) => {
    const white = /class="(?:capa-selo-icone|bk-chapeu-icone)"/.test(svg)
    const color = white
      ? '#ffffff'
      : /class="entrega-icone"/.test(svg)
        ? '#ffdd69'
        : /class="bk-campo-/.test(svg)
          ? '#5a6578'
          : accent
    return svg.replace('stroke="currentColor"', `stroke="${color}"`)
  }
  const content = pageRef(cover + body).replace(
    /<svg\b[^>]*stroke="currentColor"[^>]*>/g,
    iconColor,
  )
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(meta.title)} | Passo a passo do projeto</title><style>${cssDoCaderno(fonts)}\n${courseCss}</style></head><body>${content}</body></html>`
  const work = resolve(root, 'tmp/pdfs', resource)
  mkdirSync(work, { recursive: true })
  writeFileSync(resolve(work, 'caderno.html'), html)
  writeFileSync(
    resolve(work, 'cores-estudio.json'),
    `${JSON.stringify(Object.fromEntries(B.usadas), null, 2)}\n`,
  )
  writeFileSync(
    resolve(work, 'paginas.json'),
    `${JSON.stringify(
      sheets.map(({ id, baseId, itemStart, itemEnd, title }) => ({
        id,
        baseId,
        itemStart,
        itemEnd,
        title,
      })),
      null,
      2,
    )}\n`,
  )
  copyFileSync(
    resolve(root, 'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte', meta.cover),
    resolve(course, 'capa.jpg'),
  )
  console.log(
    JSON.stringify({
      resource,
      pages: count,
      blocks: B.usadas.size,
      html: resolve(work, 'caderno.html'),
    }),
  )
}

if (import.meta.main) gerarCaderno(process.argv[2])
