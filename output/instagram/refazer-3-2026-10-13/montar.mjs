import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/refazer-3-2026-10-13')
const folders={P01:'p01-uma-ideia-dele',P34:'p34-a-ideia-veio-dele',P07:'p07-primeira-dificuldade'}
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
function readCopy(id){
 const source=id==='P34'?'09-p31-a-p40.md':'01-p01-a-p10.md'
 const doc=fs.readFileSync(path.join(base,'postagens',source),'utf8')
 const section=doc.split('## '+id+' · ')[1].split(/\n## P\d/)[0]
 const slides=[...section.matchAll(/### Slide (\d+)[^\n]*\n([\s\S]*?)(?=\n###|\n\*\*Produção|$)/g)].map(m=>quoted(m[2]))
 const caption=quoted(section.split('### Legenda')[1]).join('\n\n')
 return {title:section.split('\n')[0].trim(),source,slides,caption}
}
function quoted(s){return s.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'').trimEnd()).join('\n').trim().split(/\n\s*\n/).filter(Boolean)}
const photo=(src,alt)=>`<figure class="media photo"><img src="apoio/v2/${src}.png" alt="${esc(alt)}"></figure>`
const game=(src,alt)=>`<figure class="media game"><img src="apoio/v2/${src}.png" alt="${esc(alt)}"></figure>`
const block=src=>`<div class="block"><img src="apoio/v2/${src}.png" alt="Blocos reais do Estúdio"></div>`
const p=(txt,cl='')=>`<p class="copy ${cl}">${esc(txt).replace('@criecomhelenaejulio','<strong>@criecomhelenaejulio</strong>')}</p>`
function pair(items,{vertical=false}={}){
 return `<div class="media comparisons ${vertical?'vertical':''}">${items.map(i=>`<figure class="compare"><figcaption>${esc(i.label)}</figcaption><img class="comparison-shot" src="apoio/v2/${i.src}.png" alt="${esc(i.alt)}">${i.block?block(i.block):''}</figure>`).join('')}</div>`
}
const alts={
 P01:[
 'André joga no computador, com as mãos no teclado e no mouse. O monitor mostra o carrinho vermelho no mundo de floresta. Cena recriada com referência de sua aparência.',
 'André observa uma partida de carrinho no computador, com as mãos relaxadas, acompanhando o jogo como espectador. Cena recriada.',
 'Captura real do carrinho percorrendo o caminho e recorte do bloco que liga o turbo com força 1.5.',
 'André conversa com Júlio ao lado do computador. Júlio escuta a ideia do filho. Cena recriada.',
 'Duas capturas reais com as mesmas teclas por 700 milissegundos. Turbo 1.5: velocidade 28; turbo 3: velocidade 45. Os blocos mostram a única alteração entre as versões.',
 'Vista real da floresta com relevo ao entardecer. Abaixo, os blocos oficiais do terreno, da água e do ciclo de dia e noite mostram os comandos por trás do cenário.',
 'André e Júlio conversam ao lado do computador. O convite final é para seguir o perfil e conhecer o que existe por trás dos jogos. Cena recriada.'
 ],
 P07:[
 'André começa a fechar o notebook. A imagem acompanha uma situação de frustração com uma atividade, sem retratar um relato real. Cena recriada.',
 'André aponta para o salto que falhou na tela, enquanto Júlio observa a mesma parte. Cena recriada com o jogo da plataforma.',
 'Captura real do Salto nas Nuvens: com a plataforma afastada, o personagem fica abaixo dela depois do salto.',
 'Recorte do bloco real com força do pulo 11 e imagem da plataforma de destino. Duas partes da mesma investigação: força e distância.',
 'Comparação real: plataforma em x 12 e em x 7, mantendo força do pulo 11 e a mesma sequência de teclas. Na segunda versão, o personagem chega e o contador mostra uma moeda.',
 'André e Júlio fazem uma pausa no sofá. André segura um copo de água. Cena recriada.',
 'André sorri depois do teste. O monitor mostra o personagem sobre a plataforma e uma moeda coletada. Cena recriada com referência do jogo real.'
 ],
 P34:[
 'Retrato recriado de Daniel em um novo ambiente. O monitor mostra a plataforma Sistema Zero. A frase do filho é apresentada como algo que Daniel contou ter ouvido.',
 'André faz um gesto de dúvida diante de uma batalha de monstrinhos. Cena recriada para representar a situação da copy; o exemplo não é atribuído a Rafael.',
 'Bloco real da tabela de tipos e cena da batalha entre o monstrinho de fogo e o de planta, mostrando onde a regra pode mudar.',
 'Captura real de Faisco usando Brasa contra Folhito, junto do bloco fogo contra planta com multiplicador 2.',
 'A mesma luta com a mesma escolha de golpe: multiplicador 2 e multiplicador 1.5. A barra de vida do monstrinho de planta fica maior na segunda versão.',
 'Tabela real de seis relações entre fogo, planta e água. Uma linha determina a vantagem de fogo contra planta.',
 'Retrato recriado de Rafael, sem captura de jogo. A fala literal relata que ele compartilhou o link com um amigo.',
 'Daniel e Rafael conversam à mesa, com um caderno de desenhos. Cena recriada, acompanhada do convite para perguntar o que a criança mudaria num jogo.'
 ]}
const styles=`
@font-face{font-family:Nunito;src:url(apoio/nunito-800.woff2);font-weight:800;font-display:block}
@font-face{font-family:Nunito;src:url(apoio/nunito-600.woff2);font-weight:600;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#dce5f4;color:#172a46;font-family:Nunito,Arial,sans-serif}
article{position:relative;width:1080px;height:1350px;overflow:hidden;background:#fffcf4;margin:0 0 24px}
header{position:absolute;top:43px;left:64px;right:64px;display:flex;justify-content:space-between;font-size:22px;font-weight:800;letter-spacing:1.7px}
header .dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#194bd7;margin-right:13px}header b{letter-spacing:0;font-size:25px}
.series{background:#ffdb56;color:#172a46;border-radius:999px;padding:5px 14px;font-size:18px;letter-spacing:.3px;line-height:1.15}
footer{position:absolute;bottom:35px;left:64px;right:64px;display:flex;justify-content:space-between;font-size:23px;font-weight:600;line-height:1.3}
.progress{position:absolute;height:9px;bottom:0;left:0;background:#ffdb56}
.content{position:absolute;inset:126px 64px 107px;display:flex;flex-direction:column;gap:28px;justify-content:space-between}
p,figure{margin:0}.copy{flex:none;font-size:42px;line-height:1.24;font-weight:600;letter-spacing:-.4px}.copy strong{font-weight:800}
.lead{font-size:53px;line-height:1.15;font-weight:800;letter-spacing:-1.1px}
.quote{font-size:58px;line-height:1.13;font-weight:800;color:#194bd7}
.media{flex:1;min-height:0;position:relative;overflow:hidden;border-radius:26px}
.media img{display:block;width:100%;height:100%}
.photo{background:#e7ded3;max-height:635px}.photo img{object-fit:cover;object-position:left center}
.game{background:#0c1320;display:flex;align-items:center;justify-content:center}
.game img{object-fit:contain}
.block{flex:none;width:100%;padding:18px 22px;border-radius:18px;background:#fff9ed;display:flex;align-items:center;justify-content:center}
.block img{display:block;width:100%;max-height:165px;object-fit:contain}
.with-block{display:flex;flex-direction:column;gap:20px;flex:1;min-height:0}.with-block .game{flex:1}
.blue{background:#194bd7;color:#fff}.blue header .dot{background:#ffdb56}.blue .quote{color:#ffdb56}
.cover .lead{font-size:77px;line-height:1.07;letter-spacing:-2px}.cover .copy:not(.lead){font-size:40px;line-height:1.22}
.cover .media{margin-top:4px}.cover .content{gap:30px}
.follow .lead{font-size:62px;line-height:1.12}.follow .last{font-size:43px}
.follow strong{color:#ffdb56;white-space:nowrap;font-size:41px}.follow .photo{flex:1}
.comparisons{display:flex;gap:24px;align-items:stretch;background:#e8eefb;padding:22px}
.compare{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:16px}
.compare figcaption{font-size:34px;font-weight:800;color:#194bd7;line-height:1.15}
.comparison-shot{width:100%;height:auto!important;object-fit:contain;border-radius:12px;background:#091429}
.compare .block{padding:10px;border-radius:12px}.compare .block img{max-height:120px}
.comparisons.vertical{flex-direction:column;gap:20px;padding:20px;background:#e8eefb}
.vertical .compare{flex-direction:row;align-items:center;gap:18px;flex:1 1 0;min-height:0}
.vertical figcaption{width:178px;flex:none;font-size:31px}
.vertical .comparison-shot{width:calc(100% - 196px);height:100%!important;max-height:100%;min-height:0;object-fit:contain}
.pair-lead{font-size:45px}
.tablemedia{padding:28px;background:#f5edda;display:flex;align-items:center;justify-content:center}.tablemedia img{object-fit:contain;width:100%;height:100%}.tablewrap{position:relative;height:100%;width:auto;max-width:100%;aspect-ratio:1638/1206}.row-highlight{position:absolute;left:2.6%;right:0.7%;top:12.2%;height:14%;border:5px solid #ffcf26;border-radius:12px;pointer-events:none}
.splitview{display:grid;grid-template-columns:1fr;grid-template-rows:1fr 1fr;gap:18px;background:#ecf1fb;padding:18px}
.splitview img{object-fit:contain;background:#091429;border-radius:16px;min-height:0}
.portrait .lead{font-size:44px}.portrait .photo{flex:1}.portrait .quote{font-size:55px}.byline{font-size:32px;font-weight:800;color:#194bd7}
.p01-1 .lead{font-size:85px}.p01-2 .lead{font-size:65px;color:#194bd7}
.p01-4 .lead{font-size:43px}.p01-4 .quote{font-size:61px}.p01-4 .last{font-size:40px}
.p01-6 .lead{font-size:50px}
.p01-6 .block img{max-height:310px}
.p07-1 .lead{font-size:83px}.p07-3 .lead{font-size:46px}.p07-4 .lead{font-size:52px}.p07-4 .quote{font-size:53px}
.p07-5 .lead{font-size:42px}.p07-5 .content{gap:20px}.p07-5 .block img{max-height:116px}
.p07-5 .quote{font-size:44px;line-height:1.16}
.p07-6 .lead{font-size:48px}
.p34-1 .lead{font-size:80px}.p34-2 .lead{font-size:49px}.p34-5 .lead{font-size:46px}.p34-6 .lead{font-size:49px}
.p34-6 .quote{font-size:46px}
.photo-label{position:absolute;bottom:18px;left:18px;background:#fffcf4;color:#172a46;padding:10px 18px;font-size:27px;font-weight:800;border-radius:14px}
.p34-8 .lead{font-size:52px}
`
function build(id,s,alts){
 return s.map((t,i)=>{
  const n=i+1,cls=[id.toLowerCase()+'-'+n]
  let parts=[]
  if(n===1){cls.push('cover','blue');let ph=photo(id==='P01'?'p01-jogando':id==='P07'?'p07-fechar':'p34-daniel',alts[i]);if(id==='P34')ph=ph.replace('</figure>','<figcaption class="photo-label">Daniel, pai do Rafael</figcaption></figure>');parts=[p(t[0],'lead'),p(t[1]),ph]}
  else if(n===s.length){cls.push('follow','blue');parts=[p(t[0],'lead'),photo(id==='P01'?'p01-conversa':id==='P07'?'p07-descoberta':'p34-pai-filho',alts[i]),p(t[1],'last')]}
  else if(id==='P01'){
   if(n===2)parts=[p(t[0],'lead'),photo('p01-assistindo',alts[i]),p(t[1])]
   if(n===3)parts=[p(t[0],'lead'),'<div class="with-block">'+game('turbo-antes',alts[i])+block('bloco-world-antes')+'</div>',p(t[1])]
   if(n===4)parts=[p(t[0],'lead'),p(t[1],'quote'),photo('p01-conversa',alts[i]),p(t[2],'last')]
   if(n===5)parts=[p(t[0],'lead pair-lead'),pair([{label:'Turbo 1,5',src:'turbo-antes',alt:alts[i]},{label:'Turbo 3',src:'turbo-depois',alt:alts[i]}],{vertical:true}),block('bloco-world-depois'),p(t[1])]
   if(n===6)parts=[p(t[0],'lead'),'<div class="with-block">'+game('ambiente-entardecer',alts[i])+block('blocos-ambiente')+'</div>',p(t[1])]
  }else if(id==='P07'){
   if(n===2)parts=[p(t[0],'lead'),photo('p07-investigar',alts[i]),p(t[1])]
   if(n===3)parts=[p(t[0],'lead'),game('salto-antes-fim',alts[i]),p(t[1],'quote')]
   if(n===4)parts=[p(t[0],'lead'),'<div class="with-block">'+block('bloco-nuvens-antes')+game('salto-antes-inicio',alts[i])+'</div>',...t.slice(1).map(txt=>p(txt))]
   if(n===5)parts=[p(t[0],'lead'),pair([{label:'Plataforma distante',src:'salto-antes-fim',alt:alts[i]},{label:'Plataforma mais perto',src:'salto-depois-fim',alt:alts[i]}],{vertical:true}),block('bloco-nuvens-depois'),p(t[1],'quote')]
   if(n===6)parts=[p(t[0],'lead'),photo('p07-pausa',alts[i]),p(t[1])]
  }else if(id==='P34'){
   if(n===2)parts=[p(t[0],'lead'),photo('p34-reclamacao',alts[i]),p(t[1])]
   if(n===3)parts=[p(t[0],'lead'),'<div class="with-block">'+block('bloco-batalha-antes')+game('batalha-antes-1',alts[i])+'</div>',p(t[1])]
   if(n===4)parts=[p(t[0],'lead'),'<div class="with-block">'+game('batalha-antes-5',alts[i])+block('bloco-batalha-antes')+'</div>',p(t[1])]
   if(n===5)parts=[p(t[0],'lead'),pair([{label:'Regra 2 ×',src:'batalha-antes-5',alt:alts[i]},{label:'Regra 1,5 ×',src:'batalha-depois-5',alt:alts[i]}],{vertical:true}),block('bloco-batalha-depois'),p(t[1])]
   if(n===6)parts=[p(t[0],'lead'),'<figure class="media tablemedia"><div class="tablewrap"><img src="apoio/v2/blocos-batalha-depois.png" alt="'+esc(alts[i])+'"><i class="row-highlight"></i></div></figure>',p(t[1],'quote')]
   if(n===7){cls.push('portrait');parts=[p(t[0],'lead'),photo('p34-rafael',alts[i]),p(t[1],'quote'),p(t[2],'byline')]}
  }
  const series={P01:'POR TRÁS DO JOGO',P34:'DIÁRIO DE CRIADOR',P07:'TRADUÇÃO DE CRIANÇA'}
  return `<article id="slide-${n}" class="${cls.join(' ')}"><header><span><i class="dot"></i>CRIE COM HELENA E JÚLIO</span>${n===1?'<span class="series">'+series[id]+'</span>':''}<b>${String(n).padStart(2,'0')} / ${String(s.length).padStart(2,'0')}</b></header><div class="content">${parts.join('')}</div><footer><span>Comunidade dos Criadores</span><span>${n===s.length?'@criecomhelenaejulio':'Deslize →'}</span></footer><div class="progress" style="width:${n/s.length*100}%"></div></article>`
 }).join('\n')
}
const browser=await chromium.launch({channel:'chrome',headless:true})
const results=[]
try{
for(const id of ['P01','P34','P07']){
 const dir=path.join(base,'producao/postagens',folders[id]);const data=readCopy(id)
 if(data.slides.length!==(id==='P34'?8:7))throw Error(id+' count '+data.slides.length)
 const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>'+esc(data.title)+'</title><style>'+styles+'</style>'+build(id,data.slides,alts[id])+'</html>'
 fs.writeFileSync(path.join(dir,'montagem.html'),html)
 fs.writeFileSync(path.join(dir,'legenda.txt'),data.caption+'\n')
 fs.writeFileSync(path.join(dir,'texto-alternativo.txt'),data.slides.map((t,i)=>'Slide '+(i+1)+'\n'+alts[id][i]+'\n\nTexto da arte: '+t.join(' ')).join('\n\n')+'\n')
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1})
 await page.goto(pathToFileURL(path.join(dir,'montagem.html')).href)
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))})
 const checks=await page.evaluate(()=>{
  return [...document.querySelectorAll('article')].map(a=>{
   const box=a.getBoundingClientRect(),content=a.querySelector('.content')
   const parts=[...content.children].map(e=>{const r=e.getBoundingClientRect();return {class:e.className,x:r.x-box.x,y:r.y-box.y,w:r.width,h:r.height}})
   const issues=[]
   for(const x of parts)if(x.y+x.h>1248||x.y<110||x.h<1)issues.push(x)
   return {id:a.id,copy:[...a.querySelectorAll('.copy')].map(e=>e.textContent),parts,issues,missingImages:[...a.querySelectorAll('img')].filter(i=>!i.naturalWidth).length}
  })
 })
 for(let i=0;i<data.slides.length;i++){
  if(JSON.stringify(checks[i].copy)!==JSON.stringify(data.slides[i]))throw Error('Copy '+id+' '+i)
  const name=String(i+1).padStart(2,'0')+'-'+id.toLowerCase()+'.png'
  await page.locator('#slide-'+(i+1)).screenshot({path:path.join(dir,name)})
 }
 fs.writeFileSync(path.join(dir,'apoio/v2/verificacao-layout.json'),JSON.stringify(checks,null,2))
 const thumbs=data.slides.map((_,i)=>`<a href="${String(i+1).padStart(2,'0')}-${id.toLowerCase()}.png"><img src="${String(i+1).padStart(2,'0')}-${id.toLowerCase()}.png" alt="${esc(alts[id][i])}"><span>Slide ${i+1}</span></a>`).join('')
 fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${id} · ${esc(data.title)}</title><style>@font-face{font-family:Nunito;src:url(apoio/nunito-800.woff2)}body{font-family:Nunito,Arial;background:#edf1f9;color:#172a46;margin:30px}h1{max-width:1050px;font-size:30px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;max-width:1300px}a{color:#194bd7;text-decoration:none}main a{background:white;border-radius:16px;overflow:hidden}img{display:block;width:100%;height:auto}span{display:block;padding:12px}nav{margin:20px 0}nav a{margin-right:20px}@media(max-width:720px){main{grid-template-columns:1fr}}</style><h1>${id} · ${esc(data.title)}</h1><p>${data.slides.length} slides · 1080 × 1350 · Copy e imagens refeitas em 13/10/2026</p><nav><a href="legenda.txt">Legenda</a><a href="texto-alternativo.txt">Texto alternativo</a><a href="montagem.html">Montagem editável</a><a href="apoio/v2/fontes-e-producao.md">Fontes e produção</a></nav><main>${thumbs}</main></html>`)
 await page.setViewportSize({width:1360,height:1000})
 await page.goto(pathToFileURL(path.join(dir,'index.html')).href);await page.evaluate(()=>document.fonts.ready)
 await page.screenshot({path:path.join(dir,'previa.png'),fullPage:true})
 fs.writeFileSync(path.join(dir,'publicacao.txt'),`${id} · ${data.title}\n\nPublicar somente os ${data.slides.length} arquivos PNG numerados, na ordem. Proporção 4:5, 1080 × 1350. Legenda completa: legenda.txt. Textos alternativos: texto-alternativo.txt.\n\nAs fotos são cenas recriadas com referências de fisionomia, por solicitação da Helena. Não são frames dos depoimentos nem registros das situações narradas. As falas literais permanecem atribuídas às fontes. Capturas de jogo e blocos vêm da ferramenta real. Ver apoio/v2/fontes-e-producao.md.\n\nPrévia, montagem e pasta apoio não fazem parte do carrossel. Nada agendado ou publicado.\n`)
 results.push({id,slides:data.slides.length,issues:checks.flatMap(c=>c.issues),dir})
 await page.close()
}
fs.writeFileSync(path.join(work,'entrega.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results))
}finally{await browser.close()}
