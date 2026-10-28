import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const {chromium}=createRequire(resolve('packages/studio/package.json'))('@playwright/test')
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
try{
 for(const d of ['2d','3d']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(d,m.type(),m.text().slice(0,350))})
  await page.goto(process.env.SZ_STUDIO_URL??'http://127.0.0.1:5178/')
  await page.locator('input[type=file]').setInputFiles({name:`jardim-${d}.szproject.json`,mimeType:'application/json',buffer:readFileSync(`docs/aulas-interativas/faisca/o-jardim-secreto/jardim-${d}.szproject.json`)})
  await page.waitForURL('**/editor/**')
  const host=page.locator('iframe[title="Pré-visualização"]');await host.waitFor()
  const frame=await host.contentFrame();await frame.locator('canvas').waitFor({timeout:60000})
  await page.waitForTimeout(2000)
  console.log(d,await frame.locator('body').evaluate(()=>({assets:Object.entries(window.__SZGAME_ASSETS_3D??{}).map(([k,v])=>[k,v.dataUrl?.length]),globals:Object.keys(window).filter(k=>k.startsWith('__SZ')).slice(0,25)})))
  await host.screenshot({path:`.cache/jardim-${d}.png`})
  if(errors.length)throw Error(errors.join('\n'))
  console.log(d,'importado e renderizado sem erro de página')
  await page.close()
 }
}finally{await browser.close()}
