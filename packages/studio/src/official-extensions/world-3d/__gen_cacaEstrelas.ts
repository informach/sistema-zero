import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Caça às Estrelas" (review 3D, lote 10). Rode com
 * `bun src/official-extensions/world-3d/__gen_cacaEstrelas.ts`. O primeiro JOGO completo do
 * Mundo 3D, só com as regras de jogo compartilhadas: tela de início, coletáveis que dão pontos,
 * cronômetro, vida com um perigo simples (o canteiro de cactos machuca), frutas que curam, fim
 * de jogo (ganhou/perdeu) e o "Jogar de novo" (recomeçar leve). 100% asset-free.
 */
export const CACA_ESTRELAS_SOURCE = `
SZWorld3D.setup({ style: "primavera", world: 140 });
SZWorld3D.terrain(2, 7);
SZWorld3D.flatten(0, 0, 18);
SZWorld3D.grass("media");
SZWorld3D.clearArea(0, 0, 14);
SZWorld3D.scatter(90, "arvores");
SZWorld3D.scatter(70, "flores");
SZWorld3D.person("#f97316", "bone");
SZWorld3D.setScreenText("inicio", "Caça às Estrelas", "Pegue 10 estrelas antes de o tempo acabar. Fuja dos cactos!", "Jogar");
SZWorld3D.setScreenText("fim", "Não foi dessa vez", "Os cactos ou o relógio venceram. Tente de novo!", "Jogar de novo");
SZWorld3D.setScreenText("vitoria", "Você pegou todas!", "10 estrelas no bolso. Que caçada!", "Jogar de novo");
SZWorld3D.collectible(12, "estrela", "estrela", 0, 0, 45);
SZWorld3D.collectible(3, "fruta", "fruta", -25, 20, 12);
SZWorld3D.placeThing("cactos", 22, 18, 1.5);
SZWorld3D.placeThing("cactos", 26, 22, 1.2);
SZWorld3D.placeThing("cactos", 19, 24, 1.3);
SZWorld3D.zone("cactos", 22, 21, 7);
SZWorld3D.marker("alerta", 22, 21);
SZWorld3D.setLife(3);
SZWorld3D.startTimer(90);
SZWorld3D.hudText("bottom-left", "Pegue 10 estrelas! As frutas curam.");
SZWorld3D.onCollectItem("estrela", function () {
  SZWorld3D.addScore(1);
  if (SZWorld3D.score() >= 10) {
    SZWorld3D.endGame("ganhou");
  }
});
SZWorld3D.onCollectItem("fruta", function () {
  SZWorld3D.heal(1);
});
SZWorld3D.onZone("cactos", function () {
  SZWorld3D.hurt(1);
  SZWorld3D.cameraShake(0.3, 0.3);
});
SZWorld3D.onLifeOver(function () {
  SZWorld3D.endGame("perdeu");
});
SZWorld3D.onTimerEnd(function () {
  SZWorld3D.endGame("perdeu");
});
`.trim()

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
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

if (import.meta.main) {
  const parsed = stripIds(parseJS(CACA_ESTRELAS_SOURCE))
  const bad = [...collectTypes(parsed)].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
