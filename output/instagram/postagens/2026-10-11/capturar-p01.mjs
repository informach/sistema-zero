import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/postagens/2026-10-11')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const proof = []
try {
  const page = await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1})
  async function move(key, coordinate, value, direction) {
    await page.keyboard.down(key)
    await page.waitForFunction(({coordinate,value,direction}) => direction > 0 ? window.__capture.personagem[coordinate] >= value : window.__capture.personagem[coordinate] <= value, {coordinate,value,direction},{timeout:5000,polling:'raf'})
    await page.keyboard.up(key)
  }
  for(const v of ['a','b']) {
    await page.goto(pathToFileURL(path.join(work, `jogo-${v}.html`)).href)
    await page.waitForFunction(() => window.__capture && document.querySelector('canvas'))
    await page.waitForTimeout(400)
    const canvas=page.locator('canvas').first()
    await canvas.screenshot({path:path.join(work,`capturas/${v}-inicio.png`)})
    const initial=await page.evaluate(()=>({personagem:{x:window.__capture.personagem.x,y:window.__capture.personagem.y},key:{x:window.__capture.chave.x,y:window.__capture.chave.y},hasKey:window.__capture.hasKey}))
    if(v==='a') {
      await move('ArrowRight','x',54,1)
      await canvas.screenshot({path:path.join(work,'capturas/a-aproximando.png')})
      await move('ArrowRight','x',104,1)
    } else {
      await move('ArrowUp','y',45,-1)
      await move('ArrowRight','x',201,1)
    }
    await page.waitForFunction(()=>window.__capture.hasKey)
    await canvas.screenshot({path:path.join(work,`capturas/${v}-coletou.png`)})
    if(v==='b') await move('ArrowDown','y',141,1)
    await move('ArrowRight','x',359,1)
    await page.waitForFunction(()=>window.__capture.won)
    await page.waitForTimeout(1400)
    await canvas.screenshot({path:path.join(work,`capturas/${v}-final.png`)})
    const final=await page.evaluate(()=>({hasKey:window.__capture.hasKey,won:window.__capture.won}))
    proof.push({version:v,initial,final})
  }
  fs.writeFileSync(path.join(work,'verificacao-percursos.json'),JSON.stringify(proof,null,2))
  console.log(JSON.stringify(proof))
} finally { await browser.close() }
