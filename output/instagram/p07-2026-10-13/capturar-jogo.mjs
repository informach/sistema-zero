import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const work=path.resolve('output/instagram/p07-2026-10-13')
const out=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p07-primeira-dificuldade/apoio')
const browser=await chromium.launch({channel:'chrome',headless:true})
const captures=[]
try{
 for(const variant of ['antes','depois']){
  const errors=[]
  let js=fs.readFileSync(path.join(out,`mini-plataforma-${variant}.js`),'utf8')
  js=js.replace('  // Quando acontecer','  window.__p07 = {heroi,inicio,destino,trace:[],record:false};\n  // Quando acontecer')
  js=js.replace('    SZGame2D.clear();','    if (__p07.record && __p07.trace.length >= 38) return;\n    SZGame2D.clear();')
  js=js.replace('    SZGame2D.drawSprite(ctx, heroi);','    SZGame2D.drawSprite(ctx, heroi);\n    if (__p07.record) __p07.trace.push({x:heroi.x,y:heroi.y,onGround:heroi.onGround,onDestination:heroi._groundSupport?.owner===destino});')
  const file=path.join(work,variant+'.html')
  fs.writeFileSync(file,`<!doctype html><html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;background:#e8f3fc;overflow:hidden}canvas{image-rendering:auto}</style><script src="game-runtime.js"></script><body><script>${js}</script></body></html>`)
  const page=await browser.newPage({viewport:{width:320,height:200},deviceScaleFactor:3})
  page.on('pageerror',e=>errors.push(e.message))
  await page.clock.install({time:new Date('2026-10-13T12:00:00Z')})
  await page.clock.pauseAt(new Date('2026-10-13T12:00:01Z'))
  await page.goto(pathToFileURL(file).href)
  await page.clock.runFor(1000)
  const buttons=await page.getByRole('button').allTextContents()
  const start=page.getByRole('button',{name:/^(Começar|Jogar|Iniciar)/i}).first()
  if(await start.isVisible())await start.click({force:true})
  await page.clock.runFor(300)
  await page.evaluate(()=>{__p07.record=true})
  await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowUp')
  await page.clock.runFor(32)
  await page.keyboard.up('ArrowUp')
  await page.clock.runFor(600)
  await page.keyboard.up('ArrowRight')
  const state=await page.evaluate(()=>({x:__p07.heroi.x,y:__p07.heroi.y,onGround:__p07.heroi.onGround,onDestination:__p07.heroi._groundSupport?.owner===__p07.destino,destinationX:__p07.destino.x,trace:__p07.trace,canvases:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height}))}))
  await page.locator('canvas').first().screenshot({path:path.join(out,`jogo-${variant}.png`)})
  captures.push({variant,buttons,...state,errors})
  await page.close()
 }
 const passed=captures.every(c=>!c.errors.length&&c.trace.length===38)&&!captures[0].trace.some(p=>p.onDestination)&&captures[1].onDestination
 const report={source:'platformerExample, game-2d/examples/foundations.ts',runtime:'gameTwoDRuntime',adaptations:['duas plataformas com colisão real','personagem da biblioteca oficial EXAMPLE_HERO_IMAGE e fundo claro','entre antes e depois, apenas destino.x muda: 240 → 180','mesmas teclas, velocidade e força do salto','captura congelada após os mesmos 38 passos de física, sem alterar suas regras'],passed,captures}
 fs.writeFileSync(path.join(out,'captura-real.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({passed,captures:captures.map(({trace,...c})=>({...c,frames:trace.length,landed:trace.some(p=>p.onDestination)}))}))
 if(!passed)process.exitCode=1
}finally{await browser.close()}
