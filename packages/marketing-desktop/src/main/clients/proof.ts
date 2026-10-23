import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app, type BrowserWindow } from 'electron'
import { captureProof } from '../imports/capture-proof'
import { waitProof } from '../imports/wait-proof'
import { clientReleases } from './catalog'
import { readClientInstallation } from './installation'

export async function proveClientInstallation(window: BrowserWindow, root: string) {
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  const directory = path.dirname(app.getPath('userData'))
  await mkdir(directory, { recursive: true })
  const statuses = await window.webContents.executeJavaScript('window.marketing.status()')
  const reinstall = process.argv.includes('--client-install-reopen')
  if (!reinstall) {
    console.log(
      JSON.stringify({
        beforeInstallation: statuses.map((status: { provider: string; client: unknown }) => ({
          provider: status.provider,
          client: status.client,
        })),
      }),
    )
    assert.ok(
      statuses.every((status: { client: { installed: boolean } }) => !status.client.installed),
      'Use um perfil isolado sem clientes no PATH para a primeira instalação',
    )
    await waitProof(
      window,
      `document.querySelectorAll('button').length > 2 && [...document.querySelectorAll('button')].some(button=>button.textContent.includes('Instalar cliente'))`,
      'A instalação não apareceu',
    )
    await writeFile(path.join(directory, 'before.png'), await captureProof(window))
    for (const release of Object.values(clientReleases)) {
      await window.webContents.executeJavaScript(
        `(()=>{const section=document.querySelector('[aria-label="Assinaturas de inteligência artificial"]');const row=[...section.querySelectorAll('div')].find(row=>row.textContent.startsWith(${JSON.stringify(release.provider === 'codex' ? 'Codex' : 'Claude Code')}));const button=[...row.querySelectorAll('button')].find(button=>button.textContent.includes('Instalar cliente'));if(!button || button.disabled)throw new Error('Instalação indisponível');button.click()})()`,
      )
      await waitProof(
        window,
        `(()=>{const error=document.querySelector('[role="alert"]');if(error)throw new Error(error.textContent);return document.querySelector('[aria-label="Assinaturas de inteligência artificial"]').textContent.includes(${JSON.stringify(`v${release.version}`)})})()`,
        `Cliente ${release.provider} não instalou`,
        600000,
      )
      await waitProof(
        window,
        `![...document.querySelectorAll('button')].some(button=>button.textContent==='Cancelar')`,
        'A interface não concluiu a instalação',
      )
    }
  }
  const binaries = []
  for (const release of Object.values(clientReleases)) {
    const executable = await readClientInstallation(root, release)
    binaries.push({
      provider: release.provider,
      version: release.version,
      verified: true,
      executable: path.relative(root, executable),
    })
  }
  const current = await window.webContents.executeJavaScript('window.marketing.status()')
  assert.ok(
    current.every(
      (status: { available: boolean; client: { installed: boolean; managed: boolean } }) =>
        status.client.installed && status.client.managed,
    ),
  )
  await writeFile(
    path.join(directory, reinstall ? 'reopen.png' : 'installed.png'),
    await captureProof(window),
  )
  const evidence = {
    installedFromUi: !reinstall,
    reopenVerified: reinstall,
    binaries,
    existingAccountsUntouched: true,
    firstLoginTested: false,
    noInferenceRequested: true,
  }
  await writeFile(
    path.join(directory, reinstall ? 'reopen.json' : 'evidence.json'),
    JSON.stringify(evidence, null, 2),
  )
  console.log(JSON.stringify(evidence))
}
