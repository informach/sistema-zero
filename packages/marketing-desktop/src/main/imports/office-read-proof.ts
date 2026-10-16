import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BrowserWindow } from 'electron'
import { z } from 'zod'
import { captureProof } from './capture-proof'

/** Continue the already authenticated web review through the same Office control used by staff. */
export async function proveOfficeRead(window: BrowserWindow, directory: string) {
  const result = z
    .object({ path: z.string(), body: z.string().min(1000), origin: z.string() })
    .parse(
      await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      let opened=false,consulted=false,requested=false,sourcePath='';
      const ready=()=>{
        const history=document.querySelector('[role="dialog"][aria-label="Histórico de revisões"]');
        if(history){history.querySelector('button[aria-label="Fechar"]')?.click();return null}
        if(requested){
          if(document.querySelector('[role="dialog"][aria-label="Importar acervo existente"]'))return null;
          const section=document.querySelector('[aria-label="Documento selecionado"]');
          const body=section?.querySelector('p.whitespace-pre-wrap')?.textContent;
          return body&&body.length>1000 ? {path:sourcePath,body,origin:section.textContent} : null;
        }
        const list=document.querySelector('[aria-label="Cargas do acervo"]');
        if(!list){[...document.querySelectorAll('button')].find(button=>button.textContent==='Importar acervo')?.click();return null}
        const error=document.querySelector('[role="dialog"][aria-label="Importar acervo existente"] [role="alert"]');
        if(error)throw new Error(error.textContent);
        if(!opened){
          const row=[...list.querySelectorAll('li')].find(row=>row.textContent.includes('Fluxo Criativo'));
          const button=[...(row?.querySelectorAll('button')??[])].find(button=>button.textContent==='Conferir origens');
          if(button&&!button.disabled){opened=true;button.click()}return null;
        }
        const panel=document.querySelector('[aria-label="Cobertura da carga"]');
        if(!panel)return null;
        if(!consulted){const button=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Conferir cobertura da carga');if(button&&!button.disabled){consulted=true;button.click()}return null}
        const row=[...panel.querySelectorAll('[aria-label="Origens e destinos da carga"] > li')].find(row=>row.textContent.includes('fixados-instagram-sistema-zero-kids-MELHORADO.docx'));
        const button=[...(row?.querySelectorAll('button')??[])].find(button=>button.textContent==='Abrir texto extraído do Office');
        if(button&&!button.disabled){sourcePath=row.querySelector('p').textContent;requested=true;button.click()}
        return null;
      };
      const finish=()=>{try{const value=ready();if(value){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(value)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
      const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('O texto do Office não abriu pelo controle da cobertura'))},120000),poll=setInterval(finish,250);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
    })`),
    )
  assert.ok(result.origin.includes('Natureza:'))
  assert.ok(result.origin.includes('Origem:'))
  await window.webContents.executeJavaScript(
    `document.querySelector('[aria-label="Documento selecionado"]').scrollIntoView({block:'start'})`,
  )
  await writeFile(path.join(directory, 'office-read-web-review.png'), await captureProof(window))
  const evidence = {
    path: result.path,
    characters: result.body.length,
    sourceVisible: true,
    nativePreload: false,
    edited: false,
    published: false,
  }
  await writeFile(
    path.join(directory, 'office-read-web-evidence.json'),
    JSON.stringify(evidence, null, 2),
  )
  return evidence
}
