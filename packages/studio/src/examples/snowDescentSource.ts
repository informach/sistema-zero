import { snowDescentCanvasSource } from './snowDescentCanvasSource'

export type SnowVariant = 'canvas' | 'g2d' | 'gk'
export const SNOW_DESCRIPTION =
  'Desça a montanha, pegue estrelas e desvie das bandeiras. Setas ou A/D para virar; arraste na neve no celular. Enter ou toque começa. P ou o botão no canto pausa. Chegue ao fim com pelo menos uma das três vidas. R reinicia.'
export const SNOW_ADVANCED_DESCRIPTION =
  'Monte a descida com controles, movimento, vidas, placar e telas personalizáveis. Clique em Descer a montanha para começar. Setas/A-D ou arraste na neve para virar. P ou Pausar abre a pausa; Continuar retoma. Chegue com pelo menos seis estrelas e uma vida. O botão da tela final recomeça.'

/** Each call becomes one ordinary block. No data objects, custom functions or frame loop. */
export function snowDescentSource(variant: SnowVariant): string {
  if (variant === 'canvas') return snowDescentCanvasSource()
  const basic = variant === 'g2d'
  const api = basic ? 'SZGame2D' : 'SZGameKit'
  const sprite = (name: string, image: string, w: number, h: number) =>
    basic
      ? `const ${name} = ${api}.createSprite({ x: 0, y: 0, w: ${w}, h: ${h}, image: "${image}" });`
      : `const ${name} = ${api}.createCharacter({ image: "${image}", w: ${w}, h: ${h}, speed: 0, color: "#ffffff" });`
  const row = (
    name: string,
    image: string,
    w: number,
    h: number,
    x: number,
    z: number,
    count: number,
    spacing: number,
    pattern: string,
  ) => `
${sprite(name, image, w, h)}
${api}.putTrackSprite("pista", ${name}, ${x}, ${z});
${api}.repeatTrackSprite("pista", ${name}, ${count}, ${spacing}, "${pattern}");`
  return `
${basic ? `${api}.setupStage(640, 720, "#102d46");` : `${api}.setup({ width: 640, height: 720, background: "#102d46", accent: "#f99143" });`}
${api}.setStageDescription(${JSON.stringify(basic ? SNOW_DESCRIPTION : SNOW_ADVANCED_DESCRIPTION)});
${api}.addSceneBackdrop("ceu", "neve-ceu", "far");
${api}.addSceneBackdrop("montanhas", "neve-montanhas", "back");
${api}.sceneBackdropMotion("montanhas", 40);
${api}.addSceneBackdrop("chao", "neve-pista", "back");
${api}.addSceneBackdrop("flocos", "neve-brilho", "front");
${api}.createSpriteTrack("pista");
${sprite('jogador', 'neve-esquiador', 26, 42)}
${api}.sceneAnimation(jogador, "neve-esquiador-animado", "deslizar", false);
${
  basic
    ? `${api}.trackPlayer("pista", jogador, 3);
${api}.trackControls("pista", 140, 120);
${api}.trackTravel("pista", 320, 6600);`
    : `${api}.setHealth(jogador, 3);
${api}.trackFollow("pista", jogador);
${api}.trackInput("pista", "both", 140);
${api}.trackLimit("pista", 120, 120);
${api}.trackSpeed("pista", 320);
${api}.trackFinishLine("pista", 6600);`
}
${row('estrela', 'neve-estrela', 22, 22, -80, 600, 12, 480, 'weave')}
${row('bandeira', 'neve-bandeira', 28, 60, 80, 840, 6, 960, 'alternate')}
${row('bandeiraDireita', 'neve-bandeira', 28, 60, 70, 1320, 6, 960, 'line')}
${row('gelo', 'neve-gelo', 150, 32, -40, 930, 12, 480, 'weave')}
${row('pinheiroEsquerda', 'neve-pinheiro', 90, 135, -210, 280, 36, 180, 'steps-left')}
${row('pinheiroDireita', 'neve-pinheiro', 90, 135, 210, 340, 36, 180, 'steps-right')}
${
  basic
    ? `${api}.trackHud("pista", "Estrelas", 12);
${api}.sceneGameScreens("DESCIDA DA NEVE", "Pegue estrelas. Desvie das bandeiras.");
${api}.onTrackEncounter("pista", estrela, function () {
  ${api}.collectTrackItem();
  ${api}.trackScore("pista", 1);
});
${api}.onTrackEncounter("pista", bandeira, function () {
  ${api}.trackHurt("pista", 1);
});
${api}.onTrackEncounter("pista", bandeiraDireita, function () {
  ${api}.trackHurt("pista", 1);
});`
    : `let estrelas = 0;
${api}.setScreenText("menu", "DESCIDA DA NEVE", "Pegue seis estrelas e desvie das bandeiras. Use setas ou arraste na pista.", "Descer a montanha");
${api}.setScreenText("pausa", "DESCANSO NA MONTANHA", "Vamos continuar a descida?", "Continuar");
${api}.setScreenText("vitoria", "VOCÊ CHEGOU!", "Você chegou com pelo menos seis estrelas.", "Descer de novo");
${api}.setScreenText("fim", "VAMOS TENTAR DE NOVO?", "Pegue seis estrelas e cuide das três vidas.", "Tentar de novo");
${api}.setPauseKey("p");
${api}.onTrackSpriteEncounter("pista", estrela, function (encontrado) {
  ${api}.collectTrackItem();
  estrelas = estrelas + 1;
});
${api}.onTrackSpriteEncounter("pista", bandeira, function (encontrado) {
  ${api}.hurt(jogador, 1, 0.35);
  if (${api}.isDead(jogador)) { ${api}.setState("fim"); }
});
${api}.onTrackSpriteEncounter("pista", bandeiraDireita, function (encontrado) {
  ${api}.hurt(jogador, 1, 0.35);
  if (${api}.isDead(jogador)) { ${api}.setState("fim"); }
});
${api}.trackCameraView("pista", "near");
${api}.onTrackFinish("pista", function () {
  if (estrelas >= 6) {
    ${api}.setState("vitoria");
  } else {
    ${api}.setState("fim");
  }
});
${api}.onDrawHud(function (ctx) {
  ${api}.drawCounter("Vidas", ${api}.healthOf(jogador), 30, 28);
  ${api}.drawCounter("Estrelas", estrelas + "/12", 180, 28);
  ${api}.drawCounter("Pausar", "", ${api}.width() - 100, 28);
  ${api}.drawBar(${api}.trackPosition("pista", "distance"), 6600, 24, 80, ${api}.width() - 48, 5, "#82d1dc");
});
${api}.onGameClick(function (x, y) {
  if (${api}.state() === "jogando" && x > ${api}.width() - 120 && y < 90) {
    ${api}.pause();
  }
});`
}
`
}
