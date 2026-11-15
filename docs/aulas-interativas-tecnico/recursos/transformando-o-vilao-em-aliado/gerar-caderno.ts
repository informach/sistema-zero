/**
 * Apostila do curso para pais "Transformando o vilão em aliado" (15/11/2026), pela Receita do
 * Passo a passo do projeto (`../caderno-visual/README.md`): capa com a composição fixa, abertura
 * com o mapa das aulas, uma ou duas folhas por aula com o cabeçalho simples da receita (curso
 * para pais não tem cena de jogo) e os cards de `../caderno-visual/visual.ts`. Só o nome do
 * material muda: "Apostila do curso", porque curso para pais não tem projeto.
 *
 * Todo texto mora em `caderno-conteudo.json`. `{{pagina:<id>}}` vira o número da folha com aquele
 * id; a capa conta como página 1. Uma página pode ter `slide` (imagem em `slides/`) para usar o
 * `cabecalho` com imagem; hoje nenhuma usa.
 *
 * Itens: `map`, `box` (`tone`, `icon`), `note`, `steps` (com `title` opcional), `delivery`,
 * `compare` (dois cards lado a lado), `quote`, `pairs` (cena e o que o jogo oferece), `rule`
 * (QUANDO, SE, ENTÃO), `grid` (o desafio do caminho), `cycle` (o ciclo de criação), `drawing`
 * (`cade-regra`, com os blocos reais do Estúdio) e `refs`.
 *
 * Uso: bun docs/aulas-interativas-tecnico/recursos/transformando-o-vilao-em-aliado/gerar-caderno.ts
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
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import {
  arteDoCurso,
  cabecalho,
  caixa,
  capaHtml,
  criarBlocos,
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
  name?: string
  author?: string
  steps?: Array<string | [string, string]>
  cards?: { title: string; text: string }[]
  pairs?: [string, string][]
  refs?: [string, string, string][]
  left?: { title: string; text: string }
  right?: { title: string; text: string }
  when?: string
  if?: string
  then?: string
}
type ContentPage = {
  id: string
  theme?: 'azul' | 'ambar' | 'vermelho' | 'roxo' | 'verde'
  slide?: string
  kicker: string
  title: string
  subtitle: string
  items: Item[]
}

const scriptDir = import.meta.dir
const root = resolve(scriptDir, '../../../..')
const output = resolve(
  root,
  'docs/aulas-interativas/pais/transformando-o-vilao-em-aliado/apostila.pdf',
)
const pages = JSON.parse(
  readFileSync(resolve(scriptDir, 'caderno-conteudo.json'), 'utf8'),
) as ContentPage[]
const fontes = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`

const slide = (arquivo: string) =>
  `data:image/jpeg;base64,${readFileSync(resolve(scriptDir, 'slides', arquivo)).toString('base64')}`

/** A regra do Cadê Todo Mundo que a Helena monta na demonstração da Aula 6. */
const B = criarBlocos([...FRAME_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS, ...gameTwoDBlocks])
const drawings: Record<string, { area: string; corpo: () => string }> = {
  'cade-regra': {
    area: 'Quando acontecer',
    corpo: () =>
      B.area(
        'Quando acontecer',
        B.comBoca(
          'sz_g2d_on_group_click',
          `Quando clicar/tocar num sprite do grupo ${B.campo('esconderijos')} chamá-lo de ${B.campo('escolhido')}`,
          B.bloco(
            'sz_g2d_set_opacity',
            `Deixar o sprite ${B.campo('escolhido')} com ${B.numero('0')} % de visibilidade`,
          ) +
            B.bloco(
              'sz_js_var_increment',
              `Somar ${B.numero('1')} em variável ${B.campo('achados')}`,
            ),
        ),
      ),
  },
}

