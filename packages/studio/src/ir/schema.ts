import { z } from 'zod'

export const MAX_IR_TEXT_CHARS = 2_000_000

const irText = () => z.string().max(MAX_IR_TEXT_CHARS)

// ---------- Source mapping ----------

/**
 * Campo opcional `__id` carrega o id do bloco Blockly original (ou um id
 * sintético do parser). Usado para construir source maps que ligam um trecho
 * do código gerado ao bloco que o produziu, e vice-versa.
 *
 * Como `z.object()` por padrão remove chaves desconhecidas, precisamos
 * declarar `__id` em cada variant Zod onde queremos preservá-lo.
 */
const idField = { __id: z.string().optional() }

// ---------- Expressions ----------

const jsExprBase = z.discriminatedUnion('type', [
  z.object({ type: z.literal('num'), value: z.number(), ...idField }),
  z.object({ type: z.literal('str'), value: irText(), ...idField }),
  z.object({ type: z.literal('color'), value: irText(), ...idField }),
  z.object({ type: z.literal('colorAlpha'), hex: irText(), alpha: z.number(), ...idField }),
  z.object({ type: z.literal('bool'), value: z.boolean(), ...idField }),
  z.object({ type: z.literal('var'), name: irText(), ...idField }),
  z.object({ type: z.literal('null'), ...idField }),
])

interface JSExprCommon {
  __id?: string
}

