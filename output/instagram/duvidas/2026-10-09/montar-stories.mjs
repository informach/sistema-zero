import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const work = path.join(root, 'output/instagram/duvidas/2026-10-09')
const finalDirectory = path.join(
  root,
  'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/duvidas',
)
const sourceFile = 'docs/marketing/kids/comunidade-dos-criadores/instagram/01-destaques.md'
const linksFile =
  'docs/marketing/kids/comunidade-dos-criadores/instagram/apoio/links-e-publicacao.md'
const source = fs.readFileSync(path.join(root, sourceFile), 'utf8').replaceAll('\r\n', '\n')
const links = fs.readFileSync(path.join(root, linksFile), 'utf8')
const section = source.split('## Dúvidas\n')[1].split('## Avaliações\n')[0]
fs.mkdirSync(path.join(work, 'finais'), { recursive: true })
fs.mkdirSync(finalDirectory, { recursive: true })

const layout = {
  DU01: {
    file: '01-idade-e-participacao.png',
    title: 'Para qual idade<br>é a Comunidade?',
    icon: 'people',
    group: 'community',
    breaks: ['autonomia.', 'responsável.'],
    emphasis: [
      '9 a 14 anos',
      'acompanhadas dos pais ou de um responsável',
      'interesse em aprender a criar jogos',
    ],
  },
  DU02: {
    file: '02-computador-e-equipamento.png',
    title: 'Dá para fazer<br>no celular?',
    icon: 'computer',
    group: 'community',
    breaks: ['teclado.'],
    emphasis: ['computador ou notebook', 'A tela maior'],
  },
  DU03: {
    file: '03-aulas-gravadas.png',
    title: 'As aulas são<br>ao vivo?',
    icon: 'video',
    group: 'community',
    breaks: ['seguir.'],
    emphasis: ['pausar para montar', 'no horário que cabe na rotina de vocês'],
  },
  DU04: {
    file: '04-como-receber-ajuda.png',
    title: 'Como ele<br>recebe ajuda?',
    icon: 'message',
    group: 'community',
    breaks: ['depois.'],
    emphasis: ['“Preciso de ajuda”', 'Recados'],
  },
  DU05: {
    file: '05-acompanhamento-da-familia.png',
    title: 'Preciso acompanhar<br>o tempo todo?',
    icon: 'family',
    group: 'community',
    breaks: ['ajuda.', 'própria.'],
    emphasis: ['fazendo mais por conta própria', 'não precisa saber programar'],
  },
  DU06: {
    file: '06-tempo-para-fazer-o-desafio.png',
    title: 'Precisa terminar<br>o Desafio em<br>três dias?',
    icon: 'calendar',
    group: 'challenge',
    breaks: ['pagamento.'],
    emphasis: ['30 dias de acesso', 'montar, jogar e ajustar'],
  },
  DU07: {
    file: '07-pagamento-unico-do-desafio.png',
    title: 'O Desafio é<br>uma assinatura?',
    icon: 'payment',
    group: 'challenge',
    breaks: ['continuar.', 'separadamente.'],
    emphasis: ['paga uma vez pelo Desafio', 'não há nova cobrança'],
  },
  DU08: {
    file: '08-o-que-o-desafio-inclui.png',
    title: 'O que está incluído<br>no Desafio?',
    icon: 'box',
    group: 'challenge',
    breaks: ['completo.', 'reagir.'],
    emphasis: ['A Chave do Farol', '30 dias de Mural completo'],
  },
  DU09: {
    file: '09-depois-dos-30-dias.png',
    title: 'O que muda depois<br>dos 30 dias<br>do Desafio?',
    icon: 'archive',
    group: 'challenge',
    breaks: ['guardado.', 'reagir.'],
    emphasis: ['o projeto fica guardado', 'ver e jogar no Mural'],
  },
  DU10: {
    file: '10-garantia-do-desafio.png',
    title: 'Como funciona<br>a garantia do Desafio?',
    icon: 'shield',
    group: 'challenge',
    breaks: ['termos.', 'acesso.'],
    emphasis: ['sete dias corridos a partir da compra', 'não amplia os 30 dias de acesso'],
  },
  DU11: {
    file: '11-cenario-e-desenhos-prontos.png',
    title: 'No Desafio, ele<br>precisa desenhar?',
    icon: 'brush',
    group: 'challenge',
    breaks: ['farol.'],
    emphasis: ['o cenário e os desenhos vêm prontos', 'personalizar o jogo'],
  },
  DU12: {
    file: '12-onde-o-jogo-e-criado.png',
    title: 'O Desafio ensina<br>Roblox ou Minecraft?',
    icon: 'blocks',
    group: 'challenge',
    breaks: ['aula.', 'fazer.'],
    emphasis: ['Estúdio do Sistema Zero', 'acompanhar, montar e testar no mesmo espaço'],
  },
  DU13: {
    file: '13-quem-pode-jogar.png',
    title: 'Quem pode abrir<br>o jogo publicado?',
    icon: 'share',
    group: 'community',
    breaks: ['teclado.', 'familiares.'],
    emphasis: ['Qualquer pessoa que receber o link', 'o link é público'],
  },
  DU14: {
    file: '14-perfil-e-link-publico.png',
    title: 'Esconder o perfil<br>torna o link privado?',
    icon: 'eye',
    group: 'community',
    breaks: ['visível.'],
    emphasis: ['você escolhe quando torná-lo visível', 'um link público separado'],
  },
  DU15: {
    file: '15-link-depois-do-curso.png',
    title: 'O link continua<br>depois do curso?',
    icon: 'link',
    group: 'community',
    breaks: ['disponível.'],
    emphasis: ['enquanto a publicação estiver disponível'],
  },
  DU16: {
    file: '16-continuar-na-comunidade.png',
    title: 'Como ele pode<br>continuar depois<br>do Desafio?',
    icon: 'steps',
    group: 'community',
    breaks: ['guardados.', 'atividades.'],
    emphasis: ['assinar a Comunidade', 'na mesma conta'],
  },
  DU17: {
    file: '17-comecar-pela-comunidade.png',
    title: 'Posso começar direto<br>pela Comunidade?',
    icon: 'door',
    group: 'community',
    breaks: ['cursos.'],
    emphasis: ['inclui o Desafio enquanto estiver ativa', 'usem a mesma conta'],
  },
  DU18: {
    file: '18-interesse-em-criar-jogos.png',
    title: 'Como saber se meu<br>filho tem interesse?',
    icon: 'game',
    group: 'challenge',
    breaks: ['assim.', 'farol.'],
    emphasis: ['Mostre A Chave do Farol', 'vontade de aprender'],
  },
}

