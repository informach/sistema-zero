import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const work = path.join(root, 'output/instagram/avaliacoes/2026-10-09')
const finalDirectory = path.join(
  root,
  'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/avaliacoes',
)
fs.mkdirSync(finalDirectory, { recursive: true })
fs.mkdirSync(path.join(work, 'finais-ampliados'), { recursive: true })
const assetRoot = path.join(root, 'packages/funnel/public/img/desafio-primeiro-jogo')
const imageData = (name) =>
  `data:image/${path.extname(name).slice(1)};base64,${fs.readFileSync(path.join(assetRoot, name)).toString('base64')}`
const localImage = (name) =>
  `data:image/png;base64,${fs.readFileSync(path.resolve(name)).toString('base64')}`
const photos = {
  fernando: localImage('output/instagram/alunos/2026-10-09/referencias/fernando.png'),
  jeffrey: localImage('output/instagram/alunos/2026-10-09/referencias/jeffrey.png'),
  daniel: localImage('output/instagram/avaliacoes/2026-10-09/fontes/daniel-12s.png'),
  harle: localImage('output/instagram/avaliacoes/2026-10-09/fontes/harle-60s.png'),
  flavia: localImage('output/instagram/avaliacoes/2026-10-09/fontes/flavia-60s.png'),
  rafael: imageData('depo-rafael.webp'),
  debora: imageData('depo-debora.webp'),
  andre: imageData('depo-andre.webp'),
  farol: imageData('farol-jogo.png'),
}
const stories = [
  {
    id: 'AV01',
    file: '01-o-que-contam-sobre-as-aulas.png',
    type: 'intro',
    title: 'O que contam<br>sobre as aulas.',
    paragraphs: [
      'Aqui a gente reúne os relatos sobre as aulas.',
      'Você pode conhecer o que as pessoas acharam antes de escolher uma atividade para seu filho.',
    ],
  },
  {
    id: 'AV02',
    file: '02-relato-rafael.png',
    type: 'quote',
    name: 'Rafael',
    role: 'Aluno',
    photo: 'rafael',
    context: 'Relato sobre o<br>Desafio do Primeiro Jogo.',
    quote: 'No fim eu peguei o link e mandei pro meu amigo jogar.',
    quoteMarkup: 'No fim eu peguei o link e mandei pro meu amigo jogar.',
  },
  {
    id: 'AV03',
    file: '03-relato-debora.png',
    type: 'quote',
    name: 'Débora',
    role: 'Aluna',
    photo: 'debora',
    context: 'Relato sobre o<br>Desafio do Primeiro Jogo.',
    quote:
      'Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No último dia chamei a minha mãe pra ver o meu jogo.',
    quoteMarkup:
      'Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo.<br><br>No último dia chamei a minha mãe pra ver o meu jogo.',
  },
  {
    id: 'AV04',
    file: '04-relato-andre.png',
    type: 'quote',
    name: 'André',
    role: 'Aluno',
    photo: 'andre',
    context: 'Relato sobre o<br>Desafio do Primeiro Jogo.',
    quote:
      'Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior.',
    quoteMarkup:
      'Eu já jogava um monte, agora eu faço os meus jogos.<br><br>Esse foi o primeiro e já quero fazer um maior.',
  },
  {
    id: 'AV05',
    file: '05-conheca-a-chave-do-farol.png',
    type: 'project',
    title: 'Conheça A Chave<br>do Farol.',
    paragraphs: [
      'A Chave do Farol é o jogo que seu filho aprende a construir no Desafio. No botão, veja como são as aulas, o que está incluído e quanto custa.',
    ],
    sticker: {
      label: 'Ver A Chave do Farol',
      url: 'https://sistemazero.com.br/kids/desafio-primeiro-jogo/oferta?utm_source=instagram&utm_medium=organic_social&utm_campaign=desafio_instagram_ciclo01&utm_content=av05',
      bounds: { x: 236, y: 1548, width: 608, height: 100 },
      instruction:
        'No Instagram, adicionar um sticker de link com este texto e destino, sobre a área amarela. O botão desenhado na imagem serve de referência de posição; só o sticker recebe cliques.',
    },
  },
]

