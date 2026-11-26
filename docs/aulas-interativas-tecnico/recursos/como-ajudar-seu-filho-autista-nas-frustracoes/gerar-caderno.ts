/**
 * Apostila de consulta do curso para pais "Como ajudar seu filho autista a lidar com frustrações e
 * evitar crises", com a Vivianne Lima (19/11/2026), pela Receita do Passo a passo do projeto
 * (`../caderno-visual/README.md`): capa com a composição fixa, abertura com o mapa das aulas e
 * uma ou duas folhas por aula com os cards de `../caderno-visual/visual.ts`.
 *
 * Todo texto mora em `caderno-conteudo.json`. `{{pagina:<id>}}` vira o número da folha com aquele
 * id; a capa conta como página 1.
 *
 * Itens: `map`, `box` (`tone`, `icon`), `note`, `steps` (com `title` opcional), `delivery`,
 * `compare` (dois cards lado a lado), `quote` e `pairs`.
 *
 * A ilustração da capa vem de `capa-do-curso.png`, na pasta editorial do curso, convertida em JPEG para
 * `../caderno-visual/arte/`.
 *
 * Uso: bun docs/aulas-interativas-tecnico/recursos/como-ajudar-seu-filho-autista-nas-frustracoes/gerar-caderno.ts
 */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import {
  arteDoCurso,
  caixa,
  capaHtml,
  cssDoCaderno,
  entrega,
  icone,
  nota,
  paragrafos,
  passo,
  rodape,
} from '../caderno-visual/visual'

type Tom = 'azul' | 'amarelo' | 'verde' | 'lilas' | 'vermelho'
type Item = {
  kind: string
  title?: string
  text?: string
  tone?: Tom
  icon?: string
  author?: string
  steps?: Array<string | [string, string]>
  cards?: { pageId: string; title: string; text: string }[]
  pairs?: [string, string][]
  left?: { title: string; text: string }
  right?: { title: string; text: string }
}
type ContentPage = {
  id: string
  theme?: 'azul' | 'ambar' | 'vermelho' | 'roxo' | 'verde'
  kicker: string
  title: string
  subtitle: string
  items: Item[]
}

