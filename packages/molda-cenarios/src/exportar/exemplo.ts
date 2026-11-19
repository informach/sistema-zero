/** Arquivos fixos do exemplo: dados autorais entram por JSON/textContent, nunca como código. */
export const HTML_DO_EXEMPLO = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cenário do Molda</title><link rel="icon" href="data:,"><link rel="stylesheet" href="explorar.css"></head>
<body><main><canvas tabindex="0" aria-label="Exploração do cenário 3D"></canvas>
<header><h1>Cenário do Molda</h1><p id="estado" role="status">Carregando o cenário…</p></header>
<section aria-label="Controles" class="controles">
<button id="pausar" type="button" disabled>Pausar</button><button id="inicio" type="button" disabled>Voltar ao início</button>
<details><summary>Como explorar</summary><p>WASD ou setas: andar. Shift: correr. Espaço: saltar. Arraste no cenário para olhar. Escape: pausar.</p>
<p>No toque, mantenha pressionados os botões de movimento e arraste no cenário para olhar.</p>
<p>Este exemplo usa a figura neutra do modo Testar. As regras e o avatar de um jogo são conectados pelo próprio jogo.</p></details></section>
<nav aria-label="Movimento por toque" class="toque"><button data-frente="1" aria-label="Avançar">↑</button>
<div><button data-lado="-1" aria-label="Esquerda">←</button><button data-frente="-1" aria-label="Recuar">↓</button><button data-lado="1" aria-label="Direita">→</button></div>
<button data-saltar="1">Saltar</button><button data-correr="1">Correr</button></nav>
</main><script type="module" src="explorar.js"></script></body></html>
`

export const CSS_DO_EXEMPLO = `:root{color-scheme:dark;font:15px/1.5 system-ui,sans-serif;background:#151722;color:#f4f4f8}*{box-sizing:border-box}body{margin:0}main{height:100dvh;min-height:360px;position:relative;overflow:hidden}canvas{width:100%;height:100%;display:block;touch-action:none}canvas:focus-visible{outline:3px solid #d8ef74;outline-offset:-4px}header,.controles,.toque{position:absolute;background:#202330ed;border:1px solid #44495d;border-radius:14px;padding:12px 16px}header{left:16px;top:16px;max-width:calc(100% - 32px);pointer-events:none}h1{font-size:18px;margin:0}p{margin:6px 0}.controles{left:16px;bottom:16px;max-width:min(480px,calc(100% - 32px));max-height:45%;overflow:auto}button,summary{font:inherit;cursor:pointer}button{border:1px solid #67704d;border-radius:9px;min-height:44px;min-width:44px;padding:8px 13px;margin:3px;background:#d8ef74;color:#20232d;font-weight:650;touch-action:none}button:disabled{opacity:.5;cursor:default}button:focus-visible,summary:focus-visible{outline:3px solid #fff;outline-offset:2px}.toque{right:16px;bottom:16px;text-align:center;display:none}@media(pointer:coarse),(max-width:720px){.toque{display:block}.controles{bottom:auto;top:112px;max-width:calc(100% - 32px);padding:8px 12px}.controles details{max-width:350px}header{padding:8px 12px}}`

export const JS_DO_EXEMPLO = `import { iniciarExploracaoDoCenario } from './carregar-cenario.js';
const canvas=document.querySelector('canvas'),status=document.querySelector('#estado'),pausar=document.querySelector('#pausar'),inicio=document.querySelector('#inicio');
const controller=new AbortController();let exploracao=null,pausado=false;
const falhar=erro=>{status.textContent=erro instanceof Error?erro.message:'Não consegui abrir o cenário.';pausar.disabled=true;inicio.disabled=true;};
try{
  exploracao=await iniciarExploracaoDoCenario({canvas,endereco:new URL('./cenario.json',import.meta.url),sinal:controller.signal,
    aoErro:falhar,aoEstado:estado=>{pausado=estado.pausado;pausar.textContent=pausado?'Continuar':'Pausar';status.textContent=estado.caiu?'Você saiu da região. Volte ao início.':pausado?'Exploração pausada':estado.nadando?'Explorando na água':'Explore com as setas ou os controles de toque.';}});
  document.querySelector('h1').textContent=exploracao.nome;pausar.disabled=false;inicio.disabled=false;
  pausar.addEventListener('click',()=>exploracao.comandar({pausado:!pausado}));
  inicio.addEventListener('click',()=>exploracao.comandar({retomarInicio:true,pausado:false}));
  const pressionados=new Map();
  const atualizar=()=>{let frente=0,lado=0,saltar=false,correr=false;for(const b of pressionados.values()){frente+=Number(b.dataset.frente||0);lado+=Number(b.dataset.lado||0);saltar||=!!b.dataset.saltar;correr||=!!b.dataset.correr;}exploracao.entrada({frente,lado,saltar,correr});};
  for(const b of document.querySelectorAll('.toque button')){
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pressionados.set(e.pointerId,b);atualizar();});
    for(const tipo of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(tipo,e=>{pressionados.delete(e.pointerId);atualizar();});
  }
  window.addEventListener('blur',()=>{pressionados.clear();atualizar();});
}catch(erro){falhar(erro);}
window.addEventListener('pagehide',()=>{controller.abort();exploracao?.descartar();},{once:true});
`
