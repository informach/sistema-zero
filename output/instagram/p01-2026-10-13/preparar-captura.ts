import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { world3DRuntime } from '../../../packages/studio/src/official-extensions/world-3d/runtime'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { meuMundoExample } from '../../../packages/studio/src/official-extensions/world-3d/examples'

const work=resolve(import.meta.dir)
const require=createRequire(resolve('packages/studio/package.json'))
mkdirSync(work,{recursive:true})
const files=generateProjectFiles({ir:meuMundoExample.ir,projectName:'Meu Mundo'})
writeFileSync(resolve(work,'exemplo-original.js'),files['script.js'])
writeFileSync(resolve(work,'world-runtime-entry.js'),world3DRuntime)
const result=await Bun.build({entrypoints:[resolve(work,'world-runtime-entry.js')],outdir:work,naming:'world-runtime.js',target:'browser',minify:true,plugins:[{name:'three-local',setup(build){build.onResolve({filter:/^three(?:\/|$)/},args=>({path:require.resolve(args.path)}))}}]})
if(!result.success)throw new Error(JSON.stringify(result.logs))
writeFileSync(resolve(work,'exemplo-original.json'),JSON.stringify(meuMundoExample.ir,null,2))
console.log(JSON.stringify({built:result.success,scriptTail:files['script.js'].slice(-600),files:Object.keys(files)}))
