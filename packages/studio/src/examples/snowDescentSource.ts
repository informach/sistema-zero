import { SNOW_COURSE } from './snowDescentAssets'

export type SnowVariant = 'canvas' | 'g2d' | 'gk'
export const SNOW_DESCRIPTION =
  'Desça a montanha, pegue estrelas e desvie das bandeiras. Setas ou A/D para virar; arraste na neve no celular. Enter ou toque começa. P ou o botão no canto pausa. Chegue ao fim com pelo menos uma das três vidas. R reinicia.'

/** This source becomes ordinary Canvas blocks, including the cached image macro. */
function image(name: string, x: string, y: string, w: string, h: string) {
  return `{
    const imagem = new Image();
    imagem.src = window.__SZGAME_ASSETS?.[${JSON.stringify(name)}] ?? ${JSON.stringify(name)};
    imagem.onload = () => ctx.drawImage(imagem, ${x}, ${y}, ${w}, ${h});
  }`
}

function snowHud(basic: boolean) {
  const rect = (x: string, y: string, w: string, h: string, color: string) =>
    basic
      ? `SZGame2D.paintRect(ctx, ${x}, ${y}, ${w}, ${h}, "${color}");`
      : `ctx.fillStyle = "${color}"; ctx.fillRect(${x}, ${y}, ${w}, ${h});`
  const text = (content: string, x: number, y: number, size: number, color = '#ffffff') =>
    basic
      ? `SZGame2D.drawLabel(ctx, ${content}, ${x}, ${y}, "${color}", ${size}, "left");`
      : `ctx.fillStyle = "${color}"; ctx.font = "${size}px sans-serif"; ctx.fillText(${content}, ${x}, ${y});`
  return `
  ${rect('16', '16', '608', '58', '#123149')}
  ${text('"VIDAS " + vidas + "    ESTRELAS " + estrelas + "/12"', 30, 51, 20)}
  ${text('"II  P"', 550, 51, 20)}
  ${rect('24', '80', '592 * Math.min(1, progresso / 6600)', '5', '#82d1dc')}
  ${text('"SETAS / A D para virar  •  Arraste na neve"', 146, 680, 16, '#24465e')}
  if (brilho > 0) { ${rect('0', '90', '640', '5', '#ef6270')} }
  if (estado !== "jogando") {
    ${rect('52', '238', '536', '222', '#0d263c')}
    if (estado === "inicio") { ${text('"DESCIDA DA NEVE"', 158, 290, 32, '#fff0cb')} }
    if (estado === "pausa") { ${text('"PAUSA NA MONTANHA"', 126, 290, 32, '#fff0cb')} }
    if (estado === "venceu") { ${text('"CHEGOU AO VALE!"', 153, 290, 32, '#fff0cb')} }
    if (estado === "perdeu") { ${text('"VAMOS TENTAR DE NOVO?"', 79, 290, 32, '#fff0cb')} }
    ${text('"Pegue estrelas. Desvie das bandeiras."', 157, 331, 18, '#d9edf3')}
    ${text('"3 vidas para atravessar a montanha."', 162, 362, 18, '#d9edf3')}
    if (estado === "venceu" || estado === "perdeu") { ${text('"Você pegou " + estrelas + " de 12 estrelas."', 189, 392, 18, '#d9edf3')} }
    ${text('"ENTER ou TOQUE para continuar"', 169, 430, 18, '#ffd18a')}
  }`
}

