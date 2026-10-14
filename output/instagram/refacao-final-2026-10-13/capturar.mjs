import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const work=path.resolve('output/instagram/refacao-final-2026-10-13')
const old=path.resolve('output/instagram/refazer-3-2026-10-13')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens')
const target={world:path.join(base,'p01-uma-ideia-dele/apoio/v3'),nuvens:path.join(base,'p07-primeira-dificuldade/apoio/v3')}
const seed='let seed=314159;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};'
for(const variant of ['antes','depois']){
 let source=fs.readFileSync(path.join(old,'nuvens-original.js'),'utf8')
 if(variant==='antes')source=source.replace('spawn("chao", 7, 1.5, -2)','spawn("chao", 12, 1.5, -2)')
 source=source.replace(/spawn\("(chao|moeda|heroi)", ([-\d.]+), ([-\d.]+), ([-\d.]+)\)/g,(_,m,x,y,z)=>`spawn("${m}", ${x}, ${Number(y)+15}, ${z})`)
 // Direção de fotografia comum: céu claro e luz acima das plataformas elevadas.
 // As regras, distâncias relativas, moedas, força e teclas não são retocadas.
 source=source.replace('sky: "#0b1026"','sky: "#75bcec"').replace('setAmbient(0.5)','setAmbient(0.9)').replace('addLight("#fef3c7", 0, 16, 6, 1.2)','addLight("#fef3c7", 0, 35, 6, 1.5)').replace('vignette: true','vignette: false')
 const clouds=`
  SZGameKit3D.defineMold("nuvem-editorial", {health:1,speed:0},()=>{
   SZGameKit3D.part({shape:"sphere",material:"normal",color:"#ffffff",w:8,h:2,d:3,x:0,y:0,z:0});
   SZGameKit3D.part({shape:"sphere",material:"normal",color:"#ffffff",w:4,h:3.5,d:3,x:-1.8,y:0.5,z:0});
   SZGameKit3D.part({shape:"sphere",material:"normal",color:"#ffffff",w:4.5,h:2.8,d:3,x:1.6,y:0.3,z:0});
  });
 `
 source=source.replace('  // Ao iniciar',clouds+'  // Ao iniciar')
 source=source.replace('    moedas = 0;','    moedas = 0;\n SZGameKit3D.setSky("#368be6", "#d7eeff");\n SZGameKit3D.spawn("nuvem-editorial", -9, 23, -22);\n SZGameKit3D.spawn("nuvem-editorial", 13, 21, -25);\n SZGameKit3D.spawn("nuvem-editorial", 2, 27, -32);')
 fs.writeFileSync(path.join(target.nuvens,`nuvens-${variant}.js`),source)
 fs.writeFileSync(path.join(work,`nuvens-${variant}.html`),`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Arial}</style><script>${seed}</script><script type="module">import './nuvens-runtime.js';${source}</script>`)
}
let world=fs.readFileSync(path.join(old,'world-original.js'),'utf8').replace('engineSound("ligado")','engineSound("desligado")')
world=world.replace('SZWorld3D.clearArea(0, 0, 40);','SZWorld3D.clearArea(0, 0, 20);SZWorld3D.cameraMode("cinema");')
fs.writeFileSync(path.join(target.world,'ambiente.js'),world)
fs.writeFileSync(path.join(work,'ambiente.html'),`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style><script>${seed}</script><script type="module">import './world-runtime.js';${world}</script>`)
const server=http.createServer((req,res)=>{
 const name=path.basename(new URL(req.url,'http://localhost').pathname)
 const root=name.endsWith('-runtime.js')?old:work
 const file=path.join(root,name)
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file))
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader']})
const results={}
async function open(name){
 const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1})
 p.on('pageerror',e=>console.log('ERROR',name,e.message))
 await p.clock.install({time:new Date('2026-10-13T12:00:00Z')});await p.clock.pauseAt(new Date('2026-10-13T12:00:01Z'))
 await p.goto(`http://127.0.0.1:${server.address().port}/${name}.html`)
 return p
}
const shot=(p,game,name)=>p.screenshot({path:path.join(target[game],name+'.png')})
const snap=p=>p.evaluate(()=>{let h;SZGameKit3D.forEachAlive('heroi',e=>h=e);return {x:SZGameKit3D.posOf(h,'x'),y:SZGameKit3D.posOf(h,'y'),z:SZGameKit3D.posOf(h,'z'),coins:SZGameKit3D.countAlive('moeda')}})
const camera=async(p,az,el,dist,x,y,z)=>{await p.evaluate(v=>{SZGameKit3D.cameraOrbit(v.dist);SZGameKit3D.cameraAngle(v.az,v.el);SZGameKit3D.cameraLookAtPoint(v.x,v.y,v.z)},{az,el,dist,x,y,z});await p.clock.runFor(16)}
try{
 for(const variant of ['antes','depois']){
  const p=await open('nuvens-'+variant)
  await p.getByRole('button',{name:'Pular',exact:true}).click();await p.clock.runFor(900)
  await p.keyboard.down('ArrowLeft');await p.keyboard.down('ArrowDown');await p.keyboard.down('Space');await p.clock.runFor(350)
  await p.keyboard.up('ArrowDown');await p.keyboard.up('Space');await p.clock.runFor(575);await p.keyboard.up('ArrowLeft')
  await p.clock.runFor(250)
  await p.keyboard.down('ArrowLeft');await p.clock.runFor(90);await p.keyboard.up('ArrowLeft');await p.clock.runFor(80)
  await p.keyboard.down('ArrowUp');await p.clock.runFor(100);await p.keyboard.up('ArrowUp');await p.clock.runFor(80)
  await camera(p,15,9,19,6,14,-1)
  results[variant]=await snap(p)
  await shot(p,'nuvens','comparacao-'+variant)
  await camera(p,0,7,18,6,13,-1)
  await shot(p,'nuvens','lateral-'+variant)
  await p.close()
 }
 const p=await open('nuvens-antes');await p.getByRole('button',{name:'Pular',exact:true}).click();await p.clock.runFor(900)
 await camera(p,25,18,20,6,16,-1)
 await shot(p,'nuvens','distancia');await p.close()
 const w=await open('ambiente');await w.getByRole('button',{name:'Começar o passeio'}).click();await w.clock.runFor(800)
 for(const period of ['manha','entardecer','noite']){
  await w.evaluate(period=>SZWorld3D.setTime(period),period);await w.clock.runFor(32)
  await shot(w,'world','ambiente-'+period)
 }
 await w.close()
 fs.writeFileSync(path.join(work,'verificacao-capturas.json'),JSON.stringify(results,null,2))
 if(results.antes.coins!==3||results.depois.coins!==2)throw Error('Comparação não confirmou 0/1 moedas')
 if(results.depois.y<16||results.antes.y>=results.depois.y)throw Error('Comparação não confirmou queda/chegada')
 console.log(JSON.stringify(results,null,2))
}finally{await browser.close();await new Promise(r=>server.close(r))}
