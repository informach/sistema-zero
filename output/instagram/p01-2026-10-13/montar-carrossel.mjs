import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const target=path.join(base,'producao/postagens/p01-uma-ideia-dele')
const source=fs.readFileSync(path.join(base,'postagens/01-p01-a-p10.md'),'utf8').replace(/\r\n/g,'\n').split('<a id="p02"')[0]
const quote=text=>text.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'')).join('\n').trim()
const blocks=source.split(/### Slide \d\n/).slice(1)
const slides=blocks.map(b=>quote(b.split('### Legenda completa')[0]))
if(slides.length!==6)throw Error('P01 deve ter seis slides')
const caption=quote(source.split('### Legenda completa')[1].split('**Nota interna')[0])
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const picture=(file,cls='')=>`<img class="${cls}" src="apoio/${file}" alt="">`
const footer=n=>`<header><span>HELENA E JÚLIO</span><span class="counter">${String(n).padStart(2,'0')} / 06</span></header><footer><span>@criecomhelenaejulio</span><span class="footer-brand">Comunidade dos Criadores</span></footer><div class="progress" style="width:${n*100/slides.length}%"></div>`
const articles=[
 `<article id="s1" class="cover">${footer(1)}<h1 class="copy title">Seu filho sabe tudo<br>sobre o<br><em>jogo dos outros.</em></h1><p class="copy lead">Ele conhece personagens, mapas e atalhos.<br>Uma dessas preferências pode virar uma ideia dele.</p><figure class="scene">${picture('01-jogando.png')}</figure></article>`,
 `<article id="s2" class="invite">${footer(2)}<h2 class="copy title">Assistir e jogar fazem<br>parte da diversão.</h2><figure class="scene">${picture('02-convite.png')}</figure><div class="question"><p class="copy bridge">Mas vale abrir espaço para uma pergunta:</p><p class="copy question-text">“O que você gostaria<br>de fazer do seu jeito?”</p></div></article>`,
 `<article id="s3" class="ideas">${footer(3)}<h2 class="copy title">Talvez ele queira uma <strong>casa numa árvore</strong>, um <strong>personagem engraçado</strong> ou um <strong>caminho cheio de surpresas.</strong></h2><figure class="scene">${picture('03-ideias.png')}</figure><p class="copy ending">A ideia pode começar pequena.</p></article>`,
 `<article id="s4" class="build">${footer(4)}<h2 class="copy title">Ao criar, ele pode decidir<br><em>onde passa o caminho</em><br>e o que alguém encontra nele.</h2><figure class="game"><div class="game-frame">${picture('04-mundo-cinema.png')}</div></figure><p class="copy ending">Montar e testar mostra<br>se a ideia funciona.</p></article>`,
 `<article id="s5" class="finish">${footer(5)}<h2 class="copy title">Parte daquela tarde pode terminar com algo que ele queira mostrar:</h2><figure class="sketch">${picture('05-rascunho.png')}</figure><figure class="built">${picture('04-mundo-topo.png')}</figure><p class="copy ending">“Esse caminho<br><em>fui eu que fiz”.</em></p></article>`,
 `<article id="s6" class="follow-card">${footer(6)}<h2 class="copy title">Aqui, a gente ensina<br>crianças a criar<br><em>os próprios jogos.</em></h2><figure class="scene">${picture('01-conversa.png')}</figure><p class="copy invitation">Siga o perfil<br>para conhecer esse caminho.</p></article>`
]
const css=`
@font-face{font-family:Nunito;src:url(apoio/nunito-800.woff2);font-weight:800;font-display:block}
@font-face{font-family:Nunito;src:url(apoio/nunito-600.woff2);font-weight:600;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#dce5f4;font-family:Nunito,Arial,sans-serif;color:#172a46}
article{position:relative;width:1080px;height:1350px;overflow:hidden;background:#fffcf4;margin:0 0 24px}
h1,h2,p,figure{margin:0}h1,h2{font-weight:800;letter-spacing:-1.5px}em{font-style:normal}header{position:absolute;left:64px;right:64px;top:47px;display:flex;align-items:center;justify-content:space-between;font-size:23px;letter-spacing:2px;font-weight:800}header>span:first-child:before{content:'';display:inline-block;width:12px;height:12px;background:#ffcf42;border-radius:50%;margin:0 12px 1px 0}.counter{letter-spacing:0;font-size:25px}footer{position:absolute;left:64px;right:64px;bottom:39px;display:flex;justify-content:space-between;font-size:24px;line-height:1.25;font-weight:800}.footer-brand{font-weight:600;font-size:23px}.progress{position:absolute;bottom:0;left:0;height:10px;background:#ffcd38}
figure img{display:block;width:100%;height:100%;object-fit:cover}figure{overflow:hidden;border-radius:24px}.cover,.build{background:#194bd7;color:white}.title{position:absolute;left:64px;right:64px;top:137px}.cover .title{font-size:83px;line-height:1.08;letter-spacing:-2px}.cover .title em,.build .title em{color:#ffdb56}.cover .lead{position:absolute;left:67px;right:64px;top:451px;font-size:36px;line-height:1.3;font-weight:600}.cover .scene{left:64px;right:64px;top:583px;height:635px;position:absolute;border:3px solid #ffffffbd}.cover .scene img{object-fit:cover}.invite .title{font-size:69px;line-height:1.12;color:#194bd7}.invite .scene{position:absolute;top:339px;left:64px;right:64px;height:620px}.question{position:absolute;left:64px;right:64px;top:997px}.bridge{font-size:34px;line-height:1.25;margin-bottom:17px}.question-text{font-size:56px;line-height:1.13;font-weight:800;color:#173fb0;letter-spacing:-1px}.ideas .title{font-size:51px;line-height:1.2;font-weight:600;top:131px}.ideas .title strong{font-weight:800;color:#194bd7}.ideas .scene{position:absolute;left:32px;right:32px;top:434px;height:670px;border-radius:26px}.ideas .ending{position:absolute;top:1151px;left:64px;right:64px;font-size:46px;line-height:1.15;font-weight:800;color:#194bd7}.build .title{font-size:57px;line-height:1.2;letter-spacing:-1.3px}.build .game{position:absolute;left:42px;right:42px;top:424px;height:642px;display:flex;align-items:center;border:3px solid #ffffffb0;background:#0b151b;box-shadow:0 20px 50px #10286566}.game-frame{width:100%;height:100%;display:flex;align-items:center}.game-frame img{object-fit:contain}.build .ending{position:absolute;left:64px;right:64px;top:1120px;font-size:51px;line-height:1.14;font-weight:800}.finish .title{font-size:53px;line-height:1.18}.finish .sketch{position:absolute;left:66px;top:378px;width:690px;height:460px;transform:rotate(-4deg);border:8px solid white;box-shadow:0 12px 34px #16274424;z-index:1}.finish .built{position:absolute;left:268px;top:710px;width:743px;height:418px;transform:rotate(2deg);border:7px solid white;box-shadow:0 12px 34px #16274435;z-index:2}.finish .ending{position:absolute;left:64px;top:1124px;font-size:56px;line-height:1.04;letter-spacing:-1px;font-weight:800;color:#173fb0;z-index:3}.finish .ending em{background:#ffdf72;box-shadow:9px 0 #ffdf72,-9px 0 #ffdf72}
`
// Slide 5 closes the idea; the invitation is a separate sixth slide.
const refinements=`
.finish .sketch{top:336px}
.finish .built{top:654px}
.follow-card{background:#194bd7;color:#fff}
.follow-card .title{font-size:75px;line-height:1.13}
.follow-card .title em{color:#ffdb56}
.follow-card .scene{position:absolute;left:64px;right:64px;top:435px;height:620px;border:3px solid #ffffffbd}
.follow-card .invitation{position:absolute;left:64px;right:64px;top:1100px;padding:18px 26px;background:#ffdb56;border-radius:20px;color:#173fb0;text-align:center;font-size:44px;line-height:1.16;font-weight:800}
`
fs.writeFileSync(path.join(target,'montagem.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>P01 · Uma ideia dele</title><style>${css}${refinements}</style><body>${articles.join('')}</body></html>`)
fs.writeFileSync(path.join(target,'legenda.txt'),caption+'\n')
const visuals=[
 'Ilustração gerada de um menino fictício de aproximadamente 11 anos, de cabelo cacheado e camiseta amarela, jogando com confiança no computador. Ele olha para a aventura no monitor e opera o controle com as duas mãos. O rosto, as mãos e o jogo aparecem na cena.',
 'Ilustração gerada vista de cima: tablet com uma aventura pausada e controle ao lado. A mão da criança desenha uma árvore e um caminho no papel. A mão aberta do adulto acompanha sem tomar o lápis.',
 'Ilustração gerada de um caderno com ideias desenhadas: casa numa árvore, personagem de boné azul, caminho pontilhado e estrelas. São possibilidades imaginadas, não uma captura do jogo.',
 'Captura real de uma adaptação editorial do exemplo Meu Mundo, do Estúdio: carro vermelho, estradas que se cruzam, moedas amarelas e árvores ao redor. A partida está em andamento.',
 'Montagem compara um desenho gerado de estradas, carro vermelho e moedas com uma captura real do mesmo arranjo no Mundo 3D, visto de cima. A comparação é uma demonstração preparada pela equipe, não um projeto atribuído a um aluno.',
 'Slide de convite com fundo azul e chamada em amarelo. Ilustração gerada mostra o menino fictício de camiseta amarela contando uma ideia à mãe, que usa blusa azul. Ele aponta para o desenho de um caminho sobre a mesa enquanto ela escuta. As pessoas não representam Helena, Júlio ou alunos identificados.'
]
fs.writeFileSync(path.join(target,'texto-alternativo.txt'),slides.map((text,i)=>`SLIDE ${i+1}\n${visuals[i]}\nTexto da arte: ${text.replace(/\n/g,' ')}\nIdentificação: Helena e Júlio, @criecomhelenaejulio, Comunidade dos Criadores. ${i+1} de ${slides.length}.`).join('\n\n')+'\n')
fs.writeFileSync(path.join(target,'publicacao.txt'),[
 'P01 · Seu filho sabe tudo sobre o jogo dos outros.',
 'Produzido em 13/10/2026. Seis PNGs de 1080 × 1350, proporção 4:5.',
 'Ordem: 01-p01.png, 02-p01.png, 03-p01.png, 04-p01.png, 05-p01.png, 06-p01.png.',
 'Usar legenda.txt e texto-alternativo.txt. previa.png é apenas a folha de conferência; não publicar como slide.',
 'Slide 5 preserva o fechamento da ideia. O convite foi acrescentado como slide 6, separado: Aqui, a gente ensina crianças a criar os próprios jogos. Siga o perfil para conhecer esse caminho. A legenda mantém o convite. Sem entrada de ManyChat.',
 'Cinco ilustrações geradas pelo image_gen incorporado, com pessoas fictícias. A cena de conversa está no slide 6. A aventura ilustrada na capa representa o jogo que a criança gosta de jogar; não é uma captura da nossa plataforma.',
 'A demonstração do Mundo 3D nos slides 4 e 5 é real, captada do runtime oficial numa adaptação do exemplo Meu Mundo. Fontes e alterações em apoio/captura-real.json; projeto da demonstração em apoio/meu-mundo-variante.js; prompts em apoio/prompts.md e apoio/prompt-capa-final.md.',
 'Nenhum resultado escolar, depoimento ou projeto de aluno foi inventado. Fontes Nunito e licença em apoio/.',
 'Montagem editável: montagem.html. Não agendado nem publicado.',
 'O carrossel anterior do não consigo e suas duas cópias de artes históricas foram apagados a pedido do usuário em 13/10/2026; este é o único P01 da fila.',
 ''
].join('\n'))
fs.writeFileSync(path.join(target,'apoio/copy-publica.txt'),slides.join('\n\n')+'\n\n'+caption+'\n')
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1})
 await page.goto(pathToFileURL(path.join(target,'montagem.html')).href)
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))})
 const checks=await page.evaluate(()=>[...document.querySelectorAll('article')].map(a=>{
  const rect=a.getBoundingClientRect();const footer=a.querySelector('footer').getBoundingClientRect()
  const content=[...a.querySelectorAll('.copy,figure')].map(e=>{let r=e.getBoundingClientRect();const isCopy=e.classList.contains('copy');if(isCopy){const range=document.createRange();range.selectNodeContents(e);const ink=range.getBoundingClientRect();r={top:Math.min(r.top,ink.top),bottom:Math.max(r.bottom,ink.bottom),left:Math.min(r.left,ink.left),right:Math.max(r.right,ink.right)}}return{kind:e.className,isCopy,top:Math.round(r.top-rect.top),bottom:Math.round(r.bottom-rect.top),left:Math.round(r.left-rect.left),right:Math.round(r.right-rect.left),overflow:e.scrollWidth>e.clientWidth+2}})
  const copy=[...a.querySelectorAll('.copy')].map(e=>e.innerText.trim()).join(' ')
  const overlaps=[];content.forEach((x,i)=>content.slice(i+1).forEach(y=>{if((x.isCopy||y.isCopy)&&Math.min(x.right,y.right)>Math.max(x.left,y.left)&&Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top))overlaps.push([x.kind,y.kind])}))
  return{id:a.id,dimensions:[rect.width,rect.height],copy,content,overlaps,footerTop:Math.round(footer.top-rect.top),passed:!overlaps.length&&content.every(e=>!e.overflow&&e.top>100&&e.bottom<footer.top-rect.top-10&&e.left>=24&&e.right<=1056)}
 }))
 const norm=s=>s.replace(/\s+/g,' ').trim()
 checks.forEach((c,i)=>{c.copyMatches=norm(c.copy)===norm(slides[i]);c.passed&&=c.copyMatches})
 for(let i=1;i<=slides.length;i++)await page.locator('#s'+i).screenshot({path:path.join(target,`0${i}-p01.png`)})
 const preview=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P01 · Seu filho sabe tudo sobre o jogo dos outros</title><style>body{background:#e8edf6;color:#142845;font:16px Arial;margin:32px}h1{font-size:26px;max-width:850px;margin-bottom:12px}p{line-height:1.6}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:1100px}figure{margin:0}img{display:block;width:100%;border-radius:8px;box-shadow:0 4px 18px #14284520}figcaption{font-size:14px;margin:10px 0 8px}a{color:#184cd7}.details{max-width:1080px;padding:16px 0} @media(max-width:720px){body{margin:18px}main{grid-template-columns:1fr}}</style><h1>Seu filho sabe tudo sobre o jogo dos outros.</h1><p>P01 · 6 slides · 1080 × 1350 · 4:5 · <a href="legenda.txt">Legenda</a> · <a href="texto-alternativo.txt">Texto alternativo</a></p><main>${slides.map((s,i)=>`<figure><a href="0${i+1}-p01.png"><img src="0${i+1}-p01.png" alt="${esc(visuals[i])}"></a><figcaption>0${i+1} / 06</figcaption></figure>`).join('')}</main><p class="details">Ilustrações editoriais e captura real de uma adaptação do exemplo Meu Mundo. Mídia pronta para publicação manual; nada foi publicado.</p></html>`
 fs.writeFileSync(path.join(target,'index.html'),preview)
 await page.setViewportSize({width:1180,height:1260})
 await page.goto(pathToFileURL(path.join(target,'index.html')).href)
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()))})
 await page.screenshot({path:path.join(target,'previa.png'),fullPage:true})
 fs.writeFileSync(path.join(target,'apoio/verificacao-layout.json'),JSON.stringify(checks,null,2))
 console.log(JSON.stringify(checks));if(checks.some(c=>!c.passed))process.exitCode=1
}finally{await browser.close()}
