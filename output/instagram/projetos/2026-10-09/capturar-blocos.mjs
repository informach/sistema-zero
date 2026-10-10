import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/projetos/2026-10-09')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 2400, height: 1800 } })
const captures = []
try {
  const p = await context.newPage()
  await p.goto('http://127.0.0.1:5173/')
  for (const key of process.argv[2] ? [process.argv[2]] : ['farol', 'cade', 'nave', 'dino']) {
    const project = JSON.parse(fs.readFileSync(path.join(work, 'jogos', key + '.json'), 'utf8'))
    await p.evaluate(async (project) => {
      const { replaceLocalProject } = await import(
        '/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/persistence/local.ts'
      )
      await replaceLocalProject(project)
    }, project)
    await p.goto('http://127.0.0.1:5173/editor/' + project.id)
    await p.locator('.blocklySvg').first().waitFor({ timeout: 30000 })
    await p.evaluate(() => document.fonts.ready)
    const capture = await p.evaluate(async (key) => {
      const src = await fetch(
        '/@fs/C:/Users/tocha/projects/sistema-zero/packages/studio/src/blockly/blockClipboard.ts',
      ).then((r) => r.text())
      const url = src.match(/import \* as Blockly from "([^"]+)"/)[1]
      const Blockly = await import(url)
      const ws = Blockly.getMainWorkspace()
      const blocks = ws.getAllBlocks(false)
      const selected = blocks.find((b) =>
        key === 'farol'
          ? b.type === 'sz_g2d_on_overlap' && b.toString().includes('sprite farol')
          : key === 'cade'
            ? b.type === 'sz_g2d_on_group_click'
            : key === 'nave'
              ? b.type === 'sz_g2d_on_group_overlap'
              : b.type === 'sz_g2d_every_seconds' &&
                Number(b.getInputTargetBlock('SECS')?.getFieldValue('NUM')) === 5,
      )
      if (!selected)
        throw Error('Bloco não encontrado: ' + key + ' ' + blocks.map((b) => b.type).join(','))
      const root = selected.getRootBlock()
      for (const b of ws.getTopBlocks(false)) if (b !== root) b.moveBy(8000, 8000)
      ws.setScale(Math.min(1.6, 1170 / selected.width))
      ws.centerOnBlock(selected.id)
      let box = selected.getSvgRoot().getBoundingClientRect()
      ws.scroll(ws.scrollX + 300 - box.x, ws.scrollY + 200 - box.y)
      box = selected.getSvgRoot().getBoundingClientRect()
      const clip = {
        x: Math.floor(box.x),
        y: Math.floor(box.y),
        width: Math.ceil(selected.width * ws.scale) + 3,
        height: Math.ceil(selected.height * ws.scale) + 3,
      }
      const descendants = selected.getDescendants(false)
      let mark
      if (key === 'farol') mark = descendants.find((b) => b.type === 'sz_js_if_else')
      if (key === 'cade')
        mark =
          descendants.find((b) => b.type === 'sz_js_var_set' && b.toString().includes('achados')) ||
          descendants.find(
            (b) => b.type === 'sz_js_var_increment' && b.toString().includes('achados'),
          )
      if (key === 'nave')
        mark = descendants.find(
          (b) => b.type === 'sz_js_var_increment' && b.toString().includes('pontos'),
        )
      if (key === 'dino')
        mark = descendants.find(
          (b) =>
            b.type === 'sz_js_if_else' && b.getInputTargetBlock('COND')?.type === 'sz_val_compare',
        )
      if (!mark)
        throw Error(
          'Destaque não encontrado: ' + key + ' ' + descendants.map((b) => b.type).join(','),
        )
      const mb = mark.getSvgRoot().getBoundingClientRect()
      let markBottom = mb.y + mark.height * ws.scale
      if (key === 'farol') {
        const branch = mark.getInputTargetBlock('THEN')
        if (branch) markBottom = branch.getSvgRoot().getBoundingClientRect().bottom
      }
      const highlight = {
        x: mb.x - clip.x,
        y: mb.y - clip.y,
        width: mark.width * ws.scale,
        height: markBottom - mb.y,
      }
      return {
        key,
        clip,
        highlight,
        selected: {
          type: selected.type,
          text: selected.toString(),
          width: selected.width,
          height: selected.height,
        },
        highlightText: mark.toString(),
        scale: ws.scale,
      }
    }, key)
    if (
      capture.clip.x < 210 ||
      capture.clip.x + capture.clip.width > 1550 ||
      capture.clip.y + capture.clip.height > 1750
    )
      throw Error('Recorte fora da área: ' + JSON.stringify(capture))
    await p.screenshot({
      path: path.join(work, 'capturas', key + '-blocos.png'),
      clip: capture.clip,
      scale: 'css',
    })
    captures.push(capture)
    console.log(JSON.stringify(capture))
  }
  const previous = fs.existsSync(path.join(work, 'blocos.json'))
    ? JSON.parse(fs.readFileSync(path.join(work, 'blocos.json'), 'utf8'))
    : []
  fs.writeFileSync(
    path.join(work, 'blocos.json'),
    JSON.stringify(
      [...previous.filter((p) => !captures.some((c) => c.key === p.key)), ...captures],
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
