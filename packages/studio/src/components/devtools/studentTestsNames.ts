import { GROUP_DECL_BLOCKS } from '../../blockly/fields/FieldNamePicker'
import { SPRITE_DECL_BLOCKS } from '../../blockly/fields/FieldSpritePicker'
import { checkScriptNames } from '../../check/instrumentCheckScript'

/**
 * Os nomes que o formulário de "Meus testes" oferece (nota da prancha "um teste novo": "As listas
 * mostram os nomes que existem no projeto"). As variáveis são as que o leitor das variáveis
 * consegue ler no script (`checkScriptNames`, o mesmo levantamento do leitor). Os sprites e os
 * grupos são os que os blocos de criar sprite e de criar grupo nomeiam (as mesmas tabelas dos
 * seletores do Jogo 2D); um jogo sem esses blocos (código digitado na Ponte) oferece as variáveis.
 */
export interface StudentTestNames {
  variables: string[]
  sprites: string[]
  groups: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** Os nomes que os blocos do estado guardado declaram (pilha explícita: projeto grande). */
function namesInBlocksState(state: unknown, fieldsOf: (type: string) => string[]): string[] {
  const names: string[] = []
  const stack: unknown[] = [state]
  while (stack.length) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push(node[i])
      continue
    }
    if (!isRecord(node)) continue
    if (typeof node.type === 'string' && isRecord(node.fields))
      for (const field of fieldsOf(node.type)) {
        const name = node.fields[field]
        if (typeof name === 'string' && name.trim()) names.push(name)
      }
    // Os filhos depois do próprio bloco, na ordem em que aparecem.
    const children = Object.entries(node)
      .filter(([key]) => key !== 'fields')
      .map(([, value]) => value)
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i])
  }
  return [...new Set(names)]
}

/** Os sprites que os blocos de criar sprite nomeiam. */
export function spriteNamesInBlocksState(state: unknown): string[] {
  return namesInBlocksState(state, (type) => {
    const declaration = SPRITE_DECL_BLOCKS[type]
    return declaration ? [declaration.nameField ?? 'NAME'] : []
  })
}

/** Os grupos que os blocos de criar grupo nomeiam (o tipo de inimigo também é um grupo). */
export function groupNamesInBlocksState(state: unknown): string[] {
  return namesInBlocksState(state, (type) => GROUP_DECL_BLOCKS[type] ?? [])
}

export function studentTestNames(script: string, blocksState: unknown): StudentTestNames {
  const variables = checkScriptNames(script)
  const sprites = spriteNamesInBlocksState(blocksState)
  const groups = groupNamesInBlocksState(blocksState)
  return {
    variables,
    sprites: sprites.length ? sprites : variables,
    groups: groups.length ? groups : variables,
  }
}
