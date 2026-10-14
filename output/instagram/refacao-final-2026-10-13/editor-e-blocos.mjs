import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const root=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele/apoio/v3')
const work=path.resolve('output/instagram/refazer-3-2026-10-13')
const ir=JSON.parse(fs.readFileSync(path.join(work,'world-original.json'),'utf8'))
const prefix='/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/'
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader']})
try{
 const p=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1})
 await p.goto('http://127.0.0.1:5181')
 const id=await p.evaluate(async({ir,prefix})=>{
  const {createEmptyProject}=await import(prefix+'core/project.ts')
  const {replaceLocalProject}=await import(prefix+'persistence/local.ts')
  const {generateProjectFiles}=await import(prefix+'generators/project.ts')
  const {buildWorkspaceStateFromIR}=await import(prefix+'blockly/workspaceState.ts')
  let project=createEmptyProject('marketing-world-v3','Meu Mundo')
  project.ir=ir;project.files=generateProjectFiles({ir,projectName:'Meu Mundo'})
  project.installedExtensions=[{id:'world-3d',version:'1.0.0',installedAt:Date.now()}]
  project.blocksState=buildWorkspaceStateFromIR(ir)
  await replaceLocalProject(project);return project.id
 },{ir,prefix})
 await p.goto('http://127.0.0.1:5181/editor/'+id)
 await p.waitForTimeout(6000)
 await p.evaluate(async prefix=>{
  const {Blockly}=await import(prefix+'blockly/setup.ts')
  const ws=Blockly.getMainWorkspace();ws.zoomToFit();ws.scrollCenter()
  const block=ws.getAllBlocks(false).find(x=>x.type==='sz_w3d_car_boost')
  if(block)block.select()
 },prefix)
 await p.waitForTimeout(3000)
 let started=false
 for(const f of p.frames()){
  const button=f.getByRole('button',{name:'Começar o passeio'});if(await button.isVisible().catch(()=>false)){await button.click();await p.waitForTimeout(700);console.log('Preview after click',await f.locator('body').innerText());started=true;break}
 }
 if(!started)throw Error('Não encontrou o botão de início no preview')
 await p.waitForTimeout(1000)
 await p.screenshot({path:path.join(root,'estudio-turbo.png')})
 await p.evaluate(async({ir,prefix})=>{
  const {Blockly,ensureBlocklyInitialized,szTheme}=await import(prefix+'blockly/setup.ts')
  const {registerExtensionBlocks}=await import(prefix+'blockly/blocks/index.ts')
  const {buildWorkspaceStateFromIR}=await import(prefix+'blockly/workspaceState.ts')
  const exp=await import(prefix+'official-extensions/world-3d/blocks.ts')
  ensureBlocklyInitialized();registerExtensionBlocks(Object.entries(exp).find(([k,v])=>k.endsWith('Blocks')&&Array.isArray(v))[1])
  document.body.innerHTML='<div id="blocks" style="width:1280px;height:880px"></div>';document.body.style.margin='0'
  const ws=Blockly.inject(document.getElementById('blocks'),{readOnly:true,theme:szTheme,renderer:'zelos',scrollbars:false})
  const rows=ir.behavior.start.filter(n=>['w3d:terrain','w3d:dayNight'].includes(n.type))
  Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR({version:2,html:[],css:[],extensions:[{extensionId:'world-3d'}],behavior:{start:rows,events:[],loops:[]}}),ws)
  ws.setScale(1.8)
 },{ir,prefix})
 await p.waitForTimeout(300)
 await p.locator('.blocklyBlockCanvas').screenshot({path:path.join(root,'blocos-morros-ciclo.png')})
 console.log('Editor e blocos atuais capturados.')
}finally{await browser.close()}
