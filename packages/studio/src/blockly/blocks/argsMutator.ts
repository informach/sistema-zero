import * as Blockly from 'blockly/core'
import { isWorkspaceLoading } from '../loadFence'
import {
  type BlockScanner,
  classOfInstance,
  constructorParams,
  findClass,
  findFunction,
  methodParams,
} from './classIntrospection'
import { withMutation } from './mutatorEvents'
import { getParamNames } from './paramsMutator'

/**
 * Mutator dos argumentos de `sz_js_new_var` (construtor) e `sz_js_call_method` /
 * `sz_val_call_method` (método, comando ou valor). Tem dois modos:
 *
 *  - AUTO: quando a classe/método é encontrada no workspace, os espaços de valor
 *    se ajustam à assinatura e ganham o RÓTULO de cada parâmetro
 *    (`nome: [..] idade: [..]`). Sem +/−, sem decorar ordem (estilo MakeCode).
 *  - MANUAL: quando não dá para resolver a assinatura, cai nos botões +/− que
 *    criam/removem espaços posicionais.
 *
 * Os rótulos são PURAMENTE cosméticos: a geração de código e o IR usam só os
 * valores posicionais (`ARG0..ARG{n-1}`), então um rótulo desatualizado nunca
 * quebra o código nem o round-trip. A contagem vai no `extraState` (Blockly 11).
 */

