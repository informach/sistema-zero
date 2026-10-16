import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { type CapturePlan, capturePlanSchema } from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import { z } from 'zod'
import { abortable } from '../abortable'
import { captureBattle, readCaptureObservation } from './capture-battle'
import { captureFiles } from './capture-files'
import { prepareStudioMedia } from './studio-media'

export async function captureStudio(source: unknown, input: CapturePlan, signal: AbortSignal) {
  const plan = capturePlanSchema.parse(input),
    files = await captureFiles(path.join(app.getAppPath(), 'dist/capture'))
  const partition = session.fromPartition(`capture-${randomUUID()}`)
  partition.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  partition.setPermissionCheckHandler(() => false)
  partition.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url)
    const allowed =
      (details.url.startsWith(files.base) && !url.search) ||
      ['data:', 'blob:', 'about:'].includes(url.protocol)
    callback({ cancel: !allowed })
  })
  const browser = new BrowserWindow({
    width: plan.width,
    height: plan.height,
    useContentSize: true,
    show: false,
    webPreferences: {
      session: partition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      backgroundThrottling: false,
      offscreen: true,
    },
  })
  browser.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  browser.webContents.on('will-navigate', (event) => event.preventDefault())
  browser.webContents.on('will-attach-webview', (event) => event.preventDefault())
  const errors: string[] = []
  browser.webContents.on('console-message', (details) => {
    if (details.level === 'error' && errors.length < 20) errors.push(details.message.slice(0, 500))
  })
  const abort = () => {
    if (!browser.isDestroyed()) browser.destroy()
  }
  signal.addEventListener('abort', abort, { once: true })
  const started = Date.now()
  let stage = 'Abrindo o compilador'
  try {
    signal.throwIfAborted()
    await abortable(browser.loadURL(`${files.base}index.html`), signal)
    stage = 'Preparando o projeto no Studio'
    const limits = z
      .object({ maxEmbeddedText: z.number().int().positive().max(2000000) })
      .parse(
        await abortable(
          browser.webContents.executeJavaScript('window.studioCapture.limits'),
          signal,
        ),
      )
    const normalized = await prepareStudioMedia(source, limits.maxEmbeddedText)
    const imports = {
      three: `${files.base}vendor/three.js`,
      'three/addons/loaders/GLTFLoader.js': `${files.base}vendor/GLTFLoader.js`,
      'three/addons/loaders/HDRLoader.js': `${files.base}vendor/HDRLoader.js`,
    }
    const compiled = z
      .object({
        html: z.string().optional(),
        dataUrl: z.string().optional(),
        projectName: z.string(),
      })
      .parse(
        await abortable(
          browser.webContents.executeJavaScript(
            `window.studioCapture.compile(${JSON.stringify(normalized.document)},${JSON.stringify(plan.view)},${JSON.stringify(imports)})`,
          ),
          signal,
        ),
      )
    if (plan.view === 'blocks') {
      if (!compiled.dataUrl?.startsWith('data:image/png;base64,'))
        throw new Error('O Studio não retornou imagem dos blocos')
      return {
        image: Buffer.from(compiled.dataUrl.slice('data:image/png;base64,'.length), 'base64'),
        projectName: compiled.projectName,
        plan,
        elapsedMs: Date.now() - started,
        errors,
        mediaChanges: normalized.changes,
      }
    }
    if (!compiled.html) throw new Error('O Studio não preparou o runtime')
    stage = 'Carregando o runtime'
    await abortable(browser.loadURL(files.document(compiled.html)), signal)
    stage = 'Executando os quadros solicitados'
    let simulatedFrames = 0
    const frames = async (count: number) => {
      simulatedFrames += count
      if (simulatedFrames > 7200)
        throw new Error('A captura ultrapassou o limite de 7.200 quadros de simulação')
      signal.throwIfAborted()
      await abortable(
        browser.webContents.executeJavaScript(
          `new Promise(resolve=>{let count=${count};function next(){if(--count<=0)resolve(true);else requestAnimationFrame(next)};requestAnimationFrame(next)})`,
        ),
        signal,
      )
    }
    await frames(2)
    for (const step of plan.steps) {
      signal.throwIfAborted()
      if (step.action === 'start') {
        await abortable(
          browser.webContents.executeJavaScript(
            `(()=>{const button=[...document.querySelectorAll('button')].find(button=>/^(começar|jogar|iniciar)/i.test(button.textContent?.trim()??''));if(button)button.click()})()`,
          ),
          signal,
        )
      } else if (step.action === 'battle') {
        await captureBattle(browser.webContents, step, frames, signal)
      } else if (step.action === 'click') {
        const clicked = await abortable(
          browser.webContents.executeJavaScript(
            `(()=>{const buttons=[...document.querySelectorAll('button,[role="button"]')].filter(button=>button.getClientRects().length&&button.textContent?.trim()===${JSON.stringify(step.text)});if(buttons.length!==1)return false;buttons[0].click();return true})()`,
          ),
          signal,
        )
        if (clicked !== true)
          throw new Error(`O controle “${step.text}” não está visível ou é ambíguo`)
      } else if (step.action === 'point') {
        const position = {
          x: Math.min(plan.width - 1, Math.round(step.x * plan.width)),
          y: Math.min(plan.height - 1, Math.round(step.y * plan.height)),
          button: 'left' as const,
          clickCount: 1,
        }
        browser.webContents.sendInputEvent({ ...position, type: 'mouseDown' })
        browser.webContents.sendInputEvent({ ...position, type: 'mouseUp' })
      } else if (step.action === 'wait') await frames(step.frames)
      else {
        const keyCode = step.key === 'Space' ? 'Space' : step.key.replace('Arrow', '')
        browser.webContents.sendInputEvent({ type: 'keyDown', keyCode })
        try {
          await frames(step.frames)
        } finally {
          if (!browser.isDestroyed()) browser.webContents.sendInputEvent({ type: 'keyUp', keyCode })
        }
      }
    }
    signal.throwIfAborted()
    if (errors.length)
      throw new Error(`A captura encontrou erro no projeto: ${errors.join(' | ').slice(0, 800)}`)
    stage = 'Capturando o quadro'
    const image = await abortable(
      browser.webContents.capturePage(
        { x: 0, y: 0, width: plan.width, height: plan.height },
        { stayHidden: true, stayAwake: true },
      ),
      signal,
    )
    if (image.isEmpty()) throw new Error('O runtime não produziu uma superfície para capturar')
    const observation = await readCaptureObservation(browser.webContents, signal)
    const expected = [...plan.steps].reverse().find((step) => step.action === 'battle')
    if (expected?.action === 'battle') {
      const foe = observation.battle?.foes.find((actor) => actor.name === expected.target)
      if (!foe || foe.hp <= 0 || foe.hp / foe.max >= expected.lifeBelow)
        throw new Error('O estado da batalha mudou antes da captura; a imagem não atende ao pedido')
    }
    return {
      image: image.toPNG(),
      projectName: compiled.projectName,
      plan,
      elapsedMs: Date.now() - started,
      errors,
      mediaChanges: normalized.changes,
      observation,
    }
  } catch (error) {
    throw new Error(
      `${stage}: ${error instanceof Error ? error.message.split(' loading ')[0]?.slice(0, 1000) : 'Falha de captura'}`,
      { cause: error },
    )
  } finally {
    signal.removeEventListener('abort', abort)
    if (!browser.isDestroyed()) browser.destroy()
    files.close()
    await partition.clearStorageData()
  }
}
