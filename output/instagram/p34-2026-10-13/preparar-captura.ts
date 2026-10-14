import {mkdirSync,writeFileSync,copyFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gameKitRuntime} from '../../../packages/studio/src/official-extensions/game-2d-advanced/runtime'
import {quebraBlocosExample} from '../../../packages/studio/src/official-extensions/game-2d-advanced/examples/quebraBlocosExample'
import {generateProjectFiles} from '../../../packages/studio/src/generators/project'
const work=resolve(import.meta.dir)
const target=resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p34-a-ideia-veio-dele/apoio')
mkdirSync(target,{recursive:true})
writeFileSync(resolve(work,'game-runtime.js'),gameKitRuntime)
for(const [variant,factor] of [['original',1],['mais-devagar',0.5]] as const){
 const ir=structuredClone(quebraBlocosExample.ir)
 const velocity=ir.behavior!.start.find((n:any)=>n.type==='gk:setVelocity') as any
 velocity.vx.value=220*factor;velocity.vy.value=260*factor
 const files=generateProjectFiles({ir,projectName:'Quebra-blocos'})
 writeFileSync(resolve(target,`quebra-blocos-${variant}.js`),files['script.js'])
 writeFileSync(resolve(target,`quebra-blocos-${variant}.json`),JSON.stringify(ir,null,2))
}
copyFileSync('output/instagram/avaliacoes/2026-10-09/fontes/daniel-12s.png',resolve(target,'daniel-12s.png'))
copyFileSync('output/instagram/avaliacoes/2026-10-09/fontes/daniel-45s.png',resolve(target,'daniel-45s.png'))
copyFileSync('packages/funnel/public/img/desafio-primeiro-jogo/depo-rafael.webp',resolve(target,'rafael.webp'))
for(const name of ['nunito-800.woff2','nunito-600.woff2','LICENSE-Nunito'])copyFileSync(resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele/apoio',name),resolve(target,name))
console.log('Runtime oficial, duas variantes e referências preparados.')
