import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const work = path.join(root, 'output/instagram/projetos/2026-10-09')
const finalDirectory = path.join(
  root,
  'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/projetos',
)
const sourceFile = 'docs/marketing/kids/comunidade-dos-criadores/instagram/01-destaques.md'
const source = fs.readFileSync(path.join(root, sourceFile), 'utf8').replaceAll('\r\n', '\n')
const section = source.split('## Projetos\n')[1].split('### Como acrescentar novos projetos\n')[0]
const links = fs.readFileSync(
  path.join(
    root,
    'docs/marketing/kids/comunidade-dos-criadores/instagram/apoio/links-e-publicacao.md',
  ),
  'utf8',
)
const captures = JSON.parse(fs.readFileSync(path.join(work, 'blocos.json'), 'utf8'))
fs.mkdirSync(finalDirectory, { recursive: true })
const escapeHtml = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const normalize = (s) => s.replaceAll('<br>', ' ').replace(/\s+/g, ' ').trim()
const picture = (name) =>
  `data:image/png;base64,${fs.readFileSync(path.join(work, 'capturas', name + '.png')).toString('base64')}`
const options = {
  PJ01: {
    key: 'farol',
    file: '01-farol-o-jogo.png',
    kind: 'game',
    first: 'inicio',
    aspect: 4 / 3,
    breaks: ['costa.'],
    emphasis: ['buscar uma chave e acender o farol', 'cada passo'],
  },
  PJ02: {
    key: 'farol',
    file: '02-farol-ordem-dos-passos.png',
    kind: 'skill',
    breaks: ['farol.'],
    emphasis: ['pegar a chave antes de acender o farol', 'conferir'],
  },
  PJ03: {
    key: 'cade',
    file: '03-cade-todo-mundo-o-jogo.png',
    kind: 'game',
    first: 'inicio',
    aspect: 16 / 9,
    breaks: ['personagens.'],
    emphasis: ['procurar três personagens', 'aparecer quando alguém toca no esconderijo'],
  },
  PJ04: {
    key: 'cade',
    file: '04-cade-todo-mundo-contagem.png',
    kind: 'skill',
    breaks: ['encontrado.'],
    emphasis: ['contar cada personagem encontrado', 'mudança no placar'],
  },
  PJ05: {
    key: 'nave',
    file: '05-nave-contra-asteroides-o-jogo.png',
    kind: 'game',
    first: 'andamento',
    aspect: 5 / 3,
    breaks: ['nave.'],
    emphasis: ['andar, atirar nos asteroides e ganhar pontos', 'fim da partida e o recomeço'],
  },
  PJ06: {
    key: 'nave',
    file: '06-nave-contra-asteroides-conferir.png',
    kind: 'skill',
    breaks: ['ponto.'],
    emphasis: ['cada acerto valer um ponto', 'conferir o próprio trabalho'],
  },
  PJ07: {
    key: 'dino',
    file: '07-corre-dino-o-jogo.png',
    kind: 'game',
    first: 'andamento',
    aspect: 16 / 9,
    breaks: ['correndo.'],
    emphasis: ['pula cactos', 'contar pontos com o tempo'],
  },
  PJ08: {
    key: 'dino',
    file: '08-corre-dino-comparar-e-ajustar.png',
    kind: 'skill',
    breaks: ['velocidade.'],
    emphasis: ['colocar um limite nessa velocidade', 'comparar tentativas e mudar o que fez'],
  },
}
const stories = [
  ...section.matchAll(/^### (PJ\d+) · (.+)\n([\s\S]*?)(?=^### PJ|(?![\s\S]))/gm),
].map(([, id, description, rest]) => {
  const config = options[id]
  if (!config) throw Error(id)
  const title = rest.match(/Título:\*\* (.+)/)?.[1]
  if (!title) throw Error('Título ausente: ' + id)
  const [project, subtitle] = title.split(' · ')
  const copy = [...rest.matchAll(/^> (.+)$/gm)].map((m) => m[1]).join(' ')
  let divided = copy
  for (const point of config.breaks) {
    if (!divided.includes(point + ' ')) throw Error('Quebra ausente: ' + id)
    divided = divided.replace(point + ' ', point + '\n')
  }
  const paragraphs = divided.split('\n')
  let body = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
  for (const phrase of config.emphasis) {
    if (!body.includes(phrase)) throw Error('Ênfase ausente: ' + id + ' ' + phrase)
    body = body.replace(escapeHtml(phrase), `<strong>${escapeHtml(phrase)}</strong>`)
  }
  const labels = rest.match(/\*\*Rótulos nas imagens:\*\* (.+?) \/ (.+?)\./)?.slice(1)
  const callout = rest.match(/\*\*Chamada junto ao destaque:\*\* (.+)/)?.[1]
  const match = rest.match(/\*\*Sticker:\*\* (.+?) → (L\d+), origem (pj\d+)\./)
  let sticker
  if (match) {
    const row = links.split(/\r?\n/).find((l) => l.startsWith('| ' + id + ' /'))
    const url = row?.match(/`(https:\/\/[^`]+)`/)?.[1]
    if (!url || new URL(url).searchParams.get('utm_content') !== id.toLowerCase())
      throw Error('Link inválido: ' + id)
    sticker = { label: match[1], url, bounds: { x: 180, y: 1640, width: 720, height: 96 } }
  }
  if (
    (config.kind === 'game' && labels?.length !== 2) ||
    (config.kind === 'skill' && (!callout || !sticker))
  )
    throw Error('Peça incompleta: ' + id)
  return {
    id,
    ...config,
    title,
    project,
    subtitle,
    description,
    copy,
    paragraphs,
    body,
    labels,
    callout,
    sticker,
  }
})
if (stories.length !== 8) throw Error('Esperadas oito telas')
const linkIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>'
function visual(s) {
  if (s.kind === 'game')
    return `<div class="game-stack">${[s.first, 'final'].map((state, i) => `<figure style="width:${390 * s.aspect}px"><figcaption>${s.labels[i]}</figcaption><img src="${picture(s.key + '-' + state)}" alt="${escapeHtml(s.project + ' — ' + s.labels[i])}"></figure>`).join('')}</div><div class="demo">Demonstração da equipe</div>`
  const capture = captures.find((c) => c.key === s.key)
  if (!capture) throw Error('Captura ausente: ' + s.key)
  const h = capture.highlight,
    w = capture.clip.width,
    height = capture.clip.height
  if (h.x < 0 || h.y < 0 || h.x + h.width > w + 3 || h.y + h.height > height + 3)
    throw Error('Destaque fora do recorte: ' + s.id)
  return `<div class="studio-card"><div class="studio-label"><span class="studio-dot"></span>ESTÚDIO · BLOCOS DO JOGO</div><div class="block-image"><img src="${picture(s.key + '-blocos')}" alt="${escapeHtml(capture.selected.text)}"><div class="highlight" style="left:calc(${(100 * h.x) / w}% - 5px);top:calc(${(100 * h.y) / height}% - 5px);width:calc(${(100 * h.width) / w}% + 10px);height:calc(${(100 * h.height) / height}% + 10px)"></div></div></div><div class="callout"><span class="marker"></span>${escapeHtml(s.callout)}</div><div class="demo">Demonstração da equipe</div>`
}
const css = `
*{box-sizing:border-box}html,body{margin:0;background:#e6ebf1;font-family:'Segoe UI',Arial,sans-serif;color:#0f1a33}html{scrollbar-width:none}::-webkit-scrollbar{display:none}
.story{position:relative;width:1080px;height:1920px;overflow:hidden;background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1080px,#fff 1080px,#fff 100%);margin-bottom:20px}
.eyebrow{position:absolute;top:160px;left:72px;background:#ffc02e;border-radius:40px;padding:11px 30px 14px;font-size:27px;font-weight:750;line-height:1;letter-spacing:3px}.number{position:absolute;top:167px;right:75px;font-size:27px;letter-spacing:3px;color:#fff;font-weight:650}
.heading{position:absolute;top:244px;left:72px;right:60px;color:#fff}.heading h1{font-size:70px;line-height:1.07;font-weight:750;letter-spacing:-2.5px;margin:0}.heading h2{font-size:34px;line-height:1.20;font-weight:550;margin:20px 0 0;letter-spacing:-.4px}
.copy{position:absolute;left:78px;right:78px;font-size:44px;line-height:1.29;letter-spacing:-.45px}.copy p{margin:0 0 22px}.copy p:last-child{margin-bottom:0}.copy strong{font-weight:650;color:#1b5cf3}
.footer{position:absolute;top:1780px;left:72px;right:72px;text-align:center;font-size:23px;letter-spacing:1px;color:#23344f}.footer:before{content:'';display:block;width:96px;height:7px;border-radius:8px;background:#ffc02e;margin:0 auto 27px}
.demo{font-size:23px;font-weight:550;line-height:1.2;color:#4b5d76;text-align:right}
.game{background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1410px,#fff 1410px,#fff 100%)}.game .heading h1{font-size:68px}.game .visual{position:absolute;top:465px;left:52px;right:52px}.game-stack{display:flex;flex-direction:column;align-items:center;gap:24px}.game-stack figure{margin:0}.game-stack figcaption{font-size:30px;color:#fff;line-height:1.16;margin:0 0 10px;font-weight:600}.game-stack img{width:100%;height:auto;display:block;border-radius:20px;outline:5px solid #ffffff}.game .demo{margin-top:20px;color:#fff;padding-right:26px}.game .copy{top:1450px;font-size:43px;line-height:1.28}
.game.nave .heading h1{font-size:66px;max-width:900px}.game.nave .heading h2{margin-top:14px}
.skill .heading h1{font-size:60px;line-height:1.06}.skill .heading h2{font-size:43px;line-height:1.12;max-width:870px;margin-top:22px;font-weight:600}
.skill .visual{position:absolute;top:530px;left:52px;right:52px}.studio-card{background:#e9eff7;border:28px solid #e9eff7;border-radius:30px}.studio-label{display:flex;align-items:center;gap:15px;font-size:25px;line-height:1.2;letter-spacing:1.2px;font-weight:700;margin-bottom:24px;color:#263c5b}.studio-dot{display:inline-block;width:16px;height:16px;border-radius:5px;background:#1b5cf3}.block-image{position:relative}.block-image>img{width:100%;height:auto;display:block}.highlight{position:absolute;border:5px solid #ffc02e;border-radius:12px;box-shadow:0 0 0 2px #0f1a3370;pointer-events:none}
.callout{display:flex;align-items:center;justify-content:center;gap:18px;font-size:35px;font-weight:650;line-height:1.15;margin:24px 26px 0;color:#0f1a33}.marker{width:24px;height:24px;flex:none;border-radius:6px;background:#ffc02e}.skill .demo{margin:17px 20px 0}.skill .copy{top:1315px;font-size:43px}.skill .link-slot{position:absolute;top:1640px;left:180px;width:720px;height:96px;border-radius:50px;background:#ffc02e;display:flex;align-items:center;justify-content:center;gap:15px;font-size:32px;line-height:1;font-weight:700}.link-slot svg{width:33px;height:33px;flex:none}
.skill.cade .visual{top:675px}.skill.cade .copy{top:1200px;font-size:47px}.skill.nave .visual{top:565px}.skill.nave .copy{top:1245px;font-size:44px}.skill.dino .visual{top:480px}.skill.dino .block-image{width:850px;max-width:100%;margin:0 auto}.skill.dino .copy{top:1290px;font-size:43px}
`
const manifest = {
  format: '1080x1920 PNG',
  source: sourceFile,
  finalDirectory,
  stories: stories.map(
    ({
      id,
      file,
      kind,
      key,
      title,
      project,
      subtitle,
      copy,
      paragraphs,
      labels,
      callout,
      sticker,
    }) => ({
      id,
      file,
      kind,
      key,
      title,
      project,
      subtitle,
      copy,
      paragraphs,
      labels,
      callout,
      sticker,
    }),
  ),
}
const markup = stories
  .map(
    (s) =>
      `<article class="story ${s.kind} ${s.key}" id="${s.id}"><span class="eyebrow">PROJETOS</span><span class="number">${s.id.slice(-2)} / 08</span><header class="heading"><h1>${escapeHtml(s.project)}</h1><h2>${escapeHtml(s.subtitle)}</h2></header><div class="visual">${visual(s)}</div><div class="copy">${s.body}</div>${s.sticker ? `<div class="link-slot">${linkIcon}${escapeHtml(s.sticker.label)}</div>` : ''}<div class="footer">Helena e Júlio · Comunidade dos Criadores</div></article>`,
  )
  .join('\n')
fs.writeFileSync(
  path.join(work, 'montagem.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>Projetos · Stories</title><style>${css}</style><body>${markup}<script id="story-data" type="application/json">${JSON.stringify(manifest)}</script></body></html>`,
)
fs.writeFileSync(path.join(work, 'manifesto.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(path.join(work, 'copy-revisao.txt'), stories.map((s) => s.copy).join('\n\n'))
fs.writeFileSync(
  path.join(work, 'publicacao.txt'),
  `PROJETOS · 8 stories de 1080 × 1920\n\nPublique na ordem de 01 a 08 e salve no destaque Projetos. São dois stories para cada jogo: apresentação e habilidades.\n\nAo publicar as imagens 02, 04, 06 e 08, adicione um sticker de link do Instagram sobre a área amarela. O botão desenhado no PNG indica a posição; é necessário adicionar o sticker para receber cliques.\n\n${stories
    .filter((s) => s.sticker)
    .map(
      (s) => `${s.id} · ${s.file}\nTexto do sticker: ${s.sticker.label}\nDestino: ${s.sticker.url}`,
    )
    .join(
      '\n\n',
    )}\n\nO Farol leva à oferta do Desafio do Primeiro Jogo. Cadê Todo Mundo?, Nave Contra Asteroides e Corre Dino levam à oferta da Comunidade. As imagens mostram os jogos e os blocos reais, em demonstrações da equipe.\n\nEste destaque pode crescer: acrescente dois stories para cada novo projeto, seguindo o mesmo formato.\n`,
)
console.log(
  JSON.stringify({
    stories: stories.length,
    stickers: stories.filter((s) => s.sticker).length,
    html: path.join(work, 'montagem.html'),
  }),
)
