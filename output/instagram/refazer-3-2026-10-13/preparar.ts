import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createRequire} from 'node:module'
import {world3DRuntime} from '../../../packages/studio/src/official-extensions/world-3d/runtime'
import {gameKit3DRuntime} from '../../../packages/studio/src/official-extensions/game-3d-advanced/runtime'
import {gameKitRuntime} from '../../../packages/studio/src/official-extensions/game-2d-advanced/runtime'
import {generateProjectFiles} from '../../../packages/studio/src/generators/project'
import {meuMundoExample} from '../../../packages/studio/src/official-extensions/world-3d/examples'
import {saltoNasNuvensExample} from '../../../packages/studio/src/official-extensions/game-3d-advanced/examples'
import {batalhaProfissionalExample} from '../../../packages/studio/src/official-extensions/game-2d-advanced/examples/batalhaProfissionalExample'
const work=resolve(import.meta.dir)
const require=createRequire(resolve('packages/studio/package.json'))
for(const [name,runtime] of [['world',world3DRuntime],['nuvens',gameKit3DRuntime]]) {
 writeFileSync(resolve(work,name+'-entry.js'),runtime)
 const result=await Bun.build({entrypoints:[resolve(work,name+'-entry.js')],outdir:work,naming:name+'-runtime.js',target:'browser',minify:true,plugins:[{name:'three-local',setup(build){build.onResolve({filter:/^three(?:\/|$)/},args=>({path:require.resolve(args.path)}))}}]})
 if(!result.success)throw new Error(JSON.stringify(result.logs))
}
writeFileSync(resolve(work,'batalha-runtime.js'),gameKitRuntime)
for(const [name,ex] of [['world',meuMundoExample],['nuvens',saltoNasNuvensExample],['batalha',batalhaProfissionalExample]] as const) {
 const files=generateProjectFiles({ir:ex.ir,projectName:ex.name})
 writeFileSync(resolve(work,name+'-original.js'),files['script.js'])
 writeFileSync(resolve(work,name+'-original.json'),JSON.stringify(ex.ir,null,2))
}
console.log('Runtimes e exemplos preparados.')
