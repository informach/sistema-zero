import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const work = path.join(root, 'output/instagram/alunos/2026-10-09')
const finalDirectory = path.join(
  root,
  'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/alunos',
)
for (const folder of ['finais-ampliados', 'molduras-ampliadas'])
  fs.mkdirSync(path.join(work, folder), { recursive: true })
fs.mkdirSync(path.join(finalDirectory, 'molduras'), { recursive: true })
const sourceFile = 'docs/marketing/kids/comunidade-dos-criadores/instagram/01-destaques.md'
const source = fs.readFileSync(path.join(root, sourceFile), 'utf8').replaceAll('\r\n', '\n')
const section = source.split('## Alunos\n')[1].split('### Como acrescentar novos alunos\n')[0]
const escapeHtml = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const data = (file) =>
  `data:image/png;base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`
const founders = data(
  'output/instagram/quem-somos/2026-10-09/cenas-contexto-v2/SN01-fundadores-no-trabalho.png',
)
const game = data('output/instagram/projetos/2026-10-09/capturas/farol-inicio.png')
const portraits = ['rafael', 'jeffrey', 'debora', 'andre', 'fernando'].map((name) => ({
  name,
  src: data(
    ['jeffrey', 'fernando'].includes(name)
      ? 'output/instagram/alunos/2026-10-09/referencias/' + name + '.png'
      : 'packages/funnel/public/img/desafio-primeiro-jogo/depo-' + name + '.webp',
  ),
}))
const options = {
  AL01: {
    file: '01-alunos-na-comunidade.png',
    kind: 'intro',
    title: 'Alunos na Comunidade<br>dos Criadores.',
    breaks: ['Criadores.'],
    emphasis: ['montam os jogos, fazem escolhas'],
  },
  AL02: {
    file: '02-rafael-aprendendo.png',
    overlayFile: '02-rafael-moldura.png',
    scene: 'AL02-rafael-aprendendo.png',
    kind: 'student',
    name: 'Rafael',
    role: 'Aluno',
    emphasis: ['aprendendo a fazer'],
  },
  AL03: {
    file: '03-jeffrey-explorando.png',
    overlayFile: '03-jeffrey-moldura.png',
    scene: 'AL03-jeffrey-explorando.png',
    kind: 'student',
    name: 'Jeffrey',
    role: 'Aluno',
    emphasis: ['explorando o que muda'],
  },
  AL04: {
    file: '04-debora-personalizando.png',
    overlayFile: '04-debora-moldura.png',
    scene: 'AL04-debora-personalizando-v2.png',
    kind: 'student',
    name: 'Débora',
    role: 'Aluna',
    emphasis: ['dando o seu jeito'],
  },
  AL05: {
    file: '05-andre-testando.png',
    overlayFile: '05-andre-moldura.png',
    scene: 'AL05-andre-testando.png',
    kind: 'student',
    name: 'André',
    role: 'Aluno',
    emphasis: ['jogando para conferir'],
  },
  AL07: {
    file: '06-fernando-mostrando.png',
    overlayFile: '06-fernando-moldura.png',
    scene: 'AL07-fernando-mostrando.png',
    kind: 'student',
    name: 'Fernando',
    role: 'Aluno',
    emphasis: ['mostrando o que fez'],
  },
  AL06: {
    file: '07-conhecer-o-desafio.png',
    kind: 'cta',
    title: 'Conheça o Desafio<br>do Primeiro Jogo.',
    breaks: ['botão.'],
    emphasis: ['Desafio do Primeiro Jogo', 'ver o jogo e como as aulas funcionam'],
  },
}
const links = fs.readFileSync(
  path.join(
    root,
    'docs/marketing/kids/comunidade-dos-criadores/instagram/apoio/links-e-publicacao.md',
  ),
  'utf8',
)
const linkRow = links.split(/\r?\n/).find((l) => l.startsWith('| AL06 /'))
const link = linkRow?.match(/`(https:\/\/[^`]+)`/)?.[1]
if (!link || new URL(link).searchParams.get('utm_content') !== 'al06')
  throw Error('Destino AL06 ausente')
const stories = [
  ...section.matchAll(/^### (AL\d+) · (.+)\n([\s\S]*?)(?=^### AL|(?![\s\S]))/gm),
].map(([, id, description, rest]) => {
  const config = options[id]
  if (!config) throw Error(id)
  const copy = [...rest.matchAll(/^> (.+)$/gm)].map((m) => m[1]).join(' ')
  let divided = copy
  for (const point of config.breaks ?? []) {
    if (!divided.includes(point + ' ')) throw Error('Quebra ausente: ' + id)
    divided = divided.replace(point + ' ', point + '\n')
  }
  const paragraphs = divided.split('\n')
  let body = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
  for (const phrase of config.emphasis) {
    if (!body.includes(escapeHtml(phrase))) throw Error('Ênfase ausente: ' + id)
    body = body.replace(escapeHtml(phrase), `<strong>${escapeHtml(phrase)}</strong>`)
  }
  return {
    id,
    ...config,
    description,
    copy,
    paragraphs,
    body,
    status:
      config.kind === 'student'
        ? 'story completo com cena gerada provisória; substituir pelo vídeo posteriormente'
        : 'arte estática pronta',
    ...(id === 'AL06'
      ? {
          sticker: {
            label: 'Conhecer o Desafio',
            url: link,
            bounds: { x: 204, y: 1600, width: 672, height: 96 },
          },
        }
      : {}),
  }
})
if (stories.length !== 7) throw Error('Esperadas sete peças')
const linkIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>'
const videoWindow = { x: 52, y: 480, width: 976, height: 970, radius: 32 }
function mask(id) {
  return `<svg class="mask" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="bg-${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="75.521%" stop-color="#1b5cf3"/><stop offset="75.521%" stop-color="#ffffff"/></linearGradient><mask id="window-${id}"><rect width="1080" height="1920" fill="white"/><rect x="52" y="480" width="976" height="970" rx="32" fill="black"/></mask></defs><rect width="1080" height="1920" fill="url(#bg-${id})" mask="url(#window-${id})"/></svg>`
}
const css = `
*{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:'Segoe UI',Arial,sans-serif;color:#0f1a33}html{scrollbar-width:none}::-webkit-scrollbar{display:none}
.story{position:relative;width:1080px;height:1920px;overflow:hidden;margin-bottom:20px;background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1080px,#fff 1080px,#fff 100%)}
.eyebrow{position:absolute;top:170px;left:72px;background:#ffc02e;border-radius:40px;padding:11px 30px 14px;font-size:27px;font-weight:750;line-height:1;letter-spacing:3px}
.title{position:absolute;top:270px;left:72px;right:60px;color:#fff;font-size:76px;line-height:1.08;font-weight:750;letter-spacing:-2.6px;margin:0}
.visual{position:absolute;left:52px;right:52px;top:510px;border-radius:32px;overflow:hidden}.visual img{display:block;width:100%;height:auto}
.copy{position:absolute;left:78px;right:78px;font-size:47px;line-height:1.30;letter-spacing:-.4px}.copy p{margin:0 0 26px}.copy p:last-child{margin-bottom:0}.copy strong{font-weight:650;color:#1b5cf3}
.footer{position:absolute;left:72px;right:72px;top:1750px;text-align:center;font-size:23px;letter-spacing:1px;color:#23344f}.footer:before{content:'';display:block;width:96px;height:7px;border-radius:8px;background:#ffc02e;margin:0 auto 27px}
.intro .title{font-size:72px}.intro .visual{top:535px}.intro .visual img{height:650px;object-fit:cover}.intro .copy{top:1240px;font-size:47px}
.cta .visual{top:485px}.cta .visual img{height:732px;object-fit:contain}.cta .copy{top:1270px;font-size:42px;line-height:1.27}.cta .demo{position:absolute;top:1228px;left:78px;right:78px;text-align:right;font-size:23px;color:#4b5d76;font-weight:550}
.link-slot{position:absolute;top:1600px;left:204px;width:672px;height:96px;border-radius:50px;background:#ffc02e;display:flex;align-items:center;justify-content:center;gap:16px;font-size:33px;font-weight:700}.link-slot svg{width:34px;height:34px;flex:none}
.student{background:none}.mask{position:absolute;inset:0;display:block}.author{position:absolute;top:278px;left:78px;right:78px;color:#fff}.author h1{margin:0;font-size:84px;font-weight:750;letter-spacing:-2px;line-height:1.1}.role{margin-top:13px;font-size:35px;line-height:1.25}.student .copy{top:1520px;font-size:57px;line-height:1.18;font-weight:500}.student .footer{top:1750px}
.student .visual{top:480px;height:970px}.student .visual img{width:100%;height:100%;object-fit:cover}
.intro .people{height:650px;display:grid;grid-template-columns:repeat(6,1fr);gap:24px 10px;align-content:center;justify-items:center;background:#edf2ff;padding:28px 55px}.face{grid-column:span 2;width:236px;height:236px;border-radius:50%;overflow:hidden;position:relative;border:8px solid #fff;background:white;box-shadow:0 5px 15px #0f1a3315}.face:nth-child(4){grid-column:2/span 2}.face:nth-child(5){grid-column:4/span 2}.intro .face img{display:block;position:absolute;width:220px;height:220px;object-fit:cover}.intro .face.jeffrey img{width:640px;height:360px;max-width:none;left:-95px;top:-32px}.intro .face.fernando img{width:640px;height:360px;max-width:none;left:-57px;top:-30px}
`
const markup = stories
  .map((s) => {
    const content =
      s.kind === 'student'
        ? `${mask(s.id)}<div class="visual"><img src="${data('output/instagram/alunos/2026-10-09/cenas-provisorias/' + s.scene)}" alt="Cena provisória gerada com a referência de ${s.name} em atividade no computador."></div><div class="author"><h1>${escapeHtml(s.name)}</h1><div class="role">${s.role}</div></div>`
        : `<h1 class="title">${s.title}</h1>${s.kind === 'intro' ? `<div class="visual people">${portraits.map((p) => `<div class="face ${p.name}"><img src="${p.src}" alt="Retrato do aluno."></div>`).join('')}</div>` : `<div class="visual"><img src="${game}" alt="A Chave do Farol, jogo do Desafio do Primeiro Jogo."></div><div class="demo">Demonstração da equipe</div>`}`
    return `<article class="story ${s.kind}" id="${s.id}">${content}<span class="eyebrow">ALUNOS</span><div class="copy">${s.body}</div>${s.sticker ? `<div class="link-slot">${linkIcon}${s.sticker.label}</div>` : ''}<div class="footer">Helena e Júlio · Comunidade dos Criadores</div></article>`
  })
  .join('\n')
