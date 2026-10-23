import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { expect, test } from '@playwright/test'
import { verifyStudioPythonWebPayload } from '@sistemazero/core/studio/python-execution-content'
import { unzipSync } from 'fflate'
import type {} from './fixtures/free'

async function serve(directory: string) {
  const child = spawn(
    process.env.PYTHON ?? 'python',
    [resolve(directory, 'serve.py'), '--port', '0'],
    {
      cwd: directory,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' },
    },
  )
  let output = '',
    errors = ''
  const url = new Promise<string>((accept, reject) => {
    child.stdout.on('data', (bytes: Buffer) => {
      output = (output + bytes.toString('utf8')).slice(-16_000)
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//)
      if (match) accept(match[0])
    })
    child.stderr.on('data', (bytes: Buffer) => {
      errors = (errors + bytes.toString('utf8')).slice(-16_000)
    })
    child.once('error', reject)
    child.once('exit', (code) => reject(new Error(`Export server exited ${code}: ${errors}`)))
  })
  const deadline = setTimeout(() => child.kill(), 10_000)
  try {
    const origin = await url
    clearTimeout(deadline)
    return {
      origin,
      async close() {
        if (child.exitCode === null && child.signalCode === null) {
          const exited = once(child, 'exit')
          child.kill()
          await exited
        }
      },
    }
  } catch (error) {
    clearTimeout(deadline)
    child.kill()
    throw error
  }
}

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind} web ZIP runs independently with Turtle PNG, input, keyboard, capture and restart`, async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(180_000)
    await page.goto('/')
    await page.waitForFunction(() => !!globalThis.studioFreeProbe)
    await page.evaluate(() => studioFreeProbe.create(false, true))
    await page.getByRole('button', { name: '+ Novo projeto' }).click()
    if (kind === 'pro') await page.getByRole('radio', { name: /Pro \(código\)/ }).click()
    await page.getByRole('radio', { name: 'Python', exact: true }).click()
    await page.getByRole('button', { name: 'Criar e abrir', exact: true }).click()
    if (kind === 'classic') {
      await expect(page.locator('.blocklySvg').first()).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: 'Ponte', exact: true }).click()
    }
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click()
    const extensions = page.getByRole('dialog', { name: 'Extensões Python' })
    await extensions.getByRole('button', { name: 'Instalar', exact: true }).click()
    await expect(extensions.getByText('Instalada', { exact: true })).toBeVisible()
    await extensions.getByRole('button', { name: /Fechar/ }).click()
    const asset = await page.evaluate(
      async () =>
        (await studioFreeProbe.saved())?.assets?.find((asset) => asset.name === 'heroi')?.proPath,
    )
    expect(asset).toBeTruthy()
    const source = `import turtle\nscreen = turtle.Screen()\nscreen.setup(640, 480)\nscreen.bgpic(${JSON.stringify(asset)})\nhero = turtle.Turtle()\nhero.forward(40)\ndef moved():\n    print("keyboard-export")\n    hero.forward(10)\nscreen.onkeypress(moved, "space")\nscreen.listen()\nname = input("Seu nome?")\nprint("ola", name)\nturtle.done()\n`
    await page.evaluate((source) => studioFreeProbe.source(source), source)
    await page.keyboard.press('Control+s')
    await expect
      .poll(async () => JSON.stringify(await page.evaluate(() => studioFreeProbe.saved())))
      .toContain('keyboard-export')
    const capturedSource = await page.evaluate(() => studioFreeProbe.read())
    expect(capturedSource?.replaceAll('\r\n', '\n')).toBe(source)
    await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Baixar para publicar', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Baixar para jogar no navegador', exact: true })
    const downloading = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Exportar', exact: true }).click()
    const download = await downloading
    const zipPath = await download.path()
    if (!zipPath) throw new Error('Missing downloaded ZIP')
    const files = unzipSync(new Uint8Array(await readFile(zipPath)))
    const payload = await verifyStudioPythonWebPayload(
      JSON.parse(new TextDecoder().decode(files['payload.json'])),
    )
    expect(
      new TextDecoder().decode(
        files[`project/${payload.snapshot.configuration.python.entrypoint}`],
      ),
    ).toBe(capturedSource)
    expect(new TextDecoder().decode(files['asset-attributions.json'])).toContain('CC0')
    const directory = testInfo.outputPath('exported-package')
    for (const [path, bytes] of Object.entries(files)) {
      const target = resolve(directory, path)
      if (!target.startsWith(`${resolve(directory)}${sep}`))
        throw new Error('ZIP path escaped its directory')
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes)
    }
    const server = await serve(directory)
    const context = await browser.newContext({ acceptDownloads: true })
    try {
      const game = await context.newPage()
      const requests: string[] = [],
        errors: string[] = []
      game.on('request', (request) => {
        requests.push(request.url())
      })
      game.on('pageerror', (error) => {
        errors.push(error.message)
      })
      const started = Date.now()
      await game.goto(server.origin)
      const canvas = game.frameLocator('#stage iframe').locator('canvas')
      await expect(canvas).toBeVisible({ timeout: 20_000 })
      const timing = testInfo.outputPath('export-startup.json')
      await writeFile(
        timing,
        JSON.stringify({
          milliseconds: Date.now() - started,
          context:
            'fresh browser context; OS/compiler caches uncontrolled; functional sample, not performance qualification',
        }),
      )
      await testInfo.attach('export-startup', { path: timing, contentType: 'application/json' })
      await expect(game.getByRole('textbox')).toBeVisible()
      expect(
        await game.evaluate(() => document.querySelector('iframe')?.contentDocument),
      ).toBeNull()
      await game.getByRole('textbox').fill('Lia')
      await game.getByRole('button', { name: 'Enviar', exact: true }).click()
      await expect(game.locator('#output')).toContainText('ola Lia')
      await canvas.click()
      await game.keyboard.press('Space')
      await expect(game.locator('#output')).toContainText('keyboard-export')
      const capturing = game.waitForEvent('download')
      await game.getByRole('button', { name: 'Salvar imagem', exact: true }).click()
      const picture = await capturing
      const picturePath = await picture.path()
      if (!picturePath) throw new Error('Missing capture')
      expect([...new Uint8Array(await readFile(picturePath)).slice(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ])
      await game.getByRole('button', { name: 'Reiniciar', exact: true }).click()
      await expect(game.getByRole('textbox')).toBeVisible({ timeout: 20_000 })
      await expect(game.locator('#output')).not.toContainText('ola Lia')
      await game.getByRole('button', { name: 'Parar', exact: true }).click()
      await expect(game.locator('#stage iframe')).toHaveCount(0)
      await expect(game.locator('#status')).toHaveText('Parado')
      expect(errors).toEqual([])
      expect(
        requests
          .filter((url) => /^https?:/.test(url))
          .every((url) => new URL(url).origin === new URL(server.origin).origin),
      ).toBe(true)
    } finally {
      await context.close()
      await server.close()
      await page.evaluate(() => studioFreeProbe.close())
    }
  })