const iconPaths = {
  people:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
  computer: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M2 13h20"/>',
  video: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 8 6 4-6 4Z"/>',
  message:
    '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3V5a3 3 0 0 1 3-3h8a8 8 0 0 1 8 9Z"/><path d="M7 7h8M7 11h8M7 15h4"/>',
  family:
    '<circle cx="8" cy="6" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M13 21v-2a4.5 4.5 0 0 1 9 0v2"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6M17 2v6M3 11h18m-14 6 3 3 6-6"/>',
  payment:
    '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h3m5 0 2 2 4-4"/>',
  box: '<path d="m12 2 10 5-10 5L2 7ZM2 7v11l10 5 10-5V7M12 12v11M7 4.5l10 5"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v13h16V8M9 12h6"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6ZM8 12l3 3 5-6"/>',
  brush:
    '<path d="m14 4 6-2 2 2-2 6-10 9-5-5Z"/><path d="m14 4 6 6M5 14c-5 0-2 6-4 8 4 0 8-1 9-3"/>',
  blocks:
    '<rect x="2" y="2" width="8" height="8" rx="1.5"/><rect x="14" y="2" width="8" height="8" rx="1.5"/><rect x="8" y="14" width="8" height="8" rx="1.5"/>',
  share:
    '<circle cx="18" cy="4" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="20" r="3"/><path d="m8.5 10.3 7-4.6m-7 8.6 7 4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  steps: '<path d="M2 22v-6h7v-6h7V4h6M16 4l6 0 0 6"/>',
  door: '<path d="M4 22V2h14v7M4 2l9 4v16H4M16 15h7m-3-3 3 3-3 3"/><path d="M9 12v2"/>',
  game: '<path d="M7 6h10c3 0 4 3 5 10s-3 7-6 2H8c-3 5-7 5-6-2S4 6 7 6Z"/><path d="M5 11h6M8 8v6M16 10h.01M19 13h.01"/>',
}
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`
const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const normalize = (text) => text.replaceAll('<br>', ' ').replace(/\s+/g, ' ').trim()

const stories = [
  ...section.matchAll(/^### (DU\d+) · (.+)\n([\s\S]*?)(?=^### DU|(?![\s\S]))/gm),
].map((match) => {
  const [_, id, title, rest] = match
  const config = layout[id]
  if (!config || normalize(config.title) !== title)
    throw new Error(`Título não corresponde ao roteiro: ${id}`)
  const copy = [...rest.matchAll(/^> (.+)$/gm)].map((m) => m[1]).join(' ')
  if (!copy) throw new Error(`Resposta ausente: ${id}`)
  let divided = copy
  for (const point of config.breaks) {
    if (!divided.includes(point + ' ')) throw new Error(`Quebra não encontrada: ${id}: ${point}`)
    divided = divided.replace(point + ' ', point + '\n')
  }
  const paragraphs = divided.split('\n')
  if (normalize(paragraphs.join(' ')) !== normalize(copy)) throw new Error(`Copy alterada: ${id}`)
  let body = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
  for (const phrase of config.emphasis) {
    if (!body.includes(escapeHtml(phrase)))
      throw new Error(`Ênfase não encontrada: ${id}: ${phrase}`)
    body = body.replace(escapeHtml(phrase), `<strong>${escapeHtml(phrase)}</strong>`)
  }
  const stickerMatch = rest.match(/\*\*Sticker:\*\* (.+?) → (L\d+), origem (du\d+)\./)
  let sticker
  if (stickerMatch) {
    const row = links.split(/\r?\n/).find((line) => line.startsWith(`| ${id} /`))
    const url = row?.match(/`(https:\/\/[^`]+)`/)?.[1]
    if (!url || !row.includes(stickerMatch[1])) throw new Error(`Link ausente ou divergente: ${id}`)
    const parsed = new URL(url)
    if (parsed.searchParams.get('utm_content') !== id.toLowerCase())
      throw new Error(`Origem incorreta: ${id}`)
    sticker = { label: stickerMatch[1], url, bounds: { x: 204, y: 1510, width: 672, height: 100 } }
  }
  return { id, title, copy, ...config, titleText: title, paragraphs, body, sticker }
})
if (stories.length !== 18 || stories.filter((s) => s.sticker).length !== 5)
  throw new Error('Seleção incompleta')