export type JSExpr =
  | (JSExprCommon & { type: 'num'; value: number })
  | (JSExprCommon & { type: 'str'; value: string })
  // Cor (ex.: '#22d3ee'). No código é a mesma string; o tipo distinto preserva
  // a intenção para o round-trip voltar ao bloco seletor de cor (sz_val_color).
  | (JSExprCommon & { type: 'color'; value: string })
  // Cor com transparência. `hex` = '#rrggbb', `alpha` = 0..1. Gera 'rgba(r, g, b, a)';
  // o tipo distinto preserva a intenção para voltar ao bloco sz_val_color_alpha.
  | (JSExprCommon & { type: 'colorAlpha'; hex: string; alpha: number })
  | (JSExprCommon & { type: 'bool'; value: boolean })
  | (JSExprCommon & { type: 'var'; name: string })
  // Valor nulo (`null`): "nada / nenhum objeto". Bloco sz_val_null.
  | (JSExprCommon & { type: 'null' })
  | (JSExprCommon & {
      type: 'binop'
      op: '+' | '-' | '*' | '/' | '%' | '**' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '===' | '!=='
      left: JSExpr
      right: JSExpr
    })
  // Operador lógico (`a && b` / `a || b`). Cadeias longas aninham.
  | (JSExprCommon & {
      type: 'logical'
      op: '&&' | '||'
      left: JSExpr
      right: JSExpr
    })
  // Negação booleana (`!x`).
  | (JSExprCommon & { type: 'logicalNot'; value: JSExpr })
  // Operador ternário (`condição ? seVerdadeiro : seFalso`).
  | (JSExprCommon & {
      type: 'ternary'
      condition: JSExpr
      whenTrue: JSExpr
      whenFalse: JSExpr
    })
  | (JSExprCommon & { type: 'call'; name: string; args: JSExpr[] })
  // Game 2D — perguntas (booleanos): tecla apertada e sprites se encostando.
  | (JSExprCommon & { type: 'g2d:keyDown'; key: string })
  | (JSExprCommon & { type: 'g2d:touches'; aVar: string; bVar: string })
  // Game 2D — quantidade de sprites num grupo (valor numérico).
  | (JSExprCommon & { type: 'g2d:countGroup'; groupVar: string })
  // Game 2D — a direção (em graus) que o sprite está apontando (valor numérico).
  | (JSExprCommon & { type: 'g2d:spriteAngle'; spriteVar: string })
  // Tier 1 — contas/mira e perguntas (valores).
  | (JSExprCommon & { type: 'g2d:distance'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g2d:angleTo'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g2d:getHealth'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteX'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteY'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteW'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteH'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:centerX'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:centerY'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:randomBetween'; min: number; max: number })
  | (JSExprCommon & { type: 'g2d:randomChance'; percent: number })
  | (JSExprCommon & { type: 'g2d:hasHealth'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:cooldownReady'; spriteVar: string; frames: number })
  | (JSExprCommon & { type: 'g2d:isPaused' })
  // Tier 2 — posição da câmera e leitura de tile (valores).
  | (JSExprCommon & { type: 'g2d:cameraX' })
  | (JSExprCommon & { type: 'g2d:cameraY' })
  | (JSExprCommon & { type: 'g2d:randomX' })
  | (JSExprCommon & { type: 'g2d:randomY' })
  | (JSExprCommon & { type: 'g2d:tileAtSprite'; mapVar: string; spriteVar: string })
  // Game 2D — a cena/tela atual é "name"? (valor booleano).
  | (JSExprCommon & { type: 'g2d:sceneIs'; name: string })
  // Game 2D — Kit equilibrista / balão: leituras do estado do jogo (valores).
  | (JSExprCommon & { type: 'g2d:stickHeroScore'; gameVar: string })
  | (JSExprCommon & { type: 'g2d:stickHeroOver'; gameVar: string })
  | (JSExprCommon & { type: 'g2d:balloonScore'; gameVar: string })
  | (JSExprCommon & { type: 'g2d:balloonFuel'; gameVar: string })
  | (JSExprCommon & { type: 'g2d:balloonOver'; gameVar: string })
  // Game 2D — Kit gorilas: perguntas (booleanos) da batalha de bananas.
  | (JSExprCommon & { type: 'g2d:aimReleased'; throwerVar: string })
  | (JSExprCommon & { type: 'g2d:bananaHitThrower'; cityVar: string; throwerVar: string })
  | (JSExprCommon & { type: 'g2d:bananaHitCity'; cityVar: string })
  // Game 3D — perguntas (booleanos): tecla apertada, dois objetos se encostando
  // (AABB) e colisão contra um grupo inteiro de inimigos.
  | (JSExprCommon & { type: 'g3d:keyDown'; key: string })
  | (JSExprCommon & { type: 'g3d:collides'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g3d:hitAny'; objVar: string; groupVar: string })
  // Game 3D — Kit Travessia: bateu num veículo? e a linha (pontuação) atual.
  | (JSExprCommon & { type: 'g3d:crosserHit'; objVar: string; worldVar: string })
  | (JSExprCommon & { type: 'g3d:crosserRow'; objVar: string })
  // Game 3D — genérico: objeto encosta em algum de um grupo (caixa real Box3).
  | (JSExprCommon & { type: 'g3d:touchesBox'; objVar: string; groupVar: string })
  // Game 3D — Corrida/genérico: distância, proximidade, bateu num rival?, voltas.
  | (JSExprCommon & { type: 'g3d:distanceTo'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g3d:isNear'; aVar: string; bVar: string; dist: number })
  | (JSExprCommon & { type: 'g3d:raceHit'; objVar: string; worldVar: string })
  | (JSExprCommon & { type: 'g3d:raceLaps'; objVar: string })
  // Game 3D — Kit Empilhar: pontuação (andares) e a torre caiu (fim de jogo)?
  | (JSExprCommon & { type: 'g3d:stackScore'; worldVar: string })
  | (JSExprCommon & { type: 'g3d:stackGameOver'; worldVar: string })
  // Game 3D — genéricos: ler posição/rotação (por eixo), escala e o tempo do quadro.
  | (JSExprCommon & { type: 'g3d:getPos'; objVar: string; axis: string })
  | (JSExprCommon & { type: 'g3d:getRot'; objVar: string; axis: string })
  | (JSExprCommon & { type: 'g3d:getScale'; objVar: string })
  | (JSExprCommon & { type: 'g3d:dt'; worldVar: string })
  | (JSExprCommon & { type: 'g3d:angleTo'; aVar: string; bVar: string })
  // Game 3D — mira & clique (raycast): seleção, mira à frente, sensor de chão.
  | (JSExprCommon & { type: 'g3d:pickAtMouse'; worldVar: string })
  | (JSExprCommon & { type: 'g3d:pointerOver'; worldVar: string; objVar: string })
  | (JSExprCommon & { type: 'g3d:aimAhead'; worldVar: string; objVar: string; dist: number })
  | (JSExprCommon & { type: 'g3d:onGround'; worldVar: string; objVar: string })
  | (JSExprCommon & { type: 'g3d:groundHeight'; worldVar: string; objVar: string })
  // Entrada (caminho "na mão"): tecla apertada (bool) e posição do ponteiro (núm).
  | (JSExprCommon & { type: 'inputKeyPressed'; key: string })
  | (JSExprCommon & { type: 'inputPointer'; axis: 'x' | 'y' })
  // Função matemática de um valor (Math.round/floor/ceil/abs/sqrt) e
  // trigonometria de um valor em radianos (Math.sin/cos/tan/asin/acos/atan).
  | (JSExprCommon & {
      type: 'mathUnary'
      fn:
        | 'round'
        | 'floor'
        | 'ceil'
        | 'abs'
        | 'sqrt'
        | 'sin'
        | 'cos'
        | 'tan'
        | 'asin'
        | 'acos'
        | 'atan'
        | 'sign'
      arg: JSExpr
    })
  // Transforma uma lista item a item: `lista.map((item) => <expr>)`.
  | (JSExprCommon & { type: 'arrayMap'; arrayVar: string; itemName: string; transform: JSExpr })
  // Função de dois valores (Math.min/Math.max/Math.atan2/Math.hypot).
  | (JSExprCommon & {
      type: 'mathBinary'
      fn: 'min' | 'max' | 'atan2' | 'hypot'
      a: JSExpr
      b: JSExpr
    })
  // Distância entre dois objetos com posição (.x/.y): Math.hypot(a.x-b.x, a.y-b.y).
  | (JSExprCommon & { type: 'distance'; a: JSExpr; b: JSExpr })
  // Constante matemática (Math.PI / Math.E).
  | (JSExprCommon & { type: 'mathConst'; name: 'PI' | 'E' })
  // Conversão de ângulo entre graus e radianos.
  | (JSExprCommon & { type: 'angleConvert'; dir: 'degToRad' | 'radToDeg'; arg: JSExpr })
  // Propriedade do evento dentro de um listener (event.clientX/clientY/key/code).
  | (JSExprCommon & { type: 'eventProp'; prop: 'clientX' | 'clientY' | 'key' | 'code' })
  // Lê do armazenamento do navegador (`localStorage.getItem(chave)` / `sessionStorage`).
  | (JSExprCommon & { type: 'storageGet'; store: 'local' | 'session'; key: JSExpr })
  // Vetor 2D/3D literal ({ x, y } / { x, y, z }).
  | (JSExprCommon & { type: 'vec2'; x: JSExpr; y: JSExpr })
  | (JSExprCommon & { type: 'vec3'; x: JSExpr; y: JSExpr; z: JSExpr })
  // Lista/array literal ([a, b, …]).
  | (JSExprCommon & { type: 'array'; items: JSExpr[] })
  // Tamanho de uma lista (arr.length).
  | (JSExprCommon & { type: 'arrayLength'; arrayVar: string })
  // Valor calculado a partir da data/hora atual (ex.: ano no rodapé).
  | (JSExprCommon & { type: 'now'; kind: 'year' | 'date' | 'time' })
  // Parte NUMÉRICA da data/hora atual (new Date().getHours() etc.) — para
  // relógios e animações; o `now` acima só dá strings localizadas.
  | (JSExprCommon & {
      type: 'dateGet'
      part: 'year' | 'month' | 'dayOfMonth' | 'weekday' | 'hours' | 'minutes' | 'seconds' | 'ms'
    })
  // Largura/altura da viewport e densidade de pixels (window.innerWidth /
  // window.innerHeight / window.devicePixelRatio).
  | (JSExprCommon & { type: 'global'; kind: 'innerWidth' | 'innerHeight' | 'devicePixelRatio' })
  // O sistema está no modo escuro? (window.matchMedia('(prefers-color-scheme: dark)').matches)
  | (JSExprCommon & { type: 'systemDark' })
  // Milissegundos desde o carregamento da página (performance.now()) — para delta de quadro.
  | (JSExprCommon & { type: 'perfNow' })
  // Está em tela cheia? (Fullscreen API) → document.fullscreenElement != null.
  | (JSExprCommon & { type: 'isFullscreen' })
  // Largura/altura do elemento canvas associado a um contexto (canvas.width).
  | (JSExprCommon & { type: 'canvasDim'; ctxVar: string; dim: 'width' | 'height' })
  | (JSExprCommon & { type: 'canvasMeasureText'; ctxVar: string; text: JSExpr })
  // Canvas — "o ponto (x,y) está dentro do traçado / na linha do traçado?" (booleanos).
  | (JSExprCommon & { type: 'canvasIsPointInPath'; ctxVar: string; x: JSExpr; y: JSExpr })
  | (JSExprCommon & { type: 'canvasIsPointInStroke'; ctxVar: string; x: JSExpr; y: JSExpr })
  // Inteiro aleatório no intervalo [min, max].
  | (JSExprCommon & { type: 'random'; min: JSExpr; max: JSExpr })
  // Cor HSL. Gera o template `hsl(${h}, ${s}%, ${l}%)`; h/s/l podem ser número,
  // variável ou expressão. Volta ao bloco sz_val_color_hsl.
  | (JSExprCommon & { type: 'hslColor'; h: JSExpr; s: JSExpr; l: JSExpr })
  // Decimal aleatório cru de 0 (inclusive) a 1 (exclusivo) — Math.random().
  | (JSExprCommon & { type: 'randomFloat' })
  // Propriedade do próprio objeto, dentro de um método (this.nome).
  | (JSExprCommon & { type: 'thisProp'; name: string })
  // Propriedade de um objeto/instância (obj.nome).
  | (JSExprCommon & { type: 'propAccess'; objectVar: string; name: string })
  // O elemento atual dentro de um handler (`this`).
  | (JSExprCommon & { type: 'thisRef' })
  // Chamada de método em forma de valor (obj.metodo(args)).
  | (JSExprCommon & { type: 'callMethodExpr'; objectVar: string; method: string; args: JSExpr[] })
  // Lê um data-attribute como valor (`el.dataset.chave`).
  | (JSExprCommon & { type: 'datasetGet'; objectVar: string; key: string })
  // Testa se um elemento tem uma classe (`el.classList.contains('x')`).
  | (JSExprCommon & {
      type: 'classContains'
      targetId: string
      targetKind?: 'id' | 'var' | 'this'
      className: string
    })
  // Junta texto e valores num só texto (template literal `` `a${b}c` ``).
  | (JSExprCommon & { type: 'concat'; parts: JSExpr[] })
  // Item de uma lista por índice (`arr[i]`).
  | (JSExprCommon & { type: 'index'; arrayVar: string; index: JSExpr })
  // Último item da lista (`lista[lista.length - 1]`).
  | (JSExprCommon & { type: 'arrayLast'; arrayVar: string })
  // Achar o 1º item da lista que passa no teste (`lista.find((item) => cond)`).
  | (JSExprCommon & { type: 'arrayFind'; arrayVar: string; itemName: string; cond: JSExpr })
  // Junta listas (`[...a, ...b]`).
  | (JSExprCommon & { type: 'concatArrays'; parts: JSExpr[] })
  // Embaralha uma lista (`arr.sort(() => Math.random() - 0.5)`).
  | (JSExprCommon & { type: 'shuffle'; arrayVar: string })
  // Objeto literal genérico ({ chave: valor, ... }).
  | (JSExprCommon & { type: 'objectLiteral'; entries: Array<{ key: string; value: JSExpr }> })
  // Leitura de propriedade de qualquer valor (objeto = expressão; cobre aninhamento como this.velocidade.x).
  | (JSExprCommon & { type: 'memberGet'; object: JSExpr; name: string })
  // Chamada de método em forma de valor sobre qualquer objeto (object.metodo(args)).
  | (JSExprCommon & { type: 'memberCallExpr'; object: JSExpr; method: string; args: JSExpr[] })

/** Campo de TELA do showScreen (título/subtítulo/dica): texto legado de projetos
 * antigos OU uma expressão (variável, "juntar texto", resultado de função…). */
export type ScreenText = string | JSExpr
/** Normaliza um ScreenText para JSExpr (string crua vira um literal de texto). */
export function screenTextToExpr(v: ScreenText): JSExpr {
  return typeof v === 'string' ? { type: 'str', value: v } : v
}

/** Valor de um campo que virou soquete oval: número/texto CRU de projetos antigos OU
 * uma expressão (variável, conta, "juntar texto", resultado de função). */
export type FieldValue = number | string | JSExpr
/** Normaliza um FieldValue para JSExpr (número/texto cru vira literal). Mantém o IR
 * antigo (valor cru salvo no projeto) compatível com o novo (expressão). */
export function valueToExpr(v: FieldValue): JSExpr {
  if (typeof v === 'number') return { type: 'num', value: v }
  if (typeof v === 'string') return { type: 'str', value: v }
  return v
}

export const JSExprSchema: z.ZodType<JSExpr> = z.lazy(() =>
  z.discriminatedUnion('type', [
    jsExprBase,
    z.object({
      type: z.literal('binop'),
      op: z.enum(['+', '-', '*', '/', '%', '**', '>', '<', '>=', '<=', '==', '!=', '===', '!==']),
      left: JSExprSchema,
      right: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('logical'),
      op: z.enum(['&&', '||']),
      left: JSExprSchema,
      right: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('logicalNot'), value: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('ternary'),
      condition: JSExprSchema,
      whenTrue: JSExprSchema,
      whenFalse: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('call'),
      name: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:keyDown'), key: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:touches'),
      aVar: irText(),
      bVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:countGroup'), groupVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteAngle'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:distance'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:angleTo'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:getHealth'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteX'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteY'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteW'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteH'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:centerX'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:centerY'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:randomBetween'),
      min: z.number(),
      max: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:randomChance'), percent: z.number(), ...idField }),
    z.object({ type: z.literal('g2d:hasHealth'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:cooldownReady'),
      spriteVar: irText(),
      frames: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:isPaused'), ...idField }),
    z.object({ type: z.literal('g2d:cameraX'), ...idField }),
    z.object({ type: z.literal('g2d:cameraY'), ...idField }),
    z.object({ type: z.literal('g2d:randomX'), ...idField }),
    z.object({ type: z.literal('g2d:randomY'), ...idField }),
    z.object({
      type: z.literal('g2d:tileAtSprite'),
      mapVar: irText(),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:sceneIs'), name: irText(), ...idField }),
    z.object({ type: z.literal('g2d:stickHeroScore'), gameVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:stickHeroOver'), gameVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:balloonScore'), gameVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:balloonFuel'), gameVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:balloonOver'), gameVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:aimReleased'), throwerVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:bananaHitThrower'),
      cityVar: irText(),
      throwerVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:bananaHitCity'), cityVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:keyDown'), key: irText(), ...idField }),
    z.object({ type: z.literal('g3d:collides'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:hitAny'), objVar: irText(), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:crosserHit'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:crosserRow'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:touchesBox'),
      objVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:distanceTo'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:isNear'),
      aVar: irText(),
      bVar: irText(),
      dist: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:raceHit'), objVar: irText(), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:raceLaps'), objVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackScore'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackGameOver'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getPos'), objVar: irText(), axis: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getRot'), objVar: irText(), axis: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getScale'), objVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:dt'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:angleTo'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:pickAtMouse'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:pointerOver'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:aimAhead'),
      worldVar: irText(),
      objVar: irText(),
      dist: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:onGround'), worldVar: irText(), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:groundHeight'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('inputKeyPressed'), key: irText(), ...idField }),
    z.object({ type: z.literal('inputPointer'), axis: z.enum(['x', 'y']), ...idField }),
    z.object({ type: z.literal('isFullscreen'), ...idField }),
    z.object({ type: z.literal('systemDark'), ...idField }),
    z.object({ type: z.literal('perfNow'), ...idField }),
    z.object({
      type: z.literal('mathUnary'),
      fn: z.enum([
        'round',
        'floor',
        'ceil',
        'abs',
        'sqrt',
        'sin',
        'cos',
        'tan',
        'asin',
        'acos',
        'atan',
        'sign',
      ]),
      arg: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('arrayMap'),
      arrayVar: irText(),
      itemName: irText(),
      transform: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('mathBinary'),
      fn: z.enum(['min', 'max', 'atan2', 'hypot']),
      a: JSExprSchema,
      b: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('distance'), a: JSExprSchema, b: JSExprSchema, ...idField }),
    z.object({ type: z.literal('mathConst'), name: z.enum(['PI', 'E']), ...idField }),
    z.object({
      type: z.literal('angleConvert'),
      dir: z.enum(['degToRad', 'radToDeg']),
      arg: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('eventProp'),
      prop: z.enum(['clientX', 'clientY', 'key', 'code']),
      ...idField,
    }),
    z.object({
      type: z.literal('storageGet'),
      store: z.enum(['local', 'session']),
      key: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('vec2'), x: JSExprSchema, y: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('vec3'),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('array'), items: z.array(JSExprSchema), ...idField }),
    z.object({ type: z.literal('arrayLength'), arrayVar: irText(), ...idField }),
    z.object({ type: z.literal('now'), kind: z.enum(['year', 'date', 'time']), ...idField }),
    z.object({
      type: z.literal('dateGet'),
      part: z.enum(['year', 'month', 'dayOfMonth', 'weekday', 'hours', 'minutes', 'seconds', 'ms']),
      ...idField,
    }),
    z.object({
      type: z.literal('global'),
      kind: z.enum(['innerWidth', 'innerHeight', 'devicePixelRatio']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasDim'),
      ctxVar: irText(),
      dim: z.enum(['width', 'height']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasMeasureText'),
      ctxVar: irText(),
      text: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasIsPointInPath'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasIsPointInStroke'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('random'), min: JSExprSchema, max: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('hslColor'),
      h: JSExprSchema,
      s: JSExprSchema,
      l: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('randomFloat'), ...idField }),
    z.object({ type: z.literal('thisProp'), name: irText(), ...idField }),
    z.object({
      type: z.literal('propAccess'),
      objectVar: irText(),
      name: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('thisRef'), ...idField }),
    z.object({
      type: z.literal('callMethodExpr'),
      objectVar: irText(),
      method: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('datasetGet'),
      objectVar: irText(),
      key: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('classContains'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      className: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('concat'), parts: z.array(JSExprSchema), ...idField }),
    z.object({ type: z.literal('index'), arrayVar: irText(), index: JSExprSchema, ...idField }),
    z.object({ type: z.literal('arrayLast'), arrayVar: irText(), ...idField }),
    z.object({
      type: z.literal('arrayFind'),
      arrayVar: irText(),
      itemName: irText(),
      cond: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('concatArrays'), parts: z.array(JSExprSchema), ...idField }),
    z.object({ type: z.literal('shuffle'), arrayVar: irText(), ...idField }),
    z.object({
      type: z.literal('objectLiteral'),
      entries: z.array(z.object({ key: irText(), value: JSExprSchema })),
      ...idField,
    }),
    z.object({ type: z.literal('memberGet'), object: JSExprSchema, name: irText(), ...idField }),
    z.object({
      type: z.literal('memberCallExpr'),
      object: JSExprSchema,
      method: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
  ]),
)

// ---------- HTML ----------

export const HTMLTagSchema = z.enum([
  'h1',
  'h2',
  'h3',
  'p',
  'span',
  'strong',
  'em',
  'button',
  'div',
  'header',
  'nav',
  'section',
  'footer',
  'main',
  'ul',
  'li',
  'a',
  'img',
  'form',
  'input',
  'textarea',
  'label',
  // SVG (gráficos vetoriais): o gerador HTML é genérico, então estas tags
  // viram <tag attrs> normalmente; os atributos (d/transform/cx/cy/r/href/…) são
  // preservados por collectAllAttrs no parse e por FIELD_ATTRS/data no round-trip.
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'rect',
  'polyline',
  'polygon',
  'text',
  'use',
])
export type HTMLTag = z.infer<typeof HTMLTagSchema>

interface HTMLNodeCommon {
  __id?: string
}

export type HTMLNode =
  | (HTMLNodeCommon & {
      type: 'element'
      tag: HTMLTag
      id?: string
      text?: string
      attrs?: Record<string, string>
      children?: HTMLNode[]
    })
  | (HTMLNodeCommon & {
      type: 'canvas'
      id: string
      class?: string
      width?: number
      height?: number
    })
  // Pedaço de texto solto que vive dentro das `children` de uma tag inline/
  // container — permite que `<p>© <span></span> texto</p>` (conteúdo misto)
  // vire blocos aninhados em vez de "código avançado".
  | (HTMLNodeCommon & { type: 'text'; text: string })
  | (HTMLNodeCommon & { type: 'rawHTML'; html: string; advanced: true })

export const HTMLNodeSchema: z.ZodType<HTMLNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('element'),
      tag: HTMLTagSchema,
      id: irText().optional(),
      text: irText().optional(),
      attrs: z.record(z.string(), irText()).optional(),
      children: z.array(HTMLNodeSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvas'),
      id: irText(),
      class: irText().optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('text'),
      text: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('rawHTML'),
      html: irText(),
      advanced: z.literal(true),
      ...idField,
    }),
  ]),
)

// ---------- CSS ----------

export interface CSSRule {
  selector: string
  declarations: Record<string, string>
  /**
   * Mapa `propriedade → block.id` do bloco `sz_css_decl` que originou aquela
   * declaração. Existe só quando a regra veio do canvas (não do reverse-parse
   * do texto). É usado pelo gerador para registrar uma entrada no sourcemap
   * por declaração, fazendo o realce bloco↔código funcionar para o bloco da
   * declaração — e não só para a regra-pai inteira.
   */
  __declIds?: Record<string, string>
  __id?: string
}

/**
 * Texto de CSS que não pode carregar `{`/`}` — usado em seletor, nome de
 * `@keyframes` e seletor de passo (`at`). Uma chave nesses campos poderia
 * encerrar a regra atual e emendar outra (injeção: `}` + nova regra com
 * `background:url(...)` para exfiltração). É a correção DURÁVEL: bloqueia já na
 * importação de IR (o strip do gerador é só o cinto-e-suspensório).
 */
const cssNameText = () => irText().regex(/^[^{}]*$/, 'CSS não pode conter chaves { }')

/**
 * Uma chave `{`/`}` em PROFUNDIDADE 0 (fora de aspas e de comentários) rompe a
 * estrutura `selector { … }` e é a vetor de injeção. DENTRO de uma string
 * (`content:"a{b}c"`) ou de um comentário (`/* { *​/`) a chave faz parte do valor
 * e é legítima. Esta máquina de estados (igual à de `generators/css.ts` e à do
 * parser) devolve `true` quando NÃO há chave solta em profundidade 0.
 */
function cssValueHasNoLooseBrace(value: string): boolean {
  let quote: '"' | "'" | null = null
  let inComment = false
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    const next = value[i + 1]
    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false
        i += 1
      }
      continue
    }
    if (quote) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '*') {
      inComment = true
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '{' || ch === '}') return false
  }
  return true
}

/**
 * VALOR de declaração CSS: proíbe chaves `{`/`}` SOLTAS (rompem a regra) mas
 * PERMITE chaves dentro de strings/comentários (`content:"a{b}c"`). O regex
 * antigo `^[^{}]*$` rejeitava o valor inteiro e corrompia o round-trip. O `;` é
 * PERMITIDO porque é legítimo dentro de `url(data:…;base64,…)` e de strings
 * (`content:"a;b"`); o `;` em profundidade 0 (emendar declaração) é barrado no
 * gerador, em `isSafeDeclarationValue` (generators/css.ts).
 */
const cssValueText = () =>
  irText().refine(cssValueHasNoLooseBrace, 'Valor de CSS não pode conter chaves { } soltas')

export const CSSRuleSchema: z.ZodType<CSSRule> = z.object({
  selector: cssNameText().min(1),
  declarations: z.record(z.string(), cssValueText()),
  __declIds: z.record(z.string(), z.string()).optional(),
  ...idField,
})

export interface RawCSS {
  type: 'rawCSS'
  code: string
  advanced: true
  __id?: string
}

export const RawCSSSchema: z.ZodType<RawCSS> = z.object({
  type: z.literal('rawCSS'),
  code: irText(),
  advanced: z.literal(true),
  ...idField,
})

/**
 * Media query (`@media (max-width: Npx) { ... }`). Modela só a forma de uma
 * única feature de largura — o caso comum de responsividade. Condições fora
 * desse formato continuam como {@link RawCSS} avançado (round-trip preserva o
 * código verbatim).
 */
export interface MediaQueryCSS {
  type: 'mediaQuery'
  feature: 'max-width' | 'min-width' | 'max-height' | 'min-height'
  px: number
  rules: CSSEntry[]
  __id?: string
}

export const MediaQueryCSSSchema: z.ZodType<MediaQueryCSS> = z.object({
  type: z.literal('mediaQuery'),
  feature: z.enum(['max-width', 'min-width', 'max-height', 'min-height']),
  px: z.number(),
  // Conteúdo da media query. Lazy por ciclo (CSSEntry inclui MediaQueryCSS).
  rules: z.array(z.lazy(() => CSSEntrySchema)),
  ...idField,
})

/**
 * `@keyframes nome { 0% { … } 100% { … } }`. Cada passo tem um seletor de
 * tempo (`at`: `from`/`to`/`N%`) e suas declarações. Animações que fogem desse
 * formato (ex.: `@-webkit-keyframes`) continuam como {@link RawCSS}.
 */
export interface KeyframesCSS {
  type: 'keyframes'
  name: string
  steps: Array<{ at: string; declarations: Record<string, string> }>
  __id?: string
}

export const KeyframesCSSSchema: z.ZodType<KeyframesCSS> = z.object({
  type: z.literal('keyframes'),
  name: cssNameText().min(1),
  steps: z.array(
    z.object({
      at: cssNameText().min(1),
      declarations: z.record(z.string(), cssValueText()),
    }),
  ),
  ...idField,
})

/**
 * `@import url("https://fonts.googleapis.com/css?family=Nome")` — importa uma
 * fonte do Google Fonts. `family` é o nome (ex.: "Press Start 2P"); o gerador
 * codifica os espaços. Sai SEMPRE no topo do CSS (regra do `@import`).
 */
export interface GoogleFontCSS {
  type: 'googleFont'
  family: string
  __id?: string
}

export const GoogleFontCSSSchema: z.ZodType<GoogleFontCSS> = z.object({
  type: z.literal('googleFont'),
  family: irText(),
  ...idField,
})

export type CSSEntry = CSSRule | RawCSS | MediaQueryCSS | KeyframesCSS | GoogleFontCSS

export const CSSEntrySchema: z.ZodType<CSSEntry> = z.union([
  CSSRuleSchema,
  RawCSSSchema,
  MediaQueryCSSSchema,
  KeyframesCSSSchema,
  GoogleFontCSSSchema,
])

// ---------- JS Statements ----------

const eventKindSchema = z.enum([
  'click',
  'keydown',
  'keyup',
  'mouseover',
  'mouseout',
  'mousemove',
  'mousedown',
  'mouseup',
  'submit',
  'input',
  'change',
  'load',
  'resize',
  // Entrou/saiu da tela cheia (Fullscreen API). Evento global no documento.
  'fullscreenchange',
])
export type EventKind = z.infer<typeof eventKindSchema>

interface JSStatementCommon {
  __id?: string
}

export type JSStatement =
  | (JSStatementCommon & { type: 'var'; name: string; value: JSExpr; kind?: 'let' | 'const' })
  // Declaração sem valor inicial (`let x;`).
  | (JSStatementCommon & { type: 'declareVar'; name: string })
  | (JSStatementCommon & { type: 'assign'; name: string; value: JSExpr })
  | (JSStatementCommon & { type: 'if'; cond: JSExpr; then: JSStatement[]; else?: JSStatement[] })
  | (JSStatementCommon & { type: 'repeat'; times: JSExpr; body: JSStatement[] })
  // Laço com condição (`while (cond) { … }`).
  | (JSStatementCommon & { type: 'while'; cond: JSExpr; body: JSStatement[] })
  // Laço que executa ao menos uma vez (`do { … } while (cond)`).
  | (JSStatementCommon & { type: 'doWhile'; cond: JSExpr; body: JSStatement[] })
  // Sai do laço atual (`break;`).
  | (JSStatementCommon & { type: 'break' })
  // Pula para a próxima volta do laço (`continue;`).
  | (JSStatementCommon & { type: 'continue' })
  // Itera os itens de uma lista (`for (const item of lista) { … }`). Distinto de
  // `forEach` (sem índice) — preserva a escolha do aluno no round-trip.
  | (JSStatementCommon & {
      type: 'forOf'
      itemName: string
      iterableVar: string
      body: JSStatement[]
    })
  // `for` clássico de contagem (`for (let i = de; i < ate; i += passo) { … }`).
  // `op` sempre `<`; o `repeat` (de 0, passo 1) tem match exato e tem prioridade.
  | (JSStatementCommon & {
      type: 'forRange'
      varName: string
      from: JSExpr
      to: JSExpr
      step: JSExpr
      body: JSStatement[]
    })
  // try/catch/finally. `errorName` ausente = `catch { … }` (sem binding). O
  // `finalizer` ausente = sem bloco `finally`.
  | (JSStatementCommon & {
      type: 'tryCatch'
      body: JSStatement[]
      errorName?: string
      handler: JSStatement[]
      finalizer?: JSStatement[]
    })
  // Busca JSON de uma URL via `fetch(url).then(r => r.json()).then((dados)=>{…})`
  // com `.catch((erro)=>{…})` opcional. `okName`/`catchName` = variáveis dos dados
  // e do erro; o `catchBody` ausente = sem `.catch`.
  | (JSStatementCommon & {
      type: 'fetchJson'
      url: JSExpr
      okName: string
      body: JSStatement[]
      catchName?: string
      catchBody?: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'event'
      target: string
      /**
       * 'var': `target` é o nome de uma variável que guarda o elemento.
       * 'document': escuta global no documento (clique em qualquer lugar). Senão é um id.
       */
      targetKind?: 'id' | 'var' | 'document' | 'window'
      event: EventKind
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'consoleLog'; value: JSExpr })
  | (JSStatementCommon & { type: 'alert'; value: JSExpr })
  | (JSStatementCommon & { type: 'setText'; targetId: string; value: JSExpr })
  | (JSStatementCommon & {
      type: 'setProperty'
      targetId: string
      /** Quando 'var', `targetId` é o nome de uma variável que guarda o elemento; senão é um id. */
      targetKind?: 'id' | 'var'
      property: 'textContent' | 'value' | 'innerHTML'
      value: JSExpr
    })
  | (JSStatementCommon & {
      type: 'getProperty'
      targetId: string
      /** Quando 'var', `targetId` é o nome de uma variável que guarda o elemento; senão é um id. */
      targetKind?: 'id' | 'var'
      property: 'textContent' | 'value' | 'innerHTML'
      varName: string
    })
  // Estilo inline por código (`el.style.left = valor` / `el.style['z-index'] = valor`).
  | (JSStatementCommon & {
      type: 'setStyle'
      targetId: string
      targetKind?: 'id' | 'var' | 'this'
      property: string
      value: JSExpr
    })
  // Atributo por código (`el.setAttribute('stroke', valor)`).
  | (JSStatementCommon & {
      type: 'setAttribute'
      targetId: string
      targetKind?: 'id' | 'var' | 'this'
      name: string
      value: JSExpr
    })
  // Cria um elemento e guarda numa variável (`const x = document.createElement('div')`).
  | (JSStatementCommon & { type: 'createElement'; tag: string; varName: string })
  // Cria uma FORMA SVG por código (`const x = document.createElementNS(SVG_NS, 'circle')`).
  | (JSStatementCommon & { type: 'createElementNS'; tag: string; varName: string })
  // Lê um atributo de um elemento e guarda numa variável (`const v = el.getAttribute('cx')`).
  | (JSStatementCommon & {
      type: 'getAttribute'
      targetId: string
      targetKind?: 'id' | 'var'
      name: string
      varName: string
    })
  // Adiciona um elemento dentro de outro (`pai.appendChild(filho)`).
  | (JSStatementCommon & { type: 'appendChild'; parentVar: string; childVar: string })
  // Dispara um erro (`throw new Error(<mensagem>)`) — fim de jogo via try/catch.
  | (JSStatementCommon & { type: 'throwError'; message: JSExpr })
  // Copia as propriedades de um objeto para outro (`Object.assign(alvo, origem)`).
  | (JSStatementCommon & { type: 'objectAssign'; targetVar: string; sourceVar: string })
  // Escolha (`switch (subject) { case <match>: <body> break; … default: <default> }`).
  | (JSStatementCommon & {
      type: 'switch'
      subject: JSExpr
      cases: Array<{ match: JSExpr; body: JSStatement[] }>
      default?: JSStatement[]
    })
  // Tela cheia (Fullscreen API) na PÁGINA inteira (document.documentElement).
  // Entrar/sair/alternar — sem campos (o alvo é fixo = a página).
  | (JSStatementCommon & { type: 'requestFullscreen' })
  | (JSStatementCommon & { type: 'exitFullscreen' })
  | (JSStatementCommon & { type: 'toggleFullscreen' })
  // Escreve um data-attribute (`el.dataset.chave = valor`).
  | (JSStatementCommon & {
      type: 'setDataset'
      targetId: string
      targetKind?: 'id' | 'var'
      key: string
      value: JSExpr
    })
  | (JSStatementCommon & { type: 'querySelector'; selector: string; varName: string })
  // Seleciona TODOS os elementos que casam (`document.querySelectorAll('sel')`).
  // O resultado (NodeList) é iterável com `forEach`.
  | (JSStatementCommon & { type: 'querySelectorAll'; selector: string; varName: string })
  | (JSStatementCommon & { type: 'getElementById'; id: string; varName: string })
  // Salva um valor no armazenamento do navegador
  // (`localStorage.setItem(chave, valor)` / `sessionStorage`).
  | (JSStatementCommon & {
      type: 'storageSet'
      store: 'local' | 'session'
      key: JSExpr
      value: JSExpr
    })
  // Dentro de um handler de evento: `event.preventDefault()` / `event.stopPropagation()`.
  | (JSStatementCommon & { type: 'eventMethod'; method: 'preventDefault' | 'stopPropagation' })
  | (JSStatementCommon & {
      type: 'classOp'
      targetId: string
      /** 'var': variável; 'this': o elemento atual (this); senão um id. */
      targetKind?: 'id' | 'var' | 'this'
      op: 'add' | 'remove' | 'toggle'
      className: string
    })
  // Canvas
  | (JSStatementCommon & { type: 'canvasSetup'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'canvasSetSize'; ctxVar: string; w: JSExpr; h: JSExpr })
  | (JSStatementCommon & { type: 'canvasClear'; ctxVar: string; canvasVar: string })
  | (JSStatementCommon & { type: 'canvasFillStyle'; ctxVar: string; color: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasFillRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasArc'; ctxVar: string; x: JSExpr; y: JSExpr; r: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasFillText'
      ctxVar: string
      text: JSExpr
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasStrokeRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasClearRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasRoundRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
      r: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasEllipse'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      rx: JSExpr
      ry: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasArcSlice'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      r: JSExpr
      start: JSExpr
      end: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasQuadraticCurve'
      ctxVar: string
      cpx: JSExpr
      cpy: JSExpr
      x: JSExpr
      y: JSExpr
    })
  // ctx.arcTo(x1, y1, x2, y2, r) — liga o ponto atual a (x2,y2) com canto arredondado.
  | (JSStatementCommon & {
      type: 'canvasArcTo'
      ctxVar: string
      x1: JSExpr
      y1: JSExpr
      x2: JSExpr
      y2: JSExpr
      r: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasBezierCurve'
      ctxVar: string
      cp1x: JSExpr
      cp1y: JSExpr
      cp2x: JSExpr
      cp2y: JSExpr
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasShadow'; ctxVar: string; color: JSExpr; blur: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasStrokeText'
      ctxVar: string
      text: JSExpr
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasLineDash'; ctxVar: string; segment: JSExpr })
  | (JSStatementCommon & {
      type: 'animationLoop'
      body: JSStatement[]
      handle?: string
      // Variáveis opcionais expostas pelo mutator: o tempo do quadro (ms desde o
      // carregamento, vindo do requestAnimationFrame) e o tempo desde o quadro
      // anterior (delta, ms) — para movimento independente de FPS.
      timeVar?: string
      deltaVar?: string
    })
  // Para o loop de animação: cancelAnimationFrame(handle).
  | (JSStatementCommon & { type: 'cancelAnimationFrame'; handle: JSExpr })
  | (JSStatementCommon & { type: 'keyboardSimple'; varName: string })
  // Adiciona um item ao fim de uma lista (arr.push(value)).
  | (JSStatementCommon & { type: 'arrayPush'; arrayVar: string; value: JSExpr })
  // Remove o último (pop) ou o primeiro (shift) item de uma lista.
  | (JSStatementCommon & { type: 'arrayRemove'; arrayVar: string; end: 'pop' | 'shift' })
  // Remove `count` itens de uma lista a partir de `start` (arr.splice(start, count)).
  | (JSStatementCommon & {
      type: 'arraySplice'
      arrayVar: string
      start: JSExpr
      count: JSExpr
    })
  // Canvas extras
  | (JSStatementCommon & {
      type: 'canvasDrawImage'
      ctxVar: string
      src: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasSave'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasRestore'; ctxVar: string })
  | (JSStatementCommon & {
      type: 'canvasTranslate'
      ctxVar: string
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasRotate'; ctxVar: string; angle: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasScale'
      ctxVar: string
      sx: JSExpr
      sy: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasGradient'
      ctxVar: string
      varName: string
      x0: JSExpr
      y0: JSExpr
      x1: JSExpr
      y1: JSExpr
      stops: Array<{ offset: number; color: string }>
    })
  // Canvas — traçado/contorno, fonte e transparência (caminho "na mão", v0.6.0).
  | (JSStatementCommon & { type: 'canvasBeginPath'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasClosePath'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasStroke'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasFill'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasMoveTo'; ctxVar: string; x: JSExpr; y: JSExpr })
  | (JSStatementCommon & { type: 'canvasLineTo'; ctxVar: string; x: JSExpr; y: JSExpr })
  // Canvas — adicionar retângulo ao traçado e recortar o desenho pelo traçado.
  | (JSStatementCommon & {
      type: 'canvasRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasClip'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasStrokeStyle'; ctxVar: string; color: JSExpr })
  | (JSStatementCommon & { type: 'canvasLineWidth'; ctxVar: string; width: JSExpr })
  | (JSStatementCommon & { type: 'canvasGlobalAlpha'; ctxVar: string; alpha: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasFont'
      ctxVar: string
      weight?: 'bold' | 'italic' | 'italic bold'
      size: number
      family: string
    })
  | (JSStatementCommon & {
      type: 'canvasTextAlign'
      ctxVar: string
      align: 'left' | 'center' | 'right'
    })
  | (JSStatementCommon & {
      type: 'canvasTextBaseline'
      ctxVar: string
      baseline: 'top' | 'middle' | 'bottom' | 'alphabetic'
    })
  // Game 2D extension
  | (JSStatementCommon & {
      type: 'g2d:createSprite'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  | (JSStatementCommon & { type: 'g2d:drawSprite'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:setPosition'; spriteVar: string; x: JSExpr; y: JSExpr })
  | (JSStatementCommon & { type: 'g2d:setVelocity'; spriteVar: string; vx: JSExpr; vy: JSExpr })
  | (JSStatementCommon & { type: 'g2d:collides'; aVar: string; bVar: string; varName: string })
  | (JSStatementCommon & { type: 'g2d:score'; varName: string; initial: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:gameOver'; ctxVar: string; text: ScreenText })
  // Palco implícito: limpa a tela do runtime (sem o aluno carregar o "pincel").
  | (JSStatementCommon & { type: 'g2d:clear' })
  // Eventos "Quando…" (hats): tecla apertada e sobreposição de sprites.
  | (JSStatementCommon & { type: 'g2d:onKey'; key: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'g2d:onOverlap'
      aVar: string
      bVar: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g2d:updateEachFrame'; body: JSStatement[] })
  // Física: gravidade do mundo, integração de velocidade, ricochete nas bordas,
  // colisão por círculo.
  | (JSStatementCommon & { type: 'g2d:setGravity'; value: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:applyVelocity'; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:bounceOnEdges'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & {
      type: 'g2d:circleCollides'
      aVar: string
      bVar: string
      varName: string
    })
  // Áudio: toca um tom (Web Audio, sem assets).
  | (JSStatementCommon & { type: 'g2d:playSound'; freq: number; durationMs: number })
  // Áudio: efeito sonoro pronto (sintetizado), escolhido por nome.
  | (JSStatementCommon & { type: 'g2d:playFx'; fx: string })
  // Áudio: música de fundo em loop (sintetizada), escolhida por nome.
  | (JSStatementCommon & { type: 'g2d:playMusic'; tune: string })
  // Áudio: para a música de fundo.
  | (JSStatementCommon & { type: 'g2d:stopMusic' })
  // Áudio: toca uma nota musical (dó ré mi…) por uma duração em ms.
  | (JSStatementCommon & { type: 'g2d:playNote'; note: string; ms: number })
  // Tier 1 — mira/movimento, vida, aparência, mundo e pausa (comandos).
  | (JSStatementCommon & { type: 'g2d:aimAt'; spriteVar: string; targetVar: string })
  | (JSStatementCommon & {
      type: 'g2d:moveToward'
      spriteVar: string
      targetVar: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:setHealth'; spriteVar: string; amount: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:changeHealth'; spriteVar: string; delta: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:flipSprite'; spriteVar: string; dir: string })
  | (JSStatementCommon & { type: 'g2d:setOpacity'; spriteVar: string; percent: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:setSize'
      spriteVar: string
      w: number | JSExpr
      h: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:scaleSprite'; spriteVar: string; factor: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:wrapEdges'; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:pruneOld'; groupVar: string; seconds: number })
  | (JSStatementCommon & { type: 'g2d:pauseGame' })
  | (JSStatementCommon & { type: 'g2d:resumeGame' })
  // Tier 2 — câmera, mapa destrutível, ordem de desenho e depuração (comandos).
  | (JSStatementCommon & {
      type: 'g2d:cameraFollow'
      spriteVar: string
      worldW: number | JSExpr
      worldH: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:setCamera'; x: number | JSExpr; y: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:breakTile'; mapVar: string; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:setTile'; mapVar: string; index: number; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:bringToFront'; spriteVar: string; groupVar: string })
  | (JSStatementCommon & { type: 'g2d:sendToBack'; spriteVar: string; groupVar: string })
  | (JSStatementCommon & { type: 'g2d:drawHitbox'; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:showFps'; x: number | JSExpr; y: number | JSExpr })
  // Entrada de mouse/toque: corpo recebe a posição do ponteiro em xName/yName.
  | (JSStatementCommon & {
      type: 'g2d:onPointer'
      xName: string
      yName: string
      body: JSStatement[]
    })
  // Imagens / spritesheet / animação (v0.3.0). `image`/`sheetVar` são nomes de
  // asset/variável (strings); coords e quadros são números (mantém os blocos e o
  // round-trip simples). O runtime resolve o nome do asset no manifesto.
  | (JSStatementCommon & {
      type: 'g2d:createImageSprite'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      image: string
    })
  | (JSStatementCommon & { type: 'g2d:setImage'; spriteVar: string; image: string })
  | (JSStatementCommon & {
      type: 'g2d:loadSpritesheet'
      varName: string
      image: string
      frameW: number
      frameH: number
    })
  | (JSStatementCommon & {
      type: 'g2d:animateSprite'
      spriteVar: string
      sheetVar: string
      from: number
      to: number
      fps: number
    })
  | (JSStatementCommon & {
      type: 'g2d:drawFrame'
      sheetVar: string
      ctxVar: string
      index: number
      x: number
      y: number
      w: number
      h: number
    })
  // Movimento + efeitos (v0.4.0).
  | (JSStatementCommon & {
      type: 'g2d:platformer'
      spriteVar: string
      ctxVar: string
      speed: number | JSExpr
      jump: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:topDown'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:followPointer'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:clampToScreen'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:flash'; color: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:shake'; ctxVar: string; intensity: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:emitParticles'
      count: number | JSExpr
      color: string
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:drawParticles'; ctxVar: string })
  // Tiles / tilemaps (v0.5.0). image = nome do asset do tileset (string); grid e
  // solid são texto editável (linhas/índices); tile/x/y são números.
  | (JSStatementCommon & {
      type: 'g2d:createTileMap'
      varName: string
      image: string
      tile: number
      solid: string
      grid: string
    })
  | (JSStatementCommon & {
      type: 'g2d:drawTileMap'
      mapVar: string
      ctxVar: string
      x: number
      y: number
    })
  | (JSStatementCommon & { type: 'g2d:tileMapCollide'; spriteVar: string; mapVar: string })
  // Grupos de sprites (v0.6.0): MUITOS sprites (tiros, inimigos, estrelas). Um
  // grupo é uma lista gerenciada de sprites. x/y/vx/vy são expressões (aceitam
  // aleatório/contas); w/h números; color/image strings (nomes de asset).
  | (JSStatementCommon & { type: 'g2d:createGroup'; varName: string })
  | (JSStatementCommon & {
      type: 'g2d:spawnInGroup'
      groupVar: string
      x: JSExpr
      y: JSExpr
      w: number
      h: number
      color: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnImageInGroup'
      groupVar: string
      x: JSExpr
      y: JSExpr
      w: number
      h: number
      image: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:updateGroup'; groupVar: string })
  | (JSStatementCommon & { type: 'g2d:drawGroup'; groupVar: string; ctxVar: string })
  | (JSStatementCommon & {
      type: 'g2d:forEachInGroup'
      groupVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g2d:clearGroup'; groupVar: string })
  | (JSStatementCommon & {
      type: 'g2d:pruneOffscreen'
      groupVar: string
      ctxVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g2d:onGroupOverlap'
      aGroup: string
      aName: string
      bGroup: string
      bName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g2d:removeFromGroup'; spriteVar: string; groupVar: string })
  // Temporizadores: "a cada N quadros/segundos" — vira if (SZGame2D.everyX(...)).
  | (JSStatementCommon & { type: 'g2d:everyFrames'; n: JSExpr; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g2d:everySeconds'; seconds: number; body: JSStatement[] })
  // HUD no canvas (v0.6.0): placar, texto, vidas (corações) e barra.
  | (JSStatementCommon & {
      type: 'g2d:drawScore'
      ctxVar: string
      label: string
      value: JSExpr
      x: number | JSExpr
      y: number | JSExpr
      color: string
      size: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:drawLabel'
      ctxVar: string
      text: string
      x: number | JSExpr
      y: number | JSExpr
      color: string
      size: number | JSExpr
      align: 'left' | 'center' | 'right'
    })
  | (JSStatementCommon & {
      type: 'g2d:drawHearts'
      ctxVar: string
      count: JSExpr
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:drawBar'
      ctxVar: string
      value: JSExpr
      max: JSExpr
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  // Estado/telas (cenas): trocar de tela, overlay de tela cheia e reiniciar.
  | (JSStatementCommon & { type: 'g2d:setScene'; name: string })
  | (JSStatementCommon & {
      type: 'g2d:showScreen'
      ctxVar: string
      title: ScreenText
      subtitle: ScreenText
      hint: ScreenText
      bg: string
    })
  | (JSStatementCommon & { type: 'g2d:restart' })
  // Tela: faz o canvas preencher ~percent% da janela (mantendo a proporção).
  | (JSStatementCommon & { type: 'g2d:fitScreen'; percent: number })
  // Atalho de início: prepara o palco (tamanho do mundo) em tela cheia responsiva.
  | (JSStatementCommon & { type: 'g2d:setupStage'; width: number; height: number; bg: string })
  // Tiro redondo com brilho num grupo; mover com setas; piscar (invencibilidade).
  | (JSStatementCommon & {
      type: 'g2d:spawnBullet'
      groupVar: string
      x: JSExpr
      y: JSExpr
      radius: number
      color: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:arrowsX'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:blinkSprite'; spriteVar: string; frames: number | JSExpr })
  // Cenário: fundo de estrelas rolando; arrastar a nave com o dedo (eixo X).
  | (JSStatementCommon & { type: 'g2d:starfield'; ctxVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:dragX'; spriteVar: string })
  // Kit "Nave & Asteroides" (v0.7.0): desenhos prontos + efeitos + colisão sprite×grupo.
  | (JSStatementCommon & {
      type: 'g2d:createShip'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      bodyColor: string
      wingColor: string
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnAsteroid'
      groupVar: string
      x: JSExpr
      y: JSExpr
      size: number
      color: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:explode'; spriteVar: string; color: string })
  | (JSStatementCommon & { type: 'g2d:playShoot' })
  | (JSStatementCommon & { type: 'g2d:playExplosion' })
  | (JSStatementCommon & {
      type: 'g2d:onSpriteGroupOverlap'
      spriteVar: string
      groupVar: string
      itemName: string
      body: JSStatement[]
    })
  // ---- Nave clássica: girar + impulsionar na direção apontada (v0.10.0) ----
  | (JSStatementCommon & {
      type: 'g2d:steerThrust'
      spriteVar: string
      speed: number | JSExpr
      turn: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:rotateSprite'; spriteVar: string; deg: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:pointSprite'; spriteVar: string; deg: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:thrust'; spriteVar: string; force: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:applyFriction'; spriteVar: string; factor: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:shootFrom'
      spriteVar: string
      groupVar: string
      speed: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnAsteroidEdge'
      groupVar: string
      size: number
      color: string
      speed: number
    })
  // ---- Pulo genérico + Kit dino (v0.9.0) ----
  | (JSStatementCommon & {
      type: 'g2d:jumpOnGround'
      spriteVar: string
      ctxVar: string
      jump: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:createDino'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
      color: string
    })
  // Game 2D — Kit equilibrista (Stick Hero) / Kit balão (v0.13.0).
  | (JSStatementCommon & { type: 'g2d:createStickHero'; varName: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:updateStickHero'; gameVar: string })
  | (JSStatementCommon & { type: 'g2d:restartStickHero'; gameVar: string })
  | (JSStatementCommon & { type: 'g2d:createBalloon'; varName: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:updateBalloon'; gameVar: string })
  | (JSStatementCommon & { type: 'g2d:restartBalloon'; gameVar: string })
  | (JSStatementCommon & {
      type: 'g2d:controlDino'
      spriteVar: string
      ctxVar: string
      jump: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnObstacle'
      groupVar: string
      ctxVar: string
      shape: string
      x: JSExpr
      size: number
      vx: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnEgg'
      groupVar: string
      x: JSExpr
      y: JSExpr
      vx: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:forest'; ctxVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:playJump' })
  | (JSStatementCommon & { type: 'g2d:playDinoHurt' })
  | (JSStatementCommon & { type: 'g2d:playCollect' })
  // ---- Kit gorilas: batalha de bananas (artilharia) ----
  | (JSStatementCommon & { type: 'g2d:createCity'; varName: string })
  | (JSStatementCommon & { type: 'g2d:drawCity'; cityVar: string; ctxVar: string })
  | (JSStatementCommon & {
      type: 'g2d:placeThrower'
      varName: string
      cityVar: string
      side: 'left' | 'right'
      color: string
    })
  | (JSStatementCommon & { type: 'g2d:newWind'; cityVar: string })
  | (JSStatementCommon & { type: 'g2d:drawWind'; cityVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:aimDrag'; throwerVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:throwBanana'; throwerVar: string; cityVar: string })
  | (JSStatementCommon & { type: 'g2d:updateBanana'; cityVar: string })
  | (JSStatementCommon & { type: 'g2d:drawBanana'; cityVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:playWhistle' })
  | (JSStatementCommon & { type: 'g2d:playBoom' })
  | (JSStatementCommon & {
      type: 'g2d:computerTurn'
      throwerVar: string
      cityVar: string
      enemyVar: string
    })
  | (JSStatementCommon & { type: 'g2d:drawAimReadout'; ctxVar: string })
  // ---- Game 3D (extensão game-3d, Three.js via window.SZGame3D) ----
  | (JSStatementCommon & { type: 'g3d:createScene'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'g3d:createFullscreenScene'; varName: string; bg: string })
  | (JSStatementCommon & { type: 'g3d:setBackground'; worldVar: string; color: string })
  | (JSStatementCommon & {
      type: 'g3d:setCameraPosition'
      worldVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:createBox'
      varName: string
      worldVar: string
      size: number
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createSphere'
      varName: string
      worldVar: string
      radius: number
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:setPosition'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:setRotation'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:animate'; worldVar: string; body: JSStatement[] })
  // Game 3D — caixa retangular (largura/altura/profundidade), p/ o chão e objetos não-cúbicos.
  | (JSStatementCommon & {
      type: 'g3d:createBlock'
      varName: string
      worldVar: string
      width: number
      height: number
      depth: number
      color: string
    })
  // Game 3D — física: velocidade, pulo, gravidade+chão, controle por teclado, escala.
  | (JSStatementCommon & {
      type: 'g3d:setVelocity'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:jump'; objVar: string; force: JSExpr })
  | (JSStatementCommon & { type: 'g3d:applyGravity'; objVar: string; groundVar: string })
  | (JSStatementCommon & { type: 'g3d:controlWithKeys'; objVar: string; speed: number })
  | (JSStatementCommon & { type: 'g3d:setScale'; objVar: string; factor: JSExpr })
  // Game 3D — câmera segue um objeto (mantém o enquadramento atual).
  | (JSStatementCommon & { type: 'g3d:cameraFollow'; worldVar: string; objVar: string })
  // Game 3D — Kit "Desvie": grupo de inimigos, spawner que avança, fim de jogo.
  | (JSStatementCommon & { type: 'g3d:createGroup'; varName: string })
  | (JSStatementCommon & {
      type: 'g3d:runEnemies'
      worldVar: string
      groupVar: string
      groundVar: string
      every: number
      speed: number
    })
  | (JSStatementCommon & { type: 'g3d:stop'; worldVar: string })
  // ---- Game 3D — Kit Travessia (atravessar a rua, mundo em grade z-up) ----
  | (JSStatementCommon & { type: 'g3d:createCrossingScene'; canvasId: string; varName: string })
  | (JSStatementCommon & {
      type: 'g3d:createCrosser'
      varName: string
      worldVar: string
      color: string
    })
  | (JSStatementCommon & { type: 'g3d:crosserMove'; objVar: string; direction: string })
  | (JSStatementCommon & { type: 'g3d:crosserStep'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:crosserReset'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:gridPosition'; objVar: string; row: JSExpr; col: JSExpr })
  | (JSStatementCommon & {
      type: 'g3d:addRow'
      worldVar: string
      rowIndex: JSExpr
      kind: string
      direction: string
      speed: number
    })
  | (JSStatementCommon & { type: 'g3d:generateRows'; worldVar: string; count: number })
  | (JSStatementCommon & { type: 'g3d:moveTraffic'; worldVar: string })
  // ---- Game 3D — primitivas GENÉRICAS de grade/isométrico (fora do kit, p/ outros jogos) ----
  | (JSStatementCommon & { type: 'g3d:isometricCamera'; worldVar: string; followVar: string })
  | (JSStatementCommon & { type: 'g3d:gridStep'; objVar: string })
  | (JSStatementCommon & { type: 'g3d:gridMove'; objVar: string; direction: string })
  | (JSStatementCommon & {
      type: 'g3d:moveAcross'
      groupVar: string
      speed: number
      min: number
      max: number
    })
  // ---- Game 3D — câmera aérea + movimento circular (genéricos) e Kit Corrida ----
  | (JSStatementCommon & { type: 'g3d:topCamera'; worldVar: string; followVar: string })
  | (JSStatementCommon & {
      type: 'g3d:moveInCircle'
      objVar: string
      radius: number
      speed: number
    })
  | (JSStatementCommon & { type: 'g3d:createRaceScene'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'g3d:createRaceTrack'; worldVar: string })
  | (JSStatementCommon & {
      type: 'g3d:createRaceCar'
      varName: string
      worldVar: string
      color: string
    })
  | (JSStatementCommon & { type: 'g3d:raceStep'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:raceControl'; objVar: string; mode: string })
  | (JSStatementCommon & { type: 'g3d:runRivals'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:raceReset'; objVar: string; worldVar: string })
  // ---- Game 3D — genéricos de movimento/física (sem lib) e Kit Empilhar (Stack) ----
  | (JSStatementCommon & { type: 'g3d:fall'; objVar: string })
  | (JSStatementCommon & {
      type: 'g3d:slideBetween'
      objVar: string
      axis: string
      min: number
      max: number
      speed: number
    })
  | (JSStatementCommon & { type: 'g3d:spin'; objVar: string; axis: string; speed: number })
  | (JSStatementCommon & { type: 'g3d:createStackScene'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'g3d:createStackTower'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:stackDrop'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:stackStep'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:stackReset'; worldVar: string })
  // ---- Game 3D — genéricos: mover/girar relativo + suavizar (lerp) ----
  | (JSStatementCommon & { type: 'g3d:moveBy'; objVar: string; x: JSExpr; y: JSExpr; z: JSExpr })
  | (JSStatementCommon & { type: 'g3d:rotateBy'; objVar: string; axis: string; amount: JSExpr })
  | (JSStatementCommon & {
      type: 'g3d:moveTowards'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
      factor: number
    })
  // ---- Game 3D — genéricos: olhar/apontar/andar para frente ----
  | (JSStatementCommon & { type: 'g3d:lookAtObject'; aVar: string; bVar: string })
  | (JSStatementCommon & {
      type: 'g3d:lookAtPoint'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:moveForward'; objVar: string; dist: JSExpr })
  | (JSStatementCommon & { type: 'g3d:faceVelocity'; objVar: string })
  // ---- Game 3D — física genérica: corpo, sólidos, presets plataforma/FPS ----
  | (JSStatementCommon & { type: 'g3d:body'; objVar: string; gravity: number })
  | (JSStatementCommon & { type: 'g3d:stepBody'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:setSolid'; objVar: string })
  | (JSStatementCommon & {
      type: 'g3d:platformerControls'
      objVar: string
      worldVar: string
      speed: number
      jump: number
    })
  | (JSStatementCommon & {
      type: 'g3d:fpsControls'
      objVar: string
      worldVar: string
      speed: number
    })
  | (JSStatementCommon & { type: 'g3d:resolveCollision'; aVar: string; bVar: string })
  // ---- Game 3D — câmeras vivas (1ª pessoa, orbital, 3ª pessoa, olhar, FOV) ----
  | (JSStatementCommon & { type: 'g3d:fpsCamera'; worldVar: string; objVar: string })
  | (JSStatementCommon & { type: 'g3d:orbitCamera'; worldVar: string; objVar: string })
  | (JSStatementCommon & {
      type: 'g3d:thirdPersonCamera'
      worldVar: string
      objVar: string
      dist: number
      height: number
    })
  | (JSStatementCommon & { type: 'g3d:cameraLookAt'; worldVar: string; objVar: string })
  | (JSStatementCommon & { type: 'g3d:setFOV'; worldVar: string; deg: number })
  // ---- Game 3D — formas, materiais, texturas, modelo (Fase 6) ----
  | (JSStatementCommon & {
      type: 'g3d:createCylinder'
      varName: string
      worldVar: string
      radius: number
      height: number
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createCone'
      varName: string
      worldVar: string
      radius: number
      height: number
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createPlane'
      varName: string
      worldVar: string
      width: number
      depth: number
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createTorus'
      varName: string
      worldVar: string
      radius: number
      tube: number
      color: string
    })
  | (JSStatementCommon & { type: 'g3d:createModel'; varName: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:setColor'; objVar: string; color: string })
  | (JSStatementCommon & { type: 'g3d:setOpacity'; objVar: string; opacity: number })
  | (JSStatementCommon & { type: 'g3d:setMaterial'; objVar: string; kind: string })
  | (JSStatementCommon & { type: 'g3d:setTexture'; objVar: string; asset: string })
  | (JSStatementCommon & { type: 'g3d:setVisible'; objVar: string; mode: string })
  | (JSStatementCommon & { type: 'g3d:removeObject'; worldVar: string; objVar: string })
  | (JSStatementCommon & { type: 'g3d:addToModel'; modelVar: string; partVar: string })
  // ---- Game 3D — luz & céu (Fase 7) ----
  | (JSStatementCommon & {
      type: 'g3d:addAmbientLight'
      worldVar: string
      color: string
      intensity: number
    })
  | (JSStatementCommon & {
      type: 'g3d:addSunLight'
      worldVar: string
      color: string
      intensity: number
    })
  | (JSStatementCommon & {
      type: 'g3d:addPointLight'
      worldVar: string
      color: string
      intensity: number
      x: number
      y: number
      z: number
    })
  | (JSStatementCommon & {
      type: 'g3d:setFog'
      worldVar: string
      color: string
      near: number
      far: number
    })
  | (JSStatementCommon & { type: 'g3d:setSky'; worldVar: string; top: string; bottom: string })
  | (JSStatementCommon & { type: 'g3d:setShadows'; worldVar: string; mode: string })
  // ---- Game 3D — enxames & som (Fase 8) ----
  | (JSStatementCommon & { type: 'g3d:createSwarm'; varName: string; worldVar: string })
  | (JSStatementCommon & {
      type: 'g3d:spawnInSwarm'
      swarmVar: string
      originalVar: string
      x: number
      y: number
      z: number
    })
  | (JSStatementCommon & {
      type: 'g3d:forEachInSwarm'
      swarmVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g3d:removeFromSwarm'; swarmVar: string; itemVar: string })
  | (JSStatementCommon & {
      type: 'g3d:pruneSwarm'
      swarmVar: string
      axis: string
      min: number
      max: number
    })
  | (JSStatementCommon & { type: 'g3d:playNote'; freq: number; ms: number })
  | (JSStatementCommon & { type: 'g3d:playEffect'; kind: string })
  // Orientação a objetos
  | (JSStatementCommon & {
      type: 'classDecl'
      name: string
      /** Classe-mãe (`class X extends Base`). Ausente = sem herança. */
      superClass?: string
      /** Parâmetros do construtor (ex.: `['nome', 'idade']`). Vazio/ausente = construtor sem args. */
      ctorParams?: string[]
      /**
       * Id do bloco `sz_js_constructor` que originou este construtor. Permite
       * o realce bloco↔código apontar para a faixa `constructor(...) { … }`
       * no Monaco. Ausente quando o IR foi reconstruído a partir do texto.
       */
      ctorId?: string
      /** Corpo livre do construtor (inclui `this.x = v` via `setThisProp`). */
      ctorBody: JSStatement[]
      methods: Array<{
        /** Id do bloco `sz_js_class_method` correspondente, quando conhecido. */
        __id?: string
        name: string
        params: string[]
        body: JSStatement[]
      }>
    })
  | (JSStatementCommon & {
      type: 'newInstance'
      varName: string
      className: string
      /** Argumentos passados ao construtor (`new Classe(args)`). */
      args?: JSExpr[]
    })
  | (JSStatementCommon & {
      type: 'callMethod'
      objectVar: string
      method: string
      /** Argumentos passados ao método (`obj.metodo(args)`). */
      args?: JSExpr[]
    })
  // Registra um listener que aponta para uma função nomeada (`el.addEventListener('click', fn)`).
  | (JSStatementCommon & {
      type: 'eventHandler'
      target: string
      targetKind?: 'id' | 'var' | 'document' | 'window'
      event: EventKind
      handlerName: string
    })
  // Escreve a própria propriedade dentro de um método/construtor (this.nome = v).
  | (JSStatementCommon & { type: 'setThisProp'; name: string; value: JSExpr })
  // Escreve a propriedade de um objeto/instância (obj.nome = v).
  | (JSStatementCommon & { type: 'setProp'; objectVar: string; name: string; value: JSExpr })
  // Escreve a propriedade de qualquer valor (objeto = expressão; cobre this.velocidade.x = v).
  | (JSStatementCommon & { type: 'memberSet'; object: JSExpr; name: string; value: JSExpr })
  // Chamada de método como comando sobre qualquer objeto (object.metodo(args);).
  | (JSStatementCommon & { type: 'memberCall'; object: JSExpr; method: string; args: JSExpr[] })
  // Retorno de um método (`return v;`) ou saída antecipada (`return;`).
  | (JSStatementCommon & { type: 'return'; value?: JSExpr })
  // Função nomeada de topo (`function nome(params) { ... }`).
  | (JSStatementCommon & { type: 'funcDecl'; name: string; params: string[]; body: JSStatement[] })
  // Chamada de função como comando (`nome(args);`).
  | (JSStatementCommon & { type: 'callFunction'; name: string; args: JSExpr[] })
  // Para cada item (com posição opcional) de uma lista (`arr.forEach((item, i) => {…})`).
  | (JSStatementCommon & {
      type: 'forEach'
      arrayVar: string
      itemName: string
      indexName?: string
      body: JSStatement[]
    })
  // Executar depois de um tempo (`setTimeout(() => {…}, ms)`).
  | (JSStatementCommon & { type: 'setTimeout'; delay: JSExpr; body: JSStatement[] })
  // Repetir a cada intervalo de tempo (`setInterval(() => {…}, ms)`).
  | (JSStatementCommon & { type: 'setInterval'; delay: JSExpr; body: JSStatement[] })
  // Versões em SEGUNDOS: geram `setTimeout/Interval(() => {…}, <delay> * 1000)`.
  // `delay` = segundos; o `* 1000` no código é o que distingue do ms no round-trip.
  | (JSStatementCommon & { type: 'setTimeoutSeconds'; delay: JSExpr; body: JSStatement[] })
  | (JSStatementCommon & { type: 'setIntervalSeconds'; delay: JSExpr; body: JSStatement[] })
  // Escape hatch
  | (JSStatementCommon & { type: 'rawJS'; code: string; advanced: true })

export const JSStatementSchema: z.ZodType<JSStatement> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('var'),
      name: irText(),
      value: JSExprSchema,
      kind: z.enum(['let', 'const']).optional(),
      ...idField,
    }),
    z.object({ type: z.literal('declareVar'), name: irText(), ...idField }),
    z.object({ type: z.literal('assign'), name: irText(), value: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('if'),
      cond: JSExprSchema,
      then: z.array(JSStatementSchema),
      else: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('repeat'),
      times: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('while'),
      cond: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('doWhile'),
      cond: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('break'), ...idField }),
    z.object({ type: z.literal('continue'), ...idField }),
    z.object({
      type: z.literal('forOf'),
      itemName: irText(),
      iterableVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('forRange'),
      varName: irText(),
      from: JSExprSchema,
      to: JSExprSchema,
      step: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('tryCatch'),
      body: z.array(JSStatementSchema),
      errorName: irText().optional(),
      handler: z.array(JSStatementSchema),
      finalizer: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('fetchJson'),
      url: JSExprSchema,
      okName: irText(),
      body: z.array(JSStatementSchema),
      catchName: irText().optional(),
      catchBody: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('event'),
      target: irText(),
      targetKind: z.enum(['id', 'var', 'document', 'window']).optional(),
      event: eventKindSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('consoleLog'), value: JSExprSchema, ...idField }),
    z.object({ type: z.literal('alert'), value: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('setText'),
      targetId: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setProperty'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      property: z.enum(['textContent', 'value', 'innerHTML']),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('getProperty'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      property: z.enum(['textContent', 'value', 'innerHTML']),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('setStyle'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      property: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setAttribute'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('createElement'),
      tag: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('createElementNS'),
      tag: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('getAttribute'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      name: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('appendChild'),
      parentVar: irText(),
      childVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('throwError'), message: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('objectAssign'),
      targetVar: irText(),
      sourceVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('switch'),
      subject: JSExprSchema,
      cases: z.array(z.object({ match: JSExprSchema, body: z.array(JSStatementSchema) })),
      default: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({ type: z.literal('requestFullscreen'), ...idField }),
    z.object({ type: z.literal('exitFullscreen'), ...idField }),
    z.object({ type: z.literal('toggleFullscreen'), ...idField }),
    z.object({
      type: z.literal('setDataset'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      key: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('querySelector'),
      selector: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('querySelectorAll'),
      selector: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('storageSet'),
      store: z.enum(['local', 'session']),
      key: JSExprSchema,
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('eventMethod'),
      method: z.enum(['preventDefault', 'stopPropagation']),
      ...idField,
    }),
    z.object({
      type: z.literal('getElementById'),
      id: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('classOp'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      op: z.enum(['add', 'remove', 'toggle']),
      className: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasSetup'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasSetSize'),
      ctxVar: irText(),
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasClear'),
      ctxVar: irText(),
      canvasVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFillStyle'),
      ctxVar: irText(),
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFillRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasArc'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      r: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFillText'),
      ctxVar: irText(),
      text: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasStrokeRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasClearRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasRoundRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      r: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasEllipse'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      rx: JSExprSchema,
      ry: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasArcSlice'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      r: JSExprSchema,
      start: JSExprSchema,
      end: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasQuadraticCurve'),
      ctxVar: irText(),
      cpx: JSExprSchema,
      cpy: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasBezierCurve'),
      ctxVar: irText(),
      cp1x: JSExprSchema,
      cp1y: JSExprSchema,
      cp2x: JSExprSchema,
      cp2y: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasArcTo'),
      ctxVar: irText(),
      x1: JSExprSchema,
      y1: JSExprSchema,
      x2: JSExprSchema,
      y2: JSExprSchema,
      r: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasShadow'),
      ctxVar: irText(),
      color: JSExprSchema,
      blur: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasStrokeText'),
      ctxVar: irText(),
      text: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasLineDash'),
      ctxVar: irText(),
      segment: JSExprSchema,
      ...idField,
    }),

    z.object({
      type: z.literal('animationLoop'),
      body: z.array(JSStatementSchema),
      handle: irText().optional(),
      timeVar: irText().optional(),
      deltaVar: irText().optional(),
      ...idField,
    }),
    z.object({ type: z.literal('cancelAnimationFrame'), handle: JSExprSchema, ...idField }),
    z.object({ type: z.literal('keyboardSimple'), varName: irText(), ...idField }),
    z.object({
      type: z.literal('arrayPush'),
      arrayVar: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('arraySplice'),
      arrayVar: irText(),
      start: JSExprSchema,
      count: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('arrayRemove'),
      arrayVar: irText(),
      end: z.enum(['pop', 'shift']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasDrawImage'),
      ctxVar: irText(),
      src: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('canvasSave'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasRestore'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('canvasTranslate'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasRotate'),
      ctxVar: irText(),
      angle: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasScale'),
      ctxVar: irText(),
      sx: JSExprSchema,
      sy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasGradient'),
      ctxVar: irText(),
      varName: irText(),
      x0: JSExprSchema,
      y0: JSExprSchema,
      x1: JSExprSchema,
      y1: JSExprSchema,
      stops: z.array(z.object({ offset: z.number(), color: irText() })),
      ...idField,
    }),
    z.object({ type: z.literal('canvasBeginPath'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasClosePath'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasStroke'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasFill'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('canvasMoveTo'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasLineTo'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('canvasClip'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('canvasStrokeStyle'),
      ctxVar: irText(),
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasLineWidth'),
      ctxVar: irText(),
      width: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasGlobalAlpha'),
      ctxVar: irText(),
      alpha: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFont'),
      ctxVar: irText(),
      weight: z.enum(['bold', 'italic', 'italic bold']).optional(),
      size: z.number(),
      family: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasTextAlign'),
      ctxVar: irText(),
      align: z.enum(['left', 'center', 'right']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasTextBaseline'),
      ctxVar: irText(),
      baseline: z.enum(['top', 'middle', 'bottom', 'alphabetic']),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createSprite'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawSprite'),
      spriteVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setPosition'),
      spriteVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setVelocity'),
      spriteVar: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:collides'),
      aVar: irText(),
      bVar: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:score'),
      varName: irText(),
      initial: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:gameOver'),
      ctxVar: irText(),
      text: z.union([JSExprSchema, irText()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:clear'), ...idField }),
    z.object({
      type: z.literal('g2d:onKey'),
      key: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onOverlap'),
      aVar: irText(),
      bVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setGravity'),
      value: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:applyVelocity'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:bounceOnEdges'),
      spriteVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:circleCollides'),
      aVar: irText(),
      bVar: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playSound'),
      freq: z.number(),
      durationMs: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playFx'),
      fx: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playMusic'),
      tune: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:stopMusic'),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playNote'),
      note: z.string(),
      ms: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:aimAt'),
      spriteVar: irText(),
      targetVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:moveToward'),
      spriteVar: irText(),
      targetVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setHealth'),
      spriteVar: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:changeHealth'),
      spriteVar: irText(),
      delta: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:flipSprite'),
      spriteVar: irText(),
      dir: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setOpacity'),
      spriteVar: irText(),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setSize'),
      spriteVar: irText(),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:scaleSprite'),
      spriteVar: irText(),
      factor: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:wrapEdges'),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:pruneOld'),
      groupVar: irText(),
      seconds: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:pauseGame'), ...idField }),
    z.object({ type: z.literal('g2d:resumeGame'), ...idField }),
    z.object({
      type: z.literal('g2d:cameraFollow'),
      spriteVar: irText(),
      worldW: z.union([JSExprSchema, z.number()]),
      worldH: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setCamera'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:breakTile'),
      mapVar: irText(),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setTile'),
      mapVar: irText(),
      index: z.number(),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:bringToFront'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:sendToBack'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:drawHitbox'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:showFps'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onPointer'),
      xName: irText(),
      yName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createImageSprite'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      image: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setImage'),
      spriteVar: irText(),
      image: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:loadSpritesheet'),
      varName: irText(),
      image: irText(),
      frameW: z.number(),
      frameH: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:animateSprite'),
      spriteVar: irText(),
      sheetVar: irText(),
      from: z.number(),
      to: z.number(),
      fps: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawFrame'),
      sheetVar: irText(),
      ctxVar: irText(),
      index: z.number(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:platformer'),
      spriteVar: irText(),
      ctxVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:topDown'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:followPointer'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:clampToScreen'),
      spriteVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:flash'), color: irText(), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:shake'),
      ctxVar: irText(),
      intensity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:emitParticles'),
      count: z.union([JSExprSchema, z.number()]),
      color: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:drawParticles'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:createTileMap'),
      varName: irText(),
      image: irText(),
      tile: z.number(),
      solid: irText(),
      grid: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawTileMap'),
      mapVar: irText(),
      ctxVar: irText(),
      x: z.number(),
      y: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:tileMapCollide'),
      spriteVar: irText(),
      mapVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:createGroup'), varName: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:spawnInGroup'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: z.number(),
      h: z.number(),
      color: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnImageInGroup'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: z.number(),
      h: z.number(),
      image: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g2d:updateGroup'), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:drawGroup'),
      groupVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:forEachInGroup'),
      groupVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:clearGroup'), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:pruneOffscreen'),
      groupVar: irText(),
      ctxVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onGroupOverlap'),
      aGroup: irText(),
      aName: irText(),
      bGroup: irText(),
      bName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:removeFromGroup'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:everyFrames'),
      n: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:everySeconds'),
      seconds: z.number(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawScore'),
      ctxVar: irText(),
      label: irText(),
      value: JSExprSchema,
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      color: irText(),
      size: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawLabel'),
      ctxVar: irText(),
      text: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      color: irText(),
      size: z.union([JSExprSchema, z.number()]),
      align: z.enum(['left', 'center', 'right']),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawHearts'),
      ctxVar: irText(),
      count: JSExprSchema,
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawBar'),
      ctxVar: irText(),
      value: JSExprSchema,
      max: JSExprSchema,
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:setScene'), name: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:showScreen'),
      ctxVar: irText(),
      title: z.union([JSExprSchema, irText()]),
      subtitle: z.union([JSExprSchema, irText()]),
      hint: z.union([JSExprSchema, irText()]),
      bg: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:restart'), ...idField }),
    z.object({
      type: z.literal('g2d:starfield'),
      ctxVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:dragX'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:fitScreen'), percent: z.number(), ...idField }),
    z.object({
      type: z.literal('g2d:setupStage'),
      width: z.number(),
      height: z.number(),
      bg: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnBullet'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      radius: z.number(),
      color: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:arrowsX'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:blinkSprite'),
      spriteVar: irText(),
      frames: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createShip'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      bodyColor: irText(),
      wingColor: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnAsteroid'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      size: z.number(),
      color: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g2d:explode'), spriteVar: irText(), color: irText(), ...idField }),
    z.object({ type: z.literal('g2d:playShoot'), ...idField }),
    z.object({ type: z.literal('g2d:playExplosion'), ...idField }),
    z.object({
      type: z.literal('g2d:onSpriteGroupOverlap'),
      spriteVar: irText(),
      groupVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:steerThrust'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      turn: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:rotateSprite'),
      spriteVar: irText(),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:pointSprite'),
      spriteVar: irText(),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:thrust'),
      spriteVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:applyFriction'),
      spriteVar: irText(),
      factor: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:shootFrom'),
      spriteVar: irText(),
      groupVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnAsteroidEdge'),
      groupVar: irText(),
      size: z.number(),
      color: irText(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:jumpOnGround'),
      spriteVar: irText(),
      ctxVar: irText(),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createDino'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createStickHero'),
      varName: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:updateStickHero'), gameVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:restartStickHero'), gameVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:createBalloon'),
      varName: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:updateBalloon'), gameVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:restartBalloon'), gameVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:controlDino'),
      spriteVar: irText(),
      ctxVar: irText(),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnObstacle'),
      groupVar: irText(),
      ctxVar: irText(),
      shape: irText(),
      x: JSExprSchema,
      size: z.number(),
      vx: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnEgg'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      vx: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:forest'),
      ctxVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:playJump'), ...idField }),
    z.object({ type: z.literal('g2d:playDinoHurt'), ...idField }),
    z.object({ type: z.literal('g2d:playCollect'), ...idField }),
    z.object({ type: z.literal('g2d:createCity'), varName: irText(), ...idField }),
    z.object({ type: z.literal('g2d:drawCity'), cityVar: irText(), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:placeThrower'),
      varName: irText(),
      cityVar: irText(),
      side: z.enum(['left', 'right']),
      color: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:newWind'), cityVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:drawWind'), cityVar: irText(), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:aimDrag'),
      throwerVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:throwBanana'),
      throwerVar: irText(),
      cityVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:updateBanana'), cityVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:drawBanana'),
      cityVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:playWhistle'), ...idField }),
    z.object({ type: z.literal('g2d:playBoom'), ...idField }),
    z.object({
      type: z.literal('g2d:computerTurn'),
      throwerVar: irText(),
      cityVar: irText(),
      enemyVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:drawAimReadout'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createFullscreenScene'),
      varName: irText(),
      bg: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setBackground'),
      worldVar: irText(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setCameraPosition'),
      worldVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createBox'),
      varName: irText(),
      worldVar: irText(),
      size: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createSphere'),
      varName: irText(),
      worldVar: irText(),
      radius: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setPosition'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setRotation'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:animate'),
      worldVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createBlock'),
      varName: irText(),
      worldVar: irText(),
      width: z.number(),
      height: z.number(),
      depth: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setVelocity'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g3d:jump'), objVar: irText(), force: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('g3d:applyGravity'),
      objVar: irText(),
      groundVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:controlWithKeys'),
      objVar: irText(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setScale'),
      objVar: irText(),
      factor: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:cameraFollow'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:createGroup'), varName: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:runEnemies'),
      worldVar: irText(),
      groupVar: irText(),
      groundVar: irText(),
      every: z.number(),
      speed: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:stop'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createCrossingScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createCrosser'),
      varName: irText(),
      worldVar: irText(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:crosserMove'),
      objVar: irText(),
      direction: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:crosserStep'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:crosserReset'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:gridPosition'),
      objVar: irText(),
      row: JSExprSchema,
      col: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addRow'),
      worldVar: irText(),
      rowIndex: JSExprSchema,
      kind: irText(),
      direction: irText(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:generateRows'),
      worldVar: irText(),
      count: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:moveTraffic'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:isometricCamera'),
      worldVar: irText(),
      followVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:gridStep'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:gridMove'),
      objVar: irText(),
      direction: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveAcross'),
      groupVar: irText(),
      speed: z.number(),
      min: z.number(),
      max: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:topCamera'),
      worldVar: irText(),
      followVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveInCircle'),
      objVar: irText(),
      radius: z.number(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createRaceScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:createRaceTrack'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createRaceCar'),
      varName: irText(),
      worldVar: irText(),
      color: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:raceStep'), objVar: irText(), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:raceControl'), objVar: irText(), mode: irText(), ...idField }),
    z.object({ type: z.literal('g3d:runRivals'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:raceReset'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:fall'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:slideBetween'),
      objVar: irText(),
      axis: irText(),
      min: z.number(),
      max: z.number(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:spin'),
      objVar: irText(),
      axis: irText(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createStackScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:createStackTower'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackDrop'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackStep'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackReset'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:moveBy'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:rotateBy'),
      objVar: irText(),
      axis: irText(),
      amount: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveTowards'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      factor: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:lookAtObject'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:lookAtPoint'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveForward'),
      objVar: irText(),
      dist: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g3d:faceVelocity'), objVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:body'), objVar: irText(), gravity: z.number(), ...idField }),
    z.object({ type: z.literal('g3d:stepBody'), objVar: irText(), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:setSolid'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:platformerControls'),
      objVar: irText(),
      worldVar: irText(),
      speed: z.number(),
      jump: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:fpsControls'),
      objVar: irText(),
      worldVar: irText(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:resolveCollision'),
      aVar: irText(),
      bVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:fpsCamera'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:orbitCamera'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:thirdPersonCamera'),
      worldVar: irText(),
      objVar: irText(),
      dist: z.number(),
      height: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:cameraLookAt'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:setFOV'), worldVar: irText(), deg: z.number(), ...idField }),
    z.object({
      type: z.literal('g3d:createCylinder'),
      varName: irText(),
      worldVar: irText(),
      radius: z.number(),
      height: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createCone'),
      varName: irText(),
      worldVar: irText(),
      radius: z.number(),
      height: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createPlane'),
      varName: irText(),
      worldVar: irText(),
      width: z.number(),
      depth: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createTorus'),
      varName: irText(),
      worldVar: irText(),
      radius: z.number(),
      tube: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createModel'),
      varName: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:setColor'), objVar: irText(), color: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:setOpacity'),
      objVar: irText(),
      opacity: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:setMaterial'), objVar: irText(), kind: irText(), ...idField }),
    z.object({ type: z.literal('g3d:setTexture'), objVar: irText(), asset: irText(), ...idField }),
    z.object({ type: z.literal('g3d:setVisible'), objVar: irText(), mode: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:removeObject'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addToModel'),
      modelVar: irText(),
      partVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addAmbientLight'),
      worldVar: irText(),
      color: irText(),
      intensity: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addSunLight'),
      worldVar: irText(),
      color: irText(),
      intensity: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addPointLight'),
      worldVar: irText(),
      color: irText(),
      intensity: z.number(),
      x: z.number(),
      y: z.number(),
      z: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setFog'),
      worldVar: irText(),
      color: irText(),
      near: z.number(),
      far: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setSky'),
      worldVar: irText(),
      top: irText(),
      bottom: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:setShadows'), worldVar: irText(), mode: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createSwarm'),
      varName: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:spawnInSwarm'),
      swarmVar: irText(),
      originalVar: irText(),
      x: z.number(),
      y: z.number(),
      z: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:forEachInSwarm'),
      swarmVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:removeFromSwarm'),
      swarmVar: irText(),
      itemVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:pruneSwarm'),
      swarmVar: irText(),
      axis: irText(),
      min: z.number(),
      max: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:playNote'), freq: z.number(), ms: z.number(), ...idField }),
    z.object({ type: z.literal('g3d:playEffect'), kind: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:updateEachFrame'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('classDecl'),
      name: irText(),
      superClass: irText().optional(),
      ctorParams: z.array(irText()).optional(),
      ctorId: z.string().optional(),
      ctorBody: z.array(JSStatementSchema),
      methods: z.array(
        z.object({
          __id: z.string().optional(),
          name: irText(),
          params: z.array(irText()),
          body: z.array(JSStatementSchema),
        }),
      ),
      ...idField,
    }),
    z.object({
      type: z.literal('newInstance'),
      varName: irText(),
      className: irText(),
      args: z.array(JSExprSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('callMethod'),
      objectVar: irText(),
      method: irText(),
      args: z.array(JSExprSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('eventHandler'),
      target: irText(),
      targetKind: z.enum(['id', 'var', 'document', 'window']).optional(),
      event: eventKindSchema,
      handlerName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('setThisProp'),
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setProp'),
      objectVar: irText(),
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('memberSet'),
      object: JSExprSchema,
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('memberCall'),
      object: JSExprSchema,
      method: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('return'),
      value: JSExprSchema.optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('funcDecl'),
      name: irText(),
      params: z.array(irText()),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('callFunction'),
      name: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('forEach'),
      arrayVar: irText(),
      itemName: irText(),
      indexName: irText().optional(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('setTimeout'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('setInterval'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('setTimeoutSeconds'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('setIntervalSeconds'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('rawJS'),
      code: irText(),
      advanced: z.literal(true),
      ...idField,
    }),
  ]),
)

// ---------- Extension usage ----------

export interface ExtensionUsage {
  extensionId: string
}

export const ExtensionUsageSchema = z.object({ extensionId: irText() })

// ---------- HTML document shell ----------

/**
 * Onde o CSS/JS canônico vive no documento gerado:
 * - `external` (padrão): arquivo `style.css`/`script.js` + `<link>`/`<script src>`.
 * - `inline-head`: `<style>`/`<script>` no fim do `<head>`.
 * - `inline-body-end`: `<style>`/`<script>` antes de `</body>`.
 *
 * Preserva o caso "tudo num único index.html": o conteúdo inline é extraído
 * para blocos (em `css`/`js`) e a geração o devolve ao mesmo lugar.
 */
export type AssetPlacement = 'external' | 'inline-head' | 'inline-body-end'

export const AssetPlacementSchema = z.enum(['external', 'inline-head', 'inline-body-end'])

/**
 * "Casca" do documento HTML que os blocos não representam (doctype, atributos
 * de `<html>` e o conteúdo de `<head>`). Preservada verbatim no round-trip
 * código↔blocos para que o aluno nunca perca title/meta/links customizados.
 */
export interface HTMLShell {
  /** Ex.: `<!doctype html>`. */
  doctype?: string
  /** Atributos do elemento `<html>`, ex.: ` lang="pt-BR"`. */
  htmlAttrs?: string
  /** Conteúdo interno de `<head>`, verbatim. */
  head?: string
  /** Posição do CSS canônico no documento. Ausente ⇒ `external`. */
  cssPlacement?: AssetPlacement
  /** Posição do JS canônico no documento. Ausente ⇒ `external`. */
  jsPlacement?: AssetPlacement
  /**
   * Se o `<script>` inline original era `type="module"`. Quando ausente/false,
   * o script inline é re-emitido como CLÁSSICO — preserva funções globais e
   * handlers `onclick="..."`. Só relevante quando `jsPlacement` é inline.
   */
  jsModule?: boolean
}

export const HTMLShellSchema = z.object({
  doctype: irText().optional(),
  htmlAttrs: irText().optional(),
  head: irText().optional(),
  cssPlacement: AssetPlacementSchema.optional(),
  jsPlacement: AssetPlacementSchema.optional(),
  jsModule: z.boolean().optional(),
})

// ---------- Top-level SZ-IR ----------

export interface SZIR {
  html: HTMLNode[]
  css: CSSEntry[]
  js: JSStatement[]
  extensions: ExtensionUsage[]
  /** Casca do documento HTML preservada do código (head/doctype). */
  htmlShell?: HTMLShell
}

export const SZIRSchema = z.object({
  html: z.array(HTMLNodeSchema),
  css: z.array(CSSEntrySchema),
  js: z.array(JSStatementSchema),
  extensions: z.array(ExtensionUsageSchema),
  htmlShell: HTMLShellSchema.optional(),
})

export function isAdvancedHTML(node: HTMLNode): node is Extract<HTMLNode, { type: 'rawHTML' }> {
  return node.type === 'rawHTML'
}

export function isAdvancedCSS(entry: CSSEntry): entry is RawCSS {
  return (entry as RawCSS).type === 'rawCSS'
}

export function isAdvancedJS(stmt: JSStatement): stmt is Extract<JSStatement, { type: 'rawJS' }> {
  return stmt.type === 'rawJS'
}

export const G2D_STATEMENT_TYPES = new Set([
  'g2d:createSprite',
  'g2d:drawSprite',
  'g2d:setPosition',
  'g2d:setVelocity',
  'g2d:collides',
  'g2d:score',
  'g2d:gameOver',
  'g2d:updateEachFrame',
  'g2d:setGravity',
  'g2d:applyVelocity',
  'g2d:bounceOnEdges',
  'g2d:circleCollides',
  'g2d:playSound',
  'g2d:playFx',
  'g2d:playMusic',
  'g2d:stopMusic',
  'g2d:playNote',
  'g2d:aimAt',
  'g2d:moveToward',
  'g2d:setHealth',
  'g2d:changeHealth',
  'g2d:flipSprite',
  'g2d:setOpacity',
  'g2d:setSize',
  'g2d:scaleSprite',
  'g2d:wrapEdges',
  'g2d:pruneOld',
  'g2d:pauseGame',
  'g2d:resumeGame',
  'g2d:cameraFollow',
  'g2d:setCamera',
  'g2d:breakTile',
  'g2d:setTile',
  'g2d:bringToFront',
  'g2d:sendToBack',
  'g2d:drawHitbox',
  'g2d:showFps',
  'g2d:onPointer',
  'g2d:createImageSprite',
  'g2d:setImage',
  'g2d:loadSpritesheet',
  'g2d:animateSprite',
  'g2d:drawFrame',
  'g2d:platformer',
  'g2d:topDown',
  'g2d:followPointer',
  'g2d:clampToScreen',
  'g2d:flash',
  'g2d:shake',
  'g2d:emitParticles',
  'g2d:drawParticles',
  'g2d:createTileMap',
  'g2d:drawTileMap',
  'g2d:tileMapCollide',
  'g2d:createGroup',
  'g2d:spawnInGroup',
  'g2d:spawnImageInGroup',
  'g2d:updateGroup',
  'g2d:drawGroup',
  'g2d:forEachInGroup',
  'g2d:clearGroup',
  'g2d:pruneOffscreen',
  'g2d:onGroupOverlap',
  'g2d:removeFromGroup',
  'g2d:everyFrames',
  'g2d:everySeconds',
  'g2d:drawScore',
  'g2d:drawLabel',
  'g2d:drawHearts',
  'g2d:drawBar',
  'g2d:setScene',
  'g2d:showScreen',
  'g2d:restart',
  'g2d:starfield',
  'g2d:dragX',
  'g2d:fitScreen',
  'g2d:setupStage',
  'g2d:spawnBullet',
  'g2d:arrowsX',
  'g2d:blinkSprite',
  'g2d:createShip',
  'g2d:spawnAsteroid',
  'g2d:explode',
  'g2d:playShoot',
  'g2d:playExplosion',
  'g2d:onSpriteGroupOverlap',
  'g2d:steerThrust',
  'g2d:rotateSprite',
  'g2d:pointSprite',
  'g2d:thrust',
  'g2d:applyFriction',
  'g2d:shootFrom',
  'g2d:spawnAsteroidEdge',
  'g2d:jumpOnGround',
  'g2d:createDino',
  'g2d:controlDino',
  'g2d:spawnObstacle',
  'g2d:spawnEgg',
  'g2d:forest',
  'g2d:playJump',
  'g2d:playDinoHurt',
  'g2d:playCollect',
  'g2d:createCity',
  'g2d:drawCity',
  'g2d:placeThrower',
  'g2d:newWind',
  'g2d:drawWind',
  'g2d:aimDrag',
  'g2d:throwBanana',
  'g2d:updateBanana',
  'g2d:drawBanana',
  'g2d:playWhistle',
  'g2d:playBoom',
  'g2d:computerTurn',
  'g2d:drawAimReadout',
  'g2d:createStickHero',
  'g2d:updateStickHero',
  'g2d:restartStickHero',
  'g2d:createBalloon',
  'g2d:updateBalloon',
  'g2d:restartBalloon',
])

export const G3D_STATEMENT_TYPES = new Set([
  'g3d:createScene',
  'g3d:createFullscreenScene',
  'g3d:setBackground',
  'g3d:setCameraPosition',
  'g3d:createBox',
  'g3d:createSphere',
  'g3d:setPosition',
  'g3d:setRotation',
  'g3d:animate',
  'g3d:createBlock',
  'g3d:setVelocity',
  'g3d:jump',
  'g3d:applyGravity',
  'g3d:controlWithKeys',
  'g3d:setScale',
  'g3d:cameraFollow',
  'g3d:createGroup',
  'g3d:runEnemies',
  'g3d:stop',
  'g3d:createCrossingScene',
  'g3d:createCrosser',
  'g3d:crosserMove',
  'g3d:crosserStep',
  'g3d:crosserReset',
  'g3d:gridPosition',
  'g3d:addRow',
  'g3d:generateRows',
  'g3d:moveTraffic',
  'g3d:isometricCamera',
  'g3d:gridStep',
  'g3d:gridMove',
  'g3d:moveAcross',
  'g3d:topCamera',
  'g3d:moveInCircle',
  'g3d:createRaceScene',
  'g3d:createRaceTrack',
  'g3d:createRaceCar',
  'g3d:raceStep',
  'g3d:raceControl',
  'g3d:runRivals',
  'g3d:raceReset',
  'g3d:fall',
  'g3d:slideBetween',
  'g3d:spin',
  'g3d:createStackScene',
  'g3d:createStackTower',
  'g3d:stackDrop',
  'g3d:stackStep',
  'g3d:stackReset',
  'g3d:moveBy',
  'g3d:rotateBy',
  'g3d:moveTowards',
  'g3d:lookAtObject',
  'g3d:lookAtPoint',
  'g3d:moveForward',
  'g3d:faceVelocity',
  'g3d:body',
  'g3d:stepBody',
  'g3d:setSolid',
  'g3d:platformerControls',
  'g3d:fpsControls',
  'g3d:resolveCollision',
  'g3d:fpsCamera',
  'g3d:orbitCamera',
  'g3d:thirdPersonCamera',
  'g3d:cameraLookAt',
  'g3d:setFOV',
  'g3d:createCylinder',
  'g3d:createCone',
  'g3d:createPlane',
  'g3d:createTorus',
  'g3d:createModel',
  'g3d:setColor',
  'g3d:setOpacity',
  'g3d:setMaterial',
  'g3d:setTexture',
  'g3d:setVisible',
  'g3d:removeObject',
  'g3d:addToModel',
  'g3d:addAmbientLight',
  'g3d:addSunLight',
  'g3d:addPointLight',
  'g3d:setFog',
  'g3d:setSky',
  'g3d:setShadows',
  'g3d:createSwarm',
  'g3d:spawnInSwarm',
  'g3d:forEachInSwarm',
  'g3d:removeFromSwarm',
  'g3d:pruneSwarm',
  'g3d:playNote',
  'g3d:playEffect',
])

export function statementIsExtension(stmt: JSStatement, extensionId: string): boolean {
  if (extensionId === 'game-2d') return stmt.type.startsWith('g2d:')
  if (extensionId === 'game-3d') return stmt.type.startsWith('g3d:')
  return false
}
