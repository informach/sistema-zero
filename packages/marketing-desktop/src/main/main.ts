import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type UtilityProcess,
  utilityProcess,
} from 'electron'
import { z } from 'zod'
import { defaultStory, storySchema } from '../../../marketing-production/src/story'
import { type Progress, providerSchema, runRequestSchema } from '../shared/contracts'
import { LocalAssets } from './assets'
import { getProviderStatus, loginProvider, runProvider } from './providers'

const directory = path.join(app.getAppPath(), 'dist')
const smoke = ['--smoke', '--smoke-render', '--smoke-text'].some((flag) =>
  process.argv.includes(flag),
)
let window: BrowserWindow | undefined
let assets: LocalAssets | undefined
let controller: AbortController | undefined
let renderWorker: UtilityProcess | undefined
let busy = false
const rendererUrl = pathToFileURL(path.join(directory, 'renderer/index.html')).href

function progress(value: Progress) {
  window?.webContents.send('marketing:progress', value)
}
async function exclusive<T>(work: () => Promise<T>): Promise<T> {
  if (busy) throw new Error('Aguarde ou cancele o trabalho em andamento.')
  busy = true
  try {
    return await work()
  } finally {
    busy = false
    controller = undefined
    renderWorker = undefined
  }
}
function handle(channel: string, operation: (...args: unknown[]) => Promise<unknown>) {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    if (
      !window ||
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== rendererUrl
    )
      throw new Error('Origem não autorizada.')
    return operation(...args)
  })
}

