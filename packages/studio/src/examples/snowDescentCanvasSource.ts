import { SNOW_COURSE } from './snowDescentAssets'

/** Manual counterpart: the learner owns projection, input, state and rendering. */
export function snowDescentCanvasSource(): string {
  const course = JSON.stringify(
    Array.from({ length: Math.ceil(SNOW_COURSE.length / 9) }, (_, i) =>
      SNOW_COURSE.slice(i * 9, i * 9 + 9),
    ),
  )
  return `const canvas = document.getElementById("neve");
const ctx = canvas.getContext("2d");
const trechos = ${course};
const percurso = [];
for (let trecho = 0; trecho < trechos.length; trecho++) {
  const objetos = trechos[trecho];
  for (let indice = 0; indice < objetos.length; indice++) { percurso.push(objetos[indice]); }
}
let tratados = [];
let estado = "inicio";
let jogadorX = 0;
let progresso = 0;
let anterior = 0;
let vidas = 3;
let estrelas = 0;
let brilho = 0;
let apertadoAntes = false;
let pausaAntes = false;
let reinicioAntes = false;

function preparar() {
  jogadorX = 0; progresso = 0; anterior = 0; vidas = 3; estrelas = 0; brilho = 0;
  tratados = [];
  for (let i = 0; i < percurso.length; i++) { tratados.push(false); }
}
// 1. Ler teclado e toque, incluindo inicio, pausa e reinicio.
function controlar() {
  const tocando = __szInput.down;
  const inicio = __szInput.key("Enter") || (tocando && __szInput.y >= 90);
  const pausa = __szInput.key("p") || __szInput.key("P") || (tocando && __szInput.x > 520 && __szInput.y < 90);
  const reinicio = __szInput.key("r") || __szInput.key("R");
  if (reinicio && !reinicioAntes) { preparar(); estado = "jogando"; }
  if (inicio && !apertadoAntes) {
    if (estado === "inicio" || estado === "venceu" || estado === "perdeu") { preparar(); estado = "jogando"; }
    else if (estado === "pausa") { estado = "jogando"; }
  }
  if (pausa && !pausaAntes) {
    if (estado === "jogando") { estado = "pausa"; }
    else if (estado === "pausa") { estado = "jogando"; }
  }
  apertadoAntes = inicio; pausaAntes = pausa; reinicioAntes = reinicio;
}
// 2. Avancar a partida e resolver encontros no percurso.
function atualizar(dt) {
  controlar();
  const tocando = __szInput.down;
  brilho = Math.max(0, brilho - dt);
  if (estado === "jogando") {
    if (__szInput.key("ArrowLeft") || __szInput.key("a") || __szInput.key("A")) { jogadorX = jogadorX - 140 * dt; }
    if (__szInput.key("ArrowRight") || __szInput.key("d") || __szInput.key("D")) { jogadorX = jogadorX + 140 * dt; }
    if (tocando && __szInput.y >= 90) { jogadorX = jogadorX + Math.max(-140 * dt, Math.min(140 * dt, (__szInput.x - 320) / 2 - jogadorX)); }
    jogadorX = Math.max(-120, Math.min(120, jogadorX));
    anterior = progresso;
    progresso = progresso + 320 * dt;
    for (let i = 0; i < percurso.length; i++) {
      const item = percurso[i];
      if (!tratados[i] && item.z > anterior && item.z <= progresso) {
        if (Math.abs(jogadorX - item.x) <= (26 + item.w) / 2) {
          if (item.kind === "star") { estrelas = estrelas + 1; }
          if (item.kind === "flag") { vidas = Math.max(0, vidas - 1); brilho = 0.35; }
        }
        tratados[i] = true;
      }
    }
    if (vidas <= 0) { estado = "perdeu"; }
    else if (progresso >= 6600) { estado = "venceu"; }
  }
}
// 3. Transformar a distancia de um item em posicao e tamanho na tela.
function desenharItem(item) {
  const distancia = item.z - progresso + 120;
  if (distancia >= 20 && distancia <= 2600) {
    const escala = 300 / distancia;
    const largura = item.w * escala;
    const altura = item.h * escala;
    const telaX = 320 + (item.x - jogadorX * 0.2) * escala - largura / 2;
    const telaY = 201.6 + 160 * escala - altura;
    if (item.kind === "star") { {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-estrela"] ?? "neve-estrela";
    imagem.onload = () => ctx.drawImage(imagem, telaX, telaY, largura, altura);
  } }
if (item.kind === "flag") { {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-bandeira"] ?? "neve-bandeira";
    imagem.onload = () => ctx.drawImage(imagem, telaX, telaY, largura, altura);
  } }
if (item.kind === "pine") { {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-pinheiro"] ?? "neve-pinheiro";
    imagem.onload = () => ctx.drawImage(imagem, telaX, telaY, largura, altura);
  } }
if (item.kind === "ice") { {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-gelo"] ?? "neve-gelo";
    imagem.onload = () => ctx.drawImage(imagem, telaX, telaY, largura, altura);
  } }
  }
}
// 4. Compor o quadro: cenario, percurso, jogador, frente e painel.
function desenhar(ctx) {
  ctx.clearRect(0, 0, 640, 720);
    {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-ceu"] ?? "neve-ceu";
    imagem.onload = () => ctx.drawImage(imagem, 0, 0, 640, 720);
  }
    {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-montanhas"] ?? "neve-montanhas";
    imagem.onload = () => ctx.drawImage(imagem, -12.8 - jogadorX * 0.08, -10, 665.6, 748.8);
  }
    {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-pista"] ?? "neve-pista";
    imagem.onload = () => ctx.drawImage(imagem, 0, 0, 640, 720);
  }
    for (let ordem = 0; ordem < percurso.length; ordem++) { const i = percurso.length - 1 - ordem; const item = percurso[i]; if (!tratados[i]) { 
  desenharItem(item);
  } }
    {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-esquiador"] ?? "neve-esquiador";
    imagem.onload = () => ctx.drawImage(imagem, 287.5 + jogadorX * 2, 496.6, 65, 105);
  }
    {
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.["neve-brilho"] ?? "neve-brilho";
    imagem.onload = () => ctx.drawImage(imagem, 0, 0, 640, 720);
  }
  
  ctx.fillStyle = "#123149"; ctx.fillRect(16, 16, 608, 58);
  ctx.fillStyle = "#ffffff"; ctx.font = "20px sans-serif"; ctx.fillText("VIDAS " + vidas + "    ESTRELAS " + estrelas + "/12", 30, 51);
  ctx.fillStyle = "#ffffff"; ctx.font = "20px sans-serif"; ctx.fillText("II  P", 550, 51);
  ctx.fillStyle = "#82d1dc"; ctx.fillRect(24, 80, 592 * Math.min(1, progresso / 6600), 5);
  ctx.fillStyle = "#24465e"; ctx.font = "16px sans-serif"; ctx.fillText("SETAS / A D para virar  •  Arraste na neve", 146, 680);
  if (brilho > 0) { ctx.fillStyle = "#ef6270"; ctx.fillRect(0, 90, 640, 5); }
  if (estado !== "jogando") {
    ctx.fillStyle = "#0d263c"; ctx.fillRect(52, 238, 536, 222);
    if (estado === "inicio") { ctx.fillStyle = "#fff0cb"; ctx.font = "32px sans-serif"; ctx.fillText("DESCIDA DA NEVE", 158, 290); }
    if (estado === "pausa") { ctx.fillStyle = "#fff0cb"; ctx.font = "32px sans-serif"; ctx.fillText("PAUSA NA MONTANHA", 126, 290); }
    if (estado === "venceu") { ctx.fillStyle = "#fff0cb"; ctx.font = "32px sans-serif"; ctx.fillText("CHEGOU AO VALE!", 153, 290); }
    if (estado === "perdeu") { ctx.fillStyle = "#fff0cb"; ctx.font = "32px sans-serif"; ctx.fillText("VAMOS TENTAR DE NOVO?", 79, 290); }
    ctx.fillStyle = "#d9edf3"; ctx.font = "18px sans-serif"; ctx.fillText("Pegue estrelas. Desvie das bandeiras.", 157, 331);
    ctx.fillStyle = "#d9edf3"; ctx.font = "18px sans-serif"; ctx.fillText("3 vidas para atravessar a montanha.", 162, 362);
    if (estado === "venceu" || estado === "perdeu") { ctx.fillStyle = "#d9edf3"; ctx.font = "18px sans-serif"; ctx.fillText("Você pegou " + estrelas + " de 12 estrelas.", 189, 392); }
    ctx.fillStyle = "#ffd18a"; ctx.font = "18px sans-serif"; ctx.fillText("ENTER ou TOQUE para continuar", 169, 430);
  }
}
preparar();
let lastFrameTime;
function quadro(tempo) {
  const dt = lastFrameTime === undefined ? 0 : (tempo - lastFrameTime) / 1000;
  lastFrameTime = tempo;
  atualizar(Math.min(0.05, Math.max(0, dt)));
  desenhar(ctx);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);`
}
