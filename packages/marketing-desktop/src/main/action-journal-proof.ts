import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app, type BrowserWindow, session } from 'electron'
import { z } from 'zod'

export async function proveActionJournal(window: BrowserWindow) {
  console.log('action-journal: starting')
  window.webContents.on('console-message', (event) => {
    if (event.message.startsWith('action-journal-renderer:')) console.log(event.message)
  })
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  const root = path.join(app.getAppPath(), '.cache/connected-proof'),
    fixture = z
      .object({
        origin: z.literal('http://127.0.0.1:15314'),
        userId: z.string().uuid(),
        projectId: z.string().uuid(),
        representationId: z.string().uuid(),
        expectedHash: z.string(),
      })
      .parse(JSON.parse(await readFile(path.join(root, 'action-fixture.json'), 'utf8'))),
    bundle = await readFile(path.join(root, 'action-journal-proof.cjs'), 'utf8')
  const scope = { origin: fixture.origin, userId: fixture.userId }
  const connection = z
    .object({ status: z.string(), origin: z.string().nullable() })
    .parse(await window.webContents.executeJavaScript('window.marketing.connection()'))
  if (connection.status !== 'connected' || connection.origin !== fixture.origin) {
    const credentials = z
      .object({ email: z.string(), password: z.string() })
      .parse(JSON.parse(await readFile(path.join(root, 'fixture.json'), 'utf8')))
    const pair = z
      .object({ code: z.string() })
      .parse(
        await window.webContents.executeJavaScript(
          `window.marketing.connect(${JSON.stringify({ origin: fixture.origin, label: 'Prova de confirmações' })})`,
        ),
      )
    const browser = session.fromPartition('review-action-login')
    for (const [route, body] of [
      ['/api/auth/login', credentials],
      ['/api/desktop', { action: 'describe', code: pair.code }],
      ['/api/desktop', { action: 'approve', code: pair.code }],
    ] as const) {
      const response = await browser.fetch(`${fixture.origin}${route}`, {
        method: 'POST',
        headers: { origin: fixture.origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) throw new Error(`Prova de conexão: HTTP ${response.status}`)
      await response.arrayBuffer()
    }
    z.object({ status: z.literal('connected'), userId: z.literal(fixture.userId) }).parse(
      await window.webContents.executeJavaScript('window.marketing.pollConnection()'),
    )
  }
  // Executes the real shared journal in the actual sandboxed renderer; never exposes Node.
  const invoke = (name: string, rest = '') =>
    window.webContents.executeJavaScript(
      `(async()=>{const module={exports:{}};const exports=module.exports;${bundle}\nconst scope=${JSON.stringify(scope)};const port={identity:scope.origin+':'+scope.userId,userId:scope.userId,request:async(path,method='GET',body)=>{const response=await window.marketing.workspace({scope,path,method,body});if(!response.ok)throw Object.assign(new Error(response.error.message),{status:response.error.status,code:response.error.code});return response.value}};return module.exports.${name}(port,${JSON.stringify(fixture)}${rest})})()`,
    )
  const evidence = []
  for (const mode of ['read', 'retry'] as const) {
    console.log(`action-journal: ${mode} submit`)
    const expected = z
      .object({ committed: z.string().uuid(), operationId: z.string().uuid() })
      .parse(await invoke('loseResponse'))
    console.log(`action-journal: ${mode} committed; reload`)
    await window.loadURL(window.webContents.getURL())
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      const projectId=${JSON.stringify(fixture.projectId)};
      const ready=()=>{
        const select=document.querySelector('select[aria-label="Projeto atual"]');
        if(!select||![...select.options].some(option=>option.value===projectId))return false;
        if(select.value!==projectId){select.value=projectId;select.dispatchEvent(new Event('change',{bubbles:true}));return false}
        const panel=document.querySelector('[aria-label="Confirmações pendentes"]');
        return panel?.textContent.includes('Aprovar a edição conferida')&&[...panel.querySelectorAll('button')].some(button=>button.textContent==='Conferir confirmação');
      };
      const finish=()=>{if(ready()){observer.disconnect();clearTimeout(timeout);resolve(true)}};
      const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();reject(new Error('A recuperação não apareceu na interface'))},20000);
      observer.observe(document.body,{childList:true,subtree:true});finish();
    })`)
    await writeFile(
      path.join(root, `action-journal-${mode}.png`),
      (await window.webContents.capturePage()).toPNG(),
    )
    console.log(`action-journal: ${mode} recover`)
    evidence.push(await invoke('recover', `,${JSON.stringify(mode)},${JSON.stringify(expected)}`))
  }
  await writeFile(
    path.join(root, 'action-journal-evidence.json'),
    JSON.stringify(
      {
        passed: true,
        realIndexedDb: true,
        rendererReloads: 2,
        recoveryPanelRendered: true,
        backend: 'PostgreSQL review',
        cases: evidence,
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ actionJournalProof: true, cases: evidence }))
}
