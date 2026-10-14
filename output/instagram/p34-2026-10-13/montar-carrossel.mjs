import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const out=path.join(base,'producao/postagens/p34-a-ideia-veio-dele')
const raw=fs.readFileSync(path.join(base,'postagens/09-p31-a-p40.md'),'utf8').replace(/\r\n/g,'\n')
const source=raw.split('<a id="p34"></a>')[1].split('<a id="p35"></a>')[0]
const quote=s=>s.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'')).join('\n').trim()
const slides=source.split(/### Slide \d\n/).slice(1).map(b=>quote(b.split('### Legenda completa')[0]))
if(slides.length!==6)throw Error('P34 deve ter seis slides')
const p=slides.map(s=>s.split(/\n\s*\n/))
const caption=quote(source.split('### Legenda completa')[1].split('**Nota interna')[0])
const captures=JSON.parse(fs.readFileSync(path.join(out,'apoio/captura-real.json'),'utf8'))
if(!captures.passed)throw Error('Capturas ainda não verificadas')
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const copy=(text,cls,tag='p')=>`<${tag} class="copy ${cls}">${esc(text)}</${tag}>`
const picture=(file,cls='')=>`<img class="${cls}" src="apoio/${file}" alt="">`
const footer=n=>`<header><span>HELENA E JÚLIO</span><span>${String(n).padStart(2,'0')} / 06</span></header><footer><span>@criecomhelenaejulio</span><span>Comunidade dos Criadores</span></footer><div class="progress" style="width:${n*100/6}%"></div>`
const scene=file=>`<figure class="scene">${picture(file)}</figure>`
function game(variant,cls=''){
 const state=captures.captures.find(c=>c.variant===variant)
 const x=state.x+8,y=state.y+8
 return `<figure class="game ${cls}">${picture('jogo-'+variant+'.png')}<svg class="trace" viewBox="0 0 800 600" aria-hidden="true"><path d="M400 308 L${x} ${y}" fill="none" stroke="#ffdb56" stroke-width="6" stroke-dasharray="9 7"/><circle cx="400" cy="308" r="10" fill="#0b1020" stroke="white" stroke-width="3"/><circle cx="${x}" cy="${y}" r="22" fill="none" stroke="#ffdb56" stroke-width="4"/></svg></figure>`
}
const zoom=`<div class="zoom" aria-hidden="true"><svg viewBox="0 0 952 120"><path d="M25 60 H435 M529 60 H734" stroke="#194bd7" stroke-width="6" stroke-dasharray="14 9"/><circle cx="25" cy="60" r="10" fill="white" stroke="#194bd7" stroke-width="3"/><circle cx="529" cy="60" r="10" fill="white" stroke="#194bd7" stroke-width="3"/><circle cx="435" cy="60" r="12" fill="#ffca33"/><circle cx="734" cy="60" r="12" fill="#ffca33"/></svg></div>`
const title1=p[0][0].split(' A ideia veio dele.')
const title3=p[2][0].split(': ')
const title6=p[5][0].split(' Siga o perfil')
const articles=[
 `<article id="s1" class="cover">${footer(1)}${copy(title1[0],'quote','h1')}${copy('A ideia veio dele.','headline')}${scene('daniel-12s.png')}${copy(p[0][1],'attribution')}</article>`,
 `<article id="s2" class="story">${footer(2)}${copy(p[1][0],'title','h2')}${scene('daniel-45s.png')}<figure class="rafael">${picture('rafael.webp')}</figure>${copy(p[1][1],'rafael-label')}${copy(p[1][2],'ending')}</article>`,
 `<article id="s3" class="idea">${footer(3)}${copy(title3[0]+':','title','h2')}${copy(title3[1],'lead')}${scene('03-ideia.png')}${copy(p[2][1],'ending')}</article>`,
 `<article id="s4" class="compare">${footer(4)}${copy(p[3][0],'title','h2')}${copy(p[3][1],'label left')}${copy(p[3][2],'label right')}${game('original','left')}${game('mais-devagar','right')}${copy(p[3][3],'explain')}${zoom}${copy(p[3][4],'ending')}</article>`,
 `<article id="s5" class="choose">${footer(5)}${copy(p[4][0],'title','h2')}${copy(p[4][1],'label left')}${copy(p[4][2],'label right')}${game('original','left')}${game('mais-devagar','right selected')}${copy(p[4][3],'reason')}${copy(p[4][4],'ending')}</article>`,
 `<article id="s6" class="follow-card">${footer(6)}<h2 class="copy title">Aqui, a gente ensina<br>crianças a criar<br><em>os próprios jogos.</em></h2>${scene('03-ideia.png')}${copy('Siga o perfil'+title6[1],'invitation')}</article>`
]
const css=`
@font-face{font-family:Nunito;src:url(apoio/nunito-800.woff2);font-weight:800;font-display:block}
@font-face{font-family:Nunito;src:url(apoio/nunito-600.woff2);font-weight:600;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#e8edf6;font-family:Nunito,Arial,sans-serif;color:#172a46}
article{position:relative;width:1080px;height:1350px;overflow:hidden;background:#fffcf4;margin:0 0 24px}h1,h2,p,figure{margin:0}h1,h2{font-weight:800;letter-spacing:-1.3px}header{position:absolute;left:64px;right:64px;top:47px;display:flex;justify-content:space-between;font-size:23px;font-weight:800;letter-spacing:1.5px}header>span:first-child:before{content:'';display:inline-block;width:12px;height:12px;background:#ffcf42;border-radius:50%;margin:0 12px 1px 0}header>span:last-child{letter-spacing:0;font-size:25px}footer{position:absolute;left:64px;right:64px;bottom:39px;display:flex;justify-content:space-between;font-size:24px;line-height:1.25;font-weight:800}footer>span:last-child{font-weight:600;font-size:23px}.progress{position:absolute;bottom:0;left:0;height:10px;background:#ffcd38}.copy{position:absolute;left:64px;right:64px}.title{top:137px;font-size:54px;line-height:1.18}.scene{position:absolute;left:64px;right:64px;overflow:hidden;border-radius:24px}.scene img{width:100%;height:100%;object-fit:cover;display:block}.cover,.follow-card{background:#194bd7;color:#fff}.cover .quote{top:137px;font-size:79px;line-height:1.1;letter-spacing:-1.5px;max-width:925px}.cover .headline{top:425px;font-size:67px;font-weight:800;color:#ffdb56;letter-spacing:-1.3px}.cover .scene{top:544px;height:545px;border:3px solid #ffffffad}.cover .scene img{object-position:70% 50%}.cover .attribution{top:1127px;font-size:37px;line-height:1.28;font-weight:600;max-width:870px}.story .title{font-size:59px;line-height:1.17;color:#194bd7}.story .scene{top:420px;height:540px}.story .scene img{object-position:60% center}.rafael{position:absolute;left:748px;top:808px;width:232px;height:232px;border:8px solid #fffcf4;border-radius:50%;overflow:hidden;box-shadow:0 10px 30px #10204030}.rafael img{width:100%;height:100%;object-fit:cover}.story .rafael-label{top:1052px;left:715px;right:64px;text-align:center;font-size:29px;font-weight:800;color:#194bd7;line-height:1.2}.story .ending{top:1110px;font-size:46px;line-height:1.19;font-weight:800}.idea .title{font-size:55px;color:#194bd7;max-width:890px}.idea .lead{top:290px;font-size:41px;line-height:1.26}.idea .scene{top:440px;height:635px;left:32px;right:32px}.idea .ending{top:1121px;font-size:44px;line-height:1.2;font-weight:800;color:#194bd7}.compare .title{font-size:51px;line-height:1.19}.label{top:437px;font-size:33px;font-weight:800;color:#194bd7;text-align:center;line-height:1.25}.label.left{left:64px;right:568px}.label.right{left:568px;right:64px}.game{position:absolute;top:506px;width:448px;height:336px;border-radius:16px;overflow:hidden;background:#0b1020}.game.left{left:64px}.game.right{left:568px}.game img{width:100%;height:100%;display:block}.trace{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.compare .explain{top:875px;font-size:33px;line-height:1.25;font-weight:600;max-width:840px}.zoom{position:absolute;left:64px;right:64px;top:978px;height:100px}.zoom svg{width:100%;height:100%}.compare .ending{top:1111px;font-size:43px;line-height:1.18;font-weight:800;color:#194bd7}.choose .title{font-size:52px;line-height:1.2}.choose .label{top:440px}.choose .game{top:505px}.choose .selected{outline:7px solid #ffcc38;outline-offset:7px}.choose .reason{top:903px;background:#eaf0ff;color:#194bd7;border-radius:20px;padding:24px 30px;font-size:43px;font-weight:800;line-height:1.2}.choose .ending{top:1120px;font-size:44px;line-height:1.2;font-weight:800}.follow-card .title{font-size:75px;line-height:1.13;max-width:940px}.follow-card .scene{top:470px;height:600px;border:3px solid #ffffffad}.follow-card .invitation{top:1110px;padding:23px 26px;background:#ffdb56;color:#173fb0;border-radius:20px;font-size:43px;line-height:1.16;font-weight:800;text-align:center}
`
const refinements=`.cover .headline{top:350px}.cover .scene{top:490px;height:620px}.cover .attribution{top:1145px}.story .scene{top:358px;height:602px}.follow-card em{font-style:normal;color:#ffdb56}`
fs.writeFileSync(path.join(out,'montagem.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>P34 · A ideia veio dele</title><style>${css}${refinements}</style><body>${articles.join('')}</body></html>`)
const visuals=[
 'Retrato real de Daniel, de camiseta azul-escura, sentado ao lado do computador. Fundo azul, título branco e destaque amarelo. Daniel está contando uma fala de seu filho Rafael; não é uma gravação da voz do filho.',
 'Outro quadro real do vídeo mostra Daniel conversando ao lado do computador. Um pequeno retrato real de Rafael, sorrindo, aparece num círculo identificado como Aluno. Não foi criada uma cena de Rafael usando a plataforma.',
 'Ilustração gerada de um caderno aberto com dois rascunhos de Quebra-blocos: blocos rosa, raquete azul e bola amarela. O primeiro trajeto desenhado é mais longo, o segundo é mais curto. Uma mão desenha a mudança. É um rascunho editorial, sem autoria atribuída a Rafael.',
 'Duas capturas reais de Quebra-blocos mostram o mesmo instante de duas partidas com velocidades diferentes. O ponto inicial é marcado por círculo vazado, e o rastro amarelo sobreposto liga a posição inicial à final registrada. Na versão mais devagar, a bola avança menos. Um desenho ampliado dos trajetos facilita a comparação. Exemplo preparado pela equipe.',
 'As duas versões reais do jogo aparecem lado a lado. A versão mais devagar tem contorno amarelo, associada ao objetivo de dar mais tempo para mover a raquete. O texto convida a testar outra velocidade caso fique fácil demais. Não é um projeto atribuído ao Rafael.',
 'Fundo azul, título branco e convite em faixa amarela. No centro, a ilustração do caderno com as duas ideias para o jogo. O convite para seguir o perfil ocupa um slide separado da conclusão.'
]
fs.writeFileSync(path.join(out,'legenda.txt'),caption+'\n')
fs.writeFileSync(path.join(out,'texto-alternativo.txt'),slides.map((s,i)=>`SLIDE ${i+1}\n${visuals[i]}\nTexto da arte: ${s.replace(/\n/g,' ')}\nIdentificação: Helena e Júlio · @criecomhelenaejulio · Comunidade dos Criadores. ${i+1} de 6.`).join('\n\n')+'\n')
fs.writeFileSync(path.join(out,'apoio/copy-publica.txt'),slides.join('\n\n')+'\n\n'+caption+'\n')
fs.writeFileSync(path.join(out,'publicacao.txt'),[
 'P34 · “Eu quero mudar isso aqui no jogo.” A ideia veio dele.',
 'Produzido em 13/10/2026. Segundo carrossel na ordem do calendário, primeira publicação da semana 2. P33 (imagem única) e P16 (Reel) continuam antes dele na fila geral, ainda sem nova mídia.',
 'Seis PNGs 1080 × 1350, 4:5. Publicar 01-p34.png a 06-p34.png, nessa ordem. previa.png é apenas para conferência.',
 'O sexto slide acrescenta o convite para seguir o perfil; o quinto preserva a conclusão do conteúdo. Sem ManyChat neste post.',
 'Fotografias reais: Daniel (quadros 12s e 45s do vídeo fornecido), Rafael (retrato já usado na oferta). Não foram geradas ou alteradas identidades.',
 'Fala da capa: AV11/I03, 28,58–30,22s. Daniel conta uma fala do Rafael. Fonte em apoio/fontes.md.',
 'Demonstração real de Quebra-blocos captada em partida, com o runtime oficial. Segunda versão reduz a velocidade inicial à metade; não representa projeto do Rafael. Rastros gráficos sobrepostos pela equipe representam posições registradas, não um recurso da interface. Fontes, projetos e medições em apoio/.',
 'Uma ilustração de rascunho gerada pelo image_gen incorporado, usada nos slides 3 e 6. Prompt em apoio/prompts.md. Sem autoria atribuída a aluno.',
 'Legenda, texto alternativo e montagem editável acompanham os arquivos. Não agendado nem publicado.',
 ''
].join('\n'))
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1})
 await page.goto(pathToFileURL(path.join(out,'montagem.html')).href)
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))})
 const checks=await page.evaluate(()=>[...document.querySelectorAll('article')].map(a=>{
  const rect=a.getBoundingClientRect(),footer=a.querySelector('footer').getBoundingClientRect()
  const content=[...a.querySelectorAll('.copy,figure,.zoom')].map(e=>{let r=e.getBoundingClientRect();const isCopy=e.classList.contains('copy');if(isCopy){const range=document.createRange();range.selectNodeContents(e);const ink=range.getBoundingClientRect();r={top:Math.min(r.top,ink.top),bottom:Math.max(r.bottom,ink.bottom),left:Math.min(r.left,ink.left),right:Math.max(r.right,ink.right)}}return{kind:e.className,isCopy,top:Math.round(r.top-rect.top),bottom:Math.round(r.bottom-rect.top),left:Math.round(r.left-rect.left),right:Math.round(r.right-rect.left),overflow:e.scrollWidth>e.clientWidth+2}})
  const overlaps=[];content.forEach((x,i)=>content.slice(i+1).forEach(y=>{if((x.isCopy||y.isCopy)&&Math.min(x.right,y.right)>Math.max(x.left,y.left)&&Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top))overlaps.push([x.kind,y.kind])}))
  return{id:a.id,dimensions:[rect.width,rect.height],copy:[...a.querySelectorAll('.copy')].map(e=>e.innerText.trim()).join(' '),content,overlaps,passed:!overlaps.length&&content.every(e=>!e.overflow&&e.top>100&&e.bottom<footer.top-rect.top-10&&e.left>=24&&e.right<=1056)}
 }))
 const norm=s=>s.replace(/\s+/g,' ').trim()
 checks.forEach((c,i)=>{c.copyMatches=norm(c.copy)===norm(slides[i]);c.passed&&=c.copyMatches})
 for(let i=1;i<=6;i++)await page.locator('#s'+i).screenshot({path:path.join(out,`0${i}-p34.png`)})
 const gallery=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P34 · A ideia veio dele</title><style>body{background:#e8edf6;color:#142845;font:16px Arial;margin:32px}h1{font-size:26px;max-width:1000px;margin-bottom:12px}p{line-height:1.6}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:1100px}figure{margin:0}img{width:100%;display:block;border-radius:8px;box-shadow:0 4px 18px #14284520}figcaption{font-size:14px;margin:10px 0 8px}a{color:#184cd7}.details{max-width:1080px;padding:16px 0}@media(max-width:720px){body{margin:18px}main{grid-template-columns:1fr}}</style><h1>“Eu quero mudar isso aqui no jogo.” A ideia veio dele.</h1><p>P34 · 6 slides · 1080 × 1350 · 4:5 · <a href="legenda.txt">Legenda</a> · <a href="texto-alternativo.txt">Texto alternativo</a></p><main>${slides.map((s,i)=>`<figure><a href="0${i+1}-p34.png"><img src="0${i+1}-p34.png" alt="${esc(visuals[i])}"></a><figcaption>0${i+1} / 06</figcaption></figure>`).join('')}</main><p class="details">Relato real de Daniel, pai do Rafael. Exemplo do jogo preparado pela equipe. Nada foi agendado ou publicado.</p></html>`
 fs.writeFileSync(path.join(out,'index.html'),gallery)
 await page.setViewportSize({width:1180,height:1260})
 await page.goto(pathToFileURL(path.join(out,'index.html')).href)
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()))})
 await page.screenshot({path:path.join(out,'previa.png'),fullPage:true})
 fs.writeFileSync(path.join(out,'apoio/verificacao-layout.json'),JSON.stringify(checks,null,2)+'\n')
 console.log(JSON.stringify(checks));if(checks.some(c=>!c.passed))process.exitCode=1
}finally{await browser.close()}
