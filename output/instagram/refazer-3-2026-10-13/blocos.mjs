import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const work=path.resolve('output/instagram/refazer-3-2026-10-13')
const root=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens')
const out={world:'p01-uma-ideia-dele',nuvens:'p07-primeira-dificuldade',batalha:'p34-a-ideia-veio-dele'}
const browser=await chromium.launch({channel:'chrome',headless:true})
try{for(const [game,types] of [['world',['w3d:carBoost']],['batalha',['gk:pkmTypeChart']],['nuvens',['g3k:platformerKeys']]]){
 const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:2})
 await page.goto('http://127.0.0.1:5181')
 const ir=JSON.parse(fs.readFileSync(path.join(work,game+'-original.json'),'utf8'))
 const blocks=[]
 function walk(n){if(!n||typeof n!=='object')return;if(types.includes(n.type))blocks.push(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}
 walk(ir)
 const result=await page.evaluate(async({blocks,game})=>{
  const prefix='/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/'
  const {Blockly,ensureBlocklyInitialized,szTheme}=await import(prefix+'blockly/setup.ts')
  const {registerExtensionBlocks}=await import(prefix+'blockly/blocks/index.ts')
  const {buildWorkspaceStateFromIR}=await import(prefix+'blockly/workspaceState.ts')
  ensureBlocklyInitialized()
  const ext=game==='world'?'world-3d':game==='nuvens'?'game-3d-advanced':'game-2d-advanced'
  const exports=await import(prefix+'official-extensions/'+ext+'/blocks.ts')
  const defs=Object.entries(exports).find(([k,v])=>k.endsWith('Blocks')&&Array.isArray(v))[1]
  registerExtensionBlocks(defs)
  document.body.innerHTML='<div id="blocks" style="height:800px;width:1200px;"></div>'
  document.body.style.margin='0'
  const ws=Blockly.inject(document.getElementById('blocks'),{readOnly:true,theme:szTheme,renderer:'zelos',scrollbars:false})
  const state=buildWorkspaceStateFromIR({version:2,html:[],css:[],extensions:[{extensionId:ext}],behavior:{start:blocks,events:[],loops:[]}})
  Blockly.serialization.workspaces.load(state,ws)
  const all=ws.getAllBlocks(false);window.mktWs=ws;window.mktBlocks=blocks;window.mktExt=ext;window.mktBuild=buildWorkspaceStateFromIR;window.mktBlockly=Blockly
  ws.setScale(1.5)
  return all.map(b=>({type:b.type,text:b.toString()}))
 },{blocks,game})
 console.log(game,JSON.stringify(result))
 await page.waitForTimeout(300)
 const svg=page.locator('.blocklyBlockCanvas')
 await svg.screenshot({path:path.join(root,out[game],'apoio/v2/blocos-'+game+'.png')})
 for(const variant of ['antes','depois']){
  await page.evaluate(({game,variant})=>{
   const b=structuredClone(window.mktBlocks[0])
   if(game==='world')b.force.value=variant==='antes'?1.5:3
   if(game==='batalha')b.mult.value=variant==='antes'?2:1.5
   const state=window.mktBuild({version:2,html:[],css:[],extensions:[{extensionId:window.mktExt}],behavior:{start:[b],events:[],loops:[]}})
   window.mktWs.clear()
   window.mktBlockly.serialization.workspaces.load(state,window.mktWs)
   const prefix=game==='world'?'sz_w3d_car_boost':game==='batalha'?'sz_gk_pkm_type_chart':'sz_g3k_platformer_keys'
   const focus=window.mktWs.getAllBlocks(false).find(x=>x.type===prefix)
   focus.unplug()
   if(focus.nextConnection?.targetConnection)focus.nextConnection.disconnect()
   for(const top of window.mktWs.getTopBlocks(false))if(top!==focus)top.dispose(false)
   const xy=focus.getRelativeToSurfaceXY();focus.moveBy(20-xy.x,20-xy.y)
  },{game,variant})
  await page.waitForTimeout(100)
  await svg.screenshot({path:path.join(root,out[game],'apoio/v2/bloco-'+game+'-'+variant+'.png')})
 }
 if(game==='world'){
  const rows=ir.behavior.start.filter(n=>['w3d:terrain','w3d:water','w3d:dayNight'].includes(n.type))
  await page.evaluate(rows=>{
   window.mktWs.clear()
   window.mktBlockly.serialization.workspaces.load(window.mktBuild({version:2,html:[],css:[],extensions:[{extensionId:window.mktExt}],behavior:{start:rows,events:[],loops:[]}}),window.mktWs)
  },rows)
  await page.waitForTimeout(200)
  await svg.screenshot({path:path.join(root,out[game],'apoio/v2/blocos-ambiente.png')})
 }
 if(game==='batalha'){
  await page.evaluate(()=>{
   const rows=structuredClone(window.mktBlocks);rows[0].mult.value=1.5
   window.mktWs.clear()
   window.mktBlockly.serialization.workspaces.load(window.mktBuild({version:2,html:[],css:[],extensions:[{extensionId:window.mktExt}],behavior:{start:rows,events:[],loops:[]}}),window.mktWs)
  })
  await page.waitForTimeout(200)
  await svg.screenshot({path:path.join(root,out[game],'apoio/v2/blocos-batalha-depois.png')})
 }
 await page.close()
}}finally{await browser.close()}
