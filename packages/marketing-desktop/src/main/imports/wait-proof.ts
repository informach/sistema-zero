import { app, type BrowserWindow } from 'electron'

/** Development-only DOM condition, with a deadline and cleanup on every exit. */
export async function waitProof(
  window: BrowserWindow,
  expression: string,
  message: string,
  timeoutMs = 60000,
) {
  if (app.isPackaged) throw new Error('Prova restrita à distribuição de desenvolvimento')
  const result: unknown =
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const ready=()=>(${expression});
    const finish=()=>{try{const value=ready();if(value){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(value)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error(${JSON.stringify(message)}))},${timeoutMs}),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  return result
}