const additions = [
  {
    id: 'AV06',
    name: 'Fernando',
    role: 'Aluno',
    photo: 'fernando',
    context: 'Relato sobre criar jogos.',
    quote:
      'Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.',
    sourceFile:
      'C:\\Users\\tocha\\Downloads\\Eu me sinto muito feliz fazendo isso _ Fernando, PCD.mp4',
    sourceStart: 0,
    sourceEnd: 8.14,
    type: 'quote',
    quoteMarkup:
      'Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.',
  },
  {
    id: 'AV07',
    name: 'Jeffrey',
    role: 'Aluno',
    photo: 'jeffrey',
    context: 'Relato sobre criar jogos.',
    quote:
      'Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.',
    sourceFile:
      'C:\\Users\\tocha\\Downloads\\Ele conseguiu se expressar com isso _ Jeffrey, PCD.mp4',
    sourceStart: 101.42,
    sourceEnd: 109.34,
    type: 'quote',
    quoteMarkup:
      'Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.',
  },
  {
    id: 'AV08',
    name: 'Daniel',
    role: 'Pai do Rafael',
    photo: 'daniel',
    context: 'Relato sobre as aulas.',
    quote:
      'O Rafa ficou bastante empolgado com o curso. Acabava uma aula e ele vinha contar: “Aprendi isso aqui”, e me mostrava no computador.',
    sourceFile:
      'C:\\Users\\tocha\\Downloads\\Isso trouxe para o meu filho organização, lógica e criatividade _ Daniel, PCD.mp4',
    sourceStart: 60.16,
    sourceEnd: 68.78,
    type: 'quote',
    quoteMarkup:
      'O Rafa ficou bastante empolgado com o curso. Acabava uma aula e ele vinha contar: “Aprendi isso aqui”, e me mostrava no computador.',
  },
  {
    id: 'AV09',
    name: 'Harle',
    role: 'Pai do Jeffrey',
    photo: 'harle',
    context: 'Relato sobre as aulas.',
    quote:
      'Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.',
    sourceFile:
      'C:\\Users\\tocha\\Downloads\\Meu filho autista superou todas as expectativas _ Harle, PCD.mp4',
    sourceStart: 69.48,
    sourceEnd: 77.28,
    type: 'quote',
    quoteMarkup:
      'Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.',
  },
  {
    id: 'AV10',
    name: 'Flávia',
    role: 'Mãe do Fernando',
    photo: 'flavia',
    context: 'Relato sobre as aulas.',
    quote:
      'No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.',
    sourceFile:
      'C:\\Users\\tocha\\Downloads\\Isso não incentivou meu filho a jogar, mas a desenvolver _ Flávia, PCD.mp4',
    sourceStart: 56.14,
    sourceEnd: 62.14,
    type: 'quote',
    quoteMarkup:
      'No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.',
  },
]
stories.push(...additions)
const order = ['AV01', 'AV02', 'AV08', 'AV03', 'AV07', 'AV09', 'AV04', 'AV06', 'AV10', 'AV05']
stories.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
for (const [i, s] of stories.entries())
  s.file =
    String(i + 1).padStart(2, '0') +
    '-' +
    (s.type === 'quote'
      ? 'relato-' + s.photo
      : s.type === 'intro'
        ? 'o-que-contam-sobre-as-aulas'
        : 'conheca-a-chave-do-farol') +
    '.png'

