import type * as Blockly from 'blockly/core'
import { getParamNames } from './paramsMutator'

/**
 * Introspecção PURA do modelo de Orientação a Objetos no workspace: achar a classe
 * de um nome/instância, e enumerar propriedades/métodos/parâmetros de uma classe
 * (com herança). Usado por:
 *  - `sz_args_mutator` (rótulos dos espaços de argumento — modo AUTO), e
 *  - os seletores de propriedade/método/classe/função (`FieldNamePicker`).
 *
 * Nada aqui muta o workspace; tudo recebe um `BlockScanner` (varredura por tipo)
 * para que o chamador escolha a estratégia — o mutator coalesce a varredura por
 * evento; o seletor abre no clique e usa uma varredura simples.
 */

/** Varredura de blocos por tipo (o chamador decide se memoiza). */
export type BlockScanner = (type: string) => Blockly.Block[]

/** Acha o bloco de uma classe pelo nome no workspace. */
export function findClass(scan: BlockScanner, name: string): Blockly.Block | null {
  if (!name) return null
  for (const b of scan('sz_js_class')) {
    if (b.getFieldValue('NAME') === name) return b
  }
  return null
}

/**
 * Método de classe, seja o comum ou o que espera. ⚠️ A espera virou o TIPO do
 * bloco, então quem procura métodos precisa conhecer os DOIS: comparar só com
 * `sz_js_class_method` faz o método assíncrono sumir da introspecção (nome e
 * parâmetros somem dos seletores) sem erro nenhum.
 */
function isClassMethod(type: string): boolean {
  return type === 'sz_js_class_method' || type === 'sz_js_class_method_async'
}

/** Acha a declaração de uma função (`sz_js_function`) pelo nome no workspace. */
export function findFunction(scan: BlockScanner, name: string): Blockly.Block | null {
  if (!name) return null
  for (const b of [...scan('sz_js_function'), ...scan('sz_js_function_async')]) {
    if (b.getFieldValue('NAME') === name) return b
  }
  return null
}

/** Dado o nome de uma variável de instância, acha a classe (via `criar x = novo Classe`). */
export function classOfInstance(scan: BlockScanner, varName: string): Blockly.Block | null {
  if (!varName) return null
  for (const b of scan('sz_js_new_var')) {
    if (b.getFieldValue('VARNAME') === varName) {
      return findClass(scan, b.getFieldValue('CLASS') ?? '')
    }
  }
  return null
}

/** Parâmetros do construtor encaixado no input MEMBERS de uma classe. */
export function constructorParams(classBlock: Blockly.Block): string[] {
  let cur: Blockly.Block | null = classBlock.getInputTargetBlock('MEMBERS')
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_js_constructor') return getParamNames(cur)
    cur = cur.getNextBlock()
  }
  return []
}

/** Parâmetros de um método (pelo nome) encaixado no input MEMBERS de uma classe. */
export function methodParams(classBlock: Blockly.Block, method: string): string[] | null {
  let cur: Blockly.Block | null = classBlock.getInputTargetBlock('MEMBERS')
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (isClassMethod(cur.type) && cur.getFieldValue('NAME') === method) {
      return getParamNames(cur)
    }
    cur = cur.getNextBlock()
  }
  return null
}

/** A classe que ENVOLVE um bloco (sobe por `getSurroundParent` até um `sz_js_class`). */
export function enclosingClass(block: Blockly.Block | null | undefined): Blockly.Block | null {
  let cur = block?.getSurroundParent() ?? null
  while (cur) {
    if (cur.type === 'sz_js_class') return cur
    cur = cur.getSurroundParent() ?? null
  }
  return null
}

/**
 * Nome da classe-mãe declarada num bloco de classe (`''` sem herança). Lido direto do
 * campo `SUPER` (só existe quando o `sz_extends_mutator` abriu a cláusula `estende`) —
 * evita depender do `extendsMutator` (senão haveria import circular via FieldNamePicker).
 */
function superClassName(classBlock: Blockly.Block): string {
  return (classBlock.getFieldValue('SUPER') ?? '').trim()
}

/** Junta os nomes (sem repetir, preservando ordem) numa lista acumuladora. */
function pushUnique(into: string[], seen: Set<string>, name: string | null | undefined): void {
  if (!name || seen.has(name)) return
  seen.add(name)
  into.push(name)
}

/**
 * Nomes das propriedades de uma classe (`this.<x> = …` em qualquer método/construtor)
 * + as herdadas da classe-mãe. Guarda contra ciclos de herança pelo nome da classe.
 */
export function classPropertyNames(scan: BlockScanner, classBlock: Blockly.Block | null): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  const visited = new Set<string>()
  let cur: Blockly.Block | null = classBlock
  while (cur) {
    const className = cur.getFieldValue('NAME') ?? ''
    if (className && visited.has(className)) break
    if (className) visited.add(className)
    for (const b of cur.getDescendants(false)) {
      if (b.type === 'sz_js_set_this_prop') pushUnique(ordered, seen, b.getFieldValue('NAME'))
    }
    cur = findClass(scan, superClassName(cur))
  }
  return ordered
}

/**
 * Nomes dos métodos de uma classe (`sz_js_class_method` na cadeia MEMBERS) + os
 * herdados da classe-mãe. Guarda contra ciclos de herança pelo nome da classe.
 */
export function classMethodNames(scan: BlockScanner, classBlock: Blockly.Block | null): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  const visited = new Set<string>()
  let cur: Blockly.Block | null = classBlock
  while (cur) {
    const className = cur.getFieldValue('NAME') ?? ''
    if (className && visited.has(className)) break
    if (className) visited.add(className)
    let member: Blockly.Block | null = cur.getInputTargetBlock('MEMBERS')
    while (member) {
      if (isClassMethod(member.type)) pushUnique(ordered, seen, member.getFieldValue('NAME'))
      member = member.getNextBlock()
    }
    cur = findClass(scan, superClassName(cur))
  }
  return ordered
}

/**
 * Métodos que podem ser chamados com `super`: começa na classe-mãe direta e segue a
 * cadeia de ancestrais, sem oferecer métodos declarados somente na classe atual.
 */
export function superClassMethodNames(
  scan: BlockScanner,
  classBlock: Blockly.Block | null,
): string[] {
  const parent = classBlock ? findClass(scan, superClassName(classBlock)) : null
  return classMethodNames(scan, parent)
}
