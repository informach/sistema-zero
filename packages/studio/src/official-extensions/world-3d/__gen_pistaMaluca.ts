import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Pista Maluca" (nível DIRIGIR/mundo do
 * Traffic Run — o corredor de pista do Hunor Borbely recriado no Mundo 3D).
 * Rode com `bun src/official-extensions/world-3d/__gen_pistaMaluca.ts` e cole a
 * saída em examples.ts. O drift test (`__tests__/examples.test.ts`) guarda o
 * resultado importando o SOURCE daqui.
 *
 * Fidelidade em ESPÍRITO ao Traffic Run: em vez de dodge de faixas cruzadas
 * (que o motor não tem), a criança DIRIGE um circuito pela cidadezinha
 * desviando do TRÂNSITO autônomo (carros educados que passeiam pelo anel) e
 * fecha as voltas passando pelos anéis na ordem. 100% asset-free.
 */
export const PISTA_MALUCA_SOURCE = `
SZWorld3D.setup({ style: "primavera", world: 200 });
SZWorld3D.terrain(2, 8);
SZWorld3D.setTime("meiodia");
SZWorld3D.grass("pouca");
SZWorld3D.city(0, 0, "media", "dia");
SZWorld3D.traffic(8, "semaforos");
SZWorld3D.car({ style: "corrida", color: "#ef4444" });
SZWorld3D.carBoost(2);
SZWorld3D.engineSound("ligado");
SZWorld3D.totemText(0, 14, "Pista Maluca", "Dirija pela cidade e passe pelos aneis na ordem, desviando do transito!");
SZWorld3D.raceCreate(0, 18, 90, 2);
SZWorld3D.raceCheckpoint(28, 0, 0);
SZWorld3D.raceCheckpoint(0, -28, 90);
SZWorld3D.raceCheckpoint(-28, 0, 0);
SZWorld3D.raceCheckpoint(0, 18, 90);
SZWorld3D.raceOnStart(function () {
  SZWorld3D.say("Valendo! Cuidado com o transito!", 2);
});
SZWorld3D.raceOnFinish(function () {
  SZWorld3D.say("Chegou! Tempo: " + Math.round(SZWorld3D.raceTime()) + "s", 4);
  SZWorld3D.confetti();
});
SZWorld3D.onUpdate(function (dt) {
  SZWorld3D.hud("Recorde: " + Math.round(SZWorld3D.raceBest()) + "s", "baixo-direita");
  SZWorld3D.hud("Velocidade: " + Math.round(SZWorld3D.carSpeed()) + " m/s", "baixo-esquerda");
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
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(PISTA_MALUCA_SOURCE),
    extensions: [{ extensionId: 'world-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const bad = [...collectTypes(behavior)].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
