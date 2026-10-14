import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const old=path.resolve('output/instagram/refazer-3-2026-10-13')
const out=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p34-a-ideia-veio-dele/apoio/v3')
const server=http.createServer((req,res)=>{
 const f=path.join(old,path.basename(new URL(req.url,'http://localhost').pathname))
 if(!fs.existsSync(f)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(f))
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const p=await browser.newPage({viewport:{width:1280,height:720}})
 await p.clock.install({time:new Date('2026-10-13T12:00:00Z')});await p.clock.pauseAt(new Date('2026-10-13T12:00:01Z'))
 await p.goto(`http://127.0.0.1:${server.address().port}/batalha-antes.html`)
 await p.getByRole('button',{name:'Começar',exact:true}).click();await p.clock.runFor(100)
 await p.evaluate(()=>{Math.random=()=>0.5;SZGameKit.pkmBattleTrainer('Alice',()=>{SZGameKit.pkmTrainerCreature('Folhito',5);SZGameKit.pkmTrainerCreature('Pingo',6);SZGameKit.pkmTrainerCreature('Braseiro',7)})})
 await p.clock.runFor(100)
 for(let i=0;i<4;i++){await p.keyboard.down('Space');await p.clock.runFor(32);await p.keyboard.up('Space');await p.clock.runFor(800)}
 await p.keyboard.down('Space');await p.clock.runFor(32);await p.keyboard.up('Space')
 for(let i=0;i<4;i++){await p.clock.runFor(96);await p.screenshot({path:path.join(out,`impacto-${i}.png`)})}
 console.log('Quatro quadros da animação real de Brasa capturados.')
}finally{await browser.close();await new Promise(r=>server.close(r))}
