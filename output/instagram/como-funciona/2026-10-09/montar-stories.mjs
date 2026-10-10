import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const work = path.join(root, 'output/instagram/como-funciona/2026-10-09')
const finalDirectory = path.join(
  root,
  'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/como-funciona',
)
const sourceFile = 'docs/marketing/kids/comunidade-dos-criadores/instagram/01-destaques.md'
const source = fs.readFileSync(path.join(root, sourceFile), 'utf8').replaceAll('\r\n', '\n')
const section = source.split('## Como funciona\n')[1].split('## Projetos\n')[0]
fs.mkdirSync(path.join(work, 'finais'), { recursive: true })
fs.mkdirSync(finalDirectory, { recursive: true })
const escapeHtml = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const normalize = (s) => s.replaceAll('<br>', ' ').replace(/\s+/g, ' ').trim()
const data = (file) =>
  `data:image/${path.extname(file).slice(1)};base64,${fs.readFileSync(file).toString('base64')}`
const capture = (name) => data(path.join(work, 'capturas', name))
const scenes = path.join(root, 'output/instagram/quem-somos/2026-10-09/cenas-contexto-v2')
const assets = {
  start: capture('01-inicio.png'),
  collect: capture('03-pegou-chave.png'),
  win: capture('04-farol-aceso.png'),
  custom: capture('05-personalizado.png'),
  without: capture('06-experiencia-sem-chave.png'),
  withKey: capture('07-experiencia-com-chave.png'),
  blocks: capture('08-blocos-porta-v2.png'),
  family: data(path.join(scenes, 'SN06-familia-no-computador-v3.png')),
  founders: data(path.join(scenes, 'SN01-fundadores-no-trabalho.png')),
}
const project = JSON.parse(fs.readFileSync(path.join(work, 'projeto.json'), 'utf8'))
const character = (name) => project.assets.find((a) => a.name === name).dataUrl
const picture = (name, alt, cls = '') =>
  `<img class="${cls}" src="${assets[name]}" alt="${escapeHtml(alt)}">`
