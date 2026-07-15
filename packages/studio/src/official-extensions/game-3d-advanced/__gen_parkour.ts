import { parseJS } from '../../parsers/js'

const SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 60, sky: "#0b1026", ground: "#1e293b" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.1, vignette: true });
SZGameKit3D.setScreenText("menu", "Parkour do Vulcão", "Suba a rampa, pegue carona na plataforma e junte as 3 gemas. O trampolim te joga longe!", "Escalar");
SZGameKit3D.setScreenText("vitoria", "Você pegou todas!", "Que parkour!", "Escalar de novo");
SZGameKit3D.defineMold("heroi", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#38bdf8", w: 0.9, h: 1.1, d: 0.9, x: 0, y: 0.55, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#e0f2fe", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.3, z: 0 });
});
SZGameKit3D.defineMold("chao", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#334155", w: 8, h: 0.6, d: 8, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("rampa", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "rampa", color: "#475569", w: 4, h: 3, d: 8, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("elevador", { health: 1, speed: 2 }, function () {
  SZGameKit3D.part({ shape: "box", material: "metal", color: "#64748b", w: 3, h: 0.5, d: 3, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("trampolim", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", material: "brilho", color: "#22c55e", w: 2.5, h: 0.4, d: 2.5, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("gema", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "torus", material: "brilho", color: "#fde047", w: 0.8, h: 0.8, d: 0.4, x: 0, y: 0, z: 0 });
});
SZGameKit3D.setCollider("heroi", "capsule");
SZGameKit3D.makeSolid("chao");
SZGameKit3D.makeSolid("rampa");
SZGameKit3D.makeSolid("elevador");
SZGameKit3D.makeSolid("trampolim");
SZGameKit3D.setBounce("trampolim", 0.9);
SZGameKit3D.setFriction("chao", 0.3);
SZGameKit3D.makeTrigger("gema");
SZGameKit3D.defineEmitter("poeira", { colorFrom: "#e0f2fe", colorTo: "#64748b", sizeFrom: 0.3, sizeTo: 0, rate: 14, speed: 1.2, cone: 45, gravity: -2, glow: false, curve: "suave" });
SZGameKit3D.defineEffect("brilho", { count: 18, colorFrom: "#fde047", colorTo: "#f97316", spread: 4, sizeFrom: 0.4, sizeTo: 0, life: 0.5, gravity: 2 });
let gemas = 0;
SZGameKit3D.onEnterState("jogando", function () {
  gemas = 0;
  SZGameKit3D.setSeed(7);
  SZGameKit3D.setAmbient(0.45);
  SZGameKit3D.addLight("#fca5a5", 0, 14, -10, 1.4);
  SZGameKit3D.setFog("#0b1026", 30, 90);
  SZGameKit3D.spawn("chao", 0, 0, 0);
  SZGameKit3D.spawn("rampa", 0, 0.3, 8);
  SZGameKit3D.spawn("trampolim", -8, 0.5, 0);
  SZGameKit3D.spawn("gema", 0, 4.5, 12);
  SZGameKit3D.spawn("gema", -8, 7, 0);
  SZGameKit3D.spawn("gema", 9, 5, -6);
  const elevador = SZGameKit3D.spawn("elevador", 9, 2, -6);
  SZGameKit3D.setVelocity(elevador, 0, 0, 2);
  const heroi = SZGameKit3D.spawn("heroi", 0, 2, 0);
  SZGameKit3D.cameraFollow(heroi, 12, 6);
  SZGameKit3D.emitterOn("poeira", heroi);
});
SZGameKit3D.onEntityStateUpdate("elevador", "parado", function (ela, dt) {
  if (SZGameKit3D.posOf(ela, "z") > 2) {
    SZGameKit3D.setVelocity(ela, 0, 0, -2);
  }
  if (SZGameKit3D.posOf(ela, "z") < -10) {
    SZGameKit3D.setVelocity(ela, 0, 0, 2);
  }
});
SZGameKit3D.onEntityStateUpdate("gema", "parado", function (ela, dt) {
  SZGameKit3D.setYaw(ela, SZGameKit3D.stateTime(ela) * 90);
});
SZGameKit3D.onOverlap("gema", function (zona, quem) {
  SZGameKit3D.burstOn("brilho", zona);
  SZGameKit3D.playEffect("coin");
  SZGameKit3D.recycle(zona);
  gemas = gemas + 1;
  if (gemas >= 3) {
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.platformerKeys(ela, 8, 11);
  if (SZGameKit3D.posOf(ela, "y") < -12) {
    SZGameKit3D.setState("menu");
  }
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.setHud("top-left", "Gemas: " + gemas + "/3");
  SZGameKit3D.setHud("top-right", "WASD anda, espaço pula");
});
SZGameKit3D.start();
`.trim()

function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

const parsed = stripIds(parseJS(SOURCE))
const types = collectTypes(parsed)
const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
if (bad.length) console.error('DRIFT:', bad)
console.log(JSON.stringify(parsed, null, 4))
