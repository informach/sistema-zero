import {mkdirSync,writeFileSync,copyFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gameTwoDRuntime} from '../../../packages/studio/src/official-extensions/game-2d/runtime'
import {platformerExample} from '../../../packages/studio/src/official-extensions/game-2d/examples/foundations'
import {EXAMPLE_HERO_IMAGE} from '../../../packages/studio/src/official-extensions/game-2d/examples/shared'
import {generateProjectFiles} from '../../../packages/studio/src/generators/project'
const work=resolve(import.meta.dir)
const out=resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p07-primeira-dificuldade/apoio')
mkdirSync(out,{recursive:true})
writeFileSync(resolve(work,'game-runtime.js'),gameTwoDRuntime)
writeFileSync(resolve(out,'mini-plataforma-base.json'),JSON.stringify(platformerExample.ir,null,2))
for(const [variant,destinationX] of [['antes',240],['depois',180]] as const){
 const ir:any=structuredClone(platformerExample.ir)
 const setup=ir.behavior.start.find((n:any)=>n.type==='g2d:setupStage');setup.bg='#e8f3fc'
 const index=ir.behavior.start.findIndex((n:any)=>n.varName==='heroi')
 ir.behavior.start[index]={type:'g2d:createImageSprite',varName:'heroi',x:64,y:128,w:36,h:36,image:EXAMPLE_HERO_IMAGE}
 ir.behavior.start.push({type:'g2d:createSprite',varName:'inicio',x:0,y:164,w:100,h:36,color:'#16a34a'},{type:'g2d:createSprite',varName:'destino',x:destinationX,y:110,w:80,h:90,color:'#16a34a'})
 ir.behavior.loops[0].body=[
  {type:'g2d:clear'},
  {type:'g2d:applyGravity',spriteVar:'heroi'},
  {type:'g2d:platformer',spriteVar:'heroi',ctxVar:'ctx',speed:4,jump:11},
  {type:'g2d:collidePlatform',spriteVar:'heroi',otherVar:'inicio'},
  {type:'g2d:collidePlatform',spriteVar:'heroi',otherVar:'destino'},
  {type:'g2d:clampToScreen',spriteVar:'heroi',ctxVar:'ctx'},
  {type:'g2d:drawSprite',spriteVar:'inicio',ctxVar:'ctx'},
  {type:'g2d:drawSprite',spriteVar:'destino',ctxVar:'ctx'},
  {type:'g2d:drawSprite',spriteVar:'heroi',ctxVar:'ctx'}
 ]
 const files=generateProjectFiles({ir,projectName:'Mini plataforma · P07'})
 writeFileSync(resolve(out,`mini-plataforma-${variant}.js`),files['script.js'])
 writeFileSync(resolve(out,`mini-plataforma-${variant}.json`),JSON.stringify(ir,null,2))
}
for(const name of ['nunito-800.woff2','nunito-600.woff2','LICENSE-Nunito'])copyFileSync(resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele/apoio',name),resolve(out,name))
copyFileSync('C:/Users/tocha/.codex/generated_images/01a1177a-9196-73f3-b995-b63ba3002ced/exec-54e000b5-ff31-4b46-b3a9-a149e80a2180.png',resolve(out,'01-dificuldade.png'))
console.log('Duas variantes preparadas com o runtime e o personagem da biblioteca oficiais.')
