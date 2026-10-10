import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const work = path.join(root, 'output/instagram/quem-somos/2026-10-09')
const final = path.join(
  root,
  'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/quem-somos',
)
fs.mkdirSync(final, { recursive: true })
const refs = 'C:/Users/tocha/Downloads/FotosHelenaJulio'
const data = (file) =>
  `data:image/${path.extname(file).slice(1).replace('jpg', 'jpeg')};base64,${fs.readFileSync(file).toString('base64')}`
const photos = {
  couple: data(path.join(refs, 'casal.png')),
  family: data(path.join(refs, 'WhatsApp Image 2026-10-04 at 17.52.32.jpeg')),
  selfie: data(path.join(refs, 'WhatsApp Image 2026-10-09 at 08.36.33.jpeg')),
  helena: data(path.join(refs, 'WhatsApp Image 2026-10-04 at 17.54.33.jpeg')),
  julio: data(path.join(refs, 'WhatsApp Image 2026-10-04 at 17.54.34.jpeg')),
  school: data(path.join(refs, 'WhatsApp Image 2026-10-09 at 08.45.20.jpeg')),
  medals: data(path.join(refs, 'medalhasAndre.png')),
  studio: data(
    path.join(root, 'packages/funnel/public/img/desafio-primeiro-jogo/plataforma-estudio.webp'),
  ),
}
const stories = [
  {
    id: 'SN01',
    file: '01-helena-e-julio.png',
    title: 'Helena e Júlio',
    photo: 'couple',
    paragraphs: [
      'Somos Helena e Júlio, pais do André e da Débora.',
      'Nós dois somos formados em <strong>Sistemas de Informação</strong> e trabalhamos com programação.',
    ],
  },
  {
    id: 'SN02',
    file: '02-tempo-para-criar.png',
    title: 'Uma parte do tempo<br>para criar',
    photo: 'family',
    paragraphs: [
      'O André sempre gostou muito de jogar e de assistir a vídeos de jogos.',
      'A gente decidiu aproveitar esse interesse: passamos a usar uma parte do tempo que ele já ficava na tela para ensiná-lo a criar seus próprios jogos.',
    ],
  },
  {
    id: 'SN03',
    file: '03-interesse-por-aprender.png',
    title: 'Aprender fazendo<br>os próprios jogos',
    photo: 'selfie',
    paragraphs: [
      'Para fazer um jogo funcionar, é preciso <strong>pensar no que vem primeiro, testar e ajustar</strong> quando algo dá errado.',
      'Foi nesse processo que vimos o André se interessar cada vez mais por aprender. Depois, chamava a gente para jogar e contava como tinha feito.',
    ],
  },
  {
    id: 'SN04',
    file: '04-mudancas-na-escola.png',
    title: 'O que percebemos<br>no André',
    photo: 'school',
    paragraphs: [
      'Nesse período, a gente também percebeu mudanças na escola. O André passou a se envolver mais nas aulas e a se concentrar melhor. As notas também melhoraram.',
      'Desde o segundo ano do ensino fundamental, ele tem ficado entre os cinco primeiros da turma e, na maioria das vezes, em primeiro lugar.',
      'Esse reconhecimento é de uma dessas conquistas.',
    ],
  },
  {
    id: 'SN05',
    file: '05-medalhas-do-andre.png',
    title: 'André, nosso filho.',
    photo: 'medals',
    paragraphs: ['Ele também conquistou medalhas em olimpíadas de matemática.'],
  },
  {
    id: 'SN06',
    file: '06-origem-da-comunidade.png',
    title: 'Da nossa casa<br>para outras famílias',
    photo: 'couple',
    paragraphs: [
      'Essa experiência nos deu vontade de ajudar outras famílias a aproveitar uma parte do tempo de tela para aprender criando.',
      'Foi assim que nasceu a <strong>Comunidade dos Criadores.</strong>',
    ],
  },
  {
    id: 'SN07',
    file: '07-aulas-que-preparamos.png',
    title: 'As aulas<br>que a gente<br>prepara',
    photo: 'couple',
    paragraphs: [
      'Hoje, somos nós que preparamos as aulas, usando o que sabemos de programação para ensinar as crianças a fazer seus jogos.',
      '<strong>No destaque Como funciona, você conhece melhor esse trabalho.</strong>',
    ],
  },
]
const css = `
*{box-sizing:border-box}html,body{margin:0;background:#e6ebf1;color:#0f1a33;font-family:'Segoe UI',Arial,sans-serif}body{padding:0}.story{width:1080px;height:1920px;position:relative;overflow:hidden;background:linear-gradient(to bottom,#1b5cf3 0px,#1b5cf3 var(--blue-end,1040px),#fff var(--blue-end,1040px),#fff 100%);margin:0 0 20px}.eyebrow{position:absolute;top:170px;left:72px;background:#ffc02e;border-radius:40px;padding:11px 30px 14px;font-size:27px;font-weight:750;line-height:1;letter-spacing:3px;color:#0f1a33}.title{position:absolute;top:256px;left:72px;right:60px;font-size:76px;line-height:1.075;letter-spacing:-2.7px;font-weight:750;color:white;margin:0}.photo{position:absolute;left:52px;width:976px;top:405px;height:630px;border-radius:34px;overflow:hidden;background:#eaf0fa}.photo>img{width:100%;height:100%;object-fit:cover;display:block}.body{position:absolute;left:78px;right:78px;top:1100px;font-size:42px;line-height:1.35;letter-spacing:-.5px}.body p{margin:0 0 31px}.body strong{font-weight:700}.footer{position:absolute;top:1690px;left:72px;right:72px;text-align:center;color:#23344f;font-size:23px;letter-spacing:1px}.footer:before{content:'';display:block;height:7px;width:96px;border-radius:8px;background:#ffc02e;margin:0 auto 29px}.SN01 .photo{top:395px;height:665px}.SN01 .photo>img{object-position:50% 46%}.SN01 .body{top:1120px;font-size:44px}.SN02{--blue-end:965px}.SN02 .photo{top:467px;height:549px}.SN02 .body{top:1080px;font-size:41px}.SN03{--blue-end:940px}.SN03 .photo{top:467px;height:550px}.SN03 .photo>img{object-position:50% 54%}.SN03 .body{top:1070px;font-size:40px}.SN04{--blue-end:935px}.SN04 .photo{top:465px;height:650px}.SN04 .photo>img{height:auto;position:absolute;left:0;top:-471px;width:976px}.SN04 .body{top:1160px;font-size:36px;line-height:1.32;letter-spacing:-.25px}.SN04 .body p{margin-bottom:22px}.SN05{--blue-end:1290px}.SN05 .photo{top:390px;width:732px;height:995px;left:174px;border-radius:30px;background:#1b5cf3}.SN05 .photo>img{width:4147.2px;height:2332.8px;max-width:none;position:absolute;left:-1509.84px;top:-1067.04px;transform-origin:1509.84px 1067.04px;transform:rotate(-5deg);object-fit:fill}.SN05 .body{top:1435px;font-size:48px;line-height:1.28}.SN06{--blue-end:0px}.SN06 .title{color:#1b5cf3}.SN06 .photo{top:465px;height:675px}.SN06 .photo>img{object-position:50% 42%}.SN06 .body{top:1205px;font-size:40px}.SN07{--blue-end:1080px}.SN07 .title{top:265px;font-size:68px;line-height:1.075;right:510px}.SN07 .photo{top:270px;left:583px;width:425px;height:340px;border-radius:28px}.SN07 .photo>img{object-position:50% 38%}.studio{position:absolute;top:660px;left:52px;width:976px;height:623px;overflow:hidden;border-radius:28px;box-shadow:0 12px 26px #0f1a3322;background:white}.studio img{position:absolute;left:-22.5px;top:-146px;width:1021px;height:auto}.studio-label{position:absolute;left:72px;top:1305px;background:#e7edff;border-radius:24px;padding:8px 22px 12px;font-size:25px;font-weight:700;line-height:1}.SN07 .body{top:1380px;font-size:37px;line-height:1.28}.SN07 .body p{margin-bottom:25px}.SN07 .body p:last-child{color:#1b5cf3;font-size:38px}.SN07 .footer{top:1712px}
html{scrollbar-width:none}::-webkit-scrollbar{display:none}.SN01 .photo>img{object-position:50% 20%}.SN06 .photo>img{object-position:50% 15%}.SN04 .body{font-size:39px}.SN05 .photo{left:190px;width:700px;height:940px}.SN05 .photo>img{left:-1523.84px}.SN05 .body{top:1395px}.SN07 .studio{top:630px}.SN07 .studio-label{top:1275px}.SN07 .body{top:1350px}.SN07 .footer{top:1690px}
.SN03 .photo{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:transparent}.SN03 .photo>img{width:100%;height:550px;object-fit:cover;object-position:50% 25%;border-radius:28px}
`
const markup = stories
  .map(
    (s) =>
      `<article class="story ${s.id}" id="${s.id}"><span class="eyebrow">QUEM SOMOS</span><h1 class="title">${s.title}</h1><div class="photo">${s.id === 'SN03' ? `<img src="${photos.helena}" alt="Helena" /><img src="${photos.julio}" alt="Júlio" />` : `<img src="${photos[s.photo]}" alt="${s.photo}" />`}</div>${s.id === 'SN07' ? `<div class="studio"><img src="${photos.studio}" alt="Print original do Estúdio" /></div><div class="studio-label">Demonstração da equipe</div>` : ''}<div class="body">${s.paragraphs.map((p) => `<p>${p}</p>`).join('')}</div><div class="footer">Helena e Júlio · Comunidade dos Criadores</div></article>`,
  )
  .join('\n')
fs.writeFileSync(
  path.join(work, 'montagem.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>Quem somos</title><style>${css}</style><body>${markup}</body></html>`,
)
fs.writeFileSync(
  path.join(work, 'manifesto.json'),
  JSON.stringify(
    {
      format: '1080x1920 PNG',
      finalDirectory: final,
      stories: stories.map(({ id, file, title, paragraphs }) => ({
        id,
        file,
        title: title.replaceAll('<br>', ' '),
        copy: paragraphs.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n'),
      })),
    },
    null,
    2,
  ),
)
console.log(
  JSON.stringify({
    html: path.join(work, 'montagem.html'),
    finalDirectory: final,
    stories: stories.length,
  }),
)