const demo = '<div class="demo">Demonstração da equipe</div>'
const compare = (left, right, labelLeft, labelRight) =>
  `<div class="comparison"><figure><figcaption>${labelLeft}</figcaption>${picture(left, labelLeft)}</figure><figure><figcaption>${labelRight}</figcaption>${picture(right, labelRight)}</figure></div>`
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${
    {
      pause:
        '<rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/>',
      replay: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/><path d="m10 8 6 4-6 4Z"/>',
      play: '<path d="m8 4 12 8-12 8Z"/>',
      calendar:
        '<rect x="3" y="5" width="18" height="17" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/>',
      link: '<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    }[name]
  }</svg>`
const layout = {
  CF01: {
    file: '01-a-chave-do-farol.png',
    title: 'A Chave<br>do Farol.',
    kind: 'hero',
    breaks: ['costa.'],
    emphasis: ['pegar uma chave para acender o farol', 'passo a passo'],
    visual: `<div class="game hero-game">${picture('win', 'O personagem acendeu o farol e o barco chegou à costa.')}</div>${demo}`,
  },
  CF02: {
    file: '02-primeiro-experimentar.png',
    title: 'Primeiro,<br>experimentar.',
    kind: 'compare',
    breaks: ['experimentar.'],
    emphasis: ['com a chave e sem ela', 'entende por que precisa buscá-la'],
    visual: `${compare('without', 'withKey', 'Sem a chave', 'Com a chave')}${demo}`,
  },
  CF03: {
    file: '03-montar-e-testar.png',
    title: 'Montar e ver<br>se funciona.',
    kind: 'blocks',
    breaks: ['fazer.'],
    emphasis: ['encaixar blocos na tela', 'conferir se funcionou'],
    visual: `<div class="block-capture">${picture('blocks', 'Blocos reais do Farol: quando encosta no farol, verifica se tem a chave e escolhe a mensagem e a luz.')}</div>${demo}`,
  },
  CF04: {
    file: '04-buscar-a-chave-e-acender.png',
    title: 'Buscar a chave<br>e acender o farol.',
    kind: 'compare',
    breaks: ['chave.'],
    emphasis: ['fazer o personagem andar e pegar a chave', 'junta essas partes'],
    visual: `${compare('collect', 'win', '1. Pegar a chave', '2. Acender o farol')}${demo}`,
  },
  CF05: {
    file: '05-escolher-o-visual.png',
    title: 'Escolher o<br>visual do jogo.',
    kind: 'custom',
    breaks: ['programação.'],
    emphasis: ['escolhe o personagem e o cenário', 'escreve as mensagens'],
    visual: `${compare('start', 'custom', 'Uma opção', 'Outra opção')}<div class="characters"><span>Personagens da aula</span><div>${['aventureiro', 'menina-de-laco', 'robo'].map((name) => `<img src="${character(name)}" alt="${name}">`).join('')}</div></div>${demo}`,
  },
  CF06: {
    file: '06-uma-escolha-para-mostrar.png',
    title: 'Uma escolha<br>para mostrar.',
    kind: 'photo',
    breaks: ['ele.'],
    emphasis: ['peça que conte por que a colocou ali', 'um assunto para conversar'],
    visual: `<div class="photo-frame">${picture('family', 'Helena, Júlio, André e Débora olhando juntos para o computador.')}</div>`,
  },
  CF07: {
    file: '07-aulas-gravadas-no-computador.png',
    title: 'Aulas gravadas,<br>no computador.',
    kind: 'study',
    breaks: ['teclado.'],
    emphasis: ['9 a 14 anos', 'pausar para fazer cada passo', 'voltar ao vídeo'],
    visual: `<div class="study-card"><div class="monitor"><div class="screen">${picture('start', 'O jogo A Chave do Farol no computador.')}</div><div class="monitor-foot"></div></div><div class="study-benefits"><div>${icon('pause')}<span>Pausar para fazer</span></div><div>${icon('replay')}<span>Voltar para rever</span></div></div></div>${demo}`,
  },
  CF08: {
    file: '08-pagamento-e-acesso.png',
    title: 'Pagamento único,<br>30 dias de acesso.',
    kind: 'access',
    breaks: ['pagamento.', 'jogar.'],
    emphasis: ['paga uma vez', '30 dias de acesso', 'não vira uma assinatura'],
    visual: `<div class="access-card"><div class="calendar">${icon('calendar')}<span>30</span></div><div class="access-label">DIAS DE ACESSO</div><div class="access-small">A partir da aprovação<br>do pagamento.</div></div>`,
  },
  CF09: {
    file: '09-conhecer-o-desafio.png',
    title: 'Conheça o Desafio<br>do Primeiro Jogo.',
    kind: 'cta',
    breaks: ['prática.'],
    emphasis: ['o jogo, as aulas e o valor', 'paga separadamente'],
    visual: `<div class="photo-frame">${picture('founders', 'Helena e Júlio preparando uma aula juntos no computador.')}</div>`,
  },
}
const stories = [
  ...section.matchAll(/^### (CF\d+) · (.+)\n([\s\S]*?)(?=^### CF|(?![\s\S]))/gm),
].map(([, id, subtitle, rest]) => {
  const config = layout[id]
  const title = rest.match(/(?:Sobreposição|Título):\*\* (.+?)(?= \*\*Sticker|\n)/)?.[1]
  if (!config || normalize(title) !== normalize(config.title))
    throw Error(`Título divergente: ${id}: ${title}`)
  const copy = [...rest.matchAll(/^> (.+)$/gm)].map((m) => m[1]).join(' ')
  let divided = copy
  for (const point of config.breaks) {
    if (!divided.includes(point + ' ')) throw Error(`Quebra ausente: ${id}: ${point}`)
    divided = divided.replace(point + ' ', point + '\n')
  }
  const paragraphs = divided.split('\n')
  if (normalize(paragraphs.join(' ')) !== normalize(copy)) throw Error(`Copy divergente: ${id}`)
  let body = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
  for (const phrase of config.emphasis) {
    if (!body.includes(escapeHtml(phrase))) throw Error(`Ênfase ausente: ${id}: ${phrase}`)
    body = body.replace(escapeHtml(phrase), `<strong>${escapeHtml(phrase)}</strong>`)
  }
  return { id, ...config, subtitle, copy, paragraphs, body }
})
if (stories.length !== 9) throw Error('Esperadas nove telas')
const linkRow = fs
  .readFileSync(
    path.join(
      root,
      'docs/marketing/kids/comunidade-dos-criadores/instagram/apoio/links-e-publicacao.md',
    ),
    'utf8',
  )
  .split(/\r?\n/)
  .find((l) => l.startsWith('| CF09 /'))
const link = linkRow.match(/`(https:\/\/[^`]+)`/)[1]
if (new URL(link).searchParams.get('utm_content') !== 'cf09')
  throw Error('Origem do link incorreta')

const css = `
*{box-sizing:border-box}html,body{margin:0;background:#e6ebf1;font-family:'Segoe UI',Arial,sans-serif;color:#0f1a33}html{scrollbar-width:none}::-webkit-scrollbar{display:none}
.story{width:1080px;height:1920px;position:relative;overflow:hidden;background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1080px,#fff 1080px,#fff 100%);margin-bottom:20px}
.eyebrow{position:absolute;top:170px;left:72px;border-radius:40px;background:#ffc02e;padding:11px 30px 14px;font-size:27px;font-weight:750;line-height:1;letter-spacing:3px}
.number{position:absolute;right:75px;top:177px;color:#fff;font-size:28px;font-weight:600;letter-spacing:3px}
.title{position:absolute;top:270px;left:72px;right:60px;color:#fff;font-size:80px;line-height:1.08;letter-spacing:-2.7px;font-weight:750;margin:0}
.visual{position:absolute;top:510px;left:52px;right:52px}.game,.photo-frame,.block-capture{overflow:hidden;border-radius:32px;background:#fff}.game img{display:block;width:100%;height:auto}
.demo{text-align:right;padding:14px 8px 0;color:#4b5d76;font-size:23px;line-height:1.2;font-weight:550}
.copy{position:absolute;left:78px;right:78px;font-size:46px;line-height:1.30;letter-spacing:-.45px}
.copy p{margin:0 0 24px}.copy p:last-child{margin:0}.copy strong{color:#1b5cf3;font-weight:650}
.footer{position:absolute;top:1750px;left:72px;right:72px;text-align:center;color:#23344f;font-size:23px;letter-spacing:1px}.footer:before{content:'';display:block;width:96px;height:7px;margin:0 auto 27px;border-radius:8px;background:#ffc02e}
.hero .visual{top:495px}.hero .copy{top:1290px;font-size:44px}.hero .demo{color:#4b5d76}
.comparison{display:grid;grid-template-columns:1fr 1fr;gap:20px;background:white;border:18px solid white;border-radius:30px;overflow:hidden}.comparison figure{margin:0;min-width:0}.comparison figcaption{font-size:33px;font-weight:700;line-height:1.2;margin:4px 0 20px;letter-spacing:-.5px}.comparison img{display:block;width:100%;border-radius:16px}
.compare .visual{top:585px}.compare .copy{top:1150px;font-size:48px}.compare .demo{color:white;padding-top:21px}
.blocks .visual{top:535px}.block-capture{padding:24px;background:#e6edf5}.block-capture img{display:block;width:100%;height:auto}.blocks .copy{top:1210px}.blocks .demo{color:#4b5d76}
.custom .visual{top:510px}.custom .copy{top:1240px;font-size:44px}.characters{display:flex;align-items:center;justify-content:space-between;padding:14px 32px 8px;background:#fff;border-radius:24px;margin-top:18px}.characters span{font-size:30px;font-weight:650}.characters>div{display:flex;gap:20px}.characters img{width:94px;height:94px;image-rendering:auto}.custom .demo{color:#4b5d76}
.photo .visual{top:510px}.photo-frame img{display:block;width:100%;height:650px;object-fit:cover}.photo .copy{top:1220px;font-size:45px}
.study .visual{top:530px}.study-card{background:#fff;border-radius:32px;padding:38px 60px 32px}.monitor{margin:auto;width:630px;position:relative;padding-bottom:50px}.screen{border:16px solid #152746;border-bottom-width:26px;border-radius:23px}.screen img{display:block;width:100%;height:345px;object-fit:cover;object-position:top}.monitor-foot{width:170px;height:45px;background:#dce5f1;position:absolute;bottom:5px;left:230px;clip-path:polygon(30% 0,70% 0,75% 75%,100% 75%,100% 100%,0 100%,0 75%,25% 75%)}.study-benefits{display:flex;justify-content:center;gap:40px;padding-top:25px}.study-benefits>div{display:flex;align-items:center;gap:14px;font-size:29px;font-weight:650}.study-benefits svg{width:38px;height:38px;color:#1b5cf3;flex:none}.study .copy{top:1240px;font-size:45px}
.access .visual{top:530px}.access-card{background:#fff;border-radius:32px;text-align:center;padding:42px 40px 40px}.calendar{position:relative;width:195px;height:195px;margin:0 auto 26px;color:#1b5cf3}.calendar svg{width:100%;height:100%}.calendar span{position:absolute;top:93px;left:0;right:0;font-size:63px;font-weight:750;line-height:1}.access-label{font-size:31px;letter-spacing:3px;font-weight:750;color:#1b5cf3}.access-small{margin-top:22px;font-size:34px;line-height:1.24;color:#4b5d76}.access .copy{top:1150px;font-size:47px}
.cta .visual{top:510px}.cta .photo-frame img{height:555px;object-position:50% 42%}.cta .copy{top:1130px;font-size:43px;line-height:1.3}.link-slot{position:absolute;top:1588px;left:204px;width:672px;height:100px;border-radius:50px;background:#ffc02e;display:flex;align-items:center;justify-content:center;gap:17px;font-size:34px;font-weight:700}.link-slot svg{width:34px;height:34px;stroke-width:2}
`
const manifest = {
  format: '1080x1920 PNG',
  source: sourceFile,
  finalDirectory,
  stories: stories.map(({ id, file, title, copy, paragraphs, kind }) => ({
    id,
    file,
    title: normalize(title),
    copy,
    paragraphs,
    kind,
    ...(id === 'CF09'
      ? {
          sticker: {
            label: 'Conhecer o Desafio',
            url: link,
            bounds: { x: 204, y: 1588, width: 672, height: 100 },
          },
        }
      : {}),
  })),
}
const markup = stories
  .map(
    (s) =>
      `<article class="story ${s.kind}" id="${s.id}"><span class="eyebrow">COMO FUNCIONA</span><span class="number">${s.id.slice(-2)} / 09</span><h1 class="title">${s.title}</h1><div class="visual">${s.visual}</div><div class="copy">${s.body}</div>${s.id === 'CF09' ? `<div class="link-slot">${icon('link')}Conhecer o Desafio</div>` : ''}<div class="footer">Helena e Júlio · Comunidade dos Criadores</div></article>`,
  )
  .join('\n')
fs.writeFileSync(
  path.join(work, 'montagem.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>Como funciona · Stories</title><style>${css}</style><body>${markup}<script id="story-data" type="application/json">${JSON.stringify(manifest)}</script></body></html>`,
)
fs.writeFileSync(path.join(work, 'manifesto.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(
  path.join(work, 'publicacao.txt'),
  `COMO FUNCIONA · 9 stories de 1080 × 1920\n\nPublique as imagens de 01 a 09, nessa ordem, e salve no destaque Como funciona. Todas contêm o texto completo; não dependem de narração.\n\nNa imagem 09, adicione um sticker de link do Instagram sobre a área amarela. O botão desenhado é uma referência de posição; é necessário adicionar o sticker para receber cliques.\n\nTexto do sticker: Conhecer o Desafio\nDestino: ${link}\n\nAs demonstrações do Farol foram capturadas no jogo, na experiência da porta e nos blocos do Estúdio. As duas cenas de família reaproveitam as imagens aprovadas para Quem somos.\n`,
)
fs.writeFileSync(
  path.join(work, 'README.md'),
  `# Como funciona — produção\n\nNove cartelas estáticas, com a copy completa de CF01–CF09.\n\n- Jogo e personalização: renderizador real do Estúdio, a partir do projeto completo do Farol. Capturas dos estados alcançados por teclado.\n- Experiência da porta: componente LighthouseKeyStage, em dois estados reais.\n- Blocos: captura do evento da porta no Estúdio local, com a mesma programação do projeto.\n- Família: reaproveitamento das cenas já aprovadas de Quem somos. Sem nova geração de pessoas.\n- Composição: HTML/CSS nativo, capturado em PNG a 1080 × 1920. Não foi necessário gerar novas fotos.\n- CF07: “foi pensado para” acompanha a orientação de faixa etária revisada no destaque Dúvidas.\n\nReprodução: executar preparar-capturas.tsx com Bun, fazer as capturas nos estados indicados e executar montar-stories.mjs com Node. O manifesto registra textos, ordem e destino do sticker.\n`,
)
console.log(
  JSON.stringify({
    stories: stories.length,
    html: path.join(work, 'montagem.html'),
    finalDirectory,
  }),
)
