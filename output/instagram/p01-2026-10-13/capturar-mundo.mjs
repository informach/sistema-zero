import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const work=path.resolve('output/instagram/p01-2026-10-13')
const target=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele/apoio')
let source=fs.readFileSync(path.join(work,'exemplo-original.js'),'utf8')
source=source.replace('SZWorld3D.terrain(4, 6);','SZWorld3D.terrain(0, 6);')
source=source.replace('SZWorld3D.dayNight(4);','SZWorld3D.cameraMode("cinema");')
source=source.replace('SZWorld3D.engineSound("ligado");','SZWorld3D.engineSound("desligado");')
source=source.replace('SZWorld3D.clearArea(0, 0, 40);','SZWorld3D.clearArea(0, 0, 27);\nSZWorld3D.roadGrid("organica", 0, 0, 50, 4);\nSZWorld3D.coinsLine(7, -10, 0, 10, 0);')
source=source.replace('SZWorld3D.grass("media");','')
source=source.replace('SZWorld3D.totemText(0, 14, "Meu Mundo", "Dirija com WASD, turbo no Shift. Ache o ponto secreto!");','')
source=source.replace('SZWorld3D.hud("Velocidade: " + Math.round(SZWorld3D.carSpeed()), "topo-direita");','')
fs.writeFileSync(path.join(target,'meu-mundo-variante.js'),source)
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><link rel="icon" href="data:,"><title>Meu Mundo · demonstração local para P01</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#103024;font-family:Arial,sans-serif}</style><script type="module">import './world-runtime.js';\n${source}</script></html>`
fs.writeFileSync(path.join(work,'mundo.html'),html)
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');const file=path.resolve(work,'.'+url.pathname)
 if(!file.startsWith(work+path.sep)){res.writeHead(403).end();return}
 if(!fs.existsSync(file)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader']})
const errors=[]
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1})
 page.on('pageerror',e=>errors.push(e.message))
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto(`http://127.0.0.1:${server.address().port}/mundo.html`,{waitUntil:'networkidle'})
 await page.locator('canvas').first().waitFor({timeout:20000})
 await page.getByRole('button',{name:'Começar o passeio'}).click()
 await page.waitForTimeout(1800)
 await page.screenshot({path:path.join(target,'04-mundo-cinema.png')})
 await page.evaluate(()=>SZWorld3D.cameraMode('topo'))
 await page.waitForTimeout(500)
 await page.screenshot({path:path.join(target,'04-mundo-topo.png')})
 await page.evaluate(()=>SZWorld3D.cameraMode('seguir'))
 await page.waitForTimeout(400)
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(650);await page.keyboard.up('ArrowUp')
 await page.waitForTimeout(200)
 await page.screenshot({path:path.join(target,'04-mundo-jogando.png')})
 const report=await page.evaluate(()=>({canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),car:{x:SZWorld3D.carPos('x'),z:SZWorld3D.carPos('z')}}))
 fs.writeFileSync(path.join(target,'captura-real.json'),JSON.stringify({source:'meuMundoExample, world-3d/examples.ts',adaptations:['terreno plano','rede de caminhos organica','sete moedas no trajeto','camera para captação','sem grama alta, som do motor, totem ou legenda de velocidade'],...report,errors},null,2))
 console.log(JSON.stringify({report,errors}))
 if(errors.length)process.exitCode=1
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
