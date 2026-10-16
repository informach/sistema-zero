import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  operationResultSchema,
  projectSchema,
  snapshotSchema,
} from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import { z } from 'zod'
import { captureProof } from '../src/main/imports/capture-proof'

const directory = path.resolve('.cache/learning-proof')
app.setName('Marketing Learning Review')
app.setPath('userData', path.join(directory, 'profile'))
async function main() {
  await app.whenReady()
  await mkdir(directory, { recursive: true })
  let window: BrowserWindow | undefined
  try {
    const fixture = z
      .object({
        userId: z.string().uuid(),
        email: z.string(),
        password: z.string(),
        origin: z.literal('http://127.0.0.1:15334'),
      })
      .parse(JSON.parse(await readFile('.cache/native-connected-proof/fixture.json', 'utf8')))
    const browser = session.fromPartition(`learning-${randomUUID()}`)
    async function request(route: string, body?: unknown) {
      const response = await browser.fetch(`${fixture.origin}${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { origin: fixture.origin, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`HTTP ${response.status}: ${route}`)
      }
      return response.json()
    }
    await request('/api/auth/login', { email: fixture.email, password: fixture.password })
    const project = projectSchema.parse(
      await request('/api/marketing/workspace/projects', {
        schemaVersion: 1,
        operationId: randomUUID(),
        id: randomUUID(),
        name: 'Prova do próximo ciclo',
        product: 'Revisão isolada',
      }),
    )
    const analysis = operationResultSchema.parse(
      await request('/api/marketing/workspace/operations', {
        schemaVersion: 1,
        operationId: randomUUID(),
        projectId: project.id,
        entityId: randomUUID(),
        baseRevisionId: null,
        action: 'save',
        document: {
          schemaVersion: 1,
          kind: 'analysis',
          title: 'Decisão baseada em amostra pequena',
          body: 'A cobertura é parcial. Testar um convite prático sem atribuir causalidade aos salvamentos.',
          objective: 'Aumentar salvamentos',
          hypothesis: 'Um exemplo prático pode estimular o salvamento.',
          evidenceIds: [],
          proposedPieceId: null,
          analysisType: 'decision',
          basis: [],
        },
      }),
    )
    if (analysis.status !== 'applied') throw new Error('Fixture conflitante')
    window = new BrowserWindow({
      show: false,
      width: 1280,
      height: 900,
      webPreferences: {
        session: browser,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        offscreen: true,
        backgroundThrottling: false,
      },
    })
    await window.loadURL(`${fixture.origin}/bancada`)
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      let opened=false;
      const ready=()=>{
        const project=document.querySelector('select[aria-label="Projeto atual"]');
        if(!project||![...project.options].some(option=>option.value===${JSON.stringify(project.id)}))return false;
        if(project.value!==${JSON.stringify(project.id)}){project.value=${JSON.stringify(project.id)};project.dispatchEvent(new Event('change',{bubbles:true}));return false}
        const area=[...document.querySelectorAll('[aria-label="Áreas da bancada"] button')].find(button=>button.textContent==='Resumos e decisões');
        if(area?.getAttribute('aria-pressed')!=='true'){area?.click();return false}
        const entry=[...document.querySelectorAll('aside button')].find(button=>button.textContent.startsWith('Decisão baseada em amostra pequena'));
        if(entry?.getAttribute('aria-pressed')!=='true'){entry?.click();return false}
        if(!opened){const button=[...document.querySelectorAll('button')].find(button=>button.textContent==='Preparar próxima pauta');if(button&&!button.disabled){opened=true;button.click()}return false}
        return !!document.querySelector('[role="dialog"][aria-label="Próxima pauta a partir da análise"]');
      };
      const poll=setInterval(()=>{try{if(ready()){clearInterval(poll);clearTimeout(deadline);resolve(true)}}catch(error){clearInterval(poll);clearTimeout(deadline);reject(error)}},100);
      const deadline=setTimeout(()=>{clearInterval(poll);reject(new Error('A análise não abriu a próxima pauta'))},60000);
    })`)
    await writeFile(path.join(directory, 'learning-dialog.png'), await captureProof(window))
    await window.webContents.executeJavaScript(`(()=>{
      const dialog=document.querySelector('[role="dialog"][aria-label="Próxima pauta a partir da análise"]');
      const criterion=dialog.querySelector('textarea[id$="-criterion"]');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(criterion,'Comparar salvamentos por visualização em 48 horas, registrando a cobertura da amostra.');
      criterion.dispatchEvent(new Event('input',{bubbles:true}));
      const format=dialog.querySelector('select[id$="-format"]');format.value='story';format.dispatchEvent(new Event('change',{bubbles:true}));
      const medium=dialog.querySelector('select[id$="-medium"]');medium.value='video';medium.dispatchEvent(new Event('change',{bubbles:true}));
    })()`)
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
    )
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] form').requestSubmit()`,
    )
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      const poll=setInterval(()=>{const dialog=document.querySelector('[role="dialog"]');const error=dialog?.querySelector('[role="alert"]');if(error){clearInterval(poll);clearTimeout(deadline);reject(new Error(error.textContent))}else if(!dialog&&document.body.textContent.includes('Próximo ciclo · Decisão baseada em amostra pequena')){clearInterval(poll);clearTimeout(deadline);resolve(true)}},100);
      const deadline=setTimeout(()=>{clearInterval(poll);reject(new Error('A nova pauta não abriu na bancada'))},60000);
    })`)
    const snapshot = snapshotSchema.parse(
      await request(`/api/marketing/workspace/projects/${project.id}/snapshot`),
    )
    const piece = snapshot.items.find((item) => item.document.kind === 'piece')
    assert.ok(piece?.document.kind === 'piece')
    assert.equal(piece.document.state, 'draft')
    assert.deepEqual(piece.document.originAnalysis, {
      entityId: analysis.item.id,
      revisionId: analysis.item.revisionId,
    })
    const representation = snapshot.items.find((item) => item.document.kind === 'representation')
    assert.ok(representation?.document.kind === 'representation')
    assert.equal(representation.document.format, 'story')
    assert.equal(representation.document.medium, 'video')
    const bundle = await readFile(path.join(directory, 'journal.cjs'), 'utf8')
    const journal = await window.webContents.executeJavaScript(`(async()=>{
      const module={exports:{}};((module,exports)=>{${bundle}\n})(module,module.exports);
      const port={identity:'long-brief-review',userId:${JSON.stringify(fixture.userId)},request:async()=>{throw new Error('Resposta perdida de propósito')}};
      const input={analysisId:${JSON.stringify(analysis.item.id)},expectedRevisionId:${JSON.stringify(analysis.item.revisionId)},title:'Longo',brief:'x'.repeat(80000),hypothesis:'Hipótese',criterion:'Critério',objective:'Objetivo',format:'story',medium:'video',schemaVersion:1};
      let lost=false;try{await module.exports.workspaceAction(port,'/projects/${project.id}/learning-pieces',input,{parse:()=>{throw new Error('Não deve receber resposta')}})}catch(error){if(error.message!=='Resposta perdida de propósito')throw error;lost=true}
      const pending=await module.exports.pendingWorkspaceActions(port,${JSON.stringify(project.id)});
      if(!lost||pending.items.length!==1||pending.items[0].input.brief.length!==80000)throw new Error('O briefing longo não foi preservado');
      return {briefCharacters:pending.items[0].input.brief.length,operationId:pending.items[0].operationId};
    })()`)
    await writeFile(path.join(directory, 'learning-piece.png'), await captureProof(window))
    const evidence = {
      projectId: project.id,
      pieceId: piece.id,
      originAnalysis: piece.document.originAnalysis,
      format: 'story',
      medium: 'video',
      draft: true,
      localPreload: false,
      journal,
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
    console.error(error instanceof Error ? error.message : 'Falha na prova de aprendizado')
    app.exit(1)
  }
}
void main()
