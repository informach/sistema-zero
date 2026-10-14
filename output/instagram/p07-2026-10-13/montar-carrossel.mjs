import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const out=path.join(base,'producao/postagens/p07-primeira-dificuldade')
const raw=fs.readFileSync(path.join(base,'postagens/01-p01-a-p10.md'),'utf8').replace(/\r\n/g,'\n')
const source=raw.split('<a id="p07"></a>')[1].split('<a id="p08"></a>')[0]
const quote=s=>s.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'')).join('\n').trim()
const slides=source.split(/### Slide \d\n/).slice(1).map(b=>quote(b.split('### Legenda completa')[0]))
if(slides.length!==7)throw Error('P07 deve ter sete slides')
const p=slides.map(s=>s.split(/\n\s*\n/))
const caption=quote(source.split('### Legenda completa')[1].split('**Nota interna')[0])
const captures=JSON.parse(fs.readFileSync(path.join(out,'apoio/captura-real.json'),'utf8'))
if(!captures.passed)throw Error('Capturas não verificadas')
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const copy=(text,cls,tag='p')=>`<${tag} class="copy ${cls}">${esc(text)}</${tag}>`
const picture=file=>`<img src="apoio/${file}" alt="">`
const scene=file=>`<figure class="scene">${picture(file)}</figure>`
const footer=n=>`<header><span>HELENA E JÚLIO</span><span>${String(n).padStart(2,'0')} / 07</span></header><footer><span>@criecomhelenaejulio</span><span>Comunidade dos Criadores</span></footer><div class="progress" style="width:${n*100/7}%"></div>`
function game(variant,cls=''){
 const state=captures.captures.find(c=>c.variant===variant)
 const points=state.trace.slice(0,-5).map(pt=>`${(pt.x+18).toFixed(2)} ${(pt.y+18).toFixed(2)}`)
 return `<figure class="game ${cls}">${picture('jogo-'+variant+'.png')}<svg class="trace" viewBox="0 0 320 200" aria-hidden="true"><path d="M82 146 L${points.join(' L')}" fill="none" stroke="#194bd7" stroke-width="2.4" stroke-dasharray="4.5 3.5" stroke-linecap="round" opacity=".72"/><circle cx="82" cy="146" r="4" fill="#ffdb56" stroke="#194bd7" stroke-width="1.8"/></svg></figure>`
}
const split=(s,separator)=>{const pos=s.indexOf(separator);if(pos<0)throw Error('Trecho não encontrado: '+separator);return[s.slice(0,pos),s.slice(pos)]}
const third=split(p[2][0],'Uma dificuldade')
const fourth=split(p[3][0],'Se o personagem')
const sixth=split(p[5][0],'Incentivar')
const seventh=split(p[6][0],'Siga o perfil')
const articles=[
 `<article id="s1" class="cover">${footer(1)}<h1 class="copy title">A vontade de desistir<br>apareceu junto com a<br><em>primeira dificuldade.</em></h1>${scene('01-dificuldade.png')}</article>`,
 `<article id="s2" class="possibilities">${footer(2)}${copy(p[1][0],'title','h2')}${scene('02-possibilidades.png')}${copy(p[1][1],'question left')}${copy(p[1][2],'question right')}</article>`,
 `<article id="s3" class="show">${footer(3)}${copy(third[0],'title','h2')}${scene('03-mostrar.png')}${copy(third[1],'ending')}</article>`,
 `<article id="s4" class="investigate">${footer(4)}${copy(fourth[0],'title','h2')}${copy(fourth[1],'lead')}${game('antes','large')}${copy(p[3][1],'ending')}</article>`,
 `<article id="s5" class="compare">${footer(5)}${copy(p[4][0],'title','h2')}${copy(p[4][1],'label left')}${copy(p[4][2],'label right')}${game('antes','left')}${game('depois','right selected')}${copy(p[4][3],'reason')}${copy(p[4][4],'ending')}</article>`,
 `<article id="s6" class="listen">${footer(6)}${copy(sixth[0],'title','h2')}${scene('06-escutar.png')}${copy(sixth[1],'ending')}</article>`,
 `<article id="s7" class="follow-card">${footer(7)}<h2 class="copy title">Aqui, a gente ensina<br>crianças a criar<br><em>os próprios jogos.</em></h2>${scene('03-mostrar.png')}${copy(seventh[1],'invitation')}</article>`
]
const css=`
@font-face{font-family:Nunito;src:url(apoio/nunito-800.woff2);font-weight:800;font-display:block}
@font-face{font-family:Nunito;src:url(apoio/nunito-600.woff2);font-weight:600;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#e8edf6;font-family:Nunito,Arial,sans-serif;color:#172a46}
article{position:relative;width:1080px;height:1350px;overflow:hidden;background:#fffcf4;margin:0 0 24px}h1,h2,p,figure{margin:0}h1,h2{font-weight:800;letter-spacing:-1.3px}header{position:absolute;left:64px;right:64px;top:47px;display:flex;justify-content:space-between;font-size:23px;font-weight:800;letter-spacing:1.5px}header>span:first-child:before{content:'';display:inline-block;width:12px;height:12px;background:#ffcf42;border-radius:50%;margin:0 12px 1px 0}header>span:last-child{letter-spacing:0;font-size:25px}footer{position:absolute;left:64px;right:64px;bottom:39px;display:flex;justify-content:space-between;font-size:24px;line-height:1.25;font-weight:800}footer>span:last-child{font-weight:600;font-size:23px}.progress{position:absolute;bottom:0;left:0;height:10px;background:#ffcd38}.copy{position:absolute;left:64px;right:64px}.title{top:137px;font-size:56px;line-height:1.18}.scene{position:absolute;left:64px;right:64px;overflow:hidden;border-radius:24px}.scene img{width:100%;height:100%;object-fit:cover;display:block}.cover,.follow-card{background:#194bd7;color:#fff}em{font-style:normal;color:#ffdb56}.cover .title{font-size:82px;line-height:1.12;letter-spacing:-1.6px}.cover .scene{top:455px;height:783px;border:3px solid #ffffffad}.cover .scene img{object-position:43% center}.possibilities .title{font-size:59px;color:#194bd7;max-width:930px}.possibilities .scene{top:369px;height:635px}.question{top:1060px;font-size:43px;line-height:1.18;font-weight:800;color:#194bd7}.question.left{left:64px;right:568px}.question.right{left:568px;right:64px}.show .title{font-size:74px;color:#194bd7;max-width:920px;line-height:1.12}.show .scene{top:354px;height:655px}.show .ending{top:1063px;font-size:48px;line-height:1.2;font-weight:800}.game{position:absolute;overflow:hidden;background:#e8f3fc;border-radius:22px}.game img{width:100%;height:100%;display:block}.trace{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.investigate .title{font-size:60px;color:#194bd7;max-width:930px}.investigate .lead{top:317px;font-size:43px;line-height:1.25;font-weight:600}.investigate .game{left:64px;top:505px;width:952px;height:595px}.investigate .ending{top:1146px;font-size:51px;line-height:1.2;font-weight:800;color:#194bd7}.compare .title{font-size:60px;line-height:1.19;max-width:930px}.label{top:462px;font-size:36px;font-weight:800;color:#194bd7;text-align:center;line-height:1.25}.left{left:64px;right:568px}.right{left:568px;right:64px}.compare .game{top:554px;width:448px;height:280px}.compare .selected{outline:7px solid #ffcc38;outline-offset:7px}.compare .reason{top:910px;background:#eaf0ff;color:#194bd7;border-radius:20px;padding:24px 30px;font-size:46px;font-weight:800;line-height:1.2}.compare .ending{top:1133px;font-size:45px;line-height:1.2;font-weight:800;max-width:870px}.listen .title{font-size:55px;line-height:1.18}.listen .scene{top:436px;height:624px}.listen .ending{top:1112px;font-size:50px;line-height:1.19;font-weight:800;color:#194bd7;max-width:930px}.follow-card .title{font-size:75px;line-height:1.13;max-width:940px}.follow-card .scene{top:465px;height:610px;border:3px solid #ffffffad}.follow-card .invitation{top:1120px;padding:23px 26px;background:#ffdb56;color:#173fb0;border-radius:20px;font-size:43px;line-height:1.16;font-weight:800;text-align:center}
`
fs.writeFileSync(path.join(out,'montagem.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>P07 · A primeira dificuldade</title><style>${css}</style><body>${articles.join('')}</body></html>`)
const visuals=[
 'Fundo azul e título branco, com primeira dificuldade em amarelo. Ilustração de uma menina de cerca de 11 anos, pele morena, cabelo cacheado preso e camiseta amarela, sentada diante de um computador. Apoia o queixo na mão e deixa a outra mão afastada do mouse, com expressão desanimada. Personagem fictícia.',
 'Duas cenas ilustradas da mesma menina. À esquerda, está com uma bola de basquete e uma bolsa no ombro, olhando para a saída. À direita, continua no computador e olha para a tela com dúvida. As perguntas abaixo de cada metade distinguem mudança de interesse de uma dificuldade numa etapa.',
 'A menina aponta para a tela enquanto o pai, de óculos e camisa azul, escuta sentado ao lado. Ela mantém a outra mão no mouse; ele não assume a atividade. Pai e filha são personagens fictícios.',
 'Captura real de uma adaptação de Mini plataforma, exemplo do Estúdio. O personagem azul saltou de uma plataforma verde à esquerda e está caindo antes de alcançar uma plataforma à direita. Um rastro tracejado azul, sobreposto a partir das posições registradas, mostra o caminho do salto. O ponto amarelo indica de onde ele saiu.',
 'Duas capturas reais mostram o mesmo salto no mesmo passo da simulação. À esquerda, a plataforma de destino está mais longe e o personagem cai antes de alcançá-la. À direita, a plataforma foi aproximada e o personagem está apoiado sobre ela. A imagem da direita tem contorno amarelo. Os rastros tracejados são anotações gráficas das posições registradas. Apenas a posição da plataforma mudou.',
 'Ilustração dos mesmos pai e filha sentados em poltronas separadas numa sala. A menina explica algo com as mãos, e o pai presta atenção. Uma bola de basquete está no chão perto dela. A cena mostra a conversa sobre o motivo de querer parar; não há computador ou prêmio.',
 'Fundo azul, texto branco com destaque amarelo e ilustração da menina mostrando ao pai a etapa no computador. O convite para seguir o perfil aparece em uma faixa amarela. É um slide adicional, depois da conclusão do conteúdo.'
]
fs.writeFileSync(path.join(out,'legenda.txt'),caption+'\n')
fs.writeFileSync(path.join(out,'texto-alternativo.txt'),slides.map((s,i)=>`SLIDE ${i+1}\n${visuals[i]}\nTexto da arte: ${s.replace(/\n/g,' ')}\nIdentificação: Helena e Júlio · @criecomhelenaejulio · Comunidade dos Criadores. ${i+1} de 7.`).join('\n\n')+'\n')
fs.writeFileSync(path.join(out,'apoio/copy-publica.txt'),slides.join('\n\n')+'\n\n'+caption+'\n')
fs.writeFileSync(path.join(out,'publicacao.txt'),[
 'P07 · A vontade de desistir apareceu junto com a primeira dificuldade.',
 'Produzido em 13/10/2026. Terceiro carrossel na ordem do calendário, depois de P01 e P34. Segunda publicação da semana 2. A ordem geral inclui outros formatos ainda a produzir.',
 'Sete PNGs 1080 × 1350, proporção 4:5. Publicar 01-p07.png a 07-p07.png, nessa ordem. previa.png é apenas para conferência.',
 'Os seis primeiros slides desenvolvem e concluem a ideia. O sétimo acrescenta o convite para seguir o perfil. Sem ManyChat neste post.',
 'Quatro ilustrações produzidas com o image_gen incorporado; a cena do slide 3 também aparece no slide 7. Pai e filha são fictícios. Não representam alunos, depoentes ou fundadores.',
 'Demonstração real de Mini plataforma, adaptada pela equipe com duas plataformas e o personagem da biblioteca oficial. Duas capturas usam as mesmas teclas, o mesmo salto e 38 passos de física. Só a plataforma de destino passa de x=240 para x=180. No primeiro caso o personagem cai; no segundo pousa. Não é uma entrega de aluno.',
 'Rastros tracejados são anotações gráficas acrescentadas à composição a partir das posições medidas, não um recurso da interface do jogo.',
 'Arquivos de projeto, medições, fontes, prompts, legenda, texto alternativo e montagem editável acompanham a entrega. Não agendado nem publicado.',
 ''
].join('\n'))
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1})
 await page.goto(pathToFileURL(path.join(out,'montagem.html')).href)
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))})
 const checks=await page.evaluate(()=>[...document.querySelectorAll('article')].map(a=>{
  const rect=a.getBoundingClientRect(),footer=a.querySelector('footer').getBoundingClientRect()
  const content=[...a.querySelectorAll('.copy,figure')].map(e=>{let r=e.getBoundingClientRect();const isCopy=e.classList.contains('copy');if(isCopy){const range=document.createRange();range.selectNodeContents(e);const ink=range.getBoundingClientRect();r={top:Math.min(r.top,ink.top),bottom:Math.max(r.bottom,ink.bottom),left:Math.min(r.left,ink.left),right:Math.max(r.right,ink.right)}}return{kind:e.className,isCopy,top:Math.round(r.top-rect.top),bottom:Math.round(r.bottom-rect.top),left:Math.round(r.left-rect.left),right:Math.round(r.right-rect.left),overflow:e.scrollWidth>e.clientWidth+2}})
  const overlaps=[];content.forEach((x,i)=>content.slice(i+1).forEach(y=>{if((x.isCopy||y.isCopy)&&Math.min(x.right,y.right)>Math.max(x.left,y.left)&&Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top))overlaps.push([x.kind,y.kind])}))
  return{id:a.id,dimensions:[rect.width,rect.height],copy:[...a.querySelectorAll('.copy')].map(e=>e.innerText.trim()).join(' '),content,overlaps,passed:!overlaps.length&&content.every(e=>!e.overflow&&e.top>100&&e.bottom<footer.top-rect.top-10&&e.left>=24&&e.right<=1056)}
 }))
 const norm=s=>s.replace(/\s+/g,' ').trim()
 checks.forEach((c,i)=>{c.copyMatches=norm(c.copy)===norm(slides[i]);c.passed&&=c.copyMatches})
 for(let i=1;i<=7;i++)await page.locator('#s'+i).screenshot({path:path.join(out,`0${i}-p07.png`)})
 const gallery=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P07 · A primeira dificuldade</title><style>body{background:#e8edf6;color:#142845;font:16px Arial;margin:32px}h1{font-size:26px;max-width:1050px;margin-bottom:12px}p{line-height:1.6}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:1100px}figure{margin:0}img{width:100%;display:block;border-radius:8px;box-shadow:0 4px 18px #14284520}figcaption{font-size:14px;margin:10px 0 8px}a{color:#184cd7}.details{max-width:1080px;padding:16px 0}@media(max-width:720px){body{margin:18px}main{grid-template-columns:1fr}}</style><h1>A vontade de desistir apareceu junto com a primeira dificuldade.</h1><p>P07 · 7 slides · 1080 × 1350 · 4:5 · <a href="legenda.txt">Legenda</a> · <a href="texto-alternativo.txt">Texto alternativo</a></p><main>${slides.map((s,i)=>`<figure><a href="0${i+1}-p07.png"><img src="0${i+1}-p07.png" alt="${esc(visuals[i])}"></a><figcaption>0${i+1} / 07</figcaption></figure>`).join('')}</main><p class="details">Ilustrações de uma família fictícia e capturas reais de Mini plataforma, adaptado pela equipe. Convite para seguir o perfil no slide 7. Nada foi agendado ou publicado.</p></html>`
 fs.writeFileSync(path.join(out,'index.html'),gallery)
 await page.setViewportSize({width:1180,height:1260})
 await page.goto(pathToFileURL(path.join(out,'index.html')).href)
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()))})
 await page.screenshot({path:path.join(out,'previa.png'),fullPage:true})
 fs.writeFileSync(path.join(out,'apoio/verificacao-layout.json'),JSON.stringify(checks,null,2)+'\n')
 console.log(JSON.stringify(checks));if(checks.some(c=>!c.passed))process.exitCode=1
}finally{await browser.close()}
