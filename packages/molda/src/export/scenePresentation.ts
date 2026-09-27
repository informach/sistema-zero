import { requireScene } from '../scene/validation'

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )

/** Self-contained turntable: no CDN, external images, uploads or autoplay. */
export function scenePresentationHtml(name: string, frames: readonly string[]) {
  requireScene(frames.length >= 2 && frames.length <= 24, 'frames', 'Quantidade de fotos inválida.')
  let bytes = 0
  for (const frame of frames) {
    bytes += frame.length
    requireScene(
      /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame) && bytes <= 24 * 1024 * 1024,
      'frames',
      'As fotos passaram do tamanho seguro.',
    )
  }
  return `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(name)} · Molda</title>
<style>body{margin:0;background:#e6f1ff;color:#162d4f;font:18px system-ui;display:grid;min-height:100dvh;place-items:center}main{width:min(92vw,640px);text-align:center;padding:24px;box-sizing:border-box}h1{overflow-wrap:anywhere}img{display:block;width:100%;aspect-ratio:1;object-fit:contain;touch-action:pan-y;user-select:none}button,input{min-height:44px}button{border:1px solid #6a85a5;border-radius:12px;background:white;color:inherit;font:inherit;padding:8px 16px}nav{display:flex;gap:12px;align-items:center}input{flex:1;min-width:0}p{font-size:15px;line-height:1.5}:focus-visible{outline:3px solid #176cda;outline-offset:3px}</style>
<main><h1>${escapeHtml(name)}</h1><img id="model" src="${frames[0]}" alt="Vista da criação ${escapeHtml(name)}" draggable="false"><nav aria-label="Girar a criação"><button id="previous" aria-label="Girar para a esquerda">←</button><input id="angle" type="range" min="0" max="${frames.length - 1}" value="0" aria-label="Ângulo da criação"><button id="next" aria-label="Girar para a direita">→</button></nav><p>Arraste a imagem ou use as setas para girar. Esta apresentação mostra fotos da pose salva no Molda e funciona sem internet.</p></main>
<script>"use strict";const frames=${JSON.stringify(frames)},photo=document.getElementById('model'),slider=document.getElementById('angle');let current=0,start=null;function show(value){current=((value%frames.length)+frames.length)%frames.length;photo.src=frames[current];slider.value=String(current)}document.getElementById('previous').onclick=()=>show(current-1);document.getElementById('next').onclick=()=>show(current+1);slider.oninput=()=>show(Number(slider.value));photo.onpointerdown=event=>{start={x:event.clientX,index:current};photo.setPointerCapture(event.pointerId)};photo.onpointermove=event=>{if(start)show(start.index+Math.round((start.x-event.clientX)/18))};photo.onpointerup=photo.onpointercancel=()=>{start=null};</script></html>`
}
