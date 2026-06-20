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
  // Game 2D — a cena/tela atual é "name"? (valor booleano).
  | (JSExprCommon & { type: 'g2d:sceneIs'; name: string })
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
      arg: JSExpr
    })
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
  // Largura/altura da viewport (window.innerWidth / window.innerHeight).
  | (JSExprCommon & { type: 'global'; kind: 'innerWidth' | 'innerHeight' })
  // Largura/altura do elemento canvas associado a um contexto (canvas.width).
  | (JSExprCommon & { type: 'canvasDim'; ctxVar: string; dim: 'width' | 'height' })
  | (JSExprCommon & { type: 'canvasMeasureText'; ctxVar: string; text: JSExpr })
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
    z.object({ type: z.literal('g2d:sceneIs'), name: irText(), ...idField }),
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
    z.object({ type: z.literal('inputKeyPressed'), key: irText(), ...idField }),
    z.object({ type: z.literal('inputPointer'), axis: z.enum(['x', 'y']), ...idField }),
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
      ]),
      arg: JSExprSchema,
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
      type: z.literal('global'),
      kind: z.enum(['innerWidth', 'innerHeight']),
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
  'submit',
  'input',
  'change',
  'load',
  'resize',
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
  // Cria um elemento e guarda numa variável (`const x = document.createElement('div')`).
  | (JSStatementCommon & { type: 'createElement'; tag: string; varName: string })
  // Adiciona um elemento dentro de outro (`pai.appendChild(filho)`).
  | (JSStatementCommon & { type: 'appendChild'; parentVar: string; childVar: string })
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
  | (JSStatementCommon & { type: 'animationLoop'; body: JSStatement[]; handle?: string })
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
  // Game 2D extension
  | (JSStatementCommon & {
      type: 'g2d:createSprite'
      varName: string
      x: number
      y: number
      w: number
      h: number
      color: string
    })
  | (JSStatementCommon & { type: 'g2d:drawSprite'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:setPosition'; spriteVar: string; x: JSExpr; y: JSExpr })
  | (JSStatementCommon & { type: 'g2d:setVelocity'; spriteVar: string; vx: JSExpr; vy: JSExpr })
  | (JSStatementCommon & { type: 'g2d:collides'; aVar: string; bVar: string; varName: string })
  | (JSStatementCommon & { type: 'g2d:score'; varName: string; initial: number })
  | (JSStatementCommon & { type: 'g2d:gameOver'; ctxVar: string; text: string })
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
  | (JSStatementCommon & { type: 'g2d:setGravity'; value: number })
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
      x: number
      y: number
      w: number
      h: number
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
      speed: number
      jump: number
    })
  | (JSStatementCommon & { type: 'g2d:topDown'; spriteVar: string; speed: number })
  | (JSStatementCommon & { type: 'g2d:followPointer'; spriteVar: string; speed: number })
  | (JSStatementCommon & { type: 'g2d:clampToScreen'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:flash'; color: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:shake'; ctxVar: string; intensity: number })
  | (JSStatementCommon & {
      type: 'g2d:emitParticles'
      count: number
      color: string
      x: number
      y: number
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
      x: number
      y: number
      color: string
      size: number
    })
  | (JSStatementCommon & {
      type: 'g2d:drawLabel'
      ctxVar: string
      text: string
      x: number
      y: number
      color: string
      size: number
      align: 'left' | 'center' | 'right'
    })
  | (JSStatementCommon & {
      type: 'g2d:drawHearts'
      ctxVar: string
      count: JSExpr
      x: number
      y: number
      size: number
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:drawBar'
      ctxVar: string
      value: JSExpr
      max: JSExpr
      x: number
      y: number
      w: number
      h: number
      color: string
    })
  // Estado/telas (cenas): trocar de tela, overlay de tela cheia e reiniciar.
  | (JSStatementCommon & { type: 'g2d:setScene'; name: string })
  | (JSStatementCommon & {
      type: 'g2d:showScreen'
      ctxVar: string
      title: string
      subtitle: string
      hint: string
      bg: string
    })
  | (JSStatementCommon & { type: 'g2d:restart' })
  // Tela: faz o canvas preencher ~percent% da janela (mantendo a proporção).
  | (JSStatementCommon & { type: 'g2d:fitScreen'; percent: number })
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
  | (JSStatementCommon & { type: 'g2d:arrowsX'; spriteVar: string; speed: number })
  | (JSStatementCommon & { type: 'g2d:blinkSprite'; spriteVar: string; frames: number })
  // Cenário: fundo de estrelas rolando; arrastar a nave com o dedo (eixo X).
  | (JSStatementCommon & { type: 'g2d:starfield'; ctxVar: string; speed: number })
  | (JSStatementCommon & { type: 'g2d:dragX'; spriteVar: string })
  // Kit "Nave & Asteroides" (v0.7.0): desenhos prontos + efeitos + colisão sprite×grupo.
  | (JSStatementCommon & {
      type: 'g2d:createShip'
      varName: string
      x: number
      y: number
      w: number
      h: number
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
      speed: number
      turn: number
    })
  | (JSStatementCommon & { type: 'g2d:rotateSprite'; spriteVar: string; deg: number })
  | (JSStatementCommon & { type: 'g2d:pointSprite'; spriteVar: string; deg: number })
  | (JSStatementCommon & { type: 'g2d:thrust'; spriteVar: string; force: number })
  | (JSStatementCommon & { type: 'g2d:applyFriction'; spriteVar: string; factor: number })
  | (JSStatementCommon & {
      type: 'g2d:shootFrom'
      spriteVar: string
      groupVar: string
      speed: number
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
      jump: number
    })
  | (JSStatementCommon & {
      type: 'g2d:createDino'
      varName: string
      x: number
      y: number
      size: number
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:controlDino'
      spriteVar: string
      ctxVar: string
      jump: number
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
  | (JSStatementCommon & { type: 'g2d:forest'; ctxVar: string; speed: number })
  | (JSStatementCommon & { type: 'g2d:playJump' })
  | (JSStatementCommon & { type: 'g2d:playDinoHurt' })
  | (JSStatementCommon & { type: 'g2d:playCollect' })
  // ---- Game 3D (extensão game-3d, Three.js via window.SZGame3D) ----
  | (JSStatementCommon & { type: 'g3d:createScene'; canvasId: string; varName: string })
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
      type: z.literal('createElement'),
      tag: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('appendChild'),
      parentVar: irText(),
      childVar: irText(),
      ...idField,
    }),
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
      type: z.literal('g2d:createSprite'),
      varName: irText(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
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
      initial: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:gameOver'),
      ctxVar: irText(),
      text: irText(),
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
    z.object({ type: z.literal('g2d:setGravity'), value: z.number(), ...idField }),
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
      type: z.literal('g2d:onPointer'),
      xName: irText(),
      yName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createImageSprite'),
      varName: irText(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
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
      speed: z.number(),
      jump: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:topDown'),
      spriteVar: irText(),
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:followPointer'),
      spriteVar: irText(),
      speed: z.number(),
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
      intensity: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:emitParticles'),
      count: z.number(),
      color: irText(),
      x: z.number(),
      y: z.number(),
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
      x: z.number(),
      y: z.number(),
      color: irText(),
      size: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawLabel'),
      ctxVar: irText(),
      text: irText(),
      x: z.number(),
      y: z.number(),
      color: irText(),
      size: z.number(),
      align: z.enum(['left', 'center', 'right']),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawHearts'),
      ctxVar: irText(),
      count: JSExprSchema,
      x: z.number(),
      y: z.number(),
      size: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawBar'),
      ctxVar: irText(),
      value: JSExprSchema,
      max: JSExprSchema,
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:setScene'), name: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:showScreen'),
      ctxVar: irText(),
      title: irText(),
      subtitle: irText(),
      hint: irText(),
      bg: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:restart'), ...idField }),
    z.object({
      type: z.literal('g2d:starfield'),
      ctxVar: irText(),
      speed: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:dragX'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:fitScreen'), percent: z.number(), ...idField }),
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
      speed: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:blinkSprite'),
      spriteVar: irText(),
      frames: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createShip'),
      varName: irText(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
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
      speed: z.number(),
      turn: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:rotateSprite'),
      spriteVar: irText(),
      deg: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:pointSprite'),
      spriteVar: irText(),
      deg: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:thrust'), spriteVar: irText(), force: z.number(), ...idField }),
    z.object({
      type: z.literal('g2d:applyFriction'),
      spriteVar: irText(),
      factor: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:shootFrom'),
      spriteVar: irText(),
      groupVar: irText(),
      speed: z.number(),
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
      jump: z.number(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createDino'),
      varName: irText(),
      x: z.number(),
      y: z.number(),
      size: z.number(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:controlDino'),
      spriteVar: irText(),
      ctxVar: irText(),
      jump: z.number(),
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
      speed: z.number(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:playJump'), ...idField }),
    z.object({ type: z.literal('g2d:playDinoHurt'), ...idField }),
    z.object({ type: z.literal('g2d:playCollect'), ...idField }),
    z.object({
      type: z.literal('g3d:createScene'),
      canvasId: irText(),
      varName: irText(),
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
    z.object({ type: z.literal('g3d:topCamera'), worldVar: irText(), followVar: irText(), ...idField }),
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
    z.object({ type: z.literal('g3d:raceReset'), objVar: irText(), worldVar: irText(), ...idField }),
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
])

export const G3D_STATEMENT_TYPES = new Set([
  'g3d:createScene',
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
])

export function statementIsExtension(stmt: JSStatement, extensionId: string): boolean {
  if (extensionId === 'game-2d') return stmt.type.startsWith('g2d:')
  if (extensionId === 'game-3d') return stmt.type.startsWith('g3d:')
  return false
}
