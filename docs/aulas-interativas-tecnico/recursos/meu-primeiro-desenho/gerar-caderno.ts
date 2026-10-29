import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FAROL_LAYOUT } from '../../../../packages/studio/src/arte/farol-assets'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { ASSETS_FAROL } from '../../qa/desafio-farol-projeto'
import { meuDesenhoAjuda } from '../../qa/meu-desenho-conteudo'
import { CHAVE_DO_JOGO, CHAVE_EXEMPLO, VAGA_CHAVE } from '../../qa/meu-desenho-projeto'

// O mesmo template do Cadê Todo Mundo, com as fontes e as cores reais dos blocos do Estúdio,
// como os cadernos dos Faróis e dos Poderes.
const root = resolve(import.meta.dirname, '../../../..'),
  out = resolve(root, 'tmp/pdfs/meu-primeiro-desenho')
mkdirSync(out, { recursive: true })
const reference = readFileSync(
  resolve(import.meta.dirname, '../cade-todo-mundo/caderno-do-aluno.template.html'),
  'utf8',
)
const base = reference.match(/<style>([\s\S]*?)<\/style>/)?.[1]
if (!base) throw Error('Template do Cadê ausente')
const css = base.replace(
  '/* {{FONT_FACES}} */',
  `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}`,
)
const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const defs = new Map([...FRAME_BLOCKS, ...gameTwoDBlocks].map((b) => [b.type, b]))
const attrs = (type: string) => {
  const definition = defs.get(type)
  const color = definition && 'colour' in definition ? definition.colour : undefined
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
    throw Error(`Cor ausente: ${type}`)
  return `data-block-type="${type}" style="background-color:${color}"`
}
const field = (s: string) => `<span class="field">${esc(s)}</span>`
const block = (type: string, s: string) => `<div class="block" ${attrs(type)}>${s}</div>`
const area = (type: string, title: string, body: string) =>
  `<div class="event-block" ${attrs(type)}><span class="tag">Áreas do projeto · ${title}</span><div class="event-body">${body}</div></div>`
const prepared = (s: string) => `<div class="prepared">${esc(s)} (já vem no projeto)</div>`
const { x, y, w, h } = FAROL_LAYOUT.chave
const spriteDaChave = (imagem: string) =>
  block(
    'sz_g2d_create_image_sprite',
    `Criar sprite ${field('chave')} em x ${field(String(x))} y ${field(String(y))} largura ${field(String(w))} altura ${field(String(h))} com imagem ${field(imagem)}`,
  )
const asset = (name: string) => ASSETS_FAROL.find((a) => a.name === name)!.dataUrl
const scene = asset('praia-tropical'),
  farol = asset('farol-listrado-aceso'),
  chaveDourada = asset(CHAVE_DO_JOGO),
  minhaChave = CHAVE_EXEMPLO.dataUrl
const box = (title: string, text: string, tone = 'note') =>
  `<div class="soft-box box-${tone}"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`
const steps = (list: string[]) =>
  `<div class="steps">${list.map((s, n) => `<div class="step"><span class="number">${n + 1}</span><p>${esc(s)}</p></div>`).join('')}</div>`