const css = `
*{box-sizing:border-box}
html,body{margin:0;background:#e6ebf1;color:#0f1a33;font-family:'Segoe UI',Arial,sans-serif}
html{scrollbar-width:none}::-webkit-scrollbar{display:none}
.story{width:1080px;height:1920px;position:relative;overflow:hidden;background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1120px,#fff 1120px,#fff 100%);margin-bottom:20px}
.eyebrow{position:absolute;top:170px;left:72px;background:#ffc02e;border-radius:40px;padding:11px 30px 14px;font-size:27px;font-weight:750;line-height:1;letter-spacing:3px}
.title{position:absolute;top:265px;left:72px;right:65px;font-size:82px;line-height:1.08;letter-spacing:-2.7px;font-weight:750;color:white;margin:0}
.footer{position:absolute;top:1690px;left:72px;right:72px;text-align:center;color:#23344f;font-size:23px;letter-spacing:1px}
.footer:before{content:'';display:block;height:7px;width:96px;border-radius:8px;background:#ffc02e;margin:0 auto 29px}
.intro{background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1040px,#fff 1040px,#fff 100%)}
.intro .title{font-size:88px;top:283px}
.voices{position:absolute;left:122px;top:600px;width:836px;height:220px;display:flex;align-items:center;justify-content:center;gap:36px}
.voice{position:relative;width:192px;height:204px;background:white;border-radius:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 0 #104bd6}
.voice:after{content:'';position:absolute;left:32px;bottom:-22px;width:30px;height:32px;background:white;clip-path:polygon(0 0,100% 0,0 100%)}
.voice img{display:block;width:144px;height:144px;border-radius:50%;object-fit:cover}
.voice:nth-child(2){transform:translateY(40px);background:#ffc02e;box-shadow:0 10px 0 #104bd6}.voice:nth-child(2):after{background:#ffc02e}
.intro-card{position:absolute;left:52px;right:52px;top:970px;padding:62px 32px 60px;background:white;border-radius:36px}
.intro-card p{margin:0 0 38px;font-size:48px;line-height:1.35;letter-spacing:-.5px}
.intro-card p:first-child{font-weight:650;color:#1b5cf3}
.author{position:absolute;left:78px;right:250px;top:278px;color:white}
.author h1{margin:0 0 10px;font-size:84px;font-weight:750;line-height:1.1;letter-spacing:-2px}
.role{font-size:35px;line-height:1.3;margin-top:13px}
.context{margin-top:27px;font-size:33px;line-height:1.35;color:#fff}
.portrait{position:absolute;top:285px;right:80px;width:154px;height:154px;border:5px solid #fff;border-radius:50%;object-fit:cover}
.quote-card{position:absolute;top:615px;left:52px;right:52px;height:960px;background:white;border-radius:36px;box-shadow:0 15px 55px #0f1a3310}
.quote-mark{position:absolute;top:44px;left:66px;color:#1b5cf3;font-family:Georgia,serif;font-size:190px;font-weight:bold;line-height:1}
.quote-card blockquote{margin:0;position:absolute;left:68px;right:68px;top:215px;font-size:65px;line-height:1.23;letter-spacing:-1.3px;font-weight:550}
.quote-card blockquote:after{content:'”'}
.AV02 .quote-card blockquote{font-size:80px;line-height:1.2;top:253px}
.AV02 .context{margin-top:28px}
.AV03 .quote-card blockquote{font-size:59px;line-height:1.22;top:218px;letter-spacing:-.8px}
.AV03 .quote-card blockquote br+br{display:block;content:'';margin-top:30px}
.AV04 .quote-card blockquote{font-size:65px;line-height:1.22;top:228px}
.project{background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1035px,#fff 1035px,#fff 100%)}
.project .title{font-size:78px;top:263px}
.game{position:absolute;left:52px;top:468px;width:976px;height:732px;border-radius:32px;overflow:hidden;background:#39aac2}
.game img{display:block;width:100%;height:100%;object-fit:contain}
.project-copy{position:absolute;left:78px;right:78px;top:1244px;font-size:40px;line-height:1.32;letter-spacing:-.35px;margin:0}
.link-slot{position:absolute;left:236px;top:1548px;width:608px;height:100px;border-radius:50px;background:#ffc02e;display:flex;align-items:center;justify-content:center;gap:16px;color:#0f1a33;font-size:34px;font-weight:700;line-height:1}
.link-slot svg{width:32px;height:32px;flex:none}
.title,.author h1{line-height:1.3}
.AV02 .quote-card blockquote,.AV03 .quote-card blockquote,.AV04 .quote-card blockquote{line-height:1.3}
.project .game{top:490px;height:710px}
.voices{left:122px;top:545px;width:836px;height:620px;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(3,190px);gap:24px;align-items:center;justify-items:center}
.voice{grid-column:span 2;width:226px;height:190px;box-shadow:0 8px 0 #104bd6}
.voice:nth-child(2){transform:none}
.voice:nth-child(7){grid-column:2/span 2}.voice:nth-child(8){grid-column:4/span 2}
.voice:nth-child(3n){background:#ffc02e}.voice:nth-child(3n):after{background:#ffc02e}
.face{position:relative;display:block;width:162px;height:162px;overflow:hidden;border-radius:50%;flex:none;background:#e8eef6}
.face img{position:absolute;display:block;width:100%;height:100%;border-radius:0;object-fit:cover;max-width:none}
.face.jeffrey img{width:291%;height:auto;left:-43.2%;top:-14.5%}
.face.fernando img{width:291%;height:auto;left:-25.9%;top:-13.6%}
.face.daniel img{width:320%;height:auto;left:-182.5%;top:-27.5%}
.face.harle img{width:378.2%;height:auto;left:-153.9%;top:-49%}
.face.flavia img{width:523.6%;height:auto;left:-105.5%;top:-23.6%}
.portrait{position:absolute;width:154px;height:154px;top:285px;right:80px;border:5px solid white}
.intro-card{top:1210px;padding:28px 32px}
.intro-card p{font-size:44px;line-height:1.3;margin:0 0 25px}
.intro-card p:last-child{margin-bottom:0}
.quote-card blockquote{line-height:1.3}
.AV08 .quote-card blockquote{font-size:60px;top:220px}
.AV09 .quote-card blockquote{font-size:68px;top:228px}
.AV10 .quote-card blockquote{font-size:65px;top:228px}

`

