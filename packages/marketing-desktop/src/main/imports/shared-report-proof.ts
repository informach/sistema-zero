import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app, BrowserWindow, session } from 'electron'
import { z } from 'zod'
import { captureProof } from './capture-proof'
import { proveOfficeRead } from './office-read-proof'

/** The web renderer receives no preload or native API; authentication stays in its own cookie jar. */
export async function proveWebProductionReport(input: {
  origin: 'http://127.0.0.1:15334'
  email: string
  password: string
  projectId: string
  capturedAt: string
  directory: string
  requireLinkedPiece?: boolean
  requireOffice?: boolean
}) {
  if (app.isPackaged) throw new Error('Prova web restrita ao ambiente local')
  const browser = session.fromPartition(`review-production-web-${randomUUID()}`)
  const requests = new Map<string, { count: number; statuses: Record<string, number> }>()
  browser.webRequest.onCompleted({ urls: [`${input.origin}/api/marketing/*`] }, (details) => {
    const key = `${details.method} ${new URL(details.url).pathname}`
    const row = requests.get(key) ?? { count: 0, statuses: {} }
    row.count++
    row.statuses[details.statusCode] = (row.statuses[details.statusCode] ?? 0) + 1
    requests.set(key, row)
  })
  const login = await browser.fetch(`${input.origin}/api/auth/login`, {
    method: 'POST',
    headers: { origin: input.origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
  })
  await login.body?.cancel()
  if (!login.ok) throw new Error(`Login web da revisão: HTTP ${login.status}`)
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      session: browser,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      offscreen: true,
    },
  })
  try {
    await window.loadURL(`${input.origin}/bancada`)
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      let opened=false, consulted=false, selected=false, previewed=false;
      const ready=()=>{
        const project=document.querySelector('select[aria-label="Projeto atual"]');
        if(!project||![...project.options].some(option=>option.value===${JSON.stringify(input.projectId)}))return false;
        if(project.value!==${JSON.stringify(input.projectId)}){project.value=${JSON.stringify(input.projectId)};project.dispatchEvent(new Event('change',{bubbles:true}));return false}
        const list=document.querySelector('[aria-label="Cargas do acervo"]');
        if(!list){[...document.querySelectorAll('button')].find(button=>button.textContent==='Importar acervo')?.click();return false}
        if(!opened){const row=[...list.querySelectorAll('li')].find(row=>row.textContent.includes(${JSON.stringify(new Date(input.capturedAt).toLocaleString('pt-BR'))}));const button=[...(row?.querySelectorAll('button')??[])].find(button=>button.textContent==='Conferir origens');if(button&&!button.disabled){opened=true;button.click()}return false}
        const panel=document.querySelector('[aria-label="Conferências compartilhadas"]');
        if(!panel)return false;
        const buttons=[...panel.querySelectorAll('button')];
        if(!consulted){const button=buttons.find(button=>button.textContent==='Consultar conferências compartilhadas');if(button&&!button.disabled){consulted=true;button.click()}return false}
        if(!selected){const button=buttons.find(button=>button.textContent.startsWith('P01 ·'));if(button&&!button.disabled){selected=true;button.click()}return false}
        if(!previewed){const button=buttons.find(button=>button.textContent==='Conferir imagem 1');if(button&&!button.disabled){previewed=true;button.click()}return false}
        const image=panel.querySelector('img');return image?.complete&&image.naturalWidth>0;
      };
      const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
      const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A web não mostrou o relatório e seu original: '+document.body.textContent.slice(-1000)))},120000),poll=setInterval(finish,250);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
    })`)
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>{document.querySelector('[aria-label="Conferências compartilhadas"] img').scrollIntoView({block:'center'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
    )
    const layout = await window.webContents.executeJavaScript(
      `(()=>{const image=document.querySelector('[aria-label="Conferências compartilhadas"] img');return {image:image.getBoundingClientRect().toJSON(), viewport:{width:innerWidth,height:innerHeight}, ancestors:[...function*(el){while(el){yield el;el=el.parentElement}}(image)].filter(el=>el.scrollHeight>el.clientHeight).map(el=>({tag:el.tagName,top:el.scrollTop,height:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY}))}})()`,
    )
    await writeFile(
      path.join(input.directory, 'production-sharing-web-layout.json'),
      JSON.stringify(layout, null, 2),
    )
    await writeFile(
      path.join(input.directory, 'production-sharing-web-review.png'),
      await captureProof(window),
    )
    if (!input.requireLinkedPiece) return { webPreviewVerified: true, localPreload: false }
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      let checked=false,opened=false;
      const ready=()=>{
        const panel=document.querySelector('[aria-label="Vínculo das artes à peça"]');
        if(!checked){const button=[...(panel?.querySelectorAll('button')??[])].find(button=>button.textContent==='Conferir vínculo com a peça atual');if(button&&!button.disabled){checked=true;button.click()}return false}
        if(!opened){const button=[...(panel?.querySelectorAll('button')??[])].find(button=>button.textContent==='Abrir peça');if(button&&!button.disabled){opened=true;button.click()}return false}
        const image=document.querySelector('[data-editorial-component] img');return image?.complete&&image.naturalWidth>0;
      };
      const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
      const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A web não abriu a primeira arte da peça vinculada'))},120000),poll=setInterval(finish,250);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
    })`)
    const pieceImage = z
      .object({
        componentId: z.string().uuid(),
        width: z.number().positive(),
        height: z.number().positive(),
        alt: z.string(),
      })
      .parse(
        await window.webContents.executeJavaScript(
          `(()=>{const component=document.querySelector('[data-editorial-component]');const image=component.querySelector('img');component.scrollIntoView({block:'center'});return {componentId:component.dataset.editorialComponent,width:image.naturalWidth,height:image.naturalHeight,alt:image.alt}})()`,
        ),
      )
    await window.webContents.executeJavaScript(
      'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',
    )
    await writeFile(
      path.join(input.directory, 'production-linked-piece-web-review.png'),
      await captureProof(window),
    )
    await writeFile(
      path.join(input.directory, 'production-linked-piece-web-evidence.json'),
      JSON.stringify(
        { pieceImage, autoMime: true, localPreload: false, approved: false, published: false },
        null,
        2,
      ),
    )
    const history = await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      let opened=false,previewed=false;
      const ready=()=>{
        if(!opened){const button=[...document.querySelectorAll('button')].find(button=>button.textContent==='Histórico');if(button&&!button.disabled){opened=true;button.click()}return null}
        const dialog=document.querySelector('[role="dialog"][aria-label="Histórico de revisões"]');if(!dialog)return null;
        const error=dialog.querySelector('[role="alert"]');if(error)throw new Error(error.textContent);
        const articles=[...dialog.querySelectorAll('article')];
        if(!previewed){const button=[...dialog.querySelectorAll('button')].find(button=>button.textContent==='Conferir arquivo 1 desta revisão');if(button&&!button.disabled){previewed=true;button.click()}return null}
        const image=dialog.querySelector('img');
        return articles.length&&image?.complete&&image.naturalWidth>0 ? {revisions:articles.length,mediaWidth:image.naturalWidth,hasRestore:!![...dialog.querySelectorAll('button')].find(button=>button.textContent==='Restaurar conteúdo como nova revisão')} : null;
      };
      const finish=()=>{try{const result=ready();if(result){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(result)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
      const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A web não mostrou o histórico paginado'))},60000),poll=setInterval(finish,250);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
    })`)
    await writeFile(
      path.join(input.directory, 'revision-history-web-review.png'),
      await captureProof(window),
    )
    await writeFile(
      path.join(input.directory, 'revision-history-web-evidence.json'),
      JSON.stringify(history, null, 2),
    )
    const office = input.requireOffice ? await proveOfficeRead(window, input.directory) : undefined
    return {
      webPreviewVerified: true,
      editablePieceVerified: true,
      historyRead: true,
      localPreload: false,
      ...(office ? { office } : {}),
    }
  } catch (error) {
    await writeFile(path.join(input.directory, 'web-proof-failure.png'), await captureProof(window))
    await writeFile(
      path.join(input.directory, 'web-proof-failure.txt'),
      await window.webContents.executeJavaScript('document.body.innerText'),
    )
    throw error
  } finally {
    await writeFile(
      path.join(input.directory, 'production-sharing-web-requests.json'),
      JSON.stringify(
        [...requests].sort((a, b) => b[1].count - a[1].count),
        null,
        2,
      ),
    )
    window.destroy()
  }
}