const scriptDir = import.meta.dir
const root = resolve(scriptDir, '../../../..')
const output = resolve(
  root,
  'docs/aulas-interativas/pais/como-ajudar-seu-filho-autista-nas-frustracoes/apostila.pdf',
)
const pages = JSON.parse(
  readFileSync(resolve(scriptDir, 'caderno-conteudo.json'), 'utf8'),
) as ContentPage[]
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`

function renderItem(item: Item): string {
  const text = item.text ?? ''
  if (item.kind === 'map')
    return `<h3 class="titulo-secao">${item.title ?? ''}</h3><div class="mapa">${(item.cards ?? [])
      .map((c, i) => {
        const destino = pages.find((page) => page.id === c.pageId)
        if (!destino) throw new Error(`Página do mapa não existe: ${c.pageId}`)
        return `<div class="mapa-card mapa-card--${destino.theme ?? 'azul'}"><span class="mapa-numero">${i + 1}</span><div><h3>${c.title}</h3><p>${c.text}</p></div></div>`
      })
      .join('')}</div>`
  if (item.kind === 'box')
    return caixa({
      tom: item.tone ?? 'azul',
      icone: item.icon ?? 'info',
      titulo: item.title,
      html: text,
    })
  if (item.kind === 'note') return nota(text)
  if (item.kind === 'delivery') return entrega(item.title ?? '', text)
  if (item.kind === 'steps')
    return `${item.title ? `<h3 class="titulo-secao">${item.title}</h3>` : ''}<div class="passos">${(
      item.steps ?? []
    )
      .map((s, i) => passo(i + 1, '', String(s)))
      .join('')}</div>`
  if (item.kind === 'compare')
    return `<div class="comparar"><div class="comparar-lado comparar-lado--antes"><h3>${item.left?.title ?? ''}</h3>${paragrafos(item.left?.text ?? '')}</div><div class="comparar-seta">${icone('seta', 'comparar-icone')}</div><div class="comparar-lado comparar-lado--depois"><h3>${item.right?.title ?? ''}</h3>${paragrafos(item.right?.text ?? '')}</div></div>`
  if (item.kind === 'quote')
    return `<figure class="citacao">${icone('mensagem', 'citacao-icone')}<blockquote>${text}</blockquote><figcaption>${item.author ?? ''}</figcaption></figure>`
  if (item.kind === 'pairs')
    return `<div class="pares">${(item.pairs ?? [])
      .map(
        ([cena, oferta]) =>
          `<div class="par"><p class="par-cena">${cena}</p><p class="par-oferta">${oferta}</p></div>`,
      )
      .join('')}</div>`
  throw new Error(`Item desconhecido na apostila: ${item.kind}`)
}

const curso = 'Frustrações e crises'
const material = 'Apostila do curso'
const total = pages.length + 1
const numeroDe = (id: string) => {
  const indice = pages.findIndex((p) => p.id === id)
  if (indice < 0) throw new Error(`Página citada na apostila não existe: ${id}`)
  return indice + 2
}
const withPages = (html: string) =>
  html.replace(/\{\{pagina:([a-z0-9-]+)\}\}/g, (_, id: string) => String(numeroDe(id)))
const folhas = pages.map((page, index) => {
  const numero = `${index + 2} / ${total}`
  const corpo = page.items.map(renderItem).join('')
  const topo = `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p></div>`
  const tema = page.theme ? ` tema-${page.theme}` : ''
  return withPages(
    `<section class="page${tema}" data-id="${page.id}"><div class="inner">${topo}<div class="content">${corpo}</div></div>${rodape(curso, numero, material)}</section>`,
  )
})
const cover = capaHtml({
  arte: arteDoCurso('capa-como-ajudar-seu-filho-autista-nas-frustracoes.jpg'),
  iconeSelo: 'livro',
  linha1: 'Frustrações',
  linha2: 'e crises',
  frase: 'Como ajudar seu filho autista a lidar com frustrações e evitar crises.',
  fraseBaixo: 'Com Vivianne Lima, psicóloga da Laopa.',
  tema: 'capa--crises',
  selo: material,
})
// Tema atualizado em 25/11/2026: lilás, creme e amarelo da imagem fornecida pela responsável.
const cursoCss = `
body { --fundo: #fcf8f4; --tinta: #38204e; --texto: #43525c; --destaque: #785099; --destaque-claro: #f1e7f7; --caminho: #785099;
  --numero-raio: 9px; --numero-fundo: var(--destaque-claro); --numero-cor: var(--destaque);
  --entrega-fundo: #38204e; --entrega-borda: #38204e; --entrega-texto: #e6f3f4; --entrega-rotulo: #38204e; --entrega-rotulo-fundo: #ffd45e; --entrega-rotulo-espaco: 1.6mm 4mm; --entrega-forte: #ffd45e; }
.tema-azul { --destaque: #785099; --destaque-claro: #f1e7f7; }
.tema-verde { --destaque: #785099; --destaque-claro: #e0f3ee; }
.tema-ambar { --destaque: #9a6b00; --destaque-claro: #fdf1cf; }
.tema-roxo { --destaque: #2b5a8c; --destaque-claro: #e3edf8; }
.tema-vermelho { --destaque: #785099; --destaque-claro: #f1e7f7; }
.capa--crises { --capa-painel: #38204e; --capa-amarelo: #ffd45e; --capa-frase: #eedff4; --selo-fundo: #785099; --selo-topo: 592px; --selo-altura: 73px; --selo-largura: 470px; --selo-letra: 24px; --titulo-topo: 692px; --frase-largura: 520px; }
.capa--crises .capa-arte { height: 550px; }
.capa--crises .capa-painel { top: 544px; }
.capa--crises .capa-painel::before { display: none; }
.capa--crises .capa-titulo span { font-size: 88px; }
.capa--crises .capa-titulo em { font-size: 88px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 26pt; line-height: 1.08; margin: 1mm 0 1.6mm; }
.abertura p { font-size: 11.4pt; font-weight: 600; line-height: 1.5; }
.mapa { display: flex; flex-direction: column; gap: 2.4mm; }
.mapa-card { display: flex; gap: 4mm; align-items: center; border-radius: 14px; padding: 3mm 5mm; border: 1px solid; }
.mapa-card h3 { font-size: 12.6pt; margin-bottom: .6mm; }
.mapa-card p { font-size: 10pt; font-weight: 700; line-height: 1.4; color: #4a5250; }
.mapa-numero { flex: none; width: 9mm; height: 9mm; display: grid; place-items: center; background: #fff; border-radius: 9px; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 12pt; }
.mapa-card--azul { background: #f1e7f7; border-color: #bcdde3; color: #785099; }
.mapa-card--verde { background: #e0f3ee; border-color: #b9e0d6; color: #785099; }
.mapa-card--ambar { background: #fdf1cf; border-color: #f0dca0; color: #9a6b00; }
.mapa-card--roxo { background: #e3edf8; border-color: #c2d5ec; color: #2b5a8c; }
.mapa-card--vermelho { background: #f1e7f7; border-color: #bcdde3; color: #785099; }
.comparar { display: grid; grid-template-columns: 1fr 8mm 1fr; align-items: stretch; gap: 2mm; }
.comparar-lado { border-radius: 14px; padding: 3.6mm 4.6mm; border: 1px solid #dfe6ee; background: #fff; }
.comparar-lado h3 { font-size: 12.6pt; margin-bottom: 1.4mm; }
.comparar-lado p { font-size: 10.2pt; line-height: 1.45; font-weight: 600; }
.comparar-lado p + p { margin-top: .8mm; }
.comparar-lado--depois { background: var(--destaque-claro); border-color: transparent; }
.comparar-lado--depois h3 { color: var(--destaque); }
.comparar-seta { display: grid; place-items: center; color: var(--destaque); }
.comparar-icone { width: 7mm; height: 7mm; transform: rotate(-90deg); }
.citacao { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 1mm 4mm; background: #fff; border: 1px solid #dfe6ee; border-left: 5px solid #ffd45e; border-radius: 0 14px 14px 0; padding: 4mm 5mm; }
.citacao-icone { width: 6mm; height: 6mm; color: #9a6b00; grid-row: span 2; }
.citacao blockquote { margin: 0; font-family: 'Baloo 2', Arial, sans-serif; font-size: 14pt; font-weight: 700; line-height: 1.3; color: var(--tinta); }
.citacao figcaption { font-size: 10pt; font-weight: 800; color: #7b8a94; }
.pares { display: flex; flex-direction: column; gap: 1.6mm; }
.par { display: grid; grid-template-columns: 1fr 1.25fr; gap: 3mm; align-items: center; background: #fff; border: 1px solid #dfe6ee; border-radius: 12px; padding: 2.4mm 4mm; }
.par-cena { font-family: 'Baloo 2', Arial, sans-serif; font-size: 11.6pt; font-weight: 800; color: var(--tinta); line-height: 1.25; }
.par-oferta { font-size: 10.2pt; font-weight: 600; line-height: 1.4; color: var(--texto); border-left: 3px solid var(--destaque); padding-left: 3mm; }
[data-id="abertura"] .content { gap: 3mm; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Apostila do curso - ${curso}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${folhas.join('\n')}</body></html>`
if (html.includes('{{')) throw new Error('Campo da apostila sem preencher.')
const previewDir = resolve(root, 'tmp/pdfs/como-ajudar-seu-filho-autista-nas-frustracoes')
mkdirSync(previewDir, { recursive: true })
writeFileSync(join(previewDir, 'caderno.html'), html)
if (process.argv.includes('--html-only')) process.exit(0)
const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.CHROME_PATH ?? '',
  '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((caminho) => caminho && existsSync(caminho) && statSync(caminho).isFile())
if (!browser) throw new Error('Chrome ou Edge não encontrado para gerar a apostila.')
const temporary = mkdtempSync(join(tmpdir(), 'sistema-zero-caderno-'))
const htmlPath = join(temporary, 'caderno.html')
const temporaryPdf = join(temporary, 'caderno.pdf')
const browserProfile = join(temporary, 'chrome-profile')
try {
  writeFileSync(htmlPath, html)
  const result = spawnSync(
    browser,
    [
      '--headless=new',
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${browserProfile}`,
      '--virtual-time-budget=5000',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${temporaryPdf}`,
      pathToFileURL(htmlPath).href,
    ],
    { encoding: 'utf8', timeout: 60000 },
  )
  if (
    result.error ||
    result.status !== 0 ||
    !existsSync(temporaryPdf) ||
    statSync(temporaryPdf).size < 1000
  ) {
    throw new Error(`Falha ao gerar o PDF: ${result.error?.message ?? result.stderr}`)
  }
  copyFileSync(temporaryPdf, output)
  console.log(output)
} finally {
  // Só remove a pasta temporária exclusiva criada acima, nunca um caminho amplo.
  const resolvedTemporary = realpathSync(temporary)
  const resolvedTempRoot = realpathSync(tmpdir())
  if (
    dirname(resolvedTemporary) === resolvedTempRoot &&
    basename(resolvedTemporary).startsWith('sistema-zero-caderno-') &&
    resolvedTemporary.startsWith(`${resolvedTempRoot}${sep}`)
  ) {
    rmSync(resolvedTemporary, { recursive: true, force: true })
  }
}
