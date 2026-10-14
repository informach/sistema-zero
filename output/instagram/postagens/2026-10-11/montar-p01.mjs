import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/postagens/2026-10-11')
const target = path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-mudar-a-chave-muda-o-caminho')
fs.mkdirSync(path.join(target,'apoio'),{recursive:true})
for (const file of ['a-inicio.png','b-inicio.png','a-aproximando.png']) fs.copyFileSync(path.join(work,'capturas',file),path.join(target,'apoio',file))
const copyFile = path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/postagens/01-p01-a-p10.md')
const source = fs.readFileSync(copyFile,'utf8').replace(/\r\n/g,'\n').split('## P02')[0]
const quote = block => block.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,''))
const blocks = source.split(/### Slide \d\n/).slice(1)
const slides = blocks.map(b=>quote(b.split('### Legenda completa')[0]).filter(Boolean))
if(slides.length!==6) throw Error('Esperados seis slides')
const caption=quote(source.split('### Legenda completa')[1]).join('\n').trim()
const alts = blocks.map(b=>b.match(/\*\*Visual\/alt:\*\* (.+)/)[1])
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
function game(version,{route=false,zoom=false,approach=false,tag=''}={}) {
  const pos=version==='a'?[131,176]:[227,69]
  const routePath=version==='a'?'M53 199 L98 199 Q131 199 131 176 L280 176 L340 187 L394 178':'M53 199 L53 69 L227 69 L227 176 L280 176 L340 187 L394 178'
  return `<div class="game ${zoom?'zoom':''}">${tag?`<span class="maptag">${esc(tag)}</span>`:''}<svg xmlns="http://www.w3.org/2000/svg" viewBox="${zoom?(approach?'55 118 140 112':'93 126 100 80'):'0 40 480 195'}" aria-label="${version==='a'?'Chave perto do começo':'Chave mais longe do começo'}"><image href="apoio/${approach?'a-aproximando':version+'-inicio'}.png" x="0" y="0" width="480" height="360"/>${route?`<path d="${routePath}" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" opacity=".95"/><path d="${routePath}" fill="none" stroke="#173fe0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 6"/><circle cx="394" cy="178" r="5" fill="#173fe0" stroke="white" stroke-width="2"/>`:''}<circle cx="${pos[0]}" cy="${pos[1]}" r="23" stroke="#fff" stroke-width="2" fill="none"/><circle cx="${pos[0]}" cy="${pos[1]}" r="27" stroke="#ffc529" stroke-width="2" fill="none"/></svg></div>`
}
const visuals=[
  `<div class="stack">${game('a',{tag:'A'})}${game('b',{tag:'B'})}</div>`,
  `<div class="single"><span class="label">Chave perto do começo.</span>${game('a',{route:true})}<div class="detail-row"><span class="letter">A</span><div class="key-detail">${game('a',{zoom:true})}</div></div></div>`,
  `<div class="single"><span class="label">Chave mais longe do começo.</span>${game('b',{route:true})}<div class="detail-row"><span class="letter">B</span><div class="destination">${game('b',{zoom:false})}</div></div></div>`,
  `<div class="test"><div class="test-close">${game('a',{zoom:true})}<span class="arrow">↓</span></div>${game('a',{approach:true})}</div>`,
  `<div class="stack">${game('a',{route:true,tag:'A'})}${game('b',{route:true,tag:'B'})}</div><div class="steps"><span>Escolher o lugar</span><span>→</span><span>Jogar para conferir</span></div>`,
  `<div class="last-map">${game('a',{approach:true})}<div class="last-detail">${game('a',{zoom:true,approach:true})}</div></div>`
]
const css=`
*{box-sizing:border-box}html,body{margin:0;background:#e4eaf4;color:#112342;font-family:'Segoe UI',Arial,sans-serif}body{width:1080px}article{width:1080px;height:1350px;position:relative;overflow:hidden;background:#fff;margin-bottom:24px}.cover,.closing{background:#194de5;color:white}.eyebrow{position:absolute;left:72px;top:57px;font-size:23px;font-weight:700;letter-spacing:2px;text-transform:uppercase}.eyebrow:before{content:'';display:inline-block;width:14px;height:14px;border-radius:50%;background:#ffc529;margin-right:14px}.inner{position:absolute;left:72px;right:72px;top:130px;bottom:118px;display:flex;flex-direction:column;gap:25px}h1{margin:0;font-size:72px;line-height:1.12;letter-spacing:-2.5px;font-weight:750}p{margin:0;font-size:37px;line-height:1.26;letter-spacing:-.6px}.cover h1{font-size:102px;line-height:1.03;letter-spacing:-4px}.cover p{font-size:39px;max-width:850px}.visual{min-height:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px}.game{position:relative;border-radius:23px;overflow:hidden;background:#153c37;border:3px solid #dce7ee;line-height:0}.game svg{width:100%;height:auto;display:block}.cover .game,.closing .game{border-color:#fff}.stack{display:flex;flex-direction:column;gap:18px}.maptag{position:absolute;left:20px;top:15px;z-index:3;font-size:28px;line-height:1;font-weight:800;background:#ffc529;color:#162640;padding:11px 16px;border-radius:14px;box-shadow:0 3px 0 #0002}.label{font-size:28px;font-weight:700;line-height:1.2;display:block;color:#194de5;margin-bottom:17px}.single{width:100%}.detail-row{height:215px;display:flex;align-items:center;gap:25px;margin-top:24px}.letter{display:flex;align-items:center;justify-content:center;width:154px;height:154px;background:#ffc529;color:#112342;border-radius:40px;font-size:100px;font-weight:800}.key-detail{height:100%;flex:1;overflow:hidden;border-radius:24px;background:#eff4ff;display:flex;align-items:center;justify-content:center}.key-detail .game{width:268px;height:215px;flex:none}.destination{height:215px;flex:1;overflow:hidden;border-radius:24px}.destination .game{width:1450px;height:auto;transform:translate(-735px,-70px)}.destination .game circle{display:none}.test-close{position:relative;display:flex;align-items:center;justify-content:center;max-height:260px;height:260px;margin-bottom:30px}.test-close .game{width:322px;height:258px}.arrow{font-size:135px;color:#194de5;position:absolute;right:70px;bottom:0;font-weight:700;line-height:1}.steps{display:flex;justify-content:space-between;gap:18px;font-size:28px;font-weight:700;color:#194de5;line-height:1.2}.s5 h1{font-size:68px}.s5 p{font-size:36px}.s5 .inner{gap:20px}.s5 .stack{gap:16px}.s5 .visual{gap:18px}.s5 .game svg{height:340px;object-fit:contain}.last-map{position:relative;padding-bottom:190px}.last-detail{position:absolute;right:28px;bottom:0;width:300px;transform:rotate(5deg);filter:drop-shadow(0 14px 8px #082ea840)}.closing h1{font-size:79px}.closing p{font-size:37px}.cta{font-size:31px;font-weight:700;line-height:1.25;background:#ffc529;color:#132444;padding:23px 27px;border-radius:19px;flex:none}.footer{position:absolute;bottom:45px;left:72px;right:72px;display:flex;justify-content:space-between;align-items:center;font-size:22px;line-height:1.2;color:#5c6b84}.cover .footer,.closing .footer{color:white}.page{font-weight:750;font-size:25px}.progress{position:absolute;bottom:0;left:0;height:8px;background:#ffc529}.footer .brand{max-width:660px} 
`
visuals[1]=`<div class="single"><span class="label">Chave perto do começo.</span>${game('a',{route:true}).replace('viewBox="0 40 480 195"','viewBox="0 38 480 265"')}</div>`
visuals[2]=`<div class="single"><span class="label">Chave mais longe do começo.</span>${game('b',{route:true}).replace('viewBox="0 40 480 195"','viewBox="0 38 480 265"')}</div>`
const refinements=`h1{line-height:1.3;font-size:68px}p{line-height:1.3}.inner{bottom:130px}.cover h1{font-size:90px;line-height:1.3}.cover p{line-height:1.3}.cover .stack{width:820px;align-self:center}.closing h1{font-size:76px;line-height:1.3}.closing p{line-height:1.3}.cta,.steps,.label{line-height:1.3}.s5 h1{line-height:1.3}.s5 .game svg{height:350px}.s5 .stack{width:870px;align-self:center}.test-close .game{width:350px;height:260px}.test-close svg{height:100%}.single svg{width:100%;height:auto}.closing .last-detail .game{border-width:4px}`
const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>P01 · Mudar a chave muda o caminho</title><style>'+css+refinements+'</style><body>'+slides.map((s,i)=>`<article id="s${i+1}" class="s${i+1} ${i===0?'cover':''} ${i===5?'closing':''}"><div class="eyebrow">${i===0?'Uma escolha no primeiro jogo':'A Chave do Farol'}</div><main class="inner"><h1>${esc(s[0])}</h1><p>${esc(s[1])}</p><div class="visual">${visuals[i]}</div>${s[2]?`<div class="cta">${esc(s[2])}</div>`:''}</main><footer class="footer"><span class="brand">Helena e Júlio · Comunidade dos Criadores</span><span class="page">0${i+1} / 06${i<5?' →':''}</span></footer><div class="progress" style="width:${(i+1)/6*100}%"></div></article>`).join('')+'</body></html>'
fs.writeFileSync(path.join(target,'montagem.html'),html.replace('<h1>Mudar a chave muda o caminho.</h1>','<h1>Mudar a chave<br>muda o caminho.</h1>'))
fs.writeFileSync(path.join(target,'legenda.txt'),caption+'\n')
fs.writeFileSync(path.join(target,'texto-alternativo.txt'),slides.map((s,i)=>`SLIDE ${i+1}\n${alts[i]}\nTexto da arte: ${s.join(' ')}${i===1?' Chave perto do começo.':i===2?' Chave mais longe do começo.':i===4?' Escolher o lugar. Jogar para conferir.':''}`).join('\n\n')+'\n')
fs.copyFileSync(path.join(work,'verificacao-percursos.json'),path.join(target,'apoio/verificacao-percursos.json'))
const browser=await chromium.launch({channel:'chrome',headless:true})
try {
  const page=await browser.newPage({viewport:{width:1080,height:1400},deviceScaleFactor:1})
  await page.goto(pathToFileURL(path.join(target,'montagem.html')).href)
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('svg image')].map(el=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=el.getAttribute('href')})))})
  const checks=await page.evaluate(()=>[...document.querySelectorAll('article')].map(el=>{
    const rect=el.getBoundingClientRect(),footer=el.querySelector('.footer').getBoundingClientRect(), children=[...el.querySelector('.inner').children].map(x=>({class:x.className||x.tagName,top:x.getBoundingClientRect().top-rect.top,bottom:x.getBoundingClientRect().bottom-rect.top,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}));
    const overflows=[...el.querySelectorAll('h1,p,.cta,.steps,.label')].filter(x=>x.scrollHeight>x.clientHeight+1||x.scrollWidth>x.clientWidth+1).map(x=>({tag:x.tagName,class:x.className,client:[x.clientWidth,x.clientHeight],scroll:[x.scrollWidth,x.scrollHeight]}));
    const visual=el.querySelector('.visual').getBoundingClientRect();
    const mediaInside=[...el.querySelectorAll('.visual>.stack,.visual>.single,.visual>.test,.visual>.last-map')].every(x=>{const r=x.getBoundingClientRect();return r.top>=visual.top-1&&r.bottom<=visual.bottom+1});
    return {id:el.id,dimensions:[rect.width,rect.height],children,overflows,mediaInside,passed:rect.width===1080&&rect.height===1350&&mediaInside&&children.every((c,i)=>c.bottom<footer.top-rect.top-14&&(i===0||c.top>=children[i-1].bottom+10))&&overflows.length===0}
  }))
  for(let i=1;i<=6;i++)await page.locator('#s'+i).screenshot({path:path.join(target,String(i).padStart(2,'0')+'-p01.png')})
  const preview=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>P01 · Conferência</title><style>body{background:#e4eaf4;color:#112342;font:18px 'Segoe UI';margin:24px}main{display:grid;grid-template-columns:repeat(3,324px);gap:18px}img{width:324px;display:block}figure{margin:0}figcaption{padding:8px 0}h1{font-size:25px}a{color:#194de5}</style><h1>P01 · Mudar a chave muda o caminho</h1><p>6 slides · 1080 × 1350 · <a href="legenda.txt">Legenda</a> · <a href="texto-alternativo.txt">Texto alternativo</a></p><main>${slides.map((_,i)=>`<figure><a href="0${i+1}-p01.png"><img src="0${i+1}-p01.png" alt="Slide ${i+1}"></a><figcaption>0${i+1} / 06</figcaption></figure>`).join('')}</main></html>`
  fs.writeFileSync(path.join(target,'index.html'),preview)
  await page.setViewportSize({width:1060,height:1070})
  await page.goto(pathToFileURL(path.join(target,'index.html')).href)
  await page.screenshot({path:path.join(target,'previa.png'),fullPage:true})
  fs.writeFileSync(path.join(target,'apoio/verificacao-layout.json'),JSON.stringify(checks,null,2))
  console.log(JSON.stringify(checks))
  if(checks.some(c=>!c.passed))process.exitCode=1
}finally{await browser.close()}
