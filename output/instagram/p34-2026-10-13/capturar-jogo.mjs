import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const work=path.resolve('output/instagram/p34-2026-10-13')
const out=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p34-a-ideia-veio-dele/apoio')
const browser=await chromium.launch({channel:'chrome',headless:true})
const captures=[]
try{
 for(const variant of ['original','mais-devagar']){
  const errors=[]
  let js=fs.readFileSync(path.join(out,`quebra-blocos-${variant}.js`),'utf8')
  js=js.replace('  // Quando acontecer','  window.__p34 = { bola, raquete, trace: [] };\n  SZGameKit.onUpdate((dt) => window.__p34.trace.push({dt, x: SZGameKit.propertyOf(bola,"x"), y: SZGameKit.propertyOf(bola,"y")}));\n  // Quando acontecer')
  const file=path.join(work,variant+'.html')
  fs.writeFileSync(file,`<!doctype html><html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;background:#0b1020;width:100%;height:100%;overflow:hidden}</style><script src="game-runtime.js"></script><body><script>${js}</script></body></html>`)
  const page=await browser.newPage({viewport:{width:800,height:600},deviceScaleFactor:1})
  page.on('pageerror',e=>errors.push(e.message))
  await page.clock.install({time:new Date('2026-10-13T12:00:00Z')})
  await page.clock.pauseAt(new Date('2026-10-13T12:00:01Z'))
  await page.goto(pathToFileURL(file).href)
  await page.clock.runFor(1000)
  await page.getByRole('button',{name:'Jogar',exact:true}).click({force:true})
  await page.clock.runFor(500)
  const state=await page.evaluate(()=>({x:SZGameKit.propertyOf(__p34.bola,'x'),y:SZGameKit.propertyOf(__p34.bola,'y'),vx:SZGameKit.velocityOf(__p34.bola,'x'),vy:SZGameKit.velocityOf(__p34.bola,'y'),trace:__p34.trace,canvases:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height}))}))
  await page.locator('canvas').first().screenshot({path:path.join(out,`jogo-${variant}.png`)})
  captures.push({variant,durationMs:500,...state,errors})
  await page.close()
 }
 const passed=captures.every(c=>!c.errors.length&&c.trace.length>10)&&Math.abs((captures[0].x-392)/(captures[1].x-392)-2)<0.1
 const report={source:'packages/studio/src/official-extensions/game-2d-advanced/examples/quebraBlocosExample.ts',runtime:'gameKitRuntime',adaptations:['segunda variante: velocidade inicial da bola reduzida à metade (220/260 → 110/130)','mesmo ponto de partida e mesmo intervalo de 500 ms','sonda de posição sem alteração do desenho do jogo; rastro editorial será acrescentado na montagem'],passed,captures}
 fs.writeFileSync(path.join(out,'captura-real.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({passed,captures:captures.map(({trace,...c})=>({...c,frames:trace.length}))}))
 if(!passed)process.exitCode=1
}finally{await browser.close()}