const [desenhar, trocar] = meuDesenhoAjuda
if (!desenhar || !trocar) throw Error('O Passo a passo mudou de forma')
const ferramentas: [string, string][] = [
  ['Círculo', 'Arraste na diagonal para fazer uma forma redonda.'],
  ['Retângulo', 'Arraste para fazer um retângulo: comprido, baixinho ou pequeno.'],
  ['Selecionar', 'Clique numa forma para mover. Os quadradinhos da borda mudam o tamanho.'],
  ['Pincel', 'Desenha à mão livre, como uma caneta.'],
  ['Preenchimento', 'O quadradinho cheio: a cor de dentro da forma.'],
  ['Contorno', 'O quadradinho vazado: a cor da borda da forma.'],
]
const pages: { title: string; kicker: string; subtitle: string; body: string }[] = [
  {
    title: 'O que você vai fazer',
    kicker: 'Extra do Faísca',
    subtitle: 'Uma chave desenhada por você, dentro do seu jogo da Chave do Farol.',
    body: `${box('O seu desenho no jogo', 'Você desenha a sua chave no Pinta, aqui mesmo na aula, e envia o desenho. Ele chega ao jogo com o nome minha-chave. No jogo, você troca a imagem da chave pela sua: as regras continuam as mesmas, e só a aparência muda.')}<div class="compare"><figure><img src="${chaveDourada}" alt="A chave dourada do jogo"><figcaption>A chave do jogo: ${esc(CHAVE_DO_JOGO)}</figcaption></figure><span class="arrow">→</span><figure><img src="${minhaChave}" alt="Uma chave desenhada"><figcaption>A sua chave: ${esc(VAGA_CHAVE)}</figcaption></figure></div>${box('Uma aula, duas entregas', 'Primeiro você envia o desenho. Depois abre o jogo, troca a imagem, testa e envia o projeto. Este extra não conta para subir de posto: é para criar do seu jeito.', 'test')}`,
  },
  {
    title: 'As ferramentas do Pinta',
    kicker: 'Desenhe a sua chave',
    subtitle: 'As que esta aula usa. O resto do Pinta você conhece mais adiante.',
    body: `<div class="tools">${ferramentas.map(([nome, texto]) => `<div class="tool"><h3>${esc(nome)}</h3><p>${esc(texto)}</p></div>`).join('')}</div>${box('Errou? Tudo bem', 'Use Desfazer, no alto do Pinta, para voltar um passo. Você pode desfazer quantas vezes quiser.', 'test')}`,
  },
  {
    title: desenhar.title,
    kicker: 'Desenhe a sua chave',
    subtitle: 'Relembre a ideia e desenhe.',
    body: `${box('A ideia', desenhar.idea)}${steps(desenhar.steps)}`,
  },
  {
    title: 'Um jeito de desenhar',
    kicker: 'Desenhe a sua chave',
    subtitle: 'Argola, haste e dois dentes. A sua pode ser do seu jeito.',
    body: `<div class="drawing"><img src="${minhaChave}" alt="Uma chave feita de um círculo, um retângulo comprido e dois retângulos pequenos"><ul><li><b>Argola:</b> um Círculo.</li><li><b>Haste:</b> um Retângulo comprido.</li><li><b>Dentes:</b> dois Retângulos pequenos.</li><li><b>Brilho:</b> um toque de Pincel, se quiser.</li></ul></div>${box('Teste', desenhar.test, 'test')}${box('Se não funcionar', desenhar.correction)}`,
  },
  {
    title: trocar.title,
    kicker: 'A sua chave no jogo',
    subtitle: 'Relembre a ideia e troque a imagem.',
    body: `${box('A ideia', trocar.idea)}${steps(trocar.steps)}${box('Teste no seu jogo', trocar.test, 'test')}`,
  },
  {
    title: 'Confira o bloco',
    kicker: 'A sua chave no jogo',
    subtitle: 'Só a imagem muda. O nome do sprite continua chave.',
    body: `<div class="blocks"><h3>Antes</h3>${area('sz_frame_start', 'Ao iniciar', prepared('O cenário e o personagem') + spriteDaChave(CHAVE_DO_JOGO) + prepared('O farol, o barco e o aviso'))}<h3 class="after">Depois</h3>${area('sz_frame_start', 'Ao iniciar', prepared('O cenário e o personagem') + spriteDaChave(VAGA_CHAVE) + prepared('O farol, o barco e o aviso'))}<p class="diagram-note">As cores vêm das definições do Estúdio. O cinza representa o que já vem no projeto.</p></div>${box('Se não funcionar', trocar.correction)}`,
  },
  {
    title: 'Teste e envie',
    kicker: 'Entrega',
    subtitle: 'O desenho primeiro, o jogo depois.',
    body:
      box(
        'Envie o desenho',
        'No Pinta, clique em Enviar meu desenho e confirme em Enviar. Quando aparecer Desenho enviado!, clique em Próxima parte: é o envio que leva o desenho ao jogo.',
      ) +
      box(
        'Antes de enviar o jogo',
        'Jogue uma partida: a sua chave aparece, o personagem a pega e o farol acende.',
        'test',
      ) +
      box(
        'Envie o projeto',
        'Clique em Verificar projeto e corrija o que faltar. Clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
      ) +
      box(
        'Quer outra chave?',
        'Volte à parte do desenho, mude e clique em Enviar de novo. Na próxima vez que você abrir a aula, o jogo vem com a chave nova.',
      ),
  },
]
const cover = `<section class="page cover" data-id="capa"><div class="cover-art"><img class="scene" src="${scene}" alt="Praia do Farol"><img class="lighthouse" src="${farol}" alt="O farol aceso"><img class="key" src="${minhaChave}" alt="Uma chave desenhada"></div><div class="cover-copy"><span class="badge">Passo a passo do projeto</span><h1>Meu primeiro<br><em>desenho no Pinta</em></h1><p>Desenhe a sua chave e coloque no seu jogo.</p><div class="cover-bottom">Uma chave que ninguém mais tem.<br>No farol que você programou.</div></div></section>`
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Meu primeiro desenho no Pinta - Passo a passo do projeto</title><style>${css}
.lesson-hero{min-height:35mm;margin-bottom:5mm}.lesson-hero .scene{width:28%;object-fit:cover}.lesson-hero h2{font-size:22pt;text-wrap:balance}.lesson-hero .kicker{font-size:8pt;letter-spacing:.02em}.content{display:grid;gap:4mm;font-size:11pt}.content p{font-size:11pt;line-height:1.5;text-wrap:pretty}.content h3{margin-bottom:2mm}.box-note{background:var(--blue-soft)}.box-test{background:var(--green-soft)}.blocks{margin:0;padding:14px}.blocks .after{margin-top:6mm}.block,.event-block{line-height:1.5}.field{white-space:nowrap}.prepared{color:var(--muted);background:#edf0f7;border-radius:8px;padding:6px 10px;font-size:9pt;font-weight:600}.diagram-note{font-size:9pt!important;color:var(--muted);margin-top:12px}.compare{display:flex;align-items:center;justify-content:center;gap:10mm}.compare figure{margin:0;text-align:center}.compare img{width:30mm;height:30mm;image-rendering:auto;background:#f5f7fb;border-radius:10px;padding:4mm}.compare figcaption{font-size:9pt;font-weight:700;margin-top:2mm}.compare .arrow{font-size:24pt;font-weight:800;color:var(--muted)}.tools{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.tool{background:var(--blue-soft);border-radius:12px;padding:4mm}.tool h3{font-size:12pt}.tool p{font-size:10pt!important}.drawing{display:flex;gap:8mm;align-items:center}.drawing img{width:55mm;height:55mm;background:white;border:1px solid #d9deea;border-radius:12px;padding:4mm}.drawing ul{font-size:11pt;line-height:1.8}.cover-art{height:48%;position:relative}.cover-art .scene{object-fit:cover}.cover-art .lighthouse{position:absolute;width:30%;left:62%;top:14%}.cover-art .key{position:absolute;width:22%;left:24%;top:30%;filter:drop-shadow(0 3mm 3mm #0003)}.cover .cover-bottom{margin-top:12mm}.content .steps{gap:12px}@media print{body{background:white}.page{margin:0}}
</style></head><body>${cover}${pages.map((p, i) => `<section class="page lesson-one" data-id="${i + 2}"><div class="inner"><div class="lesson-hero"><img class="scene" src="${scene}" alt="Praia do Farol"><div class="lesson-hero-text"><div class="kicker">${esc(p.kicker)}</div><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p></div></div><div class="content">${p.body}</div></div><div class="page-no"><span class="brand">Meu primeiro desenho no Pinta | Passo a passo do projeto</span><span>${i + 2} / ${pages.length + 1}</span></div></section>`).join('\n')}</body></html>`
writeFileSync(resolve(out, 'caderno.html'), html)
console.log(`${pages.length + 1} páginas com o template, fontes e cores do Cadê e dos Faróis.`)