app
  .whenReady()
  .then(async () => {
    const workspace = path.join(app.getPath('userData'), 'local-proof')
    await mkdir(workspace, { recursive: true })
    assets = new LocalAssets(path.join(workspace, 'assets'))
    await assets.start()
    window = new BrowserWindow({
      title: 'Marketing · Sistema Zero',
      width: 1280,
      height: 880,
      minWidth: 920,
      minHeight: 680,
      show: !smoke,
      webPreferences: {
        preload: path.join(directory, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        offscreen: smoke,
      },
    })
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    )
    handle('marketing:status', async () =>
      Promise.all(
        ['codex', 'claude'].map((name) => getProviderStatus(providerSchema.parse(name), workspace)),
      ),
    )
    handle('marketing:login', async (provider) =>
      exclusive(() => {
        controller = new AbortController()
        return loginProvider(
          providerSchema.parse(provider),
          workspace,
          shell.openExternal,
          controller.signal,
        )
      }),
    )
    handle('marketing:run', async (input) =>
      exclusive(async () => {
        const request = runRequestSchema.parse(input)
        const source = request.sourceAssetId ? assets!.get(request.sourceAssetId) : undefined
        if (source && !source.asset.mime.startsWith('image/'))
          throw new Error('Escolha uma imagem para editar.')
        controller = new AbortController()
        const started = Date.now()
        const result = await runProvider(
          request,
          workspace,
          controller.signal,
          (stage) => progress({ stage }),
          source?.path,
        )
        const produced = []
        for (const image of result.images) produced.push(await assets!.addImage(image))
        const output = {
          text: result.text,
          assets: produced,
          provider: request.provider,
          mode: result.mode,
          durationMs: Date.now() - started,
        }
        await writeFile(
          path.join(workspace, `result-${Date.now()}.json`),
          JSON.stringify(
            {
              ...output,
              assets: produced.map(({ url: _url, ...asset }) => asset),
            },
            null,
            2,
          ),
        )
        progress({ stage: 'Resultado pronto para conferir' })
        return output
      }),
    )
    handle('marketing:cancel', async () => {
      controller?.abort()
      renderWorker?.postMessage('cancel')
    })
    handle('marketing:choose-media', async () => {
      const chosen = await dialog.showOpenDialog(window!, {
        properties: ['openFile'],
        filters: [
          { name: 'Imagens e vídeos', extensions: ['png', 'jpg', 'jpeg', 'mp4', 'mov', 'webm'] },
        ],
      })
      return chosen.canceled || !chosen.filePaths[0]
        ? null
        : assets!.importFile(chosen.filePaths[0])
    })
    handle('marketing:export', async (value) => {
      const source = assets!.get(z.string().uuid().parse(value))
      const chosen = await dialog.showSaveDialog(window!, { defaultPath: source.asset.name })
      if (chosen.canceled || !chosen.filePath) return false
      await copyFile(source.path, chosen.filePath)
      return true
    })
    handle('marketing:render', async (input) =>
      exclusive(async () => {
        const props = storySchema.parse(input)
        if (props.clip && !assets!.ownsUrl(props.clip.src))
          throw new Error('Gravação não pertence a esta sessão.')
        const stamp = Date.now()
        const propsFile = path.join(workspace, `render-${stamp}.json`)
        const output = path.join(workspace, `story-${stamp}.mp4`)
        await writeFile(propsFile, JSON.stringify(props))
        progress({ stage: 'Exportando vídeo no computador', progress: 0 })
        await new Promise<void>((resolve, reject) => {
          const child = utilityProcess.fork(
            path.join(directory, 'render-worker.cjs'),
            [propsFile, output, path.join(directory, 'remotion')],
            { stdio: 'pipe', serviceName: 'Marketing video' },
          )
          renderWorker = child
          let buffer = ''
          let complete = false
          const timeout = setTimeout(() => {
            child.kill()
            reject(new Error('O render atingiu o limite de dez minutos.'))
          }, 600000)
          child.stdout?.on('data', (chunk: Buffer) => {
            buffer += chunk.toString()
            let newline = buffer.indexOf('\n')
            while (newline >= 0) {
              const line = buffer.slice(0, newline)
              buffer = buffer.slice(newline + 1)
              try {
                const message = JSON.parse(line) as { progress?: number; complete?: boolean }
                if (typeof message.progress === 'number')
                  progress({ stage: 'Exportando vídeo no computador', progress: message.progress })
                if (message.complete) complete = true
              } catch {
                /* Native renderer diagnostics are not forwarded as product events. */
              }
              newline = buffer.indexOf('\n')
            }
          })
          child.stderr?.resume()
          child.on('exit', (code) => {
            clearTimeout(timeout)
            if (code === 0 && complete) resolve()
            else
              reject(new Error('Render interrompido. O original e a composição foram preservados.'))
          })
        })
        const result = await assets!.importFile(output)
        progress({ stage: 'Vídeo pronto para conferir', progress: 1 })
        return result
      }),
    )
    await window.loadURL(rendererUrl)
    if (smoke) {
      if (process.argv.includes('--smoke-text')) {
        for (const provider of ['codex', 'claude']) {
          const request = {
            provider,
            kind: 'copy',
            prompt:
              'Escreva uma legenda curta em português sobre criar um jogo como forma de aprender. Máximo de 25 palavras.',
          }
          const result = await window.webContents.executeJavaScript(
            `window.marketing.run(${JSON.stringify(request)})`,
          )
          if (!result.text?.trim() || !result.mode)
            throw new Error(`Prova textual de ${provider} não produziu resultado.`)
          console.log(
            JSON.stringify({
              textProof: {
                provider,
                mode: result.mode,
                durationMs: result.durationMs,
                received: true,
              },
            }),
          )
        }
      }
      if (process.argv.includes('--smoke-render')) {
        const clip = await assets.importFile(path.join(app.getAppPath(), '.cache/proof/source.mp4'))
        const props = {
          ...defaultStory,
          width: 360,
          height: 640,
          durationInFrames: 60,
          clip: { src: clip.url, trimBefore: 30, muted: false },
        }
        const result = await window.webContents.executeJavaScript(
          `window.marketing.render(${JSON.stringify(props)})`,
        )
        console.log(
          JSON.stringify({
            render: {
              id: result.id,
              size: result.size,
              sha256: result.sha256,
              path: assets.get(result.id).path,
            },
          }),
        )
      }
      const state = await window.webContents.executeJavaScript(
        '(async () => { await window.marketing.status(); const composition = document.querySelector("[data-marketing-story]"); return { title: document.title, bridge: typeof window.marketing?.run, node: typeof window.require, player: !!document.querySelector("[data-player]"), frame: composition?.getAttribute("data-frame"), width: composition?.getAttribute("data-width") }; })()',
      )
      if (
        state.bridge !== 'function' ||
        state.node !== 'undefined' ||
        !state.player ||
        state.frame !== '30' ||
        state.width !== '720'
      )
        throw new Error('A ponte isolada ou a prévia não passou na verificação.')
      await writeFile(path.join(workspace, 'smoke.json'), JSON.stringify(state, null, 2))
      const screenshot = await window.webContents.capturePage()
      await writeFile(path.join(workspace, 'smoke.png'), screenshot.toPNG())
      console.log(JSON.stringify({ smoke: state, directory: workspace }))
      app.quit()
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Falha ao iniciar.')
    app.exit(1)
  })

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  controller?.abort()
  renderWorker?.kill()
  assets?.close()
})
