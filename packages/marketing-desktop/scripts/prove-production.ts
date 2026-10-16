import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { productionActivityReportSchema, projectSchema } from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { captureProof } from '../src/main/imports/capture-proof'
import { waitProof } from '../src/main/imports/wait-proof'
import { proofBrowser } from './proof-browser'

const directory = path.resolve('.cache/production-proof')
app.setName('Marketing Production Review')
app.setPath('userData', path.join(directory, 'profile'))
app.on('window-all-closed', () => {})
function localDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
async function main() {
  let window: BrowserWindow | undefined
  try {
    await app.whenReady()
    await mkdir(directory, { recursive: true })
    const browser = await proofBrowser('production')
    window = browser.window
    const project = projectSchema.parse(
      await browser.request('/api/marketing/workspace/projects', {
        schemaVersion: 1,
        operationId: randomUUID(),
        id: randomUUID(),
        name: 'Prova de processo produtivo',
        product: 'Revisão isolada',
      }),
    )
    await window.loadURL(`${browser.origin}/bancada`)
    await waitProof(
      window,
      `(()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(!select||![...select.options].some(option=>option.value===${JSON.stringify(project.id)}))return false;if(select.value!==${JSON.stringify(project.id)}){select.value=${JSON.stringify(project.id)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}return !![...document.querySelectorAll('button')].find(button=>button.textContent==='Processo produtivo')})()`,
      'Projeto não abriu',
    )
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent==='Processo produtivo').click()`,
    )
    await waitProof(
      window,
      `document.querySelector('[role="dialog"]')?.textContent.includes('Ainda não há pedidos de IA')`,
      'Relatório não abriu',
    )
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Registrar tempo de trabalho').click()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[role="dialog"] input[type="datetime-local"]')`,
      'Registro não abriu',
    )
    const end = new Date(Date.now() - 1800_000),
      start = new Date(end.getTime() - 900_000)
    await window.webContents.executeJavaScript(
      `(()=>{for(const [suffix,value] of ${JSON.stringify([
        ['-start', localDate(start)],
        ['-end', localDate(end)],
      ])}){const input=document.querySelector('[role="dialog"] input[id$="'+suffix+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))}const note=document.querySelector('[role="dialog"] textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(note,'Revisão da copy e conferência da arte');note.dispatchEvent(new Event('input',{bubbles:true}))})()`,
    )
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
    )
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] form').requestSubmit()`,
    )
    await waitProof(
      window,
      `(()=>{const alert=document.querySelector('[role="dialog"] [role="alert"]');if(alert)throw new Error(alert.textContent);return !document.querySelector('[role="dialog"] form')&&document.querySelector('[role="dialog"]')?.textContent.includes('15 min')})()`,
      'Registro não foi confirmado',
    )
    const route = `/api/marketing/workspace/projects/${project.id}/production?days=28`
    let result = productionActivityReportSchema.parse(await browser.request(route))
    assert.equal(result.timeRecords.length, 1)
    assert.equal(result.timeRecords[0]?.actorId, browser.userId)
    const original = result.timeRecords[0]?.id
    await writeFile(path.join(directory, 'recorded.png'), await captureProof(window))
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] details').open=true;[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Corrigir registro').click()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[role="dialog"] input[type="datetime-local"]')`,
      'Correção não abriu',
    )
    await window.webContents.executeJavaScript(
      `(()=>{const input=document.querySelector('[role="dialog"] input[id$="-start"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(localDate(new Date(end.getTime() - 600_000)))});input.dispatchEvent(new Event('input',{bubbles:true}))})()`,
    )
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
    )
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] form').requestSubmit()`,
    )
    await waitProof(
      window,
      `!document.querySelector('[role="dialog"] form')&&document.querySelector('[role="dialog"]')?.textContent.includes('10 min')`,
      'Correção não foi confirmada',
    )
    result = productionActivityReportSchema.parse(await browser.request(route))
    assert.equal(result.timeRecords.length, 1)
    assert.equal(result.timeRecords[0]?.replacesId, original)
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] details').open=true;[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Anular registro').click()`,
    )
    await waitProof(
      window,
      `document.querySelector('[role="dialog"]')?.textContent.includes('0 registro(s)')`,
      'Anulação não foi confirmada',
    )
    assert.equal(
      productionActivityReportSchema.parse(await browser.request(route)).timeRecords.length,
      0,
    )
    const evidence = {
      projectId: project.id,
      createdThroughUi: true,
      correctedThroughUi: true,
      voidedThroughUi: true,
      preservedOriginal: original,
      duplicateActiveRecords: false,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
    window.destroy()
    window = undefined
    app.exit(0)
  } catch (error) {
    if (window) {
      await writeFile(path.join(directory, 'failure.png'), await captureProof(window))
      await writeFile(
        path.join(directory, 'failure.txt'),
        await window.webContents.executeJavaScript('document.body.innerText'),
      )
      window.destroy()
    }
    console.error(error instanceof Error ? error.message : 'Falha na prova de produção')
    app.exit(1)
  }
}
void main()
