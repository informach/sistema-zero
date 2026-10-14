import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader']})
const work=path.resolve('output/instagram/refazer-3-2026-10-13')
const page=await browser.newPage({viewport:{width:1600,height:1000}})
try{
 await page.goto('http://127.0.0.1:5181')
 const ir=JSON.parse(fs.readFileSync(path.join(work,'world-original.json'),'utf8'))
 const result=await page.evaluate(async(ir)=>{
  const {createEmptyProject}=await import('/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/core/project.ts')
  const {replaceLocalProject}=await import('/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/persistence/local.ts')
  const {generateProjectFiles}=await import('/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/generators/project.ts')
  const {buildWorkspaceStateFromIR}=await import('/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/blockly/workspaceState.ts')
  let project=createEmptyProject('marketing-world','Meu Mundo')
  project.ir=ir;project.files=generateProjectFiles({ir,projectName:'Meu Mundo'})
  project.installedExtensions=[{id:'world-3d',version:'1.0.0',installedAt:Date.now()}]
  project.blocksState=buildWorkspaceStateFromIR(ir)
  await replaceLocalProject(project)
  return project.id
 },ir)
 await page.goto('http://127.0.0.1:5181/editor/'+result)
 await page.waitForTimeout(7000)
 console.log((await page.locator('body').innerText()).slice(0,3500))
 await page.evaluate(async()=>{
  const {Blockly}=await import('/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/blockly/setup.ts')
  const ws=Blockly.getMainWorkspace();ws.zoomToFit();ws.scrollCenter()
 })
 for(const f of page.frames()){const b=f.getByRole('button',{name:'Começar o passeio'});if(await b.count()){await b.click();break}}
 await page.waitForTimeout(800)
 await page.screenshot({path:path.join(work,'estudio-world.png')})
}finally{await browser.close()}
