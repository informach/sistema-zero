import fs from 'node:fs'
import path from 'node:path'
import {open,shot,close,targets} from './capturar.mjs'
const report={}
try{
for(const variant of (process.argv.includes('--resto')?[]:['antes','depois'])){
 const w=await open('world',variant);await w.getByRole('button',{name:'Começar o passeio'}).click();await w.clock.runFor(600)
 await shot(w,'world','mundo-'+variant+'-inicio')
 await w.keyboard.down('ArrowUp');await w.keyboard.down('Shift');await w.clock.runFor(700)
 await shot(w,'world','turbo-'+variant)
 report['world-'+variant]=await w.evaluate(()=>({x:SZWorld3D.carPos('x'),z:SZWorld3D.carPos('z'),speed:SZWorld3D.carSpeed()}))
 await w.keyboard.up('ArrowUp');await w.keyboard.up('Shift')
 await w.evaluate(()=>SZWorld3D.cameraMode('cinema'));await w.clock.runFor(300)
 await shot(w,'world','mundo-'+variant+'-panorama');await w.close()
}
for(const variant of ['antes','depois']){
 const p=await open('nuvens',variant);await p.getByRole('button',{name:'Pular',exact:true}).click();await p.clock.runFor(900)
 const snap=()=>p.evaluate(()=>{let h;SZGameKit3D.forEachAlive('heroi',e=>h=e);return {state:SZGameKit3D.state(),x:SZGameKit3D.posOf(h,'x'),y:SZGameKit3D.posOf(h,'y'),z:SZGameKit3D.posOf(h,'z'),coins:SZGameKit3D.countAlive('moeda')}})
 console.log(variant,'start',await snap());await shot(p,'nuvens','salto-'+variant+'-inicio')
 await p.keyboard.down('ArrowLeft');await p.keyboard.down('ArrowDown');await p.keyboard.down('Space');await p.clock.runFor(350)
 await p.keyboard.up('ArrowDown');await p.keyboard.up('Space');await p.clock.runFor(575);await p.keyboard.up('ArrowLeft')
 console.log(variant,'land',await snap());await shot(p,'nuvens','salto-'+variant+'-pulo')
 await p.clock.runFor(250)
 await p.keyboard.down('ArrowLeft');await p.clock.runFor(90);await p.keyboard.up('ArrowLeft');await p.clock.runFor(80)
 await p.keyboard.down('ArrowUp');await p.clock.runFor(100);await p.keyboard.up('ArrowUp');await p.clock.runFor(80)
 await p.evaluate(()=>{SZGameKit3D.cameraOrbit(20);SZGameKit3D.cameraAngle(15,35);SZGameKit3D.cameraLookAtPoint(5,15,-1)});await p.clock.runFor(50)
 report['nuvens-'+variant]=await snap();await shot(p,'nuvens','salto-'+variant+'-fim');await p.close()
}
for(const variant of ['antes','depois']){
 const p=await open('batalha',variant);await p.getByRole('button',{name:'Começar',exact:true}).click();await p.clock.runFor(100)
 // Inicia a luta original pela API pública; ficha, nível, golpes e resultado usam o motor original.
 await p.evaluate(()=>{Math.random=()=>0.5;SZGameKit.pkmBattleTrainer('Alice',()=>{SZGameKit.pkmTrainerCreature('Folhito',5);SZGameKit.pkmTrainerCreature('Pingo',6);SZGameKit.pkmTrainerCreature('Braseiro',7)})})
 await p.clock.runFor(100);await shot(p,'batalha','batalha-'+variant+'-inicio')
 let frames=[]
 for(let i=0;i<8;i++){await p.keyboard.down('Space');await p.clock.runFor(32);await p.keyboard.up('Space');await p.clock.runFor(800);frames.push(await p.locator('body').innerText());await shot(p,'batalha','batalha-'+variant+'-'+i)}
 report['batalha-'+variant]=frames;await p.close()
}
}finally{fs.writeFileSync(path.resolve('output/instagram/refazer-3-2026-10-13/partidas.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await close()}
