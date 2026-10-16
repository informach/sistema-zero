import {captureBlocksImage,captureRuntimeDocument,prepareCaptureProject,captureLimits} from '@sistemazero/studio/capture'
import '@fontsource/baloo-2/latin-600.css'
import '@fontsource/nunito/latin-600.css'

async function compile(raw:unknown,view:'runtime'|'blocks',runtimeImports:Record<string,string>){
 const project=await prepareCaptureProject(raw)
 if(view==='runtime')return {html:await captureRuntimeDocument(project,runtimeImports),projectName:project.name}
 const container=document.getElementById('blocks')
 if(!container)throw new Error('Área de captura ausente')
 const image=await captureBlocksImage(project,container)
 const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('PNG inválido'));reader.readAsDataURL(image)})
 return {dataUrl,projectName:project.name}
}
// This page is isolated from the product renderer and deliberately has no preload/IPC bridge.
Object.defineProperty(window,'studioCapture',{value:Object.freeze({compile,limits:captureLimits}),writable:false})