const css = `
*{box-sizing:border-box}html,body{margin:0;background:#e6ebf1;color:#0f1a33;font-family:'Segoe UI',Arial,sans-serif}
html{scrollbar-width:none}::-webkit-scrollbar{display:none}
.story{width:1080px;height:1920px;position:relative;overflow:hidden;background:linear-gradient(to bottom,#1b5cf3 0,#1b5cf3 1120px,#fff 1120px,#fff 100%);margin-bottom:20px}
.eyebrow{position:absolute;top:170px;left:72px;background:#ffc02e;border-radius:40px;padding:11px 30px 14px;font-size:27px;font-weight:750;line-height:1;letter-spacing:3px}
.title{position:absolute;top:271px;left:72px;right:64px;font-size:76px;line-height:1.08;letter-spacing:-2.7px;font-weight:750;color:#fff;margin:0}
.card{position:absolute;top:615px;left:52px;right:52px;height:1025px;background:#fff;border-radius:36px;box-shadow:0 15px 55px #0f1a3310}
.topic{position:absolute;left:68px;right:68px;top:52px;height:104px;display:flex;align-items:center;gap:30px}
.icon{display:flex;align-items:center;justify-content:center;width:104px;height:104px;flex:none;background:#fff2cf;border-radius:28px;color:#1b5cf3}
.icon svg{width:57px;height:57px}
.context{font-size:25px;letter-spacing:1px;line-height:1.3;font-weight:650;color:#1b5cf3}
.answer{position:absolute;left:68px;right:68px;top:206px;font-size:48px;line-height:1.30;letter-spacing:-.5px}
.answer p{margin:0 0 26px}.answer p:last-child{margin-bottom:0}.answer strong{font-weight:650;color:#1b5cf3}
.link-slot{position:absolute;left:204px;top:1510px;width:672px;height:100px;border-radius:50px;background:#ffc02e;display:flex;align-items:center;justify-content:center;gap:16px;color:#0f1a33;font-size:33px;font-weight:700;line-height:1}
.link-slot svg{width:32px;height:32px;flex:none;stroke-width:2.2}
.footer{position:absolute;top:1690px;left:72px;right:72px;text-align:center;color:#23344f;font-size:23px;letter-spacing:1px}
.footer:before{content:'';display:block;height:7px;width:96px;border-radius:8px;background:#ffc02e;margin:0 auto 29px}
`