/** O desafio do caminho: grade 4 por 4, bolinha embaixo à esquerda, estrela em cima à direita. */
function grade(): string {
  const casa = 34
  const escuros = new Set(['2-2', '3-2'])
  let celulas = ''
  for (let linha = 1; linha <= 4; linha++)
    for (let coluna = 1; coluna <= 4; coluna++) {
      const x = (coluna - 1) * casa
      const y = (linha - 1) * casa
      const escuro = escuros.has(`${linha}-${coluna}`)
      celulas += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${casa - 3}" height="${casa - 3}" rx="5" fill="${escuro ? '#2b3550' : '#ffffff'}" stroke="#c8d2e6"/>`
    }
  const bolinha = `<circle cx="${casa / 2}" cy="${3 * casa + casa / 2}" r="10" fill="#2f6fe0"/>`
  const cx = 3 * casa + casa / 2
  const cy = casa / 2
  const pontas = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 11 : 4.6
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  const estrela = `<polygon points="${pontas}" fill="#ffc02e" stroke="#b07d00" stroke-width="1"/>`
  return `<div class="grade"><svg viewBox="0 0 ${4 * casa} ${4 * casa}" role="img" aria-label="Grade 4 por 4 com a bolinha azul embaixo à esquerda, a estrela em cima à direita e dois quadrados escuros na segunda coluna">${celulas}${bolinha}${estrela}</svg><div class="grade-instrucoes">${['Subir', 'Descer', 'Ir para a direita', 'Ir para a esquerda'].map((t) => `<span>${t}</span>`).join('')}</div></div>`
}

const CORES_DO_MAPA = ['azul', 'ambar', 'roxo', 'verde', 'vermelho', 'azul', 'ambar']

