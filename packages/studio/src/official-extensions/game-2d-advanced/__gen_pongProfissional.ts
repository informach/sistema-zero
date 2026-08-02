import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectGeneratedTypes, stripGeneratedIds } from './generationUtils'

/**
 * Gerador one-off da IR do exemplo "Pong Profissional" (nível 2 da trilogia Pong
 * do Clear Code, recriado com o motor avançado). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_pongProfissional.ts` e cole
 * a saída em `examples/pongProfissionalExample.ts`. O drift test
 * (`__tests__/pongProfissionalExample.test.ts`) guarda o resultado.
 *
 * Diferencial sobre o Pong básico: motor avançado (personagens + física +
 * telas + HUD), raquete por tecla SEGURADA com dt, ângulo pelo ponto de contato,
 * a bola ACELERA a cada troca (rally) e a partida vai até 7 com tremor de câmera
 * e som. Tudo procedural.
 */
export const PONG_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 680, height: 420, background: "#0b1020", accent: "#22d3ee" });
SZGameKit.setScreenText("menu", "Pong Profissional", "Suba e desça a raquete com as setas. Rebata com a beirada para dar ângulo, e a bola acelera a cada troca. Faça 7 pontos!", "Jogar");
SZGameKit.setScreenText("vitoria", "Você venceu!", "Chegou a 7 pontos antes do computador. Que reflexos de campeão!", "Jogar de novo");
SZGameKit.setScreenText("fim", "O computador venceu", "Ele fez 7 pontos primeiro. Use a beirada da raquete para dar ângulos difíceis!", "Tentar de novo");
const jogador = SZGameKit.createCharacter({ w: 14, h: 74, speed: 0, color: "#22d3ee" });
SZGameKit.placeCharacter(jogador, 30, 173);
const computador = SZGameKit.createCharacter({ w: 14, h: 74, speed: 0, color: "#f472b6" });
SZGameKit.placeCharacter(computador, 636, 173);
const bola = SZGameKit.createCharacter({ w: 14, h: 14, speed: 0, color: "#fbbf24" });
SZGameKit.placeCharacter(bola, 333, 203);
let bolaVx = 320;
let bolaVy = 170;
let pontos = 0;
let pontosComputador = 0;
let trocas = 0;
SZGameKit.onUpdate(function (dt) {
  if (SZGameKit.stateIs("jogando")) {
    if (SZGameKit.keyDown("arrowup")) {
      SZGameKit.placeCharacter(jogador, 30, SZGameKit.charY(jogador) - 420 * dt);
    }
    if (SZGameKit.keyDown("arrowdown")) {
      SZGameKit.placeCharacter(jogador, 30, SZGameKit.charY(jogador) + 420 * dt);
    }
    SZGameKit.keepOnScreen(jogador);
    if (SZGameKit.charY(bola) > SZGameKit.charY(computador) + 6) {
      SZGameKit.placeCharacter(computador, 636, SZGameKit.charY(computador) + 320 * dt);
    }
    if (SZGameKit.charY(bola) < SZGameKit.charY(computador) - 6) {
      SZGameKit.placeCharacter(computador, 636, SZGameKit.charY(computador) - 320 * dt);
    }
    SZGameKit.keepOnScreen(computador);
    SZGameKit.setVelocity(bola, bolaVx, bolaVy);
    SZGameKit.moveByVelocity(bola, dt);
    if (SZGameKit.charY(bola) <= 0) {
      bolaVy = Math.abs(bolaVy);
    }
    if (SZGameKit.charY(bola) + 14 >= 420) {
      bolaVy = 0 - Math.abs(bolaVy);
    }
    if (SZGameKit.touching(jogador, bola) && bolaVx < 0) {
      bolaVx = Math.abs(bolaVx) + 24;
      bolaVy = bolaVy + (SZGameKit.charY(bola) - SZGameKit.charY(jogador) - 30) * 6;
      trocas = trocas + 1;
      SZGameKit.playEffect("coin");
    }
    if (SZGameKit.touching(computador, bola) && bolaVx > 0) {
      bolaVx = 0 - Math.abs(bolaVx) - 24;
      bolaVy = bolaVy + (SZGameKit.charY(bola) - SZGameKit.charY(computador) - 30) * 6;
      trocas = trocas + 1;
      SZGameKit.playEffect("coin");
    }
    if (SZGameKit.charX(bola) < 0) {
      pontosComputador = pontosComputador + 1;
      SZGameKit.cameraShake(6, 0.3);
      SZGameKit.playEffect("hit");
      SZGameKit.placeCharacter(bola, 333, 203);
      bolaVx = 320;
      bolaVy = 170;
      trocas = 0;
    }
    if (SZGameKit.charX(bola) > 680) {
      pontos = pontos + 1;
      SZGameKit.cameraShake(6, 0.3);
      SZGameKit.playEffect("coin");
      SZGameKit.placeCharacter(bola, 333, 203);
      bolaVx = 0 - 320;
      bolaVy = 0 - 170;
      trocas = 0;
    }
    if (pontos >= 7) {
      SZGameKit.setState("vitoria");
    }
    if (pontosComputador >= 7) {
      SZGameKit.setState("fim");
    }
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#0b1020", false);
  SZGameKit.drawCharacter(jogador);
  SZGameKit.drawCharacter(computador);
  SZGameKit.drawCharacter(bola);
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#22d3ee";
  ctx.font = "30px sans-serif";
  ctx.fillText("Você: " + pontos, 30, 44);
  ctx.fillStyle = "#f472b6";
  ctx.fillText("PC: " + pontosComputador, 560, 44);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px sans-serif";
  ctx.fillText("Trocas seguidas: " + trocas, 258, 40);
});
`.trim()

if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(PONG_PROFISSIONAL_SOURCE),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const behavior = stripGeneratedIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectGeneratedTypes(
    behaviorStatements({ ...normalized, behavior } as typeof normalized),
  )
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