const manifest = {
  format: '1080x1920 PNG',
  source: sourceFile,
  finalDirectory,
  videoWindow,
  excluded: [],
  stories: stories.map(
    ({
      id,
      file,
      overlayFile,
      scene,
      kind,
      name,
      role,
      title,
      copy,
      paragraphs,
      status,
      sticker,
    }) => ({
      id,
      file,
      overlayFile,
      scene,
      kind,
      name,
      role,
      title,
      copy,
      paragraphs,
      status,
      sticker,
    }),
  ),
}
fs.writeFileSync(
  path.join(work, 'montagem.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>Alunos · Stories e molduras</title><style>${css}</style><body>${markup}<script id="story-data" type="application/json">${JSON.stringify(manifest)}</script></body></html>`,
)
fs.writeFileSync(path.join(work, 'manifesto.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(path.join(work, 'copy-revisao.txt'), stories.map((s) => s.copy).join('\n\n'))
fs.writeFileSync(
  path.join(work, 'publicacao.txt'),
  `ALUNOS · Sete stories completos de 1080 × 1920\n\nVERSÃO ATUAL\nA pedido do responsável em 09/10/2026, Rafael, Jeffrey, Débora, André e Fernando aparecem em cenas provisórias geradas com suas referências de rosto. Essas imagens representam as atividades previstas e serão substituídas por vídeos; não são registros reais das aulas. Jeffrey e Fernando foram incluídos com as referências fornecidas pelo responsável.\n\nORDEM DOS ARQUIVOS\n${stories.map((s) => `${s.file} — ${s.id}${s.name ? ' · ' + s.name : ''}`).join('\n')}\n\nOs números dos arquivos indicam a ordem deste lote. Os IDs do roteiro foram preservados, incluindo AL06 para o link. A abertura não fixa nomes nem quantidade de alunos. Novos registros podem entrar depois do convite.\n\nCOPY DAS CRIANÇAS\n${stories
    .filter((s) => s.kind === 'student')
    .map((s) => `${s.id} · ${s.name} · ${s.role}\n${s.copy}`)
    .join(
      '\n\n',
    )}\n\nSUBSTITUIÇÃO PELOS VÍDEOS\nA subpasta molduras contém cinco PNGs com centro transparente, nomes, Aluno/Aluna e legendas. Posicionar a moldura correspondente sobre o vídeo em uma tela de 1080 × 1920. Janela da imagem: x 52, y 480, largura 976, altura 970, cantos de 32 pixels. Ajustar o vídeo sem esticar nem cortar o rosto ou a atividade. Conferir a legenda com o que aparece na gravação e preservar o áudio e as reações espontâneas.\n\nLINK DO CONVITE\nNa imagem 07 (AL06), adicionar um sticker de link do Instagram sobre a área amarela. O botão desenhado indica a posição; o sticker é necessário para receber cliques.\nTexto: Conhecer o Desafio\nDestino: ${link}\n\nSalvar no destaque Alunos.\n`,
)
console.log(JSON.stringify({ completeImages: 7, overlays: 5, work, finalDirectory }))