function renderItem(item: Item): string {
  const text = item.text ?? ''
  if (item.kind === 'map')
    return `<h3 class="titulo-secao">${item.title ?? ''}</h3><div class="mapa">${(item.cards ?? [])
      .map(
        (c, i) =>
          `<div class="mapa-card mapa-card--${CORES_DO_MAPA[i % CORES_DO_MAPA.length]}"><span class="mapa-numero">${i + 1}</span><div><h3>${c.title}</h3><p>${c.text}</p></div></div>`,
      )
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
  if (item.kind === 'rule')
    return `<div class="regra"><span class="regra-titulo">${item.title ?? ''}</span><div class="regra-linha"><span class="regra-chave">QUANDO</span><span>${item.when ?? ''}</span></div><div class="regra-linha"><span class="regra-chave">SE</span><span>${item.if ?? ''}</span></div><div class="regra-linha"><span class="regra-chave">ENTÃO</span><span>${item.then ?? ''}</span></div></div>`
  if (item.kind === 'grid') return grade()
  if (item.kind === 'cycle')
    return `<div class="ciclo">${(item.steps ?? [])
      .map((s, i) => {
        const [titulo, descricao] = s as [string, string]
        return `<div class="ciclo-passo"><span class="ciclo-numero">0${i + 1}</span><h3>${titulo}</h3><p>${descricao}</p></div>`
      })
      .join('')}</div>`
  if (item.kind === 'drawing') {
    const drawing = drawings[item.name ?? '']
    if (!drawing) throw new Error(`Desenho desconhecido: ${item.name}`)
    return B.esquema(item.title ?? '', drawing.area, drawing.corpo())
  }
  if (item.kind === 'refs')
    return `<div class="referencias">${(item.refs ?? [])
      .map(
        ([autores, assunto, onde]) =>
          `<div class="referencia"><h3>${autores}</h3><p>${assunto}</p><p class="referencia-onde">${onde}</p></div>`,
      )
      .join('')}</div>`
  throw new Error(`Item desconhecido na apostila: ${item.kind}`)
}

const curso = 'Transformando o vilão em aliado'
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
  const topo = page.slide
    ? cabecalho({
        cena: slide(page.slide),
        alt: page.title,
        kicker: page.kicker,
        titulo: page.title,
        resumo: page.subtitle,
        enquadre: 'left center',
      })
    : `<div class="abertura"><div class="kicker">${page.kicker}</div><h2>${page.title}</h2><p>${page.subtitle}</p></div>`
  const tema = page.theme ? ` tema-${page.theme}` : ''
  return withPages(
    `<section class="page${tema}" data-id="${page.id}"><div class="inner">${topo}<div class="content">${corpo}</div></div>${rodape(curso, numero, material)}</section>`,
  )
})
const cover = capaHtml({
  arte: arteDoCurso('capa-transformando-o-vilao-em-aliado.jpg'),
  iconeSelo: 'livro',
  linha1: 'Transformando',
  linha2: 'o vilão em aliado',
  frase: 'Como a tela que o seu filho já usa pode treinar habilidades para a vida.',
  fraseBaixo: 'Um curso para pais, em sete aulas curtas.',
  tema: 'capa--vilao',
  selo: material,
})
// Cores do curso, puxadas da arte da capa: azul-marinho, azul e amarelo.
const cursoCss = `
body { --fundo: #f7f9fd; --tinta: #13204a; --texto: #3d4a5c; --destaque: #2f4fb8; --destaque-claro: #e6ecfb; --caminho: #2f4fb8;
  --numero-raio: 9px; --numero-fundo: var(--destaque-claro); --numero-cor: var(--destaque);
  --entrega-fundo: #13204a; --entrega-borda: #13204a; --entrega-texto: #e6ebf8; --entrega-rotulo: #13204a; --entrega-rotulo-fundo: #ffc02e; --entrega-rotulo-espaco: 1.6mm 4mm; --entrega-forte: #ffc02e; }
.capa--vilao { --capa-painel: #111a33; --capa-amarelo: #ffc02e; --capa-frase: #cfd8f5; --selo-fundo: #2f4fb8; --selo-topo: 592px; --selo-altura: 73px; --selo-largura: 470px; --selo-letra: 24px; --titulo-topo: 692px; --frase-largura: 560px; }
.capa--vilao .capa-titulo span { font-size: 84px; }
.capa--vilao .capa-titulo em { font-size: 68px; }
.abertura { margin-bottom: 4mm; }
.abertura h2 { font-size: 28pt; margin: 1mm 0 1.6mm; }
.abertura p { font-size: 11.4pt; font-weight: 600; line-height: 1.5; }
.cabecalho-cena { background: #111a33; }
.mapa { display: flex; flex-direction: column; gap: 2.4mm; }
.mapa-card { display: flex; gap: 4mm; align-items: center; border-radius: 14px; padding: 3mm 5mm; border: 1px solid; }
.mapa-card h3 { font-size: 12.6pt; margin-bottom: .6mm; }
.mapa-card p { font-size: 10pt; font-weight: 700; line-height: 1.4; color: #4a5250; }
.mapa-numero { flex: none; width: 9mm; height: 9mm; display: grid; place-items: center; background: #fff; border-radius: 9px; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 12pt; }
.mapa-card--azul { background: #e8f2fb; border-color: #c8dcf0; color: #0b5394; }
.mapa-card--ambar { background: #fff4dc; border-color: #f0d9a2; color: #a36a00; }
.mapa-card--roxo { background: #f0eafd; border-color: #d8ccf6; color: #6a3cc4; }
.mapa-card--verde { background: #e3f3ea; border-color: #bfe0cd; color: #087a54; }
.mapa-card--vermelho { background: #fde9e9; border-color: #f4c8c8; color: #c22a2a; }
.comparar { display: grid; grid-template-columns: 1fr 8mm 1fr; align-items: stretch; gap: 2mm; }
.comparar-lado { border-radius: 14px; padding: 3.6mm 4.6mm; border: 1px solid #dfe6ee; background: #fff; }
.comparar-lado h3 { font-size: 12.6pt; margin-bottom: 1.4mm; }
.comparar-lado p { font-size: 10.2pt; line-height: 1.45; font-weight: 600; }
.comparar-lado p + p { margin-top: .8mm; }
.comparar-lado--depois { background: var(--destaque-claro); border-color: transparent; }
.comparar-lado--depois h3 { color: var(--destaque); }
.comparar-seta { display: grid; place-items: center; color: var(--destaque); }
.comparar-icone { width: 7mm; height: 7mm; transform: rotate(-90deg); }
.citacao { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 1mm 4mm; background: #fff; border: 1px solid #dfe6ee; border-left: 5px solid #ffc02e; border-radius: 0 14px 14px 0; padding: 4mm 5mm; }
.citacao-icone { width: 6mm; height: 6mm; color: #b07d00; grid-row: span 2; }
.citacao blockquote { margin: 0; font-family: 'Baloo 2', Arial, sans-serif; font-size: 14pt; font-weight: 700; line-height: 1.3; color: var(--tinta); }
.citacao figcaption { font-size: 10pt; font-weight: 800; color: #8a94a6; }
.pares { display: flex; flex-direction: column; gap: 1.6mm; }
.par { display: grid; grid-template-columns: 1fr 1.25fr; gap: 3mm; align-items: center; background: #fff; border: 1px solid #dfe6ee; border-radius: 12px; padding: 2.4mm 4mm; }
.par-cena { font-family: 'Baloo 2', Arial, sans-serif; font-size: 11.6pt; font-weight: 800; color: var(--tinta); line-height: 1.25; }
.par-oferta { font-size: 10.2pt; font-weight: 600; line-height: 1.4; color: var(--texto); border-left: 3px solid var(--destaque); padding-left: 3mm; }
.regra { background: #fff; border: 1px solid #dfe6ee; border-radius: 14px; padding: 3.4mm 4.6mm; display: flex; flex-direction: column; gap: 1.6mm; }
.regra-titulo { font-size: 9.4pt; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--destaque); }
.regra-linha { display: flex; gap: 3mm; align-items: center; font-size: 11pt; font-weight: 700; color: var(--tinta); }
.regra-chave { flex: none; width: 18mm; text-align: center; border-radius: 999px; padding: .8mm 0; background: var(--destaque); color: #fff; font-size: 9pt; font-weight: 800; letter-spacing: .06em; }
.grade { display: flex; gap: 8mm; align-items: center; justify-content: center; background: #fff; border: 1px solid #dfe6ee; border-radius: 16px; padding: 5mm; }
.grade svg { width: 62mm; height: 62mm; }
.grade-instrucoes { display: flex; flex-direction: column; gap: 2.4mm; }
.grade-instrucoes span { border-radius: 999px; padding: 1.8mm 5mm; background: var(--destaque-claro); color: var(--destaque); font-weight: 800; font-size: 11pt; }
.ciclo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.4mm; }
.ciclo-passo { background: #fff; border: 1px solid #dfe6ee; border-radius: 12px; padding: 2.6mm 3.6mm; }
.ciclo-numero { font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; font-size: 11pt; color: var(--destaque); }
.ciclo-passo h3 { font-size: 12.4pt; margin: .2mm 0 .6mm; }
.ciclo-passo p { font-size: 9.8pt; font-weight: 600; line-height: 1.35; }
.referencias { display: flex; flex-direction: column; gap: 2.4mm; }
.referencia { background: #fff; border: 1px solid #dfe6ee; border-radius: 12px; padding: 3mm 4.4mm; }
.referencia h3 { font-size: 12pt; margin-bottom: .8mm; }
.referencia p { font-size: 10pt; font-weight: 600; line-height: 1.4; }
.referencia-onde { margin-top: .6mm; color: var(--destaque); font-weight: 800 !important; }
[data-id="abertura"] .content { gap: 3mm; }
`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Apostila do curso - ${curso}</title><style>${cssDoCaderno(fontes)}\n${cursoCss}</style></head><body>${cover}${folhas.join('\n')}</body></html>`
if (html.includes('{{')) throw new Error('Campo da apostila sem preencher.')
const previewDir = resolve(root, 'tmp/pdfs/transformando-o-vilao-em-aliado')
mkdirSync(previewDir, { recursive: true })
writeFileSync(join(previewDir, 'caderno.html'), html)
writeFileSync(
  join(previewDir, 'cores-estudio.json'),
  JSON.stringify(Object.fromEntries(B.usadas), null, 2),
)
if (process.argv.includes('--html-only')) process.exit(0)
const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
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
