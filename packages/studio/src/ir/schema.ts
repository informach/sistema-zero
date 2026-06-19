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

const jsExprBase = z.union([
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
  // Operador ternário (`condição ? seVerdadeiro : seFalso`).
  | (JSExprCommon & {
      type: 'ternary'
      condition: JSExpr
      whenTrue: JSExpr
      whenFalse: JSExpr
    })
  | (JSExprCommon & { type: 'call'; name: string; args: JSExpr[] })
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
  // Propriedade do evento dentro de um listener (event.clientX / event.clientY).
  | (JSExprCommon & { type: 'eventProp'; prop: 'clientX' | 'clientY' })
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
  z.union([
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
    z.object({ type: z.literal('eventProp'), prop: z.enum(['clientX', 'clientY']), ...idField }),
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
  | (HTMLNodeCommon & { type: 'canvas'; id: string; width?: number; height?: number })
  // Pedaço de texto solto que vive dentro das `children` de uma tag inline/
  // container — permite que `<p>© <span></span> texto</p>` (conteúdo misto)
  // vire blocos aninhados em vez de "código avançado".
  | (HTMLNodeCommon & { type: 'text'; text: string })
  | (HTMLNodeCommon & { type: 'rawHTML'; html: string; advanced: true })

export const HTMLNodeSchema: z.ZodType<HTMLNode> = z.lazy(() =>
  z.union([
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
  feature: 'max-width' | 'min-width'
  px: number
  rules: CSSEntry[]
  __id?: string
}

export const MediaQueryCSSSchema: z.ZodType<MediaQueryCSS> = z.object({
  type: z.literal('mediaQuery'),
  feature: z.enum(['max-width', 'min-width']),
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

export type CSSEntry = CSSRule | RawCSS | MediaQueryCSS | KeyframesCSS

export const CSSEntrySchema: z.ZodType<CSSEntry> = z.union([
  CSSRuleSchema,
  RawCSSSchema,
  MediaQueryCSSSchema,
  KeyframesCSSSchema,
])

// ---------- JS Statements ----------

const eventKindSchema = z.enum([
  'click',
  'keydown',
  'keyup',
  'mouseover',
  'mouseout',
  'submit',
  'input',
  'change',
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
      targetKind?: 'id' | 'var' | 'document'
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
      targetKind?: 'id' | 'var' | 'document'
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
  // Escape hatch
  | (JSStatementCommon & { type: 'rawJS'; code: string; advanced: true })

export const JSStatementSchema: z.ZodType<JSStatement> = z.lazy(() =>
  z.union([
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
      targetKind: z.enum(['id', 'var', 'document']).optional(),
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
      targetKind: z.enum(['id', 'var', 'document']).optional(),
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
])

export function statementIsExtension(stmt: JSStatement, extensionId: string): boolean {
  if (extensionId === 'game-2d') return stmt.type.startsWith('g2d:')
  if (extensionId === 'game-3d') return stmt.type.startsWith('g3d:')
  return false
}
