import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const work=path.resolve('output/instagram/p04-2026-10-14')
const dest=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p04-arquivos-no-computador')
const sourceFile='docs/marketing/kids/comunidade-dos-criadores/instagram/postagens/01-p01-a-p10.md'
const raw=fs.readFileSync(sourceFile,'utf8').replaceAll('\r\n','\n')
const section=raw.slice(raw.indexOf('## P04 · '),raw.indexOf('\n<a id="p05"'))
const quote=s=>s.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'')).join('\n').trim()
const slides=[...section.matchAll(/### Slide (\d+)[^\n]*\n+([\s\S]*?)(?=\n\*\*Visual:)/g)].map(m=>quote(m[2]).split('\n\n'))
const caption=quote(section.match(/### Legenda\n+([\s\S]*?)(?=\n\*\*Produção:)/)[1])
if(slides.length!==7)throw Error('Copy não tem sete slides')
const title=slides[0].join(' ')
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const alt=[
 'Cena encenada: menina usa o celular no sofá; há um computador com ícones ao fundo.',
 'Cena encenada: mãos seguram um celular com fotos reunidas numa galeria.',
 'Ilustração: três arquivos parecidos têm nomes vagos numa área de trabalho desorganizada.',
 'Cena encenada: menina digita no computador; uma janela ilustrada destaca o nome do arquivo.',
 'Ilustração: pasta Escola com arquivos de nomes claros e o Sistema solar selecionado.',
 'Cena encenada: menina encontra Aventura na floresta na lista de projetos do nosso Estúdio.',
 'Cena encenada: menina mostra à mãe a pasta organizada no computador.'
]
if(alt.some(t=>t.length>100))throw Error('Alt curto com mais de 100 caracteres')
const photo=(name,n)=>`<figure class="media photo"><img src="apoio/${name}.png" alt="${esc(alt[n-1])}"></figure>`
const p=(txt,c='')=>`<p class="copy ${c}">${esc(txt).replace('@criecomhelenaejulio','<strong>@criecomhelenaejulio</strong>')}</p>`
const image=(name,n)=>`<figure class="media diagram"><img src="apoio/${name}.png" alt="${esc(alt[n-1])}"></figure>`
const save=`<div class="save-example" aria-label="Ilustração de uma janela Salvar como"><div class="save-heading"><span>Salvar como</span><span class="breadcrumb"><i></i>Escola</span></div><div class="save-row"><span>Nome do arquivo</span><div class="save-name">Sistema solar<span class="caret"></span></div><div class="save-button">Salvar</div></div></div>`
const elements=[
 `<div class="series">Por trás do jogo</div>${p(slides[0][0],'lead')}${p(slides[0][1],'tail')}${photo('01-capa-foto',1)}`,
 `${photo('02-galeria-foto',2)}${p(slides[1][0],'lead')}${p(slides[1][1],'tail')}`,
 `${p(slides[2][0],'lead')}${image('03-arquivos',3)}${p(slides[2][1],'tail')}`,
 `${p(slides[3][0],'lead')}${photo('04-pratica-foto',4)}${save}${p(slides[3][1],'tail')}`,
 `${p(slides[4][0],'lead')}${image('05-pasta-escola',5)}${p(slides[4][1],'tail')}`,
 `${p(slides[5][0],'lead')}${photo('06-projeto-foto',6)}${p(slides[5][1],'tail')}`,
 `${p(slides[6][0],'lead')}${photo('07-conversa-foto',7)}${p(slides[6][1],'tail')}`
]
const style=`
@font-face{font-family:Nunito;src:url(apoio/nunito-800.woff2);font-weight:800;font-display:block}
@font-face{font-family:Nunito;src:url(apoio/nunito-600.woff2);font-weight:600;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#e8eff8;color:#172a46;font-family:Nunito,Arial,sans-serif}
article{position:relative;width:1080px;height:1350px;overflow:hidden;background:#fffcf4;margin:0 0 24px}
header{position:absolute;left:64px;right:64px;top:44px;display:flex;justify-content:space-between;align-items:center;font-size:22px;font-weight:800;letter-spacing:1.3px;z-index:2}header .dot{display:inline-block;width:11px;height:11px;background:#194bd7;border-radius:50%;margin-right:12px}header .count{font-size:23px;letter-spacing:.5px}
footer{position:absolute;bottom:32px;left:64px;right:64px;display:flex;justify-content:space-between;font-size:22px;font-weight:600;line-height:1.3}.progress{position:absolute;bottom:0;left:0;height:8px;background:#ffdb56}
.content{position:absolute;inset:122px 64px 102px;display:flex;flex-direction:column;gap:28px}.copy{margin:0;font-size:43px;line-height:1.25;font-weight:600;letter-spacing:-.55px;flex:none}.lead{font-weight:800;font-size:54px;line-height:1.16;letter-spacing:-1.1px}.tail{font-size:43px}.series{font-size:23px;font-weight:800;letter-spacing:.6px;color:#172a46;background:#ffdb56;padding:9px 18px;border-radius:8px;align-self:flex-start;line-height:1.2;flex:none}
figure{margin:0}.media{position:relative;overflow:hidden;border-radius:24px;min-height:0;flex:1;background:#e5edf8}.media img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}.diagram{background:#d9e8f9;display:flex;align-items:center}.diagram img{height:auto;object-fit:contain}
.blue{background:#194bd7;color:white}.blue header .dot{background:#ffdb56}.cover .content{gap:24px}.cover .lead{font-size:73px;line-height:1.07;letter-spacing:-1.8px}.cover .tail{font-size:47px;line-height:1.17;font-weight:800;color:#ffdb56}.cover .media{border-radius:28px 28px 10px 10px}
.p04-2 .lead{color:#194bd7;font-size:53px}.p04-2 .media{flex:1.2}.p04-2 .media img{object-position:center 48%}
.p04-3 .lead{font-size:51px}.p04-3 .tail{font-size:45px;border-left:8px solid #ffdb56;padding-left:24px}.p04-3 .media{background:#c3dcf5}.p04-3 .media img{object-fit:cover;height:100%}
.p04-4 .content{gap:23px}.p04-4 .lead{font-size:54px}.p04-4 .media{flex:1.2}.p04-4 .media img{object-position:center 43%}.p04-4 .tail{font-size:43px}
.save-example{background:white;border:2px solid #dae3ef;border-radius:18px;overflow:hidden;flex:none;box-shadow:0 6px 20px #172a4608}.save-heading{padding:12px 22px;background:#edf3fb;display:flex;justify-content:space-between;align-items:center;font-size:27px}.breadcrumb{display:flex;gap:12px;align-items:center}.breadcrumb i{display:block;width:27px;height:19px;background:#ffd14f;border-radius:3px;position:relative}.breadcrumb i:before{content:'';width:14px;height:5px;background:#f5bc35;position:absolute;top:-4px;border-radius:3px 3px 0 0}.save-row{display:flex;align-items:center;gap:20px;padding:19px 22px;font-size:28px}.save-name{flex:1;border:2px solid #6b91e7;padding:12px 16px;border-radius:7px;font-weight:800;font-size:34px;white-space:nowrap}.save-button{padding:14px 22px;background:#194bd7;color:#fff;font-size:29px;font-weight:800;border-radius:8px}.caret{display:inline-block;height:31px;border-right:2px solid #172a46;margin-left:3px;vertical-align:middle}
.p04-5 .content{padding-bottom:8px}.p04-5 .lead{font-size:52px}.p04-5 .tail{font-size:46px;font-weight:800;color:#194bd7;line-height:1.2}.p04-5 .media{flex:1.05}
.p04-6 .lead{font-size:55px}.p04-6 .tail{font-size:45px}.p04-6 .media img{object-position:center}
.follow .lead{font-size:56px;line-height:1.14}.follow .tail{font-size:43px;line-height:1.23}.follow strong{color:#ffdb56;white-space:nowrap;font-size:42px;font-weight:800}.follow .media img{object-position:center}
`
const articles=elements.map((body,i)=>`<article id="slide-${i+1}" class="p04-${i+1} ${i===0?'cover blue':i===6?'follow blue':''}" aria-label="Slide ${i+1} de 7"><header><span><b class="dot"></b>CRIE COM HELENA E JÚLIO</span><span class="count">0${i+1} / 07</span></header><div class="content">${body}</div><footer><span>Comunidade dos Criadores</span><span>${i<6?'Deslize →':'@criecomhelenaejulio'}</span></footer><div class="progress" style="width:${(i+1)/7*100}%"></div></article>`).join('\n')
fs.writeFileSync(path.join(dest,'montagem.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${esc(title)}</title><style>${style}</style><body>${articles}</body></html>`)
fs.writeFileSync(path.join(dest,'legenda.txt'),caption+'\n')
fs.writeFileSync(path.join(dest,'texto-alternativo.txt'),alt.map((a,i)=>`SLIDE ${i+1}\nCurto (${a.length} caracteres): ${a}\n\nLongo: ${a} Texto da arte: ${slides[i].join(' ')}`).join('\n\n')+'\n')
const normalized=s=>s.replace(/\s+/g,' ').trim()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--force-color-profile=srgb']})
const report={source:sourceFile,sourceSectionHash:crypto.createHash('sha256').update(section).digest('hex'),copyEqual:true,slides:[],images:[],errors:[]}
try{
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1})
 await page.goto(pathToFileURL(path.join(dest,'montagem.html')).href,{waitUntil:'load'})
 await page.evaluate(()=>document.fonts.ready)
 report.fonts=await page.evaluate(()=>({normal:document.fonts.check('600 43px Nunito'),bold:document.fonts.check('800 54px Nunito')}))
 if(!report.fonts.normal||!report.fonts.bold)report.errors.push('Fonte não carregada')
 await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())))
 for(let i=0;i<7;i++){
  const article=page.locator('#slide-'+(i+1))
  const text=await article.locator('.copy').allTextContents()
  if(normalized(text.join(' '))!==normalized(slides[i].join(' '))){report.copyEqual=false;report.errors.push('Copy divergente no slide '+(i+1))}
  const layout=await article.evaluate(el=>{
   const content=el.querySelector('.content'),box=content.getBoundingClientRect(),footer=el.querySelector('footer').getBoundingClientRect()
   return {width:el.clientWidth,height:el.clientHeight,contentHeight:box.height,scrollHeight:content.scrollHeight,footerTop:footer.top-el.getBoundingClientRect().top,children:[...content.children].map(c=>{const r=c.getBoundingClientRect();return {kind:c.className,top:r.top-box.top,bottom:r.bottom-box.top,height:r.height,left:r.left-box.left,right:r.right-box.left}}),smallestCopy:Math.min(...[...el.querySelectorAll('.copy')].map(c=>parseFloat(getComputedStyle(c).fontSize)))}
  })
  if(layout.scrollHeight>layout.contentHeight+2||layout.children.some(c=>c.bottom>layout.contentHeight+2||c.left< -1||c.right>952+1))report.errors.push('Layout fora do limite no slide '+(i+1))
  const file=`0${i+1}-p04.png`
  await article.screenshot({path:path.join(dest,file),animations:'disabled'})
  report.slides.push({number:i+1,file,...layout})
 }
 report.images=await page.evaluate(()=>[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight})))
 if(report.images.some(i=>!i.loaded))report.errors.push('Imagem não carregada')
 const cards=slides.map((_,i)=>`<figure><a href="0${i+1}-p04.png"><img src="0${i+1}-p04.png" alt="${esc(alt[i])}"></a><figcaption>Slide ${i+1}</figcaption></figure>`).join('')
 const preview=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P04 · Arquivos no computador</title><style>body{font:17px/1.5 Arial,sans-serif;background:#edf3fb;color:#172a46;margin:0;padding:30px}h1{font-size:30px;line-height:1.25;margin:0 0 18px}nav{display:flex;gap:20px;flex-wrap:wrap;margin:22px 0}a{color:#194bd7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}figure{margin:0;background:#fff;border-radius:13px;overflow:hidden}figure img{display:block;width:100%}figcaption{padding:12px}details{background:white;padding:18px;margin-top:28px;border-radius:12px}pre{white-space:pre-wrap;font:17px/1.6 Arial} @media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}body{padding:18px}h1{font-size:24px}}@media(max-width:500px){.grid{grid-template-columns:1fr}}</style><body><h1>P04 · ${esc(title)}</h1><p>7 slides · 1080 × 1350 · Copy revisada · Cenas novas</p><nav><a href="legenda.txt">Legenda</a><a href="texto-alternativo.txt">Textos alternativos</a><a href="montagem.html">Montagem editável</a><a href="apoio/fontes-e-producao.md">Fontes e produção</a><a href="../index.html">Todas as postagens</a></nav><main class="grid">${cards}</main><details><summary>Leia a legenda</summary><pre>${esc(caption)}</pre></details></body></html>`
 fs.writeFileSync(path.join(dest,'index.html'),preview)
 await page.setViewportSize({width:1300,height:1000});await page.goto(pathToFileURL(path.join(dest,'index.html')).href)
 await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())))
 await page.screenshot({path:path.join(dest,'previa.png'),fullPage:true})
 await page.setViewportSize({width:360,height:780});await page.reload()
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))report.errors.push('Rolagem horizontal na prévia móvel')
 await page.screenshot({path:path.join(work,'previa-mobile.png'),fullPage:true})
}finally{await browser.close()}
fs.writeFileSync(path.join(dest,'apoio/verificacao.json'),JSON.stringify(report,null,2))
fs.writeFileSync(path.join(dest,'apoio/copy.json'),JSON.stringify({id:'P04',title,slides,caption,source:sourceFile},null,2))
console.log(JSON.stringify({slides:report.slides.length,copyEqual:report.copyEqual,loadedImages:report.images.length,errors:report.errors},null,2))
if(report.errors.length)process.exitCode=1