const face = (photo, name, extra = '') =>
  `<span class="face ${photo} ${extra}"><img src="${photos[photo]}" alt="${name}"></span>`
const footer = '<div class="footer" data-check>Helena e Júlio · Comunidade dos Criadores</div>'
const markup = stories
  .map((s) => {
    let content = ''
    if (s.type === 'intro') {
      content = `<h1 class="title" data-check>${s.title}</h1><div class="voices" aria-hidden="true">${stories
        .filter((s) => s.type === 'quote')
        .map((s) => `<div class="voice">${face(s.photo, s.name)}</div>`)
        .join(
          '',
        )}</div><div class="intro-card" data-check>${s.paragraphs.map((p) => `<p>${p}</p>`).join('')}</div>`
    } else if (s.type === 'quote') {
      content = `<div class="author" data-check><h1>${s.name}</h1><div class="role">${s.role}</div><div class="context">${s.context}</div></div>${face(s.photo, s.name, 'portrait')}<div class="quote-card"><span class="quote-mark" aria-hidden="true">“</span><blockquote data-check>${s.quoteMarkup}</blockquote></div>`
    } else {
      content = `<h1 class="title" data-check>${s.title}</h1><div class="game"><img src="${photos.farol}" alt="Jogo A Chave do Farol: personagem, chave e farol na ilha."></div><p class="project-copy" data-check>${s.paragraphs[0]}</p><div class="link-slot" data-check><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>${s.sticker.label}</div>`
    }
    return `<article class="story ${s.type} ${s.id}" id="${s.id}"><span class="eyebrow" data-check>AVALIAÇÕES</span>${content}${footer}</article>`
  })
  .join('\n')

fs.writeFileSync(
  path.join(work, 'montagem.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>Avaliações · Stories</title><style>${css}</style><body>${markup}</body></html>`,
)
fs.writeFileSync(
  path.join(work, 'manifesto.json'),
  JSON.stringify(
    {
      format: '1080x1920 PNG',
      finalDirectory,
      source: 'docs/marketing/kids/comunidade-dos-criadores/instagram/01-destaques.md',
      stories,
    },
    null,
    2,
  ),
)
fs.writeFileSync(
  path.join(work, 'publicacao.txt'),
  `# Avaliações\n\nPublicar as dez imagens na ordem dos arquivos.\n\nNo story 10, adicionar um sticker de link sobre o botão amarelo:\n\n- Texto: **${stories[9].sticker.label}**\n- Destino: ${stories[9].sticker.url}\n\nO botão desenhado no PNG indica a posição. É necessário adicionar o sticker no Instagram para que o link funcione.\n\nCinco crianças e três responsáveis, intercalados. Fotos das crianças obtidas das referências fornecidas e da oferta; retratos dos responsáveis extraídos dos vídeos originais. As falas novas foram transcritas e os trechos escolhidos conferidos por uma segunda transcrição. A pontuação foi ajustada para leitura; as palavras e o sentido foram mantidos. Nome, participação e contexto acompanham cada relato. Os novos vídeos falam sobre criar jogos e fazer as aulas; não atribuir esses relatos especificamente ao Farol. Fontes e segundos dos trechos estão em fontes-dos-relatos.txt. A abertura reúne os oito rostos, sem lista ou quantidade fixa no texto.\n`,
)
console.log(
  JSON.stringify({
    html: path.join(work, 'montagem.html'),
    finalDirectory,
    stories: stories.length,
  }),
)

fs.writeFileSync(
  path.join(work, 'copy-revisao.txt'),
  stories
    .map((s) =>
      [
        s.title?.replaceAll('<br>', ' '),
        s.name,
        s.role,
        s.context?.replaceAll('<br>', ' '),
        s.quote,
        ...(s.paragraphs ?? []),
        s.sticker?.label,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n'),
)
