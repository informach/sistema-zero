import fs from 'node:fs'
import path from 'node:path'
import {server,browser,shot,close,targets} from './capturar.mjs'
const work=path.resolve('output/instagram/refazer-3-2026-10-13')
let js=fs.readFileSync(path.join(work,'world-original.js'),'utf8').replace('SZWorld3D.grass("media");','').replace('SZWorld3D.engineSound("ligado");','SZWorld3D.engineSound("desligado");')
js=js.replace('SZWorld3D.clearArea(0, 0, 40);','SZWorld3D.clearArea(0, 0, 20);\nSZWorld3D.cameraMode("cinema");')
fs.writeFileSync(path.join(targets.world,'world-ambiente.js'),js)
fs.writeFileSync(path.join(work,'ambiente.html'),`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style><script type="module">import './world-runtime.js';${js}</script>`)
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}})
 await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-13T12:00:01Z'))
 await page.goto('http://127.0.0.1:'+server.address().port+'/ambiente.html')
 await page.getByRole('button',{name:'Começar o passeio'}).click();await page.clock.runFor(800)
 await shot(page,'world','ambiente-manha')
 await page.evaluate(()=>SZWorld3D.setTime('entardecer'));await page.clock.runFor(250)
 await shot(page,'world','ambiente-entardecer')
 console.log('Ambiente com morros, floresta e atmosfera do runtime oficial capturado.')
}finally{await close()}
