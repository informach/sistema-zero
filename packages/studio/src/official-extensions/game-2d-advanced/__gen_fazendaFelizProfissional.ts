import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Fazenda Feliz Profissional" (nível 2 da
 * família farming/Stardew do Clear Code, sobre o motor avançado). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_fazendaFelizProfissional.ts`
 * e cole a saída em `examples/fazendaFelizProfissionalExample.ts`. O drift test
 * (`__tests__/fazendaFelizProfissionalExample.test.ts`) guarda o resultado.
 *
 * Decisões de motor (o que o degrau BÁSICO não tinha):
 * - MUNDO MAIOR que a tela + cameraFollow: a fazenda rola atrás do fazendeiro.
 * - FERRAMENTAS de verdade (enxada, semente, regador) que se trocam com Q — o
 *   selected_tool do original — e cada uma faz uma etapa: enxada ara a terra,
 *   semente planta, regador rega.
 * - O CICLO DO DIA: só cresce quem foi REGADO e o dia só passa quando você vai
 *   DORMIR (tecla C) — o transition/reset do original. Sem regar, não cresce.
 * - COLHEITA guardada e VENDIDA na LOJA (rpgMenu) por moedas — o shop do
 *   original. Juntar 50 moedas vence (setState "vitoria").
 */
export const FAZENDA_FELIZ_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#2b4a1e", accent: "#ffd24a" });
SZGameKit.setScreenText("menu", "Fazenda Feliz Profissional", "Setas ou WASD: andar. Q: trocar a ferramenta. Espaço: usar. C: dormir. V: vender. Junte 50 moedas!", "Começar");
SZGameKit.setScreenText("vitoria", "Que fazenda!", "Você juntou 50 moedas cuidando da terra!", "Plantar de novo");
SZGameKit.defineLook("fazendeiro", function (ctx) {
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(4, 0, 26, 6);
  ctx.fillStyle = "#f7c8a2";
  ctx.beginPath();
  ctx.arc(17, 12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d98c40";
  ctx.fillRect(7, 20, 20, 16);
}, 34, 36);
const fazendeiro = SZGameKit.createCharacter({ w: 34, h: 36, speed: 200, color: "#d98c40" });
SZGameKit.placeCharacter(fazendeiro, 700, 450);
SZGameKit.stateLook(fazendeiro, "parado", "fazendeiro");
const canteiroX = [];
const canteiroY = [];
const canteiro = [];
const molhado = [];
for (let i = 0; i < 24; i++) {
  canteiroX.push(200 + (i % 6) * 100);
  canteiroY.push(200 + Math.floor(i / 6) * 100);
  canteiro.push(0);
  molhado.push(0);
}
const ferramentas = ["enxada", "semente", "regador"];
let ferramenta = 0;
let moedas = 0;
let colheita = 0;
let dia = 1;
SZGameKit.cameraFollow(fazendeiro, 1400, 900);
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithKeys(fazendeiro, dt);
  SZGameKit.keepOnScreen(fazendeiro);
  const cx = SZGameKit.charX(fazendeiro) + 17;
  const cy = SZGameKit.charY(fazendeiro) + 18;
  if (SZGameKit.keyPressed("q")) {
    ferramenta = (ferramenta + 1) % 3;
  }
  if (SZGameKit.keyPressed(" ")) {
    for (let i = 0; i < 24; i++) {
      if (cx >= canteiroX[i] && cx < canteiroX[i] + 84 && cy >= canteiroY[i] && cy < canteiroY[i] + 84) {
        if (ferramenta == 0 && canteiro[i] == 0) {
          canteiro[i] = 1;
          SZGameKit.playEffect("click");
        }
        if (ferramenta == 1 && canteiro[i] == 1) {
          canteiro[i] = 2;
          SZGameKit.playEffect("powerup");
        }
        if (ferramenta == 2 && canteiro[i] == 2) {
          molhado[i] = 1;
          SZGameKit.playEffect("coin");
        }
      }
    }
  }
  if (SZGameKit.keyPressed("c")) {
    dia = dia + 1;
    for (let i = 0; i < 24; i++) {
      if (canteiro[i] == 2 && molhado[i] == 1) {
        canteiro[i] = 3;
        molhado[i] = 0;
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    if (canteiro[i] == 3 && cx >= canteiroX[i] && cx < canteiroX[i] + 84 && cy >= canteiroY[i] && cy < canteiroY[i] + 84) {
      canteiro[i] = 0;
      colheita = colheita + 1;
      SZGameKit.floatText("+1", canteiroX[i] + 40, canteiroY[i], "#ffd24a", 18);
      SZGameKit.playEffect("coin");
    }
  }
  if (SZGameKit.keyPressed("v")) {
    SZGameKit.rpgMenu("Vender a colheita no mercado?", function () {
      SZGameKit.rpgOption("Vender tudo", function () {
        moedas = moedas + colheita * 5;
        colheita = 0;
      });
      SZGameKit.rpgOption("Agora não", function () {});
    });
  }
  if (moedas >= 50) {
    SZGameKit.setState("vitoria");
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#3a5a2a", true);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(canteiroX[i], canteiroY[i], 84, 84);
    if (molhado[i] == 1) {
      ctx.fillStyle = "#4a3320";
    } else {
      ctx.fillStyle = "#7a5636";
    }
    ctx.fillRect(canteiroX[i] + 6, canteiroY[i] + 6, 72, 72);
    if (canteiro[i] == 1) {
      ctx.fillStyle = "#5a4326";
      ctx.fillRect(canteiroX[i] + 14, canteiroY[i] + 28, 56, 6);
      ctx.fillRect(canteiroX[i] + 14, canteiroY[i] + 48, 56, 6);
    }
    if (canteiro[i] == 2) {
      ctx.fillStyle = "#4fae3a";
      ctx.beginPath();
      ctx.arc(canteiroX[i] + 42, canteiroY[i] + 50, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    if (canteiro[i] == 3) {
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(canteiroX[i] + 42, canteiroY[i] + 42, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  SZGameKit.drawCharacter(fazendeiro);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#fff8e1";
  ctx.font = "22px sans-serif";
  ctx.fillText("Ferramenta: " + ferramentas[ferramenta], 20, 34);
  ctx.fillText("Moedas: " + moedas, 20, 62);
  ctx.fillText("Colheita: " + colheita, 20, 90);
  ctx.fillText("Dia: " + dia, 820, 34);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(FAZENDA_FELIZ_PROFISSIONAL_SOURCE),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const stripIds = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripIds)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (key !== '__id') out[key] = stripIds(child)
      }
      return out
    }
    return value
  }
  const clean = stripIds(JSON.parse(JSON.stringify(normalized))) as Record<string, unknown>
  const collectTypes = (value: unknown, out: Set<string> = new Set()): Set<string> => {
    if (Array.isArray(value)) {
      for (const item of value) collectTypes(item, out)
    } else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (typeof record.type === 'string') out.add(record.type)
      for (const child of Object.values(record)) collectTypes(child, out)
    }
    return out
  }
  const types = collectTypes(behaviorStatements(normalized))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)

  const printTS = (value: unknown, indent: string): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]'
      const inner = indent + '  '
      const items = value.map((item) => inner + printTS(item, inner))
      return '[\n' + items.join(',\n') + ',\n' + indent + ']'
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) return '{}'
      const inner = indent + '  '
      const lines = entries.map(([key, child]) => `${inner}${key}: ${printTS(child, inner)}`)
      return '{\n' + lines.join(',\n') + ',\n' + indent + '}'
    }
    if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
    return String(value)
  }
  const ordered = {
    html: clean.html,
    css: clean.css,
    extensions: clean.extensions,
    version: clean.version,
    behavior: clean.behavior,
  }
  console.log(printTS(ordered, '  '))
}
