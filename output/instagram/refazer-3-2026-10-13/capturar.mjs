import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const work=path.resolve('output/instagram/refazer-3-2026-10-13')
const root=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens')
export const targets={world:path.join(root,'p01-uma-ideia-dele/apoio/v2'),nuvens:path.join(root,'p07-primeira-dificuldade/apoio/v2'),batalha:path.join(root,'p34-a-ideia-veio-dele/apoio/v2')}
const seed='let seed=314159;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};'
for(const game of ['world','nuvens','batalha'])for(const variant of ['antes','depois']){
 let source=fs.readFileSync(path.join(work,game+'-original.js'),'utf8')
 if(game==='world'){
  // Mesmo percurso nas duas variantes; caminho é uma construção oficial do Mundo 3D.
  source=source.replace('SZWorld3D.clearArea(0, 0, 40);','SZWorld3D.clearArea(0, 0, 27);\nSZWorld3D.roadGrid("organica", 0, 0, 50, 4);')
  source=source.replace('SZWorld3D.terrain(4, 6);','SZWorld3D.terrain(0, 6);').replace('SZWorld3D.dayNight(4);','SZWorld3D.cameraMode("seguir");')
  source=source.replace('SZWorld3D.engineSound("ligado");','SZWorld3D.engineSound("desligado");').replace('SZWorld3D.grass("media");','')
  if(variant==='depois')source=source.replace('carBoost(1.5)','carBoost(3)')
 }
 if(game==='nuvens'){
  if(variant==='antes')source=source.replace('spawn("chao", 7, 1.5, -2)','spawn("chao", 12, 1.5, -2)')
  // Elevação comum às duas versões para a queda entre plataformas ficar visível acima do piso.
  source=source.replace(/spawn\("(chao|moeda|heroi)", ([-\d.]+), ([-\d.]+), ([-\d.]+)\)/g,(_,m,x,y,z)=>'spawn("'+m+'", '+x+', '+(Number(y)+15)+', '+z+')')
 }
 if(game==='batalha'&&variant==='depois')source=source.replace('pkmTypeChart("fogo", "planta", 2)','pkmTypeChart("fogo", "planta", 1.5)')
 fs.writeFileSync(path.join(targets[game],game+'-'+variant+'.js'),source)
 const runtime=game==='batalha'?'<script src="./batalha-runtime.js"></script>':''
 const imp=game==='batalha'?'':"import './"+game+"-runtime.js';"
 fs.writeFileSync(path.join(work,game+'-'+variant+'.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Arial;background:#091429}</style><script>${seed};window.__SZSTUDIO_RUNTIME_INSPECTORS={};</script>${runtime}<script type="module">${imp}\n${source}</script></html>`)
}
export const server=http.createServer((req,res)=>{
 const file=path.resolve(work,'.'+new URL(req.url,'http://localhost').pathname)
 if(!file.startsWith(work+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(file))
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
export const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader']})
export async function open(game,variant){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1})
 page.on('pageerror',e=>console.log('ERROR',game,e.message))
 await page.clock.install({time:new Date('2026-10-13T12:00:00Z')})
 await page.clock.pauseAt(new Date('2026-10-13T12:00:01Z'))
 await page.goto(`http://127.0.0.1:${server.address().port}/${game}-${variant}.html`)
 await page.locator('canvas').first().waitFor({timeout:30000})
 return page
}
export async function shot(page,game,name){await page.screenshot({path:path.join(targets[game],name+'.png')})}
export async function close(){await browser.close();await new Promise(r=>server.close(r))}
if(process.argv.includes('--smoke')){
 try{for(const game of ['world','nuvens','batalha']){
  const page=await open(game,'antes');console.log(game,await page.locator('body').innerText())
  await page.screenshot({path:path.join(work,game+'-menu.png')});await page.close()
 }}finally{await close()}
}
