import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Dino Corredor" (o degrau BÁSICO da família
 * Clear Code). Rode com
 * `bun src/official-extensions/game-2d/__gen_dinoCorredor.ts` e cole a saída em
 * examples/clearcode.ts. O drift test (`dinoCorredorExample.test.ts`) guarda o
 * resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 */
export const DINO_CORREDOR_SOURCE = `
SZGame2D.fitScreen(100);
const dino = SZGame2D.createDino({ x: 110, y: 150, size: 64, color: "#5fb45f" });
SZGame2D.setHitboxScale(dino, 80);
const cactos = SZGame2D.createGroup();
let pontos = 0;
let velocidade = -5;
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.restart();
  }
});
SZGame2D.onKey("Space", function () {
  if (SZGame2D.sceneIs("jogando")) {
    if (SZGame2D.spriteVy(dino) == 0) {
      SZGame2D.playFx("jump");
    }
  }
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.restart();
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  SZGame2D.drawForest(ctx, 5);
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Dino Corredor", "Pule os cactos e sobreviva o maior tempo que você conseguir!", "Aperte Enter ou espaço para começar", "#185078");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.controlDino(dino, ctx, 15);
    SZGame2D.drawSprite(ctx, dino);
    SZGame2D.updateGroup(cactos);
    SZGame2D.drawGroup(ctx, cactos);
    SZGame2D.overlapSpriteGroup(() => dino, cactos, (cacto) => {
      SZGame2D.explodeSprite(cacto, "#ff5d3d");
      SZGame2D.shake(ctx, 8);
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("perdeu");
    });
    SZGame2D.pruneOffscreen(ctx, cactos, 40, (cacto) => {});
    SZGame2D.drawScore(ctx, "Pontos:", pontos, 12, 28, "#20415c", 22);
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.showScreen(ctx, "Bateu no cacto!", "Você fez " + pontos + " pontos. Tente bater essa marca!", "Aperte Enter para reiniciar", "#5a2a2a");
  }
});
if (SZGame2D.everySeconds("nasce-cacto", 1.4)) {
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.spawnObstacle(cactos, ctx, { type: "cactus", x: SZGame2D.randomBetween(500, 560), size: 44, vx: velocidade - SZGame2D.randomBetween(0, 1) });
  }
}
if (SZGame2D.everySeconds("ponto-por-segundo", 1)) {
  if (SZGame2D.sceneIs("jogando")) {
    pontos = pontos + 1;
  }
}
if (SZGame2D.everySeconds("acelera", 5)) {
  if (SZGame2D.sceneIs("jogando")) {
    if (velocidade > -9) {
      velocidade = velocidade - 1;
    }
  }
}
`.trim()

/** Remove apenas os ids efêmeros da IR para comparar fontes de exemplo. */
export function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === '__id') continue
      out[key] = stripIds(nested)
    }
    return out as T
  }
  return value
}

/** Coleta recursivamente os discriminantes `type` presentes numa IR. */
export function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    if (typeof object.type === 'string') out.add(object.type)
    for (const nested of Object.values(object)) collectTypes(nested, out)
  }
  return out
}

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(DINO_CORREDOR_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  // IR persistida é JSON: derruba as chaves `undefined` antes de comparar/colar.
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