const icon = (inner: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15">${inner}</svg>`,
  )}`

const PLUS_ICON = icon(
  '<path d="M7.5 3v9M3 7.5h9" stroke="white" stroke-width="2" stroke-linecap="round"/>',
)
const MINUS_ICON = icon(
  '<path d="M3 7.5h9" stroke="white" stroke-width="2" stroke-linecap="round"/>',
)

const CONTROLS_INPUT = 'SZ_ARGS_CONTROLS'
const MAX_ITEMS = 32

interface ArgsMutatorBlock extends Blockly.Block {
  itemCount_: number
  lastKey_?: string
  prevPreKey_?: string
  syncShape_(event?: Blockly.Events.Abstract | null): void
  preKey_(): string
  rebuild_(sig: string[] | null, opts?: { shadows?: boolean }): void
  resolveSignature_(event?: Blockly.Events.Abstract | null): string[] | null
  plus(): void
  minus(): void
}

/**
 * Varredura de blocos por tipo COALESCIDA por evento. O Blockly despacha O MESMO
 * objeto de evento a TODOS os listeners (cada bloco com `onchange` é um
 * listener), então os M blocos com `sz_args_mutator` resolviam a assinatura
 * fazendo CADA UM a sua varredura O(N) do workspace — O(M·N) por evento. Aqui a
 * varredura por tipo é memorizada na chave do PRÓPRIO evento (WeakMap, coletado
 * junto com o evento), de modo que os M blocos compartilham UMA varredura por
 * tipo: O(N + M) por evento. Sem evento (init do mutator) varre direto.
 *
 * Seguro porque, dentro de um único despacho, nenhum bloco `sz_js_class`/
 * `sz_js_function`/`sz_js_new_var` é criado/removido: `rebuild_` roda com
 * `Blockly.Events.disable()` e só mexe nos INPUTS do próprio bloco (e numa
 * sombra `sz_val_number`, que não é um dos tipos varridos).
 *
 * Os helpers de resolução (`findClass`, `classOfInstance`, `constructorParams`,
 * `methodParams`, `findFunction`) vivem em `classIntrospection.ts` — compartilhados
 * com os seletores de propriedade/método/classe/função.
 */
const signatureScanCache = new WeakMap<Blockly.Events.Abstract, Map<string, Blockly.Block[]>>()

function makeScanner(ws: Blockly.Workspace, event?: Blockly.Events.Abstract | null): BlockScanner {
  if (!event) return (type) => ws.getBlocksByType(type, false)
  let perEvent = signatureScanCache.get(event)
  if (!perEvent) {
    perEvent = new Map()
    signatureScanCache.set(event, perEvent)
  }
  const cache = perEvent
  return (type) => {
    const hit = cache.get(type)
    if (hit) return hit
    const res = ws.getBlocksByType(type, false)
    cache.set(type, res)
    return res
  }
}

/** Cria a sombra padrão (número editável) e conecta no input de valor. */
function attachNumberShadow(block: Blockly.Block, input: Blockly.Input): void {
  const ws = block.workspace
  if (!ws || !input.connection) return
  const shadow = ws.newBlock('sz_val_number')
  shadow.setShadow(true)
  shadow.setFieldValue(0, 'NUM')
  const svg = shadow as unknown as Partial<Blockly.BlockSvg>
  svg.initSvg?.()
  svg.render?.()
  if (shadow.outputConnection) input.connection.connect(shadow.outputConnection)
}

const ARGS_MUTATOR_MIXIN = {
  itemCount_: 0,

  saveExtraState(this: ArgsMutatorBlock): { items: number } | null {
    let count = 0
    while (this.getInput(`ARG${count}`)) count += 1
    return count > 0 ? { items: count } : null
  },

  loadExtraState(this: ArgsMutatorBlock, state: { items?: number } | null): void {
    this.itemCount_ = clampItemCount(state?.items ?? 0)
    // Constrói espaços "crus" a partir da contagem salva (sem criar sombras
    // durante a desserialização). O onchange pós-load resolve assinatura,
    // rótulos, sombras e controles quando a classe já está no workspace.
    this.rebuild_(null, { shadows: false })
    this.lastKey_ = undefined
  },

  /**
   * Chave BARATA derivada APENAS dos campos do próprio bloco — sem varrer o
   * workspace. Se nada que pudesse mudar a assinatura mudou desde o último
   * `onchange`, o scan O(workspace) do `resolveSignature_()` é desnecessário.
   * Inclui o tipo, os campos que escolhem o alvo (classe/objeto/método/função) e
   * a contagem atual de espaços (que muda no +/− manual).
   */
  preKey_(this: ArgsMutatorBlock): string {
    return [
      this.type,
      this.getFieldValue('CLASS') ?? '',
      this.getFieldValue('OBJ') ?? '',
      this.getFieldValue('METHOD') ?? '',
      this.getFieldValue('NAME') ?? '',
      this.itemCount_,
    ].join('\u0000')
  },

  /** Resolve a assinatura (nomes dos parâmetros) ou `null` se não der (modo manual). */
  resolveSignature_(
    this: ArgsMutatorBlock,
    event?: Blockly.Events.Abstract | null,
  ): string[] | null {
    const ws = this.workspace
    if (!ws || this.isInFlyout) return null
    // Compartilha a varredura do workspace com os demais blocos-mutador que
    // respondem AO MESMO evento (coalescing por evento) — ver `makeScanner`.
    const scan = makeScanner(ws, event)
    if (this.type === 'sz_js_new_var') {
      const cls = findClass(scan, this.getFieldValue('CLASS') ?? '')
      return cls ? constructorParams(cls) : null
    }
    if (this.type === 'sz_js_call_method' || this.type === 'sz_val_call_method') {
      const cls = classOfInstance(scan, this.getFieldValue('OBJ') ?? '')
      return cls ? methodParams(cls, this.getFieldValue('METHOD') ?? '') : null
    }
    if (this.type === 'sz_js_call_function' || this.type === 'sz_val_call_function') {
      const fn = findFunction(scan, this.getFieldValue('NAME') ?? '')
      return fn ? getParamNames(fn) : null
    }
    return null
  },

  /** Reconstrói os espaços ARG conforme `sig` (auto, com rótulos) ou contagem manual. */
  rebuild_(this: ArgsMutatorBlock, sig: string[] | null, opts?: { shadows?: boolean }): void {
    const auto = sig !== null
    const withShadows = opts?.shadows !== false

    // Captura os filhos reais (não-sombra) por índice, para preservá-los.
    const saved: Array<Blockly.Block | null> = []
    for (let i = 0; this.getInput(`ARG${i}`); i += 1) {
      const target = this.getInput(`ARG${i}`)?.connection?.targetBlock() ?? null
      saved.push(target && !target.isShadow() ? target : null)
    }

    // Quantos slots o aluno já preencheu com uma expressão de verdade. Se a
    // assinatura encolheu (ex.: o construtor de Pessoa passou de 3 p/ 1 param),
    // NÃO podemos cair em `sig.length` — isso desconectaria os argumentos a mais
    // e o aluno os perderia silenciosamente (buildIR ignora filhos órfãos). Por
    // isso mantemos pelo menos `savedMax` espaços, preservando todos os valores.
    let savedMax = 0
    for (let i = 0; i < saved.length; i += 1) {
      if (saved[i]) savedMax = i + 1
    }
    const autoCount = auto ? Math.min(sig.length, MAX_ITEMS) : this.itemCount_
    const count = auto ? Math.min(Math.max(autoCount, savedMax), MAX_ITEMS) : this.itemCount_

    if (this.getInput(CONTROLS_INPUT)) this.removeInput(CONTROLS_INPUT)
    for (let i = 0; this.getInput(`ARG${i}`); i += 1) {
      const conn = this.getInput(`ARG${i}`)?.connection
      const child = conn?.targetBlock()
      if (child && !child.isShadow()) conn?.disconnect()
      this.removeInput(`ARG${i}`)
    }

    for (let k = 0; k < count; k += 1) {
      const input = this.appendValueInput(`ARG${k}`).setCheck('JSValue')
      if (auto) {
        // Slots dentro da assinatura ganham o rótulo do parâmetro; os
        // excedentes (preservados de uma assinatura que encolheu) caem num
        // rótulo neutro `argN:` — NUNCA renderizamos `undefined:`.
        input.appendField(k < sig.length ? `${sig[k]}:` : `arg${k + 1}:`)
      }
      const child = saved[k]
      if (child && !child.disposed && child.outputConnection) {
        input.connection?.connect(child.outputConnection)
      } else if (withShadows) {
        attachNumberShadow(this, input)
      }
    }

    if (!auto) {
      const controls = this.appendDummyInput(CONTROLS_INPUT)
      controls.appendField(
        new Blockly.FieldImage(PLUS_ICON, 15, 15, '+', () => {
          this.plus()
        }),
      )
      if (this.itemCount_ > 0) {
        controls.appendField(
          new Blockly.FieldImage(MINUS_ICON, 15, 15, '−', () => {
            this.minus()
          }),
        )
      }
    }
    this.itemCount_ = count
  },

  /** Recalcula a forma se a assinatura resolvida (ou a contagem manual) mudou. */
  syncShape_(this: ArgsMutatorBlock, event?: Blockly.Events.Abstract | null): void {
    const sig = this.resolveSignature_(event)
    const key = sig ? `auto:${sig.join('\u0001')}` : `manual:${this.itemCount_}`
    if (key === this.lastKey_) return
    this.lastKey_ = key
    Blockly.Events.disable()
    try {
      this.rebuild_(sig)
    } finally {
      Blockly.Events.enable()
    }
  },

  onchange(this: ArgsMutatorBlock, event?: Blockly.Events.Abstract): void {
    if (!this.workspace || this.isInFlyout) return
    const workspace = this.workspace as Blockly.WorkspaceSvg
    if (typeof workspace.isDragging === 'function' && workspace.isDragging()) return
    // Carga programática em voo: o `load`/`clear` emite N eventos de
    // criação/remoção; processá-los aqui faria CADA um dos M blocos com mutator
    // varrer o workspace — O(N·M) só para abrir o projeto. A assinatura é
    // resolvida UMA vez no `FINISHED_LOADING` final, então ignoramos os eventos
    // intermediários da carga (mas NUNCA o `FINISHED_LOADING`).
    if (isWorkspaceLoading() && event != null && event.type !== Blockly.Events.FINISHED_LOADING) {
      return
    }
    if (
      event &&
      event.type !== Blockly.Events.BLOCK_CREATE &&
      event.type !== Blockly.Events.BLOCK_DELETE &&
      event.type !== Blockly.Events.BLOCK_CHANGE &&
      event.type !== Blockly.Events.BLOCK_MOVE &&
      event.type !== Blockly.Events.FINISHED_LOADING
    ) {
      return
    }
    // Atalho barato: se o evento mexeu SÓ neste bloco (ex.: arrastá-lo) e nenhum
    // dos campos que escolhem a assinatura (nem a contagem de espaços) mudou
    // desde o último onchange, a varredura O(workspace) do `resolveSignature_()`
    // é desnecessária. Eventos de OUTROS blocos (a classe/construtor pode ter
    // mudado) sempre passam, preservando a re-sincronização do modo AUTO.
    const selfEvent = (event as { blockId?: string } | undefined)?.blockId === this.id
    const preKey = this.preKey_()
    if (event && selfEvent && preKey === this.prevPreKey_) return
    this.prevPreKey_ = preKey
    this.syncShape_(event)
  },

  plus(this: ArgsMutatorBlock): void {
    if (this.itemCount_ >= MAX_ITEMS) return
    withMutation(this, () => {
      this.itemCount_ += 1
      this.lastKey_ = `manual:${this.itemCount_}`
      this.rebuild_(null)
    })
  },

  minus(this: ArgsMutatorBlock): void {
    if (this.itemCount_ <= 0) return
    withMutation(this, () => {
      this.itemCount_ -= 1
      this.lastKey_ = `manual:${this.itemCount_}`
      this.rebuild_(null)
    })
  },
}

function clampItemCount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(MAX_ITEMS, Math.trunc(value)))
}

function argsMutatorHelper(this: ArgsMutatorBlock): void {
  this.syncShape_()
}

let registered = false

/** Registra o mutator `sz_args_mutator`. Idempotente. */
export function registerArgsMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_args_mutator',
    ARGS_MUTATOR_MIXIN,
    argsMutatorHelper as unknown as () => void,
  )
  registered = true
}