const markup = stories
  .map(
    (s) =>
      `<article class="story ${s.id}${s.sticker ? ' with-link' : ''}" id="${s.id}"><span class="eyebrow">DÚVIDAS</span><h1 class="title">${s.title}</h1><div class="card"><div class="topic"><div class="icon">${icon(s.icon)}</div><div class="context">${s.group === 'community' ? 'COMUNIDADE DOS CRIADORES' : 'DESAFIO DO PRIMEIRO JOGO'}</div></div><div class="answer">${s.body}</div></div>${s.sticker ? `<div class="link-slot">${icon('link')}${s.sticker.label}</div>` : ''}<div class="footer">Helena e Júlio · Comunidade dos Criadores</div></article>`,
  )
  .join('\n')
const manifest = {
  format: '1080x1920 PNG',
  source: sourceFile,
  linksSource: linksFile,
  finalDirectory,
  stories: stories.map(({ id, file, titleText, copy, paragraphs, sticker }) => ({
    id,
    file,
    title: titleText,
    copy,
    paragraphs,
    sticker,
  })),
}
fs.writeFileSync(
  path.join(work, 'montagem.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>Dúvidas · Stories</title><style>${css}</style><body>${markup}<script id="story-data" type="application/json">${JSON.stringify(manifest)}</script></body></html>`,
)
fs.writeFileSync(path.join(work, 'manifesto.json'), JSON.stringify(manifest, null, 2))
const publishing = `DÚVIDAS · 18 stories de 1080 × 1920\n\nAs imagens seguem a ordem do roteiro. Os quatro blocos do calendário são: 01–06, 07–10, 11–15 e 16–18.\n\nAo publicar as imagens 07, 10, 16, 17 e 18, adicione um sticker de link do Instagram sobre a área amarela. O botão desenhado no PNG é uma referência de posição; é necessário adicionar o sticker para receber cliques.\n\n${stories
  .filter((s) => s.sticker)
  .map(
    (s) => `${s.id} · ${s.file}\nTexto do sticker: ${s.sticker.label}\nDestino: ${s.sticker.url}`,
  )
  .join('\n\n')}\n\nSalvar no destaque Dúvidas.\n`
fs.writeFileSync(path.join(work, 'publicacao.txt'), publishing)
console.log(
  JSON.stringify({
    html: path.join(work, 'montagem.html'),
    stories: stories.length,
    stickers: stories.filter((s) => s.sticker).length,
    finalDirectory,
  }),
)
