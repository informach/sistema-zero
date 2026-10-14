import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const target=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p04-arquivos-no-computador/apoio')
const ir=JSON.parse(fs.readFileSync('output/instagram/refazer-3-2026-10-13/world-original.json','utf8'))
const thumb='data:image/png;base64,'+fs.readFileSync('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele/apoio/v3/ambiente-manha.png').toString('base64')
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1280,height:820},deviceScaleFactor:1})
 await page.goto('http://127.0.0.1:5181/',{waitUntil:'networkidle'})
 const prefix='/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/'
 await page.evaluate(async({prefix,ir,thumb})=>{
  const {createEmptyProject}=await import(prefix+'core/project.ts')
  const {replaceLocalProject}=await import(prefix+'persistence/local.ts')
  const {generateProjectFiles}=await import(prefix+'generators/project.ts')
  const {buildWorkspaceStateFromIR}=await import(prefix+'blockly/workspaceState.ts')
  const p=createEmptyProject('marketing-p04-demonstracao','Aventura na floresta')
  p.ir=ir;p.files=generateProjectFiles({ir,projectName:p.name})
  p.installedExtensions=[{id:'world-3d',version:'1.0.0',installedAt:Date.now()}]
  p.blocksState=buildWorkspaceStateFromIR(ir)
  await replaceLocalProject(p)
  const {writeProjectThumb}=await import(prefix+'state/persistence.ts')
  const {buildCloudThumb}=await import(prefix+'cover/cloudThumb.ts')
  const small=await buildCloudThumb(thumb)
  if(!small||!await writeProjectThumb(p.id,small))throw Error('Miniatura não guardada')
 },{prefix,ir,thumb})
 await page.reload({waitUntil:'networkidle'})
 await page.evaluate(async prefix=>{
  const deps='/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/node_modules/.vite/deps/'
  const ReactModule=await import(deps+'react.js')
  const React=ReactModule.default||ReactModule
  const DOM=await import(deps+'react-dom_client.js')
  const createRoot=DOM.createRoot||DOM.default.createRoot
  const {ProjectList}=await import(prefix+'projects/ProjectList.tsx')
  const root=document.createElement('div');root.id='marketing-project-list'
  document.body.replaceChildren(root)
  createRoot(root).render(React.createElement(ProjectList,{theme:'light',showExamples:false,onOpenProject:()=>{}}))
 },prefix)
 await page.getByText('Aventura na floresta',{exact:true}).waitFor()
 await page.evaluate(()=>document.fonts.ready)
 await page.screenshot({path:path.join(target,'06-lista-real.png'),clip:{x:40,y:30,width:600,height:535}})
 await page.screenshot({path:path.join(target,'06-lista-real-inteira.png')})
 fs.writeFileSync(path.join(target,'captura-lista.json'),JSON.stringify({url:'http://127.0.0.1:5181/',viewport:{width:1280,height:820},project:'marketing-p04-demonstracao',name:'Aventura na floresta',source:'ProjectList real, navegador isolado, armazenamento local; nenhuma conta ou publicação alterada',body:await page.locator('body').innerText()},null,2))
 console.log(await page.locator('body').innerText())
}finally{await browser.close()}
