import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/refacao-final-2026-10-13')
const folders={P01:'p01-uma-ideia-dele',P34:'p34-a-ideia-veio-dele',P07:'p07-primeira-dificuldade'}
const series={P01:'Por trás do jogo',P34:'Diário de criador',P07:'Tradução de criança'}
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const quoted=s=>s.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'').trimEnd()).join('\n').trim().split(/\n\s*\n/).filter(Boolean)
function readCopy(id){
 const source=id==='P34'?'09-p31-a-p40.md':'01-p01-a-p10.md'
 const doc=fs.readFileSync(path.join(base,'postagens',source),'utf8')
 const section=doc.split('## '+id+' · ')[1].split(/\n## P\d/)[0]
 const slides=[...section.matchAll(/### Slide (\d+)[^\n]*\n([\s\S]*?)(?=\n###|\n\*\*Produção|$)/g)].map(m=>quoted(m[2]))
 return {title:section.split('\n')[0].trim(),source,section,slides,caption:quoted(section.split('### Legenda')[1]).join('\n\n')}
}
const alts={
 P01:[
 'Cena encenada: menino no sofá assiste no tablet a um vídeo de corrida.',
 'Cena encenada: o mesmo menino observa o tablet; a luz da tela ilumina seu rosto.',
 'Captura do Estúdio: carrinho no jogo e bloco do turbo com força 1.5 em destaque.',
 'Cena encenada: mãe aponta para o tablet e o menino explica uma ideia no sofá.',
 'Captura do Estúdio: turbo 1.5 chega a 28; turbo 3 chega a 45 com as mesmas teclas.',
 'Captura do Estúdio: a mesma floresta de manhã, ao entardecer e à noite.',
 'Cena encenada: o menino usa os blocos no computador; sua mãe está ao fundo.'
 ],
 P34:[
 'Retrato de Daniel, pai do Rafael: recorte real de seu depoimento em vídeo.',
 'Ilustração: uma mão aponta para a barra de vida de um monstrinho numa tela.',
 'Ilustração: uma criança descobre a mesa de controle atrás da cortina da plateia.',
 'Captura do Estúdio: golpe de fogo na planta e bloco com multiplicador 2.',
 'Captura do Estúdio: a vida de Folhito após o mesmo golpe com regras 2 e 1.5.',
 'Captura do Estúdio: seis regras de tipos; a linha alterada para 1.5 está destacada.',
 'Retrato de Rafael, aluno: foto real junto ao relato sobre compartilhar seu jogo.',
 'Cena encenada: pai escuta o filho pensar numa ideia, com lápis e caderno à mesa.'
 ],
 P07:[
 'Cena encenada: André começa a fechar o notebook depois de uma tentativa.',
 'Cena encenada: André aponta para o salto na tela e Júlio observa com ele.',
 'Captura do Estúdio: de lado, o personagem cai antes de alcançar a plataforma.',
 'Captura do Estúdio: setas indicam a força do salto e a distância entre plataformas.',
 'Captura do Estúdio: mesmo pulo 11; na plataforma próxima, o personagem coleta a moeda.',
 'Cena encenada: André toma água no sofá e conversa com Júlio durante uma pausa.',
 'Cena encenada: André sorri ao lado do monitor com a moeda coletada no jogo.'
 ]
}
const img=(file,alt='',cl='')=>`<img class="${cl}" src="apoio/${file}" alt="${esc(alt)}">`
const photo=(file,alt,cl='')=>`<figure class="media photo ${cl}">${img(file,alt)}</figure>`
const game=(file,alt,cl='')=>`<figure class="media game ${cl}">${img(file,alt)}</figure>`
const block=file=>`<figure class="block">${img(file,'Recorte dos blocos reais do Estúdio')}</figure>`
function p(txt,cl=''){
 let text=esc(txt).replace('@criecomhelenaejulio','<strong>@criecomhelenaejulio</strong>')
 return `<p class="copy ${cl}">${text}</p>`
}
function compare(items,kind){return `<div class="comparison ${kind}">${items.map(i=>`<figure class="compare"><figcaption>${esc(i.label)}</figcaption><div class="shot">${img(i.file,i.alt||'Comparação real')}${kind==='turbo'?`<div class="hud">${img(i.file,'Velocidade real ampliada')}</div>`:kind==='jump'?`<div class="coin-hud">${img(i.file,'Contador real de moedas ampliado')}</div>`:''}</div></figure>`).join('')}</div>`}
const styles=`
@font-face{font-family:Nunito;src:url(apoio/nunito-800.woff2);font-weight:800;font-display:block}
@font-face{font-family:Nunito;src:url(apoio/nunito-600.woff2);font-weight:600;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#dce5f4;color:#172a46;font-family:Nunito,Arial,sans-serif}
article{position:relative;width:1080px;height:1350px;overflow:hidden;background:#fffcf4;margin:0 0 24px}
header{position:absolute;left:64px;right:64px;top:44px;display:flex;justify-content:space-between;align-items:center;gap:20px;font-size:22px;font-weight:800;letter-spacing:1.3px;z-index:2}
header .name{white-space:nowrap}header .dot{display:inline-block;width:11px;height:11px;background:#194bd7;border-radius:50%;margin-right:12px}header .count{font-size:23px;letter-spacing:.5px}
footer{position:absolute;bottom:32px;left:64px;right:64px;display:flex;justify-content:space-between;font-size:22px;font-weight:600;line-height:1.3}
.progress{position:absolute;bottom:0;left:0;height:8px;background:#ffdb56}
.content{position:absolute;inset:122px 64px 102px;display:flex;flex-direction:column;gap:28px}
.copy{margin:0;font-size:42px;line-height:1.25;font-weight:600;letter-spacing:-.55px;flex:none}
.copy strong{font-weight:800}.lead{font-weight:800;font-size:54px;line-height:1.13;letter-spacing:-1.1px}
.tail{font-size:42px}.quote{font-size:56px;font-weight:800;line-height:1.18;color:#194bd7}
.series{font-size:23px;font-weight:800;letter-spacing:.6px;color:#172a46;background:#ffdb56;padding:9px 18px;border-radius:8px;align-self:flex-start;line-height:1.2;flex:none}
figure{margin:0}.media{position:relative;overflow:hidden;border-radius:24px;min-height:0;flex:1;background:#eaf0f9}
.media img{display:block;width:100%;height:100%;object-fit:cover}.photo img{object-position:center}
.game img{object-fit:contain}.game{background:#dce8f1}
.block{padding:16px 20px;background:#fff7e6;border-radius:18px;flex:none;display:flex;justify-content:center;align-items:center}
.block img{display:block;max-width:100%;width:auto;max-height:130px;object-fit:contain}
.blue{background:#194bd7;color:white}.blue header .dot{background:#ffdb56}.blue .quote{color:#ffdb56}
.cover .content{inset-top:110px;gap:24px}.cover .lead{font-size:72px;line-height:1.07;letter-spacing:-1.8px}
.cover .tail{font-size:46px;line-height:1.17;font-weight:800;color:#ffdb56}
.cover .credit{font-size:29px;line-height:1.15;letter-spacing:0}
.cover .media{border-radius:28px 28px 10px 10px}
.follow .lead{font-size:52px;line-height:1.14}.follow .tail{font-size:41px}.follow strong{color:#ffdb56;white-space:nowrap;font-size:40px}
.p01-2 .content{gap:32px}.p01-2 .media{order:-1;flex:1.4}.p01-2 .lead{font-size:52px;color:#194bd7}
.p01-3 .lead{font-size:52px}.p01-3 .media{flex:1.15}.p01-3 .tail{font-size:43px}
.p01-4 .lead{font-size:53px}.p01-4 .media{flex:1.2}.p01-4 .tail{border-left:8px solid #ffdb56;padding-left:24px}
.comparison{flex:1;min-height:0;display:flex;gap:22px}.compare{position:relative;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;border-radius:20px;background:#e7edfa}
.compare figcaption{padding:14px 20px;color:#194bd7;font-size:34px;font-weight:800;line-height:1.2;flex:none}
.shot{flex:1;position:relative;min-height:0;overflow:hidden}.shot>img{width:100%;height:100%;object-fit:cover;display:block}
.turbo .shot>img{object-fit:cover;object-position:center}.turbo .hud{position:absolute;top:20px;right:15px;width:276px;height:55px;overflow:hidden;border-radius:10px;border:3px solid #ffdb56;background:#afc5cd}
.turbo .hud img{position:absolute;width:1996px;height:1123px;max-width:none;left:-1665px;top:-27px}
.p01-5 .lead{font-size:54px}.p01-5 .block img{max-height:100px}.p01-5 .tail{font-size:43px}
.triptych{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;min-height:0}
.triptych figure{position:relative;overflow:hidden;border-radius:18px;min-height:0}.triptych img{width:100%;height:100%;object-fit:cover;object-position:75% center;display:block}
.triptych figcaption{position:absolute;left:16px;top:16px;background:#fffcf4;color:#172a46;padding:7px 12px;border-radius:8px;font-size:24px;font-weight:800}
.p01-6 .lead{font-size:51px}.p01-6 .block img{max-height:170px}.p01-6 .tail{font-size:42px}
.p07-1 .lead{font-size:78px}.p07-1 .tail{font-size:44px}.p07-2 .lead{font-size:55px;color:#194bd7}.p07-2 .tail{font-size:42px}
.p07-3 .lead{font-size:47px;line-height:1.19}.p07-3 .tail{font-size:52px;font-weight:800;color:#194bd7}.p07-3 .game img{object-fit:cover}
.p07-4 .lead{font-size:49px}.p07-4 .game img{object-fit:cover}.p07-4 .tail{font-size:49px;font-weight:800;color:#194bd7}
.arrows{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.arrows text{font:800 35px Nunito;paint-order:stroke;stroke:#fffcf4;stroke-width:8px;fill:#172a46}
.jump{flex-direction:column;gap:16px}.jump .compare{flex-direction:row;align-items:stretch}.jump figcaption{width:210px;display:flex;align-items:center;font-size:31px;padding:20px;flex:none}
.jump .shot{flex:1}.jump .shot>img{object-fit:cover}.p07-5 .content{gap:21px}.p07-5 .lead{font-size:49px}.p07-5 .tail{font-size:43px}.p07-5 .block{padding:16px 0}.p07-5 .block img{width:100%;max-height:100px}
.coin-hud{position:absolute;top:13px;left:14px;width:212px;height:58px;overflow:hidden;border:3px solid #ffdb56;border-radius:10px;background:#b7d6e4}.coin-hud img{position:absolute;max-width:none;width:2880px;height:1800px;left:-43px;top:-111px}
.p07-6 .lead{font-size:51px}.p07-6 .tail{font-size:43px}
.p34-1 .lead{font-size:76px}.p34-1 .tail{font-size:51px}.daniel img{position:absolute;width:230%;height:auto;max-width:none;left:-116%;top:-165px}.photo-label{position:absolute;bottom:22px;left:24px;padding:10px 18px;font-size:28px;font-weight:800;border-radius:10px;background:#fffcf4;color:#172a46}
.p34-2 .lead{font-size:53px}.p34-2 .tail{font-size:43px}.p34-2 .media img,.p34-3 .media img{object-fit:cover}
.p34-3 .lead{font-size:56px}.p34-3 .tail{font-size:44px}.p34-4 .lead{font-size:55px}.p34-4 .tail{font-size:43px}
.life{flex-direction:column;gap:26px}.life .compare{background:#e7edfa;flex:none;height:235px}.life .shot{margin:0 22px 22px;border-radius:12px;background:#609662}
.life .shot>img{position:absolute;max-width:none;width:282%;height:auto;left:-17%;top:-116px;object-fit:initial}
.p34-5 .lead{font-size:58px}.p34-5 .tail{font-size:47px}.p34-5 .comparison{justify-content:center}
.table{display:flex;align-items:center;justify-content:center;padding:18px;background:#fff7e6}.tablewrap{position:relative;width:100%;aspect-ratio:1590/1206}.tablewrap img{width:100%;height:100%;object-fit:contain}.tablewrap .highlight{position:absolute;left:3%;top:12.3%;width:96%;height:14%;border:6px solid #ffdb56;border-radius:12px}
.p34-6 .lead{font-size:52px}.p34-6 .tail{font-size:49px;font-weight:800;color:#194bd7}
.p34-7 .content{justify-content:center;gap:52px}.p34-7 .lead{font-size:46px;font-weight:600}.p34-7 .quote{font-size:75px;line-height:1.14;letter-spacing:-1.5px}.testimonial{display:flex;align-items:center;gap:28px}.testimonial img{width:160px;height:160px;object-fit:cover;border-radius:50%;border:5px solid #ffdb56}.testimonial .copy{font-size:35px;font-weight:800}.quote-line{height:8px;width:130px;background:#ffdb56;border:0;align-self:flex-start;margin:0}
.p34-8 .lead{font-size:52px}.p34-8 .tail{font-size:41px}
`
function build(id,data){return data.slides.map((t,i)=>{
 const n=i+1,last=n===data.slides.length,a=alts[id][i];let parts=[],cl=id.toLowerCase()+'-'+n
 if(n===1){
  cl+=' cover blue'
  const source=id==='P01'?'v3/p01-assistindo.png':id==='P07'?'v2/p07-fechar.png':'daniel-12s.png'
  let visual=photo(source,a,id==='P34'?'daniel':'')
  if(id==='P34')visual=visual.replace('</figure>','<figcaption class="photo-label">Daniel, pai do Rafael</figcaption></figure>')
  parts=[`<div class="series">${series[id]}</div>`,p(t[0],'lead'),p(t[1],'tail'),...(t[2]?[p(t[2],'credit')]:[]),visual]
 }else if(last){
  cl+=' follow blue'
  parts=[p(t[0],'lead'),photo(id==='P01'?'v3/p01-criando-final.png':id==='P07'?'v3/p07-descoberta.png':'v3/p34-conversa.png',a),p(t[1],'tail')]
 }else if(id==='P01'){
  if(n===2)parts=[p(t[0],'lead'),photo('v3/p01-rosto.png',a),p(t[1],'tail')]
  if(n===3)parts=[p(t[0],'lead'),p(t[1],'tail'),game('v3/estudio-turbo.png',a),block('v2/bloco-world-antes.png')]
  if(n===4)parts=[p(t[0],'lead'),photo('v3/p01-conversa.png',a),p(t[1],'tail')]
  if(n===5)parts=[p(t[0],'lead'),compare([{label:'Antes',file:'v2/turbo-antes.png'},{label:'Depois',file:'v2/turbo-depois.png'}],'turbo'),block('v2/bloco-world-depois.png'),p(t[1],'tail')]
  if(n===6)parts=[p(t[0],'lead'),'<div class="triptych">'+[['manha','Manhã'],['entardecer','Entardecer'],['noite','Noite']].map(([f,l])=>`<figure>${img('v3/ambiente-'+f+'.png',a)}<figcaption>${l}</figcaption></figure>`).join('')+'</div>',block('v3/blocos-morros-ciclo.png'),p(t[1],'tail')]
 }else if(id==='P07'){
  if(n===2)parts=[p(t[0],'lead'),photo('v3/p07-investigar.png',a),p(t[1],'tail')]
  if(n===3)parts=[p(t[0],'lead'),game('v3/lateral-antes.png',a),p(t[1],'tail')]
  if(n===4){let visual=game('v3/distancia.png',a).replace('</figure>',`<svg class="arrows" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0 L7 3.5 L0 7 Z" fill="#ffdb56"/></marker></defs><path d="M640 477 L834 477" stroke="#ffdb56" stroke-width="5" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="664" y="535">Distância</text><path d="M552 390 Q557 326 601 301" fill="none" stroke="#ffdb56" stroke-width="5" marker-end="url(#arrow)"/><text x="407" y="283">Força do pulo</text></svg></figure>`);parts=[p(t[0],'lead'),visual,p(t[1],'tail')]}
  if(n===5)parts=[p(t[0],'lead'),compare([{label:'Mais longe',file:'v3/comparacao-antes.png'},{label:'Mais perto',file:'v3/comparacao-depois.png'}],'jump'),block('v2/bloco-nuvens-depois.png'),p(t[1],'tail')]
  if(n===6)parts=[p(t[0],'lead'),photo('v2/p07-pausa.png',a),p(t[1],'tail')]
 }else if(id==='P34'){
  if(n===2)parts=[p(t[0],'lead'),photo('v3/p34-apontar.png',a),p(t[1],'tail')]
  if(n===3)parts=[p(t[0],'lead'),photo('v3/p34-bastidores.png',a),p(t[1],'tail')]
  if(n===4)parts=[p(t[0],'lead'),game('v3/impacto-3.png',a),block('v2/bloco-batalha-antes.png'),p(t[1],'tail')]
  if(n===5)parts=[p(t[0],'lead'),compare([{label:'Antes',file:'v2/batalha-antes-5.png'},{label:'Depois',file:'v2/batalha-depois-5.png'}],'life'),p(t[1],'tail')]
  if(n===6)parts=[p(t[0],'lead'),`<figure class="media table"><div class="tablewrap">${img('v2/blocos-batalha-depois.png',a)}<span class="highlight"></span></div></figure>`,p(t[1],'tail')]
  if(n===7)parts=[p(t[0],'lead'),'<hr class="quote-line">',p(t[1],'quote'),`<div class="testimonial">${img('rafael.webp',a)}${p(t[2])}</div>`]
 }
 return `<article id="slide-${n}" class="${cl}"><header><span class="name"><i class="dot"></i>CRIE COM HELENA E JÚLIO</span><span class="count">${String(n).padStart(2,'0')} / ${String(data.slides.length).padStart(2,'0')}</span></header><div class="content">${parts.join('')}</div><footer><span>Comunidade dos Criadores</span><span>${last?'@criecomhelenaejulio':'Deslize →'}</span></footer><div class="progress" style="width:${n/data.slides.length*100}%"></div></article>`
}).join('\n')}
const browser=await chromium.launch({channel:'chrome',headless:true})
const report=[]
try{for(const id of ['P01','P34','P07'].filter(id=>process.argv.length===2||process.argv.slice(2).includes(id))){
 const dir=path.join(base,'producao/postagens',folders[id]),data=readCopy(id)
 fs.writeFileSync(path.join(dir,'apoio/v4/copy-fonte.md'),'## '+id+' · '+data.section)
 fs.writeFileSync(path.join(dir,'montagem.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${esc(data.title)}</title><style>${styles}</style>${build(id,data)}</html>`)
 fs.writeFileSync(path.join(dir,'legenda.txt'),data.caption+'\n')
 fs.writeFileSync(path.join(dir,'texto-alternativo.txt'),data.slides.map((t,i)=>`SLIDE ${i+1}\nCurto (${alts[id][i].length} caracteres): ${alts[id][i]}\n\nLongo: ${alts[id][i]}\nTexto da arte: ${t.join(' ')}`).join('\n\n')+'\n')
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1})
 await page.goto(pathToFileURL(path.join(dir,'montagem.html')).href)
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))})
 const checks=await page.evaluate(()=>[...document.querySelectorAll('article')].map(a=>{
  const box=a.getBoundingClientRect(),parts=[...a.querySelector('.content').children].map(e=>{const r=e.getBoundingClientRect();return {class:e.className,x:r.x-box.x,y:r.y-box.y,w:r.width,h:r.height}})
  return {id:a.id,copy:[...a.querySelectorAll('.copy')].map(e=>e.textContent),parts,issues:parts.filter(x=>x.y+x.h>1250||x.y<105||x.h<1),missing:[...a.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).length}
 }))
 for(let i=0;i<data.slides.length;i++){
  if(JSON.stringify(checks[i].copy)!==JSON.stringify(data.slides[i]))throw Error('Copy divergiu: '+id+' '+(i+1))
  if(alts[id][i].length>100)throw Error('Alt longo: '+id+' '+(i+1))
  await page.locator('#slide-'+(i+1)).screenshot({path:path.join(dir,String(i+1).padStart(2,'0')+'-'+id.toLowerCase()+'.png')})
 }
 fs.writeFileSync(path.join(dir,'apoio/v4/verificacao-layout.json'),JSON.stringify(checks,null,2))
 const previews=data.slides.map((_,i)=>{let file=String(i+1).padStart(2,'0')+'-'+id.toLowerCase()+'.png';return `<a href="${file}"><img src="${file}" alt="${esc(alts[id][i])}"><span>Slide ${i+1}</span></a>`}).join('')
 fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${id} · ${esc(data.title)}</title><style>body{font-family:Arial,sans-serif;background:#eef2fa;color:#172a46;margin:30px}h1{font-size:29px;max-width:1000px;line-height:1.2}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:1300px}a{color:#194bd7;text-decoration:none}main a{background:white;border-radius:12px;overflow:hidden}img{display:block;width:100%;height:auto}span{display:block;padding:12px}nav{margin:22px 0;display:flex;gap:25px;flex-wrap:wrap}@media(max-width:720px){main{grid-template-columns:1fr}}</style><h1>${id} · ${esc(data.title)}</h1><p>${data.slides.length} slides · 1080 × 1350 · Copy simplificada · Direção de arte preservada</p><nav><a href="legenda.txt">Legenda</a><a href="texto-alternativo.txt">Textos alternativos</a><a href="montagem.html">Montagem editável</a><a href="apoio/v4/fontes-e-producao.md">Fontes e produção</a><a href="../index.html">As três postagens</a></nav><main>${previews}</main></html>`)
 await page.setViewportSize({width:1300,height:1000});await page.goto(pathToFileURL(path.join(dir,'index.html')).href);await page.evaluate(async()=>await Promise.all([...document.images].map(i=>i.decode())))
 await page.screenshot({path:path.join(dir,'previa.png'),fullPage:true})
 report.push({id,slides:data.slides.length,copySha256:crypto.createHash('sha256').update(JSON.stringify(data.slides)).digest('hex'),issues:checks.flatMap(c=>c.issues),missing:checks.reduce((s,c)=>s+c.missing,0),dir})
 await page.close()
}
 fs.writeFileSync(path.join(work,'verificacao-layout.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}finally{await browser.close()}