export function snowDescentSource(variant: SnowVariant): string {
  const manual = variant === 'canvas'
  const api = variant === 'g2d' ? 'SZGame2D' : 'SZGameKit'
  const key = (name: string) =>
    manual
      ? `__szInput.key("${name}")`
      : `${api}.keyDown("${name.length === 1 ? name.toLowerCase() : name}")`
  // The Canvas input is case-sensitive, so a letter is asked twice; the engines fold
  // the case themselves, and asking twice there would stack two identical blocks.
  const letter = (name: string) =>
    manual ? `${key(name)} || ${key(name.toUpperCase())}` : key(name)
  const px = manual
    ? '__szInput.x'
    : variant === 'g2d'
      ? 'SZGame2D.pointer.x'
      : 'SZGameKit.mouseScreenX()'
  const py = manual
    ? '__szInput.y'
    : variant === 'g2d'
      ? 'SZGame2D.pointer.y'
      : 'SZGameKit.mouseScreenY()'
  const down = manual
    ? '__szInput.down'
    : variant === 'g2d'
      ? 'SZGame2D.pointerDown()'
      : 'SZGameKit.mouseDown()'
  const setup = manual
    ? 'const canvas = document.getElementById("neve");\nconst ctx = canvas.getContext("2d");'
    : variant === 'g2d'
      ? `SZGame2D.setupStage(640, 720, "#102d46");\nSZGame2D.setStageDescription(${JSON.stringify(SNOW_DESCRIPTION)});`
      : `SZGameKit.setup({ width: 640, height: 720, background: "#102d46", accent: "#f99143" });\nSZGameKit.setStageDescription(${JSON.stringify(SNOW_DESCRIPTION)});\nSZGameKit.setState("jogando");`
  const layers = manual
    ? ''
    : `
${api}.createSceneLayer("ceu", "neve-ceu", "back");
${api}.createSceneLayer("montanhas", "neve-montanhas", "back");
${api}.orderSceneLayer("montanhas", 1);
${api}.createSceneLayer("chao", "neve-pista", "back");
${api}.orderSceneLayer("chao", 2);
${api}.createSceneLayer("flocos", "neve-brilho", "front");`
  const populate = manual
    ? ''
    : `
  ${api}.createTrack("pista", 28, 300, 160, 120);
  ${api}.viewTrack("pista", 20, 2600);
  ${api}.placeTrackObject("pista", "jogador", "neve-esquiador", 0, 0, 26, 42);
  for (let i = 0; i < percurso.length; i++) {
    const item = percurso[i];
    ${(['star', 'flag', 'pine', 'ice'] as const).map((kind) => `if (item.kind === "${kind}") { ${api}.placeTrackObject("pista", "obj" + i, "neve-${{ star: 'estrela', flag: 'bandeira', pine: 'pinheiro', ice: 'gelo' }[kind]}", item.x, item.z, item.w, item.h); }`).join('\n')}
  }`
  const projection = `
  const distancia = item.z - progresso + 120;
  if (distancia >= 20 && distancia <= 2600) {
    const escala = 300 / distancia;
    const largura = item.w * escala;
    const altura = item.h * escala;
    const telaX = 320 + (item.x - jogadorX * 0.2) * escala - largura / 2;
    const telaY = 201.6 + 160 * escala - altura;
    ${(['star', 'flag', 'pine', 'ice'] as const).map((kind) => `if (item.kind === "${kind}") { ${image(`neve-${{ star: 'estrela', flag: 'bandeira', pine: 'pinheiro', ice: 'gelo' }[kind]}`, 'telaX', 'telaY', 'largura', 'altura')} }`).join('\n')}
  }`
  const background = manual
    ? `ctx.clearRect(0, 0, 640, 720);
    ${image('neve-ceu', '0', '0', '640', '720')}
    ${image('neve-montanhas', '-12.8 - jogadorX * 0.08', '-10', '665.6', '748.8')}
    ${image('neve-pista', '0', '0', '640', '720')}
    for (let ordem = 0; ordem < percurso.length; ordem++) { const i = percurso.length - 1 - ordem; const item = percurso[i]; if (!tratados[i]) { ${projection} } }
    ${image('neve-esquiador', '287.5 + jogadorX * 2', '496.6', '65', '105')}
    ${image('neve-brilho', '0', '0', '640', '720')}`
    : `${api}.transformSceneLayer("montanhas", -12.8 - jogadorX * 0.08, -10, 1.04, 1);
    ${api}.drawSceneLayers("back");
    ${api}.drawTrack("pista");
    ${api}.drawSceneLayers("front");`
  const loop = manual
    ? `let lastFrameTime;
function quadro(tempo) {
  const dt = lastFrameTime === undefined ? 0 : (tempo - lastFrameTime) / 1000;
  lastFrameTime = tempo;
  atualizar(Math.min(0.05, Math.max(0, dt)));
  desenhar(ctx);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);`
    : variant === 'g2d'
      ? `SZGame2D.gameLoop(function () { atualizar(1 / 60); desenhar(ctx); });`
      : `SZGameKit.onUpdate(function (dt) { atualizar(dt); });
SZGameKit.start();`
  return `${setup}
const trechos = ${JSON.stringify(Array.from({ length: Math.ceil(SNOW_COURSE.length / 9) }, (_, index) => SNOW_COURSE.slice(index * 9, index * 9 + 9)))};
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
${layers}
function preparar() {
  jogadorX = 0; progresso = 0; anterior = 0; vidas = 3; estrelas = 0; brilho = 0;
  tratados = [];
  for (let i = 0; i < percurso.length; i++) { tratados.push(false); }
  ${populate}
}
function atualizar(dt) {
  const tocando = ${down};
  const inicio = ${key('Enter')} || (tocando && ${py} >= 90);
  const pausa = ${letter('p')} || (tocando && ${px} > 520 && ${py} < 90);
  const reinicio = ${letter('r')};
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
  brilho = Math.max(0, brilho - dt);
  if (estado === "jogando") {
    if (${key('ArrowLeft')} || ${letter('a')}) { jogadorX = jogadorX - 140 * dt; }
    if (${key('ArrowRight')} || ${letter('d')}) { jogadorX = jogadorX + 140 * dt; }
    if (tocando && ${py} >= 90) { jogadorX = jogadorX + Math.max(-140 * dt, Math.min(140 * dt, (${px} - 320) / 2 - jogadorX)); }
    jogadorX = Math.max(-120, Math.min(120, jogadorX));
    anterior = progresso;
    ${
      manual
        ? 'progresso = progresso + 320 * dt;'
        : `${api}.cameraTrack("pista", jogadorX * 0.2, progresso);
    ${api}.advanceTrack("pista", 320 * dt);
    progresso = ${api}.trackValue("pista", "distance");
    ${api}.moveTrackObject("pista", "jogador", jogadorX, progresso);`
    }
    for (let i = 0; i < percurso.length; i++) {
      const item = percurso[i];
      if (!tratados[i] && ${manual ? 'item.z > anterior && item.z <= progresso' : `${api}.trackPassed("pista", "obj" + i)`}) {
        if (${manual ? 'Math.abs(jogadorX - item.x) <= (26 + item.w) / 2' : `${api}.trackTouching("pista", "obj" + i, jogadorX, 26)`}) {
          if (item.kind === "star") { estrelas = estrelas + 1; }
          if (item.kind === "flag") { vidas = Math.max(0, vidas - 1); brilho = 0.35; }
        }
        tratados[i] = true;
        ${manual ? '' : `${api}.removeTrackObject("pista", "obj" + i);`}
      }
    }
    if (vidas <= 0) { estado = "perdeu"; }
    else if (progresso >= 6600) { estado = "venceu"; }
  }
}
${variant === 'gk' ? 'SZGameKit.onDraw(function (ctx) {' : 'function desenhar(ctx) {'}
  ${background}
  ${snowHud(variant === 'g2d')}
${variant === 'gk' ? '});' : '}'}
preparar();
${loop}`
}
